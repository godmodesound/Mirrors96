import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
  Animated,
  Vibration,
  TextInput,
  KeyboardAvoidingView,
  Alert,
  AppState,
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

const CHANNEL_CODE = 'code-direct';
const CHANNEL_MIRRORS = 'mirrors-fleet';

// ═══════════════════════════════════
// TYPES
// ═══════════════════════════════════
interface Dispatch {
  id: string;
  sender_name: string;
  sender_id: string;
  text?: string;
  audio_base64?: string;
  duration: number;
  created_at: string;
  status: string;
}

// ═══════════════════════════════════
// COMPONENT
// ═══════════════════════════════════
export default function ChirpConnect() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  // State
  const [activeChannel, setActiveChannel] = useState<'code' | 'mirrors'>('code');
  const [connectionStatus, setConnectionStatus] = useState<'offline' | 'connecting' | 'online'>('offline');
  const [onlineCount, setOnlineCount] = useState(0);
  const [isTransmitting, setIsTransmitting] = useState(false);
  const [transmitDuration, setTransmitDuration] = useState(0);
  const [dispatches, setDispatches] = useState<Dispatch[]>([]);
  const [textMessage, setTextMessage] = useState('');
  const [mode, setMode] = useState<'voice' | 'text'>('text');
  const [hasAudioPermission, setHasAudioPermission] = useState(false);
  const [isPlaying, setIsPlaying] = useState<string | null>(null);
  const [someoneTransmitting, setSomeoneTransmitting] = useState<string | null>(null);
  const [userId] = useState(() => `user-${Date.now()}`);
  const [userName] = useState('OPERATOR');

  // Refs
  const wsRef = useRef<WebSocket | null>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  const pttStartSoundRef = useRef<Audio.Sound | null>(null);
  const pttEndSoundRef = useRef<Audio.Sound | null>(null);
  const transmitTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Animations
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const ringAnim = useRef(new Animated.Value(0)).current;

  // ═══════════════════════════════════
  // AUDIO PERMISSION
  // ═══════════════════════════════════
  useEffect(() => {
    (async () => {
      if (Platform.OS !== 'web') {
        try {
          const { status } = await Audio.requestPermissionsAsync();
          setHasAudioPermission(status === 'granted');
          if (status === 'granted') {
            await Audio.setAudioModeAsync({
              allowsRecordingIOS: true,
              playsInSilentModeIOS: true,
            });
            setMode('voice');
          }
        } catch {
          setHasAudioPermission(false);
        }
      }
    })();
  }, []);

  // ═══════════════════════════════════
  // PTT AUDIO FEEDBACK - Chirp sounds
  // ═══════════════════════════════════
  const playPttStartSound = async () => {
    try {
      // Play ascending chirp tone for press
      if (Platform.OS !== 'web') {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      }
      
      // Create a quick chirp using synthesized audio
      if (pttStartSoundRef.current) {
        await pttStartSoundRef.current.unloadAsync();
      }
      
      // Use a simple beep sound (base64 encoded short tone)
      // This is a short 100ms 800Hz beep
      const chirpTone = 'UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=';
      try {
        const { sound } = await Audio.Sound.createAsync(
          { uri: `data:audio/wav;base64,${chirpTone}` },
          { shouldPlay: true, volume: 0.7 }
        );
        pttStartSoundRef.current = sound;
      } catch {
        // Fallback to vibration only
        Vibration.vibrate([0, 50, 30, 50]);
      }
    } catch {
      // Fallback haptic
      Vibration.vibrate(50);
    }
  };

  const playPttEndSound = async () => {
    try {
      // Play descending chirp tone for release
      if (Platform.OS !== 'web') {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      
      if (pttEndSoundRef.current) {
        await pttEndSoundRef.current.unloadAsync();
      }
      
      // Double beep for end
      Vibration.vibrate([0, 30, 50, 30]);
    } catch {
      Vibration.vibrate(30);
    }
  };

  // ═══════════════════════════════════
  // WEBSOCKET CONNECTION
  // ═══════════════════════════════════
  const channelId = activeChannel === 'code' ? CHANNEL_CODE : CHANNEL_MIRRORS;

  const connectWebSocket = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    setConnectionStatus('connecting');

    try {
      const ws = new WebSocket(
        `${WS_BASE}/api/codes/live/${channelId}?user_id=${userId}&user_name=${userName}`
      );

      ws.onopen = () => {
        setConnectionStatus('online');
        // Start ping interval
        const pingInterval = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }));
          }
        }, 15000);
        (ws as any)._pingInterval = pingInterval;
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'presence') {
            setOnlineCount(data.online_count || 0);
          } else if (data.type === 'new_message') {
            const newDispatch: Dispatch = {
              id: data.message_id,
              sender_name: data.sender_name,
              sender_id: data.sender_id,
              text: data.text,
              audio_base64: data.audio_base64,
              duration: data.duration,
              created_at: data.created_at,
              status: 'delivered',
            };
            setDispatches(prev => [...prev, newDispatch]);
            Vibration.vibrate(50);
            setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
          } else if (data.type === 'user_transmitting') {
            setSomeoneTransmitting(data.sender_name);
          } else if (data.type === 'user_stopped') {
            setSomeoneTransmitting(null);
          }
        } catch {}
      };

      ws.onclose = () => {
        clearInterval((ws as any)._pingInterval);
        setConnectionStatus('offline');
        setOnlineCount(0);
        // Auto-reconnect after 3s
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
  }, [channelId, userId, userName]);

  const disconnectWebSocket = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (wsRef.current) {
      clearInterval((wsRef.current as any)._pingInterval);
      wsRef.current.close();
      wsRef.current = null;
    }
    setConnectionStatus('offline');
    setOnlineCount(0);
  }, []);

  // Connect on mount / channel change
  useEffect(() => {
    connectWebSocket();
    loadDispatchHistory();
    return () => disconnectWebSocket();
  }, [channelId]);

  // Handle app state
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        connectWebSocket();
      } else if (state === 'background') {
        disconnectWebSocket();
      }
    });
    return () => sub.remove();
  }, [connectWebSocket, disconnectWebSocket]);

  // ═══════════════════════════════════
  // DISPATCH HISTORY
  // ═══════════════════════════════════
  const loadDispatchHistory = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/codes/messages/${channelId}?limit=50`);
      const data = await res.json();
      if (data.messages) {
        setDispatches(data.messages);
        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 200);
      }
    } catch {}
  };

  // ═══════════════════════════════════
  // TRANSMIT ANIMATIONS
  // ═══════════════════════════════════
  const startTransmitAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.15, duration: 400, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      ])
    ).start();
    Animated.timing(glowAnim, { toValue: 1, duration: 300, useNativeDriver: false }).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(ringAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
        Animated.timing(ringAnim, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    ).start();
  };

  const stopTransmitAnimation = () => {
    pulseAnim.stopAnimation();
    glowAnim.stopAnimation();
    ringAnim.stopAnimation();
    Animated.timing(pulseAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    Animated.timing(glowAnim, { toValue: 0, duration: 200, useNativeDriver: false }).start();
    Animated.timing(ringAnim, { toValue: 0, duration: 0, useNativeDriver: true }).start();
  };

  // ═══════════════════════════════════
  // PTT — VOICE RECORDING
  // ═══════════════════════════════════
  const startVoiceTransmit = async () => {
    if (!hasAudioPermission) {
      Alert.alert('PERMISSION DENIED', 'Microphone access required for voice dispatch.');
      return;
    }

    setIsTransmitting(true);
    setTransmitDuration(0);
    
    // Play PTT start sound with haptic feedback
    await playPttStartSound();
    startTransmitAnimation();

    // Notify others
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'transmitting',
        sender_name: userName,
        sender_id: userId,
      }));
    }

    // Start duration timer
    transmitTimerRef.current = setInterval(() => {
      setTransmitDuration(prev => prev + 0.1);
    }, 100);

    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync({
        android: {
          extension: '.m4a',
          outputFormat: 3, // MPEG_4
          audioEncoder: 3, // AAC
          sampleRate: 22050,
          numberOfChannels: 1,
          bitRate: 64000,
        },
        ios: {
          extension: '.m4a',
          outputFormat: 'aac' as any,
          audioQuality: 0x60, // medium
          sampleRate: 22050,
          numberOfChannels: 1,
          bitRate: 64000,
        },
        web: {
          mimeType: 'audio/webm',
          bitsPerSecond: 64000,
        },
      });
      await recording.startAsync();
      recordingRef.current = recording;
    } catch (err: any) {
      console.warn('Recording start failed:', err);
      stopVoiceTransmit(true);
    }
  };

  const stopVoiceTransmit = async (cancelled = false) => {
    setIsTransmitting(false);
    stopTransmitAnimation();
    
    // Play PTT end sound with haptic feedback
    await playPttEndSound();

    if (transmitTimerRef.current) {
      clearInterval(transmitTimerRef.current);
      transmitTimerRef.current = null;
    }

    // Notify stopped
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
        // Read file as base64
        let base64Audio = '';
        if (Platform.OS !== 'web') {
          base64Audio = await FileSystem.readAsStringAsync(uri, {
            encoding: FileSystem.EncodingType.Base64,
          });
        }

        // Send via HTTP POST
        const payload = {
          channel_id: channelId,
          sender_name: userName,
          sender_id: userId,
          audio_base64: base64Audio,
          duration: Math.round(transmitDuration * 10) / 10,
        };

        const res = await fetch(`${API_BASE}/api/codes/transmit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          const result = await res.json();
          // Add to local dispatches
          const localDispatch: Dispatch = {
            id: result.message_id,
            sender_name: userName,
            sender_id: userId,
            audio_base64: base64Audio,
            duration: payload.duration,
            created_at: new Date().toISOString(),
            status: 'delivered',
          };
          setDispatches(prev => [...prev, localDispatch]);
          setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
        }
      }
    } catch (err: any) {
      console.warn('Transmit failed:', err);
    }

    setTransmitDuration(0);
  };

  // ═══════════════════════════════════
  // TEXT DISPATCH
  // ═══════════════════════════════════
  const sendTextDispatch = async () => {
    if (!textMessage.trim()) return;

    const payload = {
      channel_id: channelId,
      sender_name: userName,
      sender_id: userId,
      audio_base64: `TEXT:${textMessage.trim()}`,
      duration: 0,
    };

    try {
      Vibration.vibrate(20);
      const res = await fetch(`${API_BASE}/api/codes/transmit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const result = await res.json();
        const localDispatch: Dispatch = {
          id: result.message_id,
          sender_name: userName,
          sender_id: userId,
          text: textMessage.trim(),
          audio_base64: `TEXT:${textMessage.trim()}`,
          duration: 0,
          created_at: new Date().toISOString(),
          status: 'delivered',
        };
        setDispatches(prev => [...prev, localDispatch]);
        setTextMessage('');
        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
      }
    } catch (err: any) {
      Alert.alert('DISPATCH FAILED', 'Could not send message. Check connection.');
    }
  };

  // ═══════════════════════════════════
  // AUDIO PLAYBACK
  // ═══════════════════════════════════
  const playAudio = async (base64: string, dispatchId: string) => {
    if (isPlaying === dispatchId) {
      await soundRef.current?.stopAsync();
      setIsPlaying(null);
      return;
    }

    try {
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
      }
      const { sound } = await Audio.Sound.createAsync(
        { uri: `data:audio/m4a;base64,${base64}` },
        { shouldPlay: true }
      );
      soundRef.current = sound;
      setIsPlaying(dispatchId);
      sound.setOnPlaybackStatusUpdate((status: any) => {
        if (status.didJustFinish) {
          setIsPlaying(null);
        }
      });
    } catch {
      // Fallback: text message
    }
  };

  // ═══════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const formatTimestamp = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const isTextMessage = (d: Dispatch) => {
    return d.audio_base64?.startsWith('TEXT:');
  };

  const getTextContent = (d: Dispatch) => {
    if (d.text) return d.text;
    if (d.audio_base64?.startsWith('TEXT:')) return d.audio_base64.slice(5);
    return '';
  };

  const isOwnMessage = (d: Dispatch) => d.sender_id === userId;

  // Animated glow color
  const glowColor = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(255, 10, 10, 0)', 'rgba(255, 10, 10, 0.6)'],
  });

  const ringScale = ringAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 2.5],
  });

  const ringOpacity = ringAnim.interpolate({
    inputRange: [0, 0.8, 1],
    outputRange: [0.6, 0.1, 0],
  });

  // ═══════════════════════════════════
  // RENDER
  // ═══════════════════════════════════
  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* ═══ HEADER ═══ */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>{'<'}</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>CODES : I.D.</Text>
          <Text style={styles.headerSub}>DIRECT CONNECT</Text>
        </View>
        <View style={styles.statusDot}>
          <View style={[
            styles.dot,
            connectionStatus === 'online' && styles.dotOnline,
            connectionStatus === 'connecting' && styles.dotConnecting,
            connectionStatus === 'offline' && styles.dotOffline,
          ]} />
          <Text style={styles.statusText}>
            {connectionStatus === 'online' ? 'LIVE' : connectionStatus === 'connecting' ? '...' : 'OFF'}
          </Text>
        </View>
      </View>

      {/* ═══ NETWORK BAR ═══ */}
      <View style={styles.networkBar}>
        <View style={styles.signalBars}>
          {[1, 2, 3, 4, 5].map(i => (
            <View
              key={i}
              style={[
                styles.signalBar,
                { height: 4 + i * 3 },
                onlineCount >= i ? styles.signalBarActive : styles.signalBarInactive,
              ]}
            />
          ))}
        </View>
        <Text style={styles.networkLabel}>GODMODE NETWORK</Text>
        <Text style={styles.onlineText}>{onlineCount} ONLINE</Text>
      </View>

      {/* ═══ CHANNEL SELECTOR ═══ */}
      <View style={styles.channelRow}>
        <TouchableOpacity
          style={[styles.channelBtn, activeChannel === 'code' && styles.channelBtnActive]}
          onPress={() => setActiveChannel('code')}
        >
          <Text style={[styles.channelBtnText, activeChannel === 'code' && styles.channelBtnTextActive]}>
            CODE
          </Text>
          <Text style={styles.channelBtnSub}>Direct</Text>
        </TouchableOpacity>
        <View style={styles.channelDivider} />
        <TouchableOpacity
          style={[styles.channelBtn, activeChannel === 'mirrors' && styles.channelBtnActive]}
          onPress={() => setActiveChannel('mirrors')}
        >
          <Text style={[styles.channelBtnText, activeChannel === 'mirrors' && styles.channelBtnTextActive]}>
            MIRRORS
          </Text>
          <Text style={styles.channelBtnSub}>Fleet</Text>
        </TouchableOpacity>
      </View>

      {/* ═══ SOMEONE TRANSMITTING INDICATOR ═══ */}
      {someoneTransmitting && (
        <View style={styles.receivingBar}>
          <View style={styles.receivingDot} />
          <Text style={styles.receivingText}>
            {someoneTransmitting} IS TRANSMITTING...
          </Text>
        </View>
      )}

      {/* ═══ DISPATCH FEED ═══ */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.feedContainer}
        keyboardVerticalOffset={insets.top + 50}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.feed}
          contentContainerStyle={styles.feedContent}
          showsVerticalScrollIndicator={false}
        >
          {dispatches.length === 0 ? (
            <View style={styles.emptyFeed}>
              <Text style={styles.emptyIcon}>{'///'}</Text>
              <Text style={styles.emptyText}>NO DISPATCHES</Text>
              <Text style={styles.emptySubText}>
                {mode === 'voice' ? 'Hold the PTT button to transmit' : 'Type a message below'}
              </Text>
            </View>
          ) : (
            dispatches.map((d) => (
              <View
                key={d.id}
                style={[
                  styles.dispatchItem,
                  isOwnMessage(d) && styles.dispatchItemOwn,
                ]}
              >
                <View style={styles.dispatchHeader}>
                  <Text style={[
                    styles.dispatchSender,
                    isOwnMessage(d) && styles.dispatchSenderOwn,
                  ]}>
                    {isOwnMessage(d) ? 'YOU' : d.sender_name}
                  </Text>
                  <Text style={styles.dispatchTime}>{formatTimestamp(d.created_at)}</Text>
                </View>

                {isTextMessage(d) ? (
                  <Text style={styles.dispatchText}>{getTextContent(d)}</Text>
                ) : d.audio_base64 && !d.audio_base64.startsWith('TEXT:') ? (
                  <TouchableOpacity
                    style={styles.audioBtn}
                    onPress={() => playAudio(d.audio_base64!, d.id)}
                  >
                    <Text style={styles.audioBtnIcon}>
                      {isPlaying === d.id ? '||' : '\u25B6'}
                    </Text>
                    <View style={styles.audioWaveform}>
                      {Array.from({ length: 12 }).map((_, i) => (
                        <View
                          key={i}
                          style={[
                            styles.waveBar,
                            {
                              height: 4 + Math.random() * 14,
                              backgroundColor: isPlaying === d.id ? '#ff0a0a' : '#444',
                            },
                          ]}
                        />
                      ))}
                    </View>
                    <Text style={styles.audioDuration}>{d.duration}s</Text>
                  </TouchableOpacity>
                ) : (
                  <Text style={styles.dispatchText}>[Dispatch]</Text>
                )}
              </View>
            ))
          )}
        </ScrollView>

        {/* ═══ PTT / TEXT INPUT AREA ═══ */}
        <View style={[styles.inputArea, { paddingBottom: Math.max(insets.bottom, 16) + 60 }]}>
          {/* Mode toggle */}
          <View style={styles.modeRow}>
            <TouchableOpacity
              style={[styles.modeBtn, mode === 'voice' && styles.modeBtnActive]}
              onPress={() => {
                if (!hasAudioPermission && Platform.OS !== 'web') {
                  Alert.alert('MIC REQUIRED', 'Enable microphone access in Settings.');
                  return;
                }
                setMode('voice');
              }}
            >
              <Text style={[styles.modeBtnText, mode === 'voice' && styles.modeBtnTextActive]}>
                VOICE
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeBtn, mode === 'text' && styles.modeBtnActive]}
              onPress={() => setMode('text')}
            >
              <Text style={[styles.modeBtnText, mode === 'text' && styles.modeBtnTextActive]}>
                TEXT
              </Text>
            </TouchableOpacity>
          </View>

          {mode === 'voice' ? (
            /* ═══ VOICE PTT BUTTON ═══ */
            <View style={styles.pttContainer}>
              {/* Animated expanding ring */}
              {isTransmitting && (
                <Animated.View
                  style={[
                    styles.pttRing,
                    {
                      transform: [{ scale: ringScale }],
                      opacity: ringOpacity,
                    },
                  ]}
                />
              )}

              <Animated.View
                style={[
                  styles.pttGlow,
                  { backgroundColor: glowColor },
                ]}
              />

              <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                <TouchableOpacity
                  style={[styles.pttButton, isTransmitting && styles.pttButtonActive]}
                  onPressIn={startVoiceTransmit}
                  onPressOut={() => stopVoiceTransmit(false)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.pttIcon}>
                    {isTransmitting ? '\u25CF' : '\u25B2'}
                  </Text>
                  <Text style={styles.pttLabel}>
                    {isTransmitting ? 'TRANSMITTING' : 'HOLD TO TALK'}
                  </Text>
                  {isTransmitting && (
                    <Text style={styles.pttTimer}>{formatTime(transmitDuration)}</Text>
                  )}
                </TouchableOpacity>
              </Animated.View>
            </View>
          ) : (
            /* ═══ TEXT INPUT ═══ */
            <View style={styles.textInputRow}>
              <TextInput
                style={styles.textInput}
                value={textMessage}
                onChangeText={setTextMessage}
                placeholder="TYPE DISPATCH..."
                placeholderTextColor="#555"
                returnKeyType="send"
                onSubmitEditing={sendTextDispatch}
                maxLength={500}
              />
              <TouchableOpacity
                style={[styles.sendBtn, !textMessage.trim() && styles.sendBtnDisabled]}
                onPress={sendTextDispatch}
                disabled={!textMessage.trim()}
              >
                <Text style={styles.sendBtnText}>TX</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
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
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  backBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backText: {
    color: '#ff0a0a',
    fontSize: 24,
    fontWeight: '700',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    color: '#ff0a0a',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 4,
  },
  headerSub: {
    color: '#666',
    fontSize: 9,
    letterSpacing: 6,
    marginTop: 2,
  },
  statusDot: {
    width: 44,
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginBottom: 2,
  },
  dotOnline: {
    backgroundColor: '#00ff44',
  },
  dotConnecting: {
    backgroundColor: '#ffaa00',
  },
  dotOffline: {
    backgroundColor: '#ff0a0a',
  },
  statusText: {
    color: '#555',
    fontSize: 8,
    letterSpacing: 2,
  },

  // Network Bar
  networkBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: '#0a0a0a',
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  signalBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
    marginRight: 10,
  },
  signalBar: {
    width: 3,
    borderRadius: 1,
  },
  signalBarActive: {
    backgroundColor: '#ff0a0a',
  },
  signalBarInactive: {
    backgroundColor: '#222',
  },
  networkLabel: {
    color: '#444',
    fontSize: 9,
    letterSpacing: 3,
    flex: 1,
  },
  onlineText: {
    color: '#ff0a0a',
    fontSize: 10,
    letterSpacing: 2,
    fontWeight: '700',
  },

  // Channel Selector
  channelRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#222',
    borderRadius: 6,
    overflow: 'hidden',
  },
  channelBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#0a0a0a',
  },
  channelBtnActive: {
    backgroundColor: '#1a0000',
    borderColor: '#ff0a0a',
  },
  channelDivider: {
    width: 1,
    backgroundColor: '#222',
  },
  channelBtnText: {
    color: '#444',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 4,
  },
  channelBtnTextActive: {
    color: '#ff0a0a',
  },
  channelBtnSub: {
    color: '#333',
    fontSize: 8,
    letterSpacing: 3,
    marginTop: 2,
  },

  // Receiving indicator
  receivingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    backgroundColor: '#1a0500',
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#ff0a0a33',
  },
  receivingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ff0a0a',
    marginRight: 8,
  },
  receivingText: {
    color: '#ff0a0a',
    fontSize: 10,
    letterSpacing: 2,
    fontWeight: '700',
  },

  // Feed
  feedContainer: {
    flex: 1,
  },
  feed: {
    flex: 1,
  },
  feedContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
  },
  emptyFeed: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyIcon: {
    color: '#222',
    fontSize: 40,
    fontWeight: '900',
    marginBottom: 12,
  },
  emptyText: {
    color: '#333',
    fontSize: 14,
    letterSpacing: 4,
    fontWeight: '700',
  },
  emptySubText: {
    color: '#222',
    fontSize: 11,
    marginTop: 8,
    letterSpacing: 1,
  },

  // Dispatch items
  dispatchItem: {
    marginBottom: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 6,
    backgroundColor: '#0a0a0a',
    borderWidth: 1,
    borderColor: '#1a1a1a',
    borderLeftWidth: 3,
    borderLeftColor: '#333',
  },
  dispatchItemOwn: {
    borderLeftColor: '#ff0a0a',
    backgroundColor: '#0d0000',
  },
  dispatchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  dispatchSender: {
    color: '#666',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 3,
  },
  dispatchSenderOwn: {
    color: '#ff0a0a',
  },
  dispatchTime: {
    color: '#333',
    fontSize: 9,
    letterSpacing: 1,
  },
  dispatchText: {
    color: '#ccc',
    fontSize: 14,
    lineHeight: 20,
  },

  // Audio playback
  audioBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 10,
  },
  audioBtnIcon: {
    color: '#ff0a0a',
    fontSize: 14,
    fontWeight: '900',
  },
  audioWaveform: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    flex: 1,
    height: 20,
  },
  waveBar: {
    width: 3,
    borderRadius: 2,
  },
  audioDuration: {
    color: '#555',
    fontSize: 10,
    letterSpacing: 1,
  },

  // Input area
  inputArea: {
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#1a1a1a',
    backgroundColor: '#000',
  },

  // Mode toggle
  modeRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 12,
    gap: 8,
  },
  modeBtn: {
    paddingHorizontal: 20,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#222',
  },
  modeBtnActive: {
    borderColor: '#ff0a0a',
    backgroundColor: '#1a0000',
  },
  modeBtnText: {
    color: '#444',
    fontSize: 10,
    letterSpacing: 3,
    fontWeight: '700',
  },
  modeBtnTextActive: {
    color: '#ff0a0a',
  },

  // PTT Button
  pttContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 140,
    position: 'relative',
  },
  pttRing: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: '#ff0a0a',
  },
  pttGlow: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
  },
  pttButton: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#111',
    borderWidth: 3,
    borderColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pttButtonActive: {
    backgroundColor: '#2a0000',
    borderColor: '#ff0a0a',
  },
  pttIcon: {
    color: '#ff0a0a',
    fontSize: 24,
    fontWeight: '900',
    marginBottom: 4,
  },
  pttLabel: {
    color: '#888',
    fontSize: 8,
    letterSpacing: 2,
    fontWeight: '700',
  },
  pttTimer: {
    color: '#ff0a0a',
    fontSize: 12,
    fontWeight: '900',
    marginTop: 4,
    letterSpacing: 2,
  },

  // Text Input
  textInputRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  textInput: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    borderWidth: 1,
    borderColor: '#222',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#ccc',
    fontSize: 14,
    letterSpacing: 0.5,
  },
  sendBtn: {
    backgroundColor: '#ff0a0a',
    width: 52,
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: '#1a0000',
  },
  sendBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 2,
  },
});
