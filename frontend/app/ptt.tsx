import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Animated,
  Easing,
  ActivityIndicator,
  Vibration,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Audio } from 'expo-av';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import { useAuth } from '../src/AuthContext';
import * as FileSystem from 'expo-file-system';
import * as Haptics from 'expo-haptics';

const API_URL =
  Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL ||
  process.env.EXPO_PUBLIC_BACKEND_URL ||
  '';

interface PTTChannel {
  id: string;
  name: string;
  active_users: number;
}

interface PTTMessage {
  id: string;
  sender_name: string;
  sender_id: string;
  duration: number;
  created_at: string;
  audio_base64: string;
}

// ═══ NEXTEL CHIRP GENERATOR ═══
// Recreates the iconic Nextel Direct Connect chirp using Web Audio API tones
const playChirp = async (type: 'connect' | 'disconnect') => {
  try {
    if (Platform.OS !== 'web') {
      // Use haptic feedback as chirp substitute on native
      await Haptics.notificationAsync(
        type === 'connect'
          ? Haptics.NotificationFeedbackType.Success
          : Haptics.NotificationFeedbackType.Warning
      );
    }
  } catch (e) {}
};

export default function PTTScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();

  // State
  const [channels, setChannels] = useState<PTTChannel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<string>('godmode-main');
  const [isRecording, setIsRecording] = useState(false);
  const [isTransmitting, setIsTransmitting] = useState(false);
  const [messages, setMessages] = useState<PTTMessage[]>([]);
  const [activeUsers, setActiveUsers] = useState(0);
  const [isPlayingId, setIsPlayingId] = useState<string | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [hasPermission, setHasPermission] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const [whoIsTalking, setWhoIsTalking] = useState<string | null>(null);

  // Refs
  const recordingRef = useRef<Audio.Recording | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<ScrollView | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Animations
  const pulseRing1 = useRef(new Animated.Value(0)).current;
  const pulseRing2 = useRef(new Animated.Value(0)).current;
  const pulseRing3 = useRef(new Animated.Value(0)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;
  const signalAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    requestPermissions();
    fetchChannels();
    return () => {
      cleanupWS();
      cleanupAudio();
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  useEffect(() => {
    if (selectedChannel) {
      connectToChannel(selectedChannel);
      fetchMessages(selectedChannel);
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = setInterval(() => {
        fetchMessages(selectedChannel);
      }, 4000);
    }
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [selectedChannel]);

  const requestPermissions = async () => {
    try {
      if (Platform.OS !== 'web') {
        const { status } = await Audio.requestPermissionsAsync();
        setHasPermission(status === 'granted');
      } else {
        setHasPermission(true);
      }
    } catch (e) {
      console.log('Permission error:', e);
    }
  };

  const fetchChannels = async () => {
    try {
      const res = await fetch(`${API_URL}/api/ptt/channels`);
      if (res.ok) {
        const data = await res.json();
        setChannels(data.channels || []);
      }
    } catch (e) {}
  };

  const fetchMessages = async (channelId: string) => {
    try {
      const res = await fetch(`${API_URL}/api/ptt/messages/${channelId}?limit=25`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      }
    } catch (e) {}
  };

  const connectToChannel = (channelId: string) => {
    cleanupWS();
    try {
      const wsUrl = API_URL.replace('https://', 'wss://').replace('http://', 'ws://');
      const ws = new WebSocket(`${wsUrl}/api/ptt/live/${channelId}`);

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'user_count') {
            setActiveUsers(data.count);
          } else if (data.type === 'new_message') {
            setMessages((prev) => [...prev, {
              id: data.message_id,
              sender_name: data.sender_name,
              sender_id: data.sender_id,
              duration: data.duration,
              created_at: data.created_at,
              audio_base64: data.audio_base64,
            }]);
            // Nextel: auto-play incoming like a walkie-talkie
            setWhoIsTalking(data.sender_name);
            playChirp('connect');
            playAudioFromBase64(data.audio_base64, data.message_id);
          }
        } catch (e) {}
      };

      ws.onerror = () => {};
      ws.onclose = () => {};
      wsRef.current = ws;
    } catch (e) {}
  };

  const cleanupWS = () => {
    if (wsRef.current) {
      try { wsRef.current.close(); } catch (e) {}
      wsRef.current = null;
    }
  };

  const cleanupAudio = async () => {
    if (recordingRef.current) {
      try { await recordingRef.current.stopAndUnloadAsync(); } catch (e) {}
      recordingRef.current = null;
    }
    if (soundRef.current) {
      try { await soundRef.current.stopAsync(); await soundRef.current.unloadAsync(); } catch (e) {}
      soundRef.current = null;
    }
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
  };

  // ═══ NEXTEL-STYLE RECORDING ═══
  const startRecording = async () => {
    if (!hasPermission) {
      await requestPermissions();
      return;
    }
    try {
      await cleanupAudio();

      // Nextel chirp on connect
      await playChirp('connect');

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      recordingRef.current = recording;
      setIsRecording(true);
      setRecordingDuration(0);

      durationIntervalRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 0.1);
      }, 100);

      // Animate
      startTransmitAnimation();

      // Button press feedback
      Animated.spring(buttonScale, {
        toValue: 0.92,
        useNativeDriver: true,
      }).start();
    } catch (e) {
      console.log('Start recording error:', e);
      setIsRecording(false);
    }
  };

  const stopRecording = async () => {
    if (!recordingRef.current) return;
    setIsRecording(false);
    stopTransmitAnimation();

    Animated.spring(buttonScale, {
      toValue: 1,
      useNativeDriver: true,
    }).start();

    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }

    try {
      await recordingRef.current.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;

      // Nextel chirp on disconnect
      await playChirp('disconnect');

      if (uri && recordingDuration > 0.3) {
        await transmitAudio(uri);
      }
    } catch (e) {
      console.log('Stop recording error:', e);
      recordingRef.current = null;
    }
  };

  const transmitAudio = async (uri: string) => {
    setIsTransmitting(true);
    try {
      let audioBase64 = '';
      if (Platform.OS === 'web') {
        const response = await fetch(uri);
        const blob = await response.blob();
        audioBase64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const result = reader.result as string;
            resolve(result.split(',')[1] || '');
          };
          reader.readAsDataURL(blob);
        });
      } else {
        audioBase64 = await FileSystem.readAsStringAsync(uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
      }

      const senderName = user?.display_name || user?.username || 'ANONYMOUS';
      const senderId = user?.id || `anon-${Date.now()}`;

      const res = await fetch(`${API_URL}/api/ptt/transmit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel_id: selectedChannel,
          sender_name: senderName.toUpperCase(),
          sender_id: senderId,
          audio_base64: audioBase64,
          duration: Math.round(recordingDuration * 10) / 10,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => [...prev, {
          id: data.message_id,
          sender_name: senderName.toUpperCase(),
          sender_id: senderId,
          duration: Math.round(recordingDuration * 10) / 10,
          created_at: new Date().toISOString(),
          audio_base64: audioBase64,
        }]);
      }
    } catch (e) {
      console.log('Transmit error:', e);
    }
    setIsTransmitting(false);
    setRecordingDuration(0);
  };

  // ═══ PLAYBACK ═══
  const playAudioFromBase64 = async (base64: string, messageId: string) => {
    if (!base64) return;
    try {
      if (soundRef.current) {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }
      setIsPlayingId(messageId);

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
      });

      const uri = `data:audio/m4a;base64,${base64}`;
      const { sound } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: true, volume: 1.0 }
      );
      soundRef.current = sound;

      sound.setOnPlaybackStatusUpdate((status: any) => {
        if (status.isLoaded && status.didJustFinish) {
          setIsPlayingId(null);
          setWhoIsTalking(null);
          sound.unloadAsync();
          soundRef.current = null;
        }
      });
    } catch (e) {
      setIsPlayingId(null);
      setWhoIsTalking(null);
    }
  };

  // ═══ ANIMATIONS ═══
  const startTransmitAnimation = () => {
    // Concentric pulse rings like radio waves
    const createPulse = (anim: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, { toValue: 1, duration: 1200, easing: Easing.out(Easing.ease), useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0, duration: 0, useNativeDriver: true }),
        ])
      );

    createPulse(pulseRing1, 0).start();
    createPulse(pulseRing2, 400).start();
    createPulse(pulseRing3, 800).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(signalAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(signalAnim, { toValue: 0.4, duration: 300, useNativeDriver: true }),
      ])
    ).start();
  };

  const stopTransmitAnimation = () => {
    [pulseRing1, pulseRing2, pulseRing3, signalAnim].forEach(a => {
      a.stopAnimation();
      a.setValue(0);
    });
  };

  const formatTime = (s: number) => `${Math.floor(s)}.${Math.floor((s % 1) * 10)}`;

  const formatTimestamp = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch { return ''; }
  };

  const channelName = channels.find(c => c.id === selectedChannel)?.name || 'GODMODE';
  const senderName = user?.display_name || user?.username || 'ANONYMOUS';

  const renderPulseRing = (anim: Animated.Value, size: number) => (
    <Animated.View
      style={[
        styles.pulseRing,
        {
          width: size, height: size, borderRadius: size / 2,
          opacity: anim.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0] }),
          transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.8] }) }],
        },
      ]}
    />
  );

  return (
    <View style={styles.container}>
      <View style={[styles.safeArea, { paddingTop: insets.top }]}>
        {/* ═══ NEXTEL HEADER ═══ */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backIcon}>◁</Text>
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>DIRECT CONNECT</Text>
            <View style={styles.headerStatus}>
              <View style={[styles.statusLED, { backgroundColor: activeUsers > 0 ? '#ff0a0a' : '#3a1010' }]} />
              <Text style={styles.headerChannel}>{channelName}</Text>
              <Text style={styles.headerOnline}>{activeUsers} ACTIVE</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.setupBtn} onPress={() => setShowSetup(!showSetup)}>
            <Text style={styles.setupIcon}>⚙</Text>
          </TouchableOpacity>
        </View>

        {/* ACTION BUTTON SETUP */}
        {showSetup && (
          <View style={styles.setupPanel}>
            <Text style={styles.setupTitle}>◈ iOS ACTION BUTTON</Text>
            <Text style={styles.setupStep}>Settings → Action Button → Shortcut</Text>
            <Text style={styles.setupStep}>Create Shortcut → Open URL</Text>
            <Text style={styles.setupURL}>godmodesound://ptt</Text>
            <Text style={styles.setupNote}>iPhone 15 Pro+ • Instant PTT launch</Text>
            <TouchableOpacity style={styles.setupClose} onPress={() => setShowSetup(false)}>
              <Text style={styles.setupCloseText}>✕</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ═══ CHANNEL BAR ═══ */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.channelBar} contentContainerStyle={styles.channelBarContent}>
          {channels.map(ch => (
            <TouchableOpacity
              key={ch.id}
              style={[styles.chBtn, selectedChannel === ch.id && styles.chBtnActive]}
              onPress={() => { setSelectedChannel(ch.id); playChirp('connect'); }}
            >
              <Text style={[styles.chBtnText, selectedChannel === ch.id && styles.chBtnTextActive]}>
                {ch.name}
              </Text>
              {ch.active_users > 0 && (
                <View style={styles.chBadge}>
                  <Text style={styles.chBadgeText}>{ch.active_users}</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* ═══ TRANSMISSION FEED ═══ */}
        <ScrollView
          ref={messagesEndRef}
          style={styles.feed}
          contentContainerStyle={styles.feedContent}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => messagesEndRef.current?.scrollToEnd?.({ animated: true })}
        >
          {messages.length === 0 ? (
            <View style={styles.emptyFeed}>
              <Text style={styles.emptyGlyph}>◎</Text>
              <Text style={styles.emptyTitle}>CHANNEL CLEAR</Text>
              <Text style={styles.emptyText}>Hold the button to transmit</Text>
            </View>
          ) : (
            messages.map(msg => {
              const isMine = msg.sender_id === (user?.id || '');
              const isPlaying = isPlayingId === msg.id;
              return (
                <TouchableOpacity
                  key={msg.id}
                  style={[styles.msgCard, isMine && styles.msgCardMine, isPlaying && styles.msgCardPlaying]}
                  onPress={() => { playChirp('connect'); playAudioFromBase64(msg.audio_base64, msg.id); }}
                  activeOpacity={0.7}
                >
                  <View style={styles.msgTop}>
                    <View style={[styles.msgDot, { backgroundColor: isPlaying ? '#ff0a0a' : isMine ? '#ff3040' : '#3a1010' }]} />
                    <Text style={[styles.msgName, isMine && styles.msgNameMine]}>{msg.sender_name}</Text>
                    <Text style={styles.msgTime}>{formatTimestamp(msg.created_at)}</Text>
                  </View>
                  <View style={styles.msgWave}>
                    <Text style={[styles.msgPlay, isPlaying && styles.msgPlayActive]}>
                      {isPlaying ? '◼' : '▶'}
                    </Text>
                    <View style={styles.waveContainer}>
                      {[...Array(20)].map((_, i) => (
                        <View
                          key={i}
                          style={[
                            styles.waveBar,
                            {
                              height: 3 + Math.sin(i * 0.7) * 8 + Math.random() * 4,
                              backgroundColor: isPlaying ? '#ff0a0a' : isMine ? '#ff304060' : '#3a101060',
                            },
                          ]}
                        />
                      ))}
                    </View>
                    <Text style={styles.msgDur}>{msg.duration ? `${msg.duration}s` : ''}</Text>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>

        {/* ═══ WHO'S TALKING INDICATOR ═══ */}
        {whoIsTalking && (
          <View style={styles.talkingBar}>
            <Animated.View style={[styles.talkingDot, { opacity: signalAnim }]} />
            <Text style={styles.talkingText}>{whoIsTalking} IS TALKING</Text>
          </View>
        )}

        {/* ═══ NEXTEL PTT BUTTON ═══ */}
        <View style={[styles.pttZone, { paddingBottom: Math.max(insets.bottom + 80, 90) }]}>
          {/* Recording Status */}
          {isRecording && (
            <View style={styles.recBar}>
              <View style={styles.recLED} />
              <Text style={styles.recText}>TX {formatTime(recordingDuration)}s</Text>
            </View>
          )}
          {isTransmitting && (
            <View style={styles.recBar}>
              <ActivityIndicator size="small" color="#ff0a0a" />
              <Text style={styles.recText}>SENDING...</Text>
            </View>
          )}

          {/* The Button */}
          <View style={styles.pttBtnContainer}>
            {/* Pulse rings */}
            {isRecording && (
              <>
                {renderPulseRing(pulseRing1, 160)}
                {renderPulseRing(pulseRing2, 160)}
                {renderPulseRing(pulseRing3, 160)}
              </>
            )}

            <Animated.View style={[styles.pttOuter, { transform: [{ scale: buttonScale }] }]}>
              <TouchableOpacity
                style={[styles.pttBtn, isRecording && styles.pttBtnActive]}
                onPressIn={startRecording}
                onPressOut={stopRecording}
                activeOpacity={1}
                disabled={isTransmitting}
              >
                <View style={[styles.pttInner, isRecording && styles.pttInnerActive]}>
                  {isRecording ? (
                    <>
                      <Animated.Text style={[styles.pttGlyph, { opacity: signalAnim }]}>
                        ◉
                      </Animated.Text>
                      <Text style={styles.pttLabelActive}>TRANSMITTING</Text>
                    </>
                  ) : (
                    <>
                      <Text style={styles.pttGlyph}>◎</Text>
                      <Text style={styles.pttLabel}>HOLD TO TALK</Text>
                    </>
                  )}
                </View>
              </TouchableOpacity>
            </Animated.View>
          </View>

          {/* Identity */}
          <Text style={styles.idLine}>
            {user ? `${senderName.toUpperCase()} • ${user.mirrors_id}` : 'ANONYMOUS • NO MIRRORS ID'}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  safeArea: { flex: 1 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1a0808',
  },
  backBtn: { padding: 8, marginRight: 4 },
  backIcon: { color: '#ff0a0a', fontSize: 16, fontWeight: '700' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { color: '#ff0a0a', fontSize: 14, fontWeight: '700', letterSpacing: 3 },
  headerStatus: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  statusLED: { width: 6, height: 6, borderRadius: 3 },
  headerChannel: { color: '#5a1a1a', fontSize: 9, fontWeight: '700', letterSpacing: 1 },
  headerOnline: { color: '#3a1010', fontSize: 8 },
  setupBtn: { padding: 8 },
  setupIcon: { color: '#5a1a1a', fontSize: 16 },

  // Setup Panel
  setupPanel: {
    margin: 10, padding: 12, borderWidth: 1, borderColor: '#ff0a0a40',
    backgroundColor: '#0a0505', borderRadius: 6, position: 'relative',
  },
  setupTitle: { color: '#ff0a0a', fontSize: 10, fontWeight: '700', letterSpacing: 2, marginBottom: 8, textAlign: 'center' },
  setupStep: { color: '#ff3040', fontSize: 10, lineHeight: 18, paddingLeft: 6 },
  setupURL: { color: '#ff0a0a', fontSize: 12, fontWeight: '700', textAlign: 'center', marginVertical: 6, letterSpacing: 1 },
  setupNote: { color: '#3a1010', fontSize: 8, textAlign: 'center' },
  setupClose: { position: 'absolute', top: 8, right: 10, padding: 4 },
  setupCloseText: { color: '#5a1a1a', fontSize: 14 },

  // Channel Bar
  channelBar: { maxHeight: 44, borderBottomWidth: 1, borderBottomColor: '#0a0505' },
  channelBarContent: { paddingHorizontal: 10, gap: 6, alignItems: 'center', paddingVertical: 6 },
  chBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: '#1a0808', borderRadius: 4,
  },
  chBtnActive: { borderColor: '#ff0a0a', backgroundColor: '#150505' },
  chBtnText: { color: '#3a1010', fontSize: 9, fontWeight: '700', letterSpacing: 1 },
  chBtnTextActive: { color: '#ff0a0a' },
  chBadge: { backgroundColor: '#ff0a0a', borderRadius: 7, paddingHorizontal: 4, paddingVertical: 1 },
  chBadgeText: { color: '#000', fontSize: 7, fontWeight: '700' },

  // Feed
  feed: { flex: 1, paddingHorizontal: 10 },
  feedContent: { paddingVertical: 8, gap: 6 },
  emptyFeed: { alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyGlyph: { color: '#1a0808', fontSize: 56, marginBottom: 10 },
  emptyTitle: { color: '#3a1010', fontSize: 12, fontWeight: '700', letterSpacing: 3 },
  emptyText: { color: '#2a0a0a', fontSize: 10, marginTop: 4 },

  // Message Card
  msgCard: {
    padding: 10, borderWidth: 1, borderColor: '#1a0808',
    backgroundColor: '#050202', borderRadius: 6,
  },
  msgCardMine: { backgroundColor: '#0a0404', borderColor: '#2a0a0a' },
  msgCardPlaying: { borderColor: '#ff0a0a60', backgroundColor: '#100505' },
  msgTop: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  msgDot: { width: 6, height: 6, borderRadius: 3 },
  msgName: { color: '#5a1a1a', fontSize: 9, fontWeight: '700', letterSpacing: 1, flex: 1 },
  msgNameMine: { color: '#ff3040' },
  msgTime: { color: '#2a0a0a', fontSize: 8 },
  msgWave: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  msgPlay: { color: '#3a1010', fontSize: 10, width: 16 },
  msgPlayActive: { color: '#ff0a0a' },
  waveContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 1.5, height: 20 },
  waveBar: { width: 2.5, borderRadius: 1 },
  msgDur: { color: '#3a1010', fontSize: 8, width: 26, textAlign: 'right' },

  // Talking Indicator
  talkingBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 6, backgroundColor: '#150505',
    borderTopWidth: 1, borderTopColor: '#ff0a0a40',
  },
  talkingDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#ff0a0a' },
  talkingText: { color: '#ff0a0a', fontSize: 10, fontWeight: '700', letterSpacing: 2 },

  // PTT Zone
  pttZone: {
    alignItems: 'center', paddingTop: 10,
    borderTopWidth: 1, borderTopColor: '#1a0808', backgroundColor: '#020101',
  },
  recBar: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  recLED: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#ff0a0a' },
  recText: { color: '#ff0a0a', fontSize: 11, fontWeight: '700', letterSpacing: 2 },

  // PTT Button
  pttBtnContainer: {
    width: 160, height: 160, justifyContent: 'center', alignItems: 'center',
    position: 'relative',
  },
  pulseRing: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: '#ff0a0a',
  },
  pttOuter: {
    width: 130, height: 130, borderRadius: 65,
    borderWidth: 3, borderColor: '#2a0a0a',
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#060303',
  },
  pttBtn: {
    width: 118, height: 118, borderRadius: 59,
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#0a0505',
    borderWidth: 2, borderColor: '#1a0808',
  },
  pttBtnActive: {
    backgroundColor: '#1a0808',
    borderColor: '#ff0a0a',
  },
  pttInner: {
    alignItems: 'center', justifyContent: 'center',
  },
  pttInnerActive: {},
  pttGlyph: { color: '#ff0a0a', fontSize: 38 },
  pttLabel: { color: '#5a1a1a', fontSize: 8, fontWeight: '700', letterSpacing: 1, marginTop: 2 },
  pttLabelActive: { color: '#ff0a0a', fontSize: 7, fontWeight: '700', letterSpacing: 2, marginTop: 2 },

  // Identity
  idLine: { color: '#2a0a0a', fontSize: 8, letterSpacing: 1, marginTop: 6 },
});
