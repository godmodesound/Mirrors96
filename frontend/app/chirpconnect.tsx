import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Animated,
  Vibration,
  AppState,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import * as Haptics from 'expo-haptics';
import Constants from 'expo-constants';

// ═══════════════════════════════════
// CONFIG
// ═══════════════════════════════════
const API_BASE =
  Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL ||
  process.env.EXPO_PUBLIC_BACKEND_URL ||
  '';
const WS_BASE = API_BASE.replace(/^https?/, 'wss');
const CHANNEL_ID = 'codes-chirp';

// ═══════════════════════════════════
// NEXTEL-STYLE CODES I.D.
// ═══════════════════════════════════
export default function ChirpConnect() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  // Core state
  const [isTransmitting, setIsTransmitting] = useState(false);
  const [isReceiving, setIsReceiving] = useState(false);
  const [transmitDuration, setTransmitDuration] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState<'offline' | 'connecting' | 'online'>('offline');
  const [onlineCount, setOnlineCount] = useState(0);
  const [hasPermission, setHasPermission] = useState(false);
  const [lastChirpTime, setLastChirpTime] = useState<string | null>(null);
  const [receiverName, setReceiverName] = useState<string | null>(null);

  // Refs
  const wsRef = useRef<WebSocket | null>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  const transmitTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Animations
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const ringAnim = useRef(new Animated.Value(0)).current;
  const receiveAnim = useRef(new Animated.Value(0)).current;

  // ═══════════════════════════════════
  // AUDIO PERMISSION
  // ═══════════════════════════════════
  useEffect(() => {
    (async () => {
      if (Platform.OS !== 'web') {
        try {
          const { status } = await Audio.requestPermissionsAsync();
          setHasPermission(status === 'granted');
          if (status === 'granted') {
            await Audio.setAudioModeAsync({
              allowsRecordingIOS: true,
              playsInSilentModeIOS: true,
            });
          }
        } catch {
          setHasPermission(false);
        }
      }
    })();
  }, []);

  // ═══════════════════════════════════
  // CHIRP SOUND FEEDBACK
  // ═══════════════════════════════════
  const playChirpStart = async () => {
    try {
      if (Platform.OS !== 'web') {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      }
      // Classic Nextel "bleep-bleep" pattern
      Vibration.vibrate([0, 60, 40, 60]);
    } catch {
      Vibration.vibrate(50);
    }
  };

  const playChirpEnd = async () => {
    try {
      if (Platform.OS !== 'web') {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      Vibration.vibrate([0, 30, 50, 30]);
    } catch {
      Vibration.vibrate(30);
    }
  };

  const playIncomingChirp = async () => {
    try {
      if (Platform.OS !== 'web') {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }
      // Distinctive incoming chirp pattern
      Vibration.vibrate([0, 100, 50, 100, 50, 100]);
    } catch {
      Vibration.vibrate(100);
    }
  };

  // ═══════════════════════════════════
  // WEBSOCKET CONNECTION
  // ═══════════════════════════════════
  const connectWebSocket = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    setConnectionStatus('connecting');

    try {
      const ws = new WebSocket(`${WS_BASE}/api/codes/live/${CHANNEL_ID}`);

      ws.onopen = () => {
        setConnectionStatus('online');
        const pingInterval = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }));
          }
        }, 15000);
        (ws as any)._pingInterval = pingInterval;
      };

      ws.onmessage = async (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'presence') {
            setOnlineCount(data.online_count || 0);
          } else if (data.type === 'new_message') {
            // Incoming chirp!
            await playIncomingChirp();
            setIsReceiving(true);
            setReceiverName(data.sender_name || 'CODES');
            
            // Animate receive
            Animated.sequence([
              Animated.timing(receiveAnim, { toValue: 1, duration: 200, useNativeDriver: false }),
              Animated.delay(2000),
              Animated.timing(receiveAnim, { toValue: 0, duration: 300, useNativeDriver: false }),
            ]).start(() => {
              setIsReceiving(false);
              setReceiverName(null);
            });

            // Play audio if present
            if (data.audio_base64 && !data.audio_base64.startsWith('TEXT:')) {
              try {
                if (soundRef.current) {
                  await soundRef.current.unloadAsync();
                }
                const { sound } = await Audio.Sound.createAsync(
                  { uri: `data:audio/m4a;base64,${data.audio_base64}` },
                  { shouldPlay: true }
                );
                soundRef.current = sound;
              } catch {}
            }
          } else if (data.type === 'user_transmitting') {
            setIsReceiving(true);
            setReceiverName(data.sender_name || 'CODES');
          } else if (data.type === 'user_stopped') {
            // Will clear after audio plays
          }
        } catch {}
      };

      ws.onclose = () => {
        clearInterval((ws as any)._pingInterval);
        setConnectionStatus('offline');
        setOnlineCount(0);
        reconnectTimeoutRef.current = setTimeout(connectWebSocket, 3000);
      };

      ws.onerror = () => {
        setConnectionStatus('offline');
      };

      wsRef.current = ws;
    } catch {
      setConnectionStatus('offline');
      reconnectTimeoutRef.current = setTimeout(connectWebSocket, 5000);
    }
  }, []);

  const disconnectWebSocket = useCallback(() => {
    if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    if (wsRef.current) {
      clearInterval((wsRef.current as any)._pingInterval);
      wsRef.current.close();
      wsRef.current = null;
    }
    setConnectionStatus('offline');
  }, []);

  useEffect(() => {
    connectWebSocket();
    return () => disconnectWebSocket();
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') connectWebSocket();
      else if (state === 'background') disconnectWebSocket();
    });
    return () => sub.remove();
  }, [connectWebSocket, disconnectWebSocket]);

  // ═══════════════════════════════════
  // TRANSMIT ANIMATIONS
  // ═══════════════════════════════════
  const startTransmitAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 300, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      ])
    ).start();
    Animated.timing(glowAnim, { toValue: 1, duration: 200, useNativeDriver: false }).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(ringAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(ringAnim, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    ).start();
  };

  const stopTransmitAnimation = () => {
    pulseAnim.stopAnimation();
    glowAnim.stopAnimation();
    ringAnim.stopAnimation();
    Animated.timing(pulseAnim, { toValue: 1, duration: 150, useNativeDriver: true }).start();
    Animated.timing(glowAnim, { toValue: 0, duration: 150, useNativeDriver: false }).start();
  };

  // ═══════════════════════════════════
  // PTT TRANSMIT
  // ═══════════════════════════════════
  const startTransmit = async () => {
    if (!hasPermission) {
      Vibration.vibrate([0, 100, 50, 100]);
      return;
    }

    setIsTransmitting(true);
    setTransmitDuration(0);
    await playChirpStart();
    startTransmitAnimation();

    // Notify network
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'transmitting', sender_name: 'CODES' }));
    }

    // Duration timer
    transmitTimerRef.current = setInterval(() => {
      setTransmitDuration(prev => prev + 0.1);
    }, 100);

    // Start recording
    try {
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync({
        android: { extension: '.m4a', outputFormat: 3, audioEncoder: 3, sampleRate: 22050, numberOfChannels: 1, bitRate: 64000 },
        ios: { extension: '.m4a', outputFormat: 'aac' as any, audioQuality: 0x60, sampleRate: 22050, numberOfChannels: 1, bitRate: 64000 },
        web: { mimeType: 'audio/webm', bitsPerSecond: 64000 },
      });
      await recording.startAsync();
      recordingRef.current = recording;
    } catch {
      stopTransmit(true);
    }
  };

  const stopTransmit = async (cancelled = false) => {
    setIsTransmitting(false);
    stopTransmitAnimation();
    await playChirpEnd();

    if (transmitTimerRef.current) {
      clearInterval(transmitTimerRef.current);
      transmitTimerRef.current = null;
    }

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'stopped' }));
    }

    if (cancelled || !recordingRef.current) {
      setTransmitDuration(0);
      return;
    }

    try {
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;

      if (uri && transmitDuration > 0.3) {
        let base64Audio = '';
        if (Platform.OS !== 'web') {
          base64Audio = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
        }

        await fetch(`${API_BASE}/api/codes/transmit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            channel_id: CHANNEL_ID,
            sender_name: 'CODES',
            sender_id: 'codes-user',
            audio_base64: base64Audio,
            duration: Math.round(transmitDuration * 10) / 10,
          }),
        });

        setLastChirpTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      }
    } catch {}

    setTransmitDuration(0);
  };

  // ═══════════════════════════════════
  // ANIMATED VALUES
  // ═══════════════════════════════════
  const glowColor = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(255, 10, 10, 0)', 'rgba(255, 10, 10, 0.4)'],
  });

  const ringScale = ringAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 2],
  });

  const ringOpacity = ringAnim.interpolate({
    inputRange: [0, 0.7, 1],
    outputRange: [0.5, 0.1, 0],
  });

  const receiveGlow = receiveAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(0, 255, 68, 0)', 'rgba(0, 255, 68, 0.3)'],
  });

  const formatDuration = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = Math.floor(s % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // ═══════════════════════════════════
  // RENDER
  // ═══════════════════════════════════
  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>{'◀'}</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>CODES</Text>
          <Text style={styles.headerSub}>I.D.</Text>
        </View>
        <View style={styles.statusArea}>
          <View style={[styles.statusDot, connectionStatus === 'online' && styles.statusDotOnline]} />
          <Text style={styles.statusText}>{connectionStatus === 'online' ? 'LIVE' : 'OFF'}</Text>
        </View>
      </View>

      {/* Network Status */}
      <View style={styles.networkBar}>
        <View style={styles.signalBars}>
          {[1, 2, 3, 4, 5].map(i => (
            <View key={i} style={[styles.signalBar, { height: 4 + i * 2 }, onlineCount >= i && styles.signalBarActive]} />
          ))}
        </View>
        <Text style={styles.networkText}>GODMODE NETWORK</Text>
        <Text style={styles.onlineCount}>{onlineCount}</Text>
      </View>

      {/* Main PTT Area */}
      <View style={styles.mainArea}>
        {/* Incoming chirp indicator */}
        {isReceiving && (
          <Animated.View style={[styles.receiveIndicator, { backgroundColor: receiveGlow }]}>
            <Text style={styles.receiveText}>◉ INCOMING</Text>
            {receiverName && <Text style={styles.receiverName}>{receiverName}</Text>}
          </Animated.View>
        )}

        {/* Transmission status */}
        {isTransmitting && (
          <View style={styles.transmitStatus}>
            <Text style={styles.transmitLabel}>TRANSMITTING</Text>
            <Text style={styles.transmitTimer}>{formatDuration(transmitDuration)}</Text>
          </View>
        )}

        {/* THE BUTTON */}
        <View style={styles.pttWrapper}>
          {/* Expanding ring animation */}
          {isTransmitting && (
            <Animated.View
              style={[styles.pttRing, { transform: [{ scale: ringScale }], opacity: ringOpacity }]}
            />
          )}

          {/* Glow */}
          <Animated.View style={[styles.pttGlow, { backgroundColor: glowColor }]} />

          {/* Main button */}
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <TouchableOpacity
              style={[styles.pttButton, isTransmitting && styles.pttButtonActive]}
              onPressIn={startTransmit}
              onPressOut={() => stopTransmit(false)}
              activeOpacity={0.9}
            >
              <Text style={styles.pttIcon}>◉</Text>
              <Text style={styles.pttMainText}>CODES</Text>
              <Text style={styles.pttSubText}>{isTransmitting ? 'RELEASE TO SEND' : 'HOLD TO CHIRP'}</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>

        {/* Last chirp time */}
        {lastChirpTime && !isTransmitting && (
          <Text style={styles.lastChirp}>Last chirp: {lastChirpTime}</Text>
        )}
      </View>

      {/* Action Button Setup Guide */}
      <View style={styles.footer}>
        <Text style={styles.footerTitle}>iPHONE ACTION BUTTON</Text>
        <Text style={styles.footerText}>
          Settings → Action Button → Shortcut → "Open CODES I.D."
        </Text>
        <TouchableOpacity
          style={styles.settingsBtn}
          onPress={() => {
            if (Platform.OS === 'ios') {
              Linking.openURL('app-settings:');
            }
          }}
        >
          <Text style={styles.settingsBtnText}>OPEN SETTINGS</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ═══════════════════════════════════
// STYLES
// ═══════════════════════════════════
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1a0808',
  },
  backBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backText: {
    color: '#ff0a0a',
    fontSize: 20,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    color: '#ff0a0a',
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 8,
    fontFamily: 'TerminatorRealNFI',
  },
  headerSub: {
    color: '#5a1a1a',
    fontSize: 12,
    letterSpacing: 8,
    marginTop: 2,
    fontFamily: 'TerminatorRealNFI',
  },
  statusArea: {
    width: 44,
    alignItems: 'center',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#ff0a0a',
    marginBottom: 4,
  },
  statusDotOnline: {
    backgroundColor: '#00ff44',
  },
  statusText: {
    color: '#5a1a1a',
    fontSize: 8,
    letterSpacing: 2,
    fontFamily: 'TerminatorRealNFI',
  },

  // Network bar
  networkBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#050202',
    borderBottomWidth: 1,
    borderBottomColor: '#1a0808',
  },
  signalBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
    marginRight: 12,
  },
  signalBar: {
    width: 4,
    backgroundColor: '#2a0a0a',
    borderRadius: 1,
  },
  signalBarActive: {
    backgroundColor: '#ff0a0a',
  },
  networkText: {
    color: '#3a1010',
    fontSize: 9,
    letterSpacing: 3,
    flex: 1,
    fontFamily: 'TerminatorRealNFI',
  },
  onlineCount: {
    color: '#ff0a0a',
    fontSize: 14,
    fontWeight: '900',
    fontFamily: 'TerminatorRealNFI',
  },

  // Main PTT area
  mainArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },

  // Receive indicator
  receiveIndicator: {
    position: 'absolute',
    top: 40,
    left: 20,
    right: 20,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#00ff4440',
  },
  receiveText: {
    color: '#00ff44',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 4,
    fontFamily: 'TerminatorRealNFI',
  },
  receiverName: {
    color: '#00ff44',
    fontSize: 10,
    letterSpacing: 2,
    marginTop: 4,
    opacity: 0.7,
    fontFamily: 'TerminatorRealNFI',
  },

  // Transmit status
  transmitStatus: {
    position: 'absolute',
    top: 40,
    alignItems: 'center',
  },
  transmitLabel: {
    color: '#ff0a0a',
    fontSize: 12,
    letterSpacing: 6,
    fontFamily: 'TerminatorRealNFI',
  },
  transmitTimer: {
    color: '#ff0a0a',
    fontSize: 32,
    fontWeight: '900',
    marginTop: 8,
    fontFamily: 'TerminatorRealNFI',
  },

  // PTT Button
  pttWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 220,
    height: 220,
  },
  pttRing: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 2,
    borderColor: '#ff0a0a',
  },
  pttGlow: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
  },
  pttButton: {
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: '#0a0303',
    borderWidth: 4,
    borderColor: '#2a0a0a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pttButtonActive: {
    backgroundColor: '#1a0505',
    borderColor: '#ff0a0a',
  },
  pttIcon: {
    color: '#ff0a0a',
    fontSize: 40,
    marginBottom: 8,
  },
  pttMainText: {
    color: '#ff0a0a',
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 6,
    fontFamily: 'TerminatorRealNFI',
  },
  pttSubText: {
    color: '#5a1a1a',
    fontSize: 9,
    letterSpacing: 2,
    marginTop: 8,
    fontFamily: 'TerminatorRealNFI',
  },

  lastChirp: {
    color: '#3a1010',
    fontSize: 10,
    letterSpacing: 1,
    marginTop: 30,
    fontFamily: 'TerminatorRealNFI',
  },

  // Footer - Action Button Guide
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#1a0808',
    alignItems: 'center',
  },
  footerTitle: {
    color: '#ff0a0a',
    fontSize: 10,
    letterSpacing: 3,
    marginBottom: 8,
    fontFamily: 'TerminatorRealNFI',
  },
  footerText: {
    color: '#3a1010',
    fontSize: 10,
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: 12,
  },
  settingsBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#2a0a0a',
    borderRadius: 4,
  },
  settingsBtnText: {
    color: '#5a1a1a',
    fontSize: 10,
    letterSpacing: 2,
    fontFamily: 'TerminatorRealNFI',
  },
});
