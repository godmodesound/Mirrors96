import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform,
  Animated, Easing, ActivityIndicator, StatusBar, Dimensions, Switch, Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Audio } from 'expo-av';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import { useAuth } from '../src/AuthContext';
import * as FileSystem from 'expo-file-system';
import * as Haptics from 'expo-haptics';
import MirrorsIdBanner from '../src/MirrorsIdBanner';
import {
  getSendChirp, getReceiveChirp, getConnectChirp,
  getErrorChirp, getRogerBeep,
} from '../src/ChirpAudio';

const API =
  Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL ||
  process.env.EXPO_PUBLIC_BACKEND_URL || '';
const SW = Dimensions.get('window').width;

// ═══ TYPES ═══
type ScreenView = 'home' | 'ptt' | 'settings';
type ActiveChannel = 'code' | 'mirrors' | null;
type ConnState = 'offline' | 'connecting' | 'ready' | 'transmitting' | 'receiving';

interface VoiceMessage {
  id: string;
  sender_name: string;
  sender_id: string;
  duration: number;
  created_at: string;
  audio_base64: string;
  status?: string;
}

// ═══ CHIRP PLAYER ═══
const playChirpSound = async (type: 'send' | 'receive' | 'connect' | 'error' | 'roger') => {
  try {
    const uriMap = {
      send: getSendChirp(),
      receive: getReceiveChirp(),
      connect: getConnectChirp(),
      error: getErrorChirp(),
      roger: getRogerBeep(),
    };
    const { sound } = await Audio.Sound.createAsync(
      { uri: uriMap[type] },
      { shouldPlay: true, volume: 0.85 }
    );
    sound.setOnPlaybackStatusUpdate((s: any) => {
      if (s.isLoaded && s.didJustFinish) sound.unloadAsync();
    });
    if (Platform.OS !== 'web') {
      if (type === 'send') await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      else if (type === 'receive') await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      else if (type === 'connect') await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  } catch (e) { /* silent */ }
};

export default function ChirpConnectScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, token } = useAuth();

  // ═══ STATE ═══
  const [view, setView] = useState<ScreenView>('home');
  const [activeChannel, setActiveChannel] = useState<ActiveChannel>(null);
  const [connState, setConnState] = useState<ConnState>('offline');

  // PTT State
  const [isRecording, setIsRecording] = useState(false);
  const [isTransmitting, setIsTransmitting] = useState(false);
  const [messages, setMessages] = useState<VoiceMessage[]>([]);
  const [activeUsers, setActiveUsers] = useState(0);
  const [isPlayingId, setIsPlayingId] = useState<string | null>(null);
  const [recDuration, setRecDuration] = useState(0);
  const [hasPermission, setHasPermission] = useState(false);
  const [whoIsTalking, setWhoIsTalking] = useState<string | null>(null);
  const [pttLocked, setPttLocked] = useState(false);

  // Settings State
  const [actionButtonEnabled, setActionButtonEnabled] = useState(false);
  const [halfDuplexActive, setHalfDuplexActive] = useState(true);

  // Refs
  const recordingRef = useRef<Audio.Recording | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const durRef = useRef<NodeJS.Timeout | null>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);
  const feedRef = useRef<ScrollView | null>(null);

  // Animations
  const pulseA = useRef(new Animated.Value(0)).current;
  const pulseB = useRef(new Animated.Value(0)).current;
  const pulseC = useRef(new Animated.Value(0)).current;
  const btnScale = useRef(new Animated.Value(1)).current;
  const waveAnim = useRef(new Animated.Value(0)).current;
  const glowPulse = useRef(new Animated.Value(0.4)).current;

  // ═══ ANIMATIONS ═══
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowPulse, { toValue: 1, duration: 1800, useNativeDriver: true }),
        Animated.timing(glowPulse, { toValue: 0.4, duration: 1800, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  // ═══ LIFECYCLE ═══
  useEffect(() => {
    requestPermissions();
    return () => {
      cleanupWS();
      cleanupAudio();
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  // ═══ PERMISSIONS ═══
  const requestPermissions = async () => {
    try {
      if (Platform.OS !== 'web') {
        const { status } = await Audio.requestPermissionsAsync();
        setHasPermission(status === 'granted');
      } else setHasPermission(true);
    } catch (e) {}
  };

  // ═══ CHANNEL CONNECT ═══
  const openChannel = (channel: ActiveChannel) => {
    setActiveChannel(channel);
    setView('ptt');
    setMessages([]);
    playChirpSound('connect');
    // Auto-connect to channel
    const channelId = channel === 'code' ? 'code-direct' : 'mirrors-direct';
    connectToChannel(channelId);
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(() => fetchMessages(channelId), 4000);
  };

  const leaveChannel = () => {
    cleanupWS();
    cleanupAudio();
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    setActiveChannel(null);
    setView('home');
    setMessages([]);
    setConnState('offline');
    setWhoIsTalking(null);
  };

  // ═══ DATA ═══
  const fetchMessages = async (id: string) => {
    try {
      const res = await fetch(`${API}/api/codes/messages/${id}?limit=50`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      }
    } catch (e) {}
  };

  // ═══ WEBSOCKET ═══
  const connectToChannel = (id: string) => {
    cleanupWS();
    setConnState('connecting');
    try {
      const wsUrl = API.replace('https://', 'wss://').replace('http://', 'ws://');
      const sName = callsign();
      const sId = user?.id || `anon-${Date.now()}`;
      const ws = new WebSocket(`${wsUrl}/api/codes/live/${id}?user_id=${sId}&user_name=${encodeURIComponent(sName)}`);

      ws.onopen = () => {
        setConnState('ready');
        playChirpSound('connect');
      };

      ws.onmessage = (evt) => {
        try {
          const d = JSON.parse(evt.data);
          if (d.type === 'presence') setActiveUsers(d.online_count || 0);
          else if (d.type === 'user_count') setActiveUsers(d.count);
          else if (d.type === 'new_message') {
            setMessages(prev => [...prev, {
              id: d.message_id, sender_name: d.sender_name, sender_id: d.sender_id,
              duration: d.duration, created_at: d.created_at, audio_base64: d.audio_base64,
              status: 'delivered',
            }]);
            setWhoIsTalking(d.sender_name);
            setConnState('receiving');
            playChirpSound('receive');
            playAudioBase64(d.audio_base64, d.message_id);
          } else if (d.type === 'user_transmitting') {
            setWhoIsTalking(d.sender_name);
            setConnState('receiving');
          } else if (d.type === 'user_stopped') {
            setWhoIsTalking(null);
            setConnState('ready');
          }
        } catch (e) {}
      };

      ws.onerror = () => { setConnState('offline'); playChirpSound('error'); };
      ws.onclose = () => { setConnState('offline'); };
      wsRef.current = ws;
    } catch (e) { setConnState('offline'); }
  };

  const cleanupWS = () => { if (wsRef.current) { try { wsRef.current.close(); } catch (e) {} wsRef.current = null; } };
  const cleanupAudio = async () => {
    if (recordingRef.current) { try { await recordingRef.current.stopAndUnloadAsync(); } catch (e) {} recordingRef.current = null; }
    if (soundRef.current) { try { await soundRef.current.stopAsync(); await soundRef.current.unloadAsync(); } catch (e) {} soundRef.current = null; }
    if (durRef.current) { clearInterval(durRef.current); durRef.current = null; }
  };

  // ═══ RECORDING ═══
  const startRecording = async () => {
    if (!hasPermission) { await requestPermissions(); return; }
    try {
      await cleanupAudio();
      await playChirpSound('send');

      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'transmitting', sender_name: callsign(), sender_id: user?.id || '',
        }));
      }

      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      recordingRef.current = recording;
      setIsRecording(true);
      setConnState('transmitting');
      setRecDuration(0);
      durRef.current = setInterval(() => setRecDuration(p => p + 0.1), 100);
      startTXAnim();
      Animated.spring(btnScale, { toValue: 0.92, useNativeDriver: true }).start();
    } catch (e) { setIsRecording(false); setConnState('ready'); }
  };

  const stopRecording = async () => {
    if (!recordingRef.current) return;
    setIsRecording(false);
    setConnState('ready');
    stopTXAnim();
    Animated.spring(btnScale, { toValue: 1, useNativeDriver: true }).start();
    if (durRef.current) { clearInterval(durRef.current); durRef.current = null; }
    if (wsRef.current?.readyState === WebSocket.OPEN) wsRef.current.send(JSON.stringify({ type: 'stopped' }));

    try {
      await recordingRef.current.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;
      await playChirpSound('roger');
      if (uri && recDuration > 0.3) await transmitAudio(uri);
    } catch (e) { recordingRef.current = null; }
  };

  const transmitAudio = async (uri: string) => {
    if (!activeChannel) return;
    setIsTransmitting(true);
    const channelId = activeChannel === 'code' ? 'code-direct' : 'mirrors-direct';
    try {
      let b64 = '';
      if (Platform.OS === 'web') {
        const r = await fetch(uri);
        const blob = await r.blob();
        b64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve((reader.result as string).split(',')[1] || '');
          reader.readAsDataURL(blob);
        });
      } else {
        b64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
      }

      const res = await fetch(`${API}/api/codes/transmit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel_id: channelId, sender_name: callsign(),
          sender_id: user?.id || `anon-${Date.now()}`,
          audio_base64: b64, duration: Math.round(recDuration * 10) / 10,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setMessages(prev => [...prev, {
          id: data.message_id, sender_name: callsign(),
          sender_id: user?.id || '', duration: Math.round(recDuration * 10) / 10,
          created_at: new Date().toISOString(), audio_base64: b64, status: 'delivered',
        }]);
      }
    } catch (e) {}
    setIsTransmitting(false);
    setRecDuration(0);
  };

  // ═══ PLAYBACK ═══
  const playAudioBase64 = async (b64: string, msgId: string) => {
    if (!b64) return;
    try {
      if (soundRef.current) { await soundRef.current.stopAsync(); await soundRef.current.unloadAsync(); soundRef.current = null; }
      setIsPlayingId(msgId);
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false, playsInSilentModeIOS: true });
      const { sound } = await Audio.Sound.createAsync({ uri: `data:audio/m4a;base64,${b64}` }, { shouldPlay: true, volume: 1.0 });
      soundRef.current = sound;
      sound.setOnPlaybackStatusUpdate((s: any) => {
        if (s.isLoaded && s.didJustFinish) {
          setIsPlayingId(null); setWhoIsTalking(null); setConnState('ready');
          sound.unloadAsync(); soundRef.current = null;
        }
      });
    } catch (e) { setIsPlayingId(null); setWhoIsTalking(null); }
  };

  // ═══ ANIMATIONS ═══
  const startTXAnim = () => {
    const pulse = (a: Animated.Value, delay: number) =>
      Animated.loop(Animated.sequence([
        Animated.delay(delay),
        Animated.timing(a, { toValue: 1, duration: 1000, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.timing(a, { toValue: 0, duration: 0, useNativeDriver: true }),
      ]));
    pulse(pulseA, 0).start();
    pulse(pulseB, 333).start();
    pulse(pulseC, 666).start();
    Animated.loop(Animated.sequence([
      Animated.timing(waveAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.timing(waveAnim, { toValue: 0.3, duration: 250, useNativeDriver: true }),
    ])).start();
  };

  const stopTXAnim = () => {
    [pulseA, pulseB, pulseC, waveAnim].forEach(a => { a.stopAnimation(); a.setValue(0); });
  };

  // ═══ HELPERS ═══
  const callsign = () => (user?.display_name || user?.username || 'ANONYMOUS').toUpperCase();
  const fmtTime = (s: number) => `${Math.floor(s)}.${Math.floor((s % 1) * 10)}`;
  const fmtTs = (iso: string) => { try { return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); } catch { return ''; } };

  const stateColor = (): string => {
    switch (connState) {
      case 'ready': return '#00ff41';
      case 'connecting': return '#B8860B';
      case 'transmitting': return '#ff0a0a';
      case 'receiving': return '#00ccff';
      default: return '#999';
    }
  };

  const stateLabel = (): string => {
    switch (connState) {
      case 'ready': return 'READY';
      case 'connecting': return 'CONNECTING...';
      case 'transmitting': return 'TX';
      case 'receiving': return 'RX';
      default: return 'OFFLINE';
    }
  };

  const renderPulse = (a: Animated.Value, size: number) => (
    <Animated.View style={[st.pulseRing, {
      width: size, height: size, borderRadius: size / 2,
      opacity: a.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] }),
      transform: [{ scale: a.interpolate({ inputRange: [0, 1], outputRange: [1, 2] }) }],
    }]} />
  );

  // ═══════════════════════════════════════
  // HOME VIEW — 3 BUTTONS
  // ═══════════════════════════════════════
  const renderHome = () => (
    <View style={st.homeContainer}>
      {/* Header */}
      <View style={st.homeHeader}>
        <Text style={st.homeTitle}>CODES</Text>
        <Text style={st.homeTitleSub}>: I.D.</Text>
      </View>
      <Text style={st.homeSubtitle}>DIRECT CONNECT</Text>

      {/* Signal status */}
      <View style={st.signalRow}>
        <Animated.Text style={[st.signalBars, { opacity: glowPulse }]}>
          {'▮▮▮▮▮'}
        </Animated.Text>
        <Text style={st.signalLabel}>GODMODE NETWORK</Text>
      </View>

      {/* 3 Buttons */}
      <View style={st.btnGrid}>
        {/* CODE — Direct Connect Channel */}
        <TouchableOpacity
          style={st.dcButton}
          onPress={() => openChannel('code')}
          activeOpacity={0.7}
        >
          <View style={st.dcBtnInner}>
            <Text style={st.dcBtnIcon}>◎</Text>
            <Text style={st.dcBtnLabel}>CODE</Text>
            <Text style={st.dcBtnSub}>DIRECT CONNECT</Text>
          </View>
          <View style={st.dcBtnIndicator}>
            <Animated.View style={[st.dcBtnDot, { opacity: glowPulse }]} />
          </View>
        </TouchableOpacity>

        {/* MIRRORS — Mirrors Network Channel */}
        <TouchableOpacity
          style={st.dcButton}
          onPress={() => openChannel('mirrors')}
          activeOpacity={0.7}
        >
          <View style={st.dcBtnInner}>
            <Text style={st.dcBtnIcon}>⊞</Text>
            <Text style={st.dcBtnLabel}>MIRRORS</Text>
            <Text style={st.dcBtnSub}>FLEET NETWORK</Text>
          </View>
          <View style={st.dcBtnIndicator}>
            <Animated.View style={[st.dcBtnDot, { opacity: glowPulse }]} />
          </View>
        </TouchableOpacity>

        {/* CODES — Action Button Sync + Half Duplex Settings */}
        <TouchableOpacity
          style={[st.dcButton, st.dcButtonCodes]}
          onPress={() => { setView('settings'); playChirpSound('connect'); }}
          activeOpacity={0.7}
        >
          <View style={st.dcBtnInner}>
            <Text style={[st.dcBtnIcon, st.dcBtnIconCodes]}>⚡</Text>
            <Text style={[st.dcBtnLabel, st.dcBtnLabelCodes]}>CODES</Text>
            <Text style={[st.dcBtnSub, st.dcBtnSubCodes]}>ACTION BUTTON · HALF DUPLEX</Text>
          </View>
          <View style={st.dcBtnIndicator}>
            <View style={[st.dcBtnDotStatic, { backgroundColor: actionButtonEnabled ? '#00ff41' : '#999' }]} />
          </View>
        </TouchableOpacity>
      </View>

      {/* ID Line */}
      <Text style={st.idLine}>{callsign()}{user?.mirrors_id ? ` · ${user.mirrors_id}` : ''}</Text>
    </View>
  );

  // ═══════════════════════════════════════
  // PTT VIEW — HALF DUPLEX DIRECT CONNECT
  // ═══════════════════════════════════════
  const renderPTT = () => {
    const channelName = activeChannel === 'code' ? 'CODE' : 'MIRRORS';
    const isMine = (id: string) => id === (user?.id || '');

    return (
      <View style={st.pttContainer}>
        {/* Channel Header */}
        <View style={st.pttHeader}>
          <TouchableOpacity onPress={leaveChannel} style={st.pttBack}>
            <Text style={st.pttBackIcon}>◁</Text>
          </TouchableOpacity>
          <View style={st.pttHeaderCenter}>
            <Text style={st.pttChannelName}>{channelName}</Text>
            <View style={st.pttStatusRow}>
              <View style={[st.pttStatusDot, { backgroundColor: stateColor() }]} />
              <Text style={[st.pttStatusText, { color: stateColor() }]}>{stateLabel()}</Text>
              <Text style={st.pttUsersText}> · {activeUsers} ON</Text>
            </View>
          </View>
          <View style={{ width: 40 }} />
        </View>

        {/* Message Feed */}
        <ScrollView
          ref={feedRef} style={st.feed}
          contentContainerStyle={st.feedInner}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => feedRef.current?.scrollToEnd?.({ animated: true })}
        >
          {messages.length === 0 ? (
            <View style={st.feedEmpty}>
              <Text style={st.feedEmptyIcon}>◎</Text>
              <Text style={st.feedEmptyTitle}>CHANNEL CLEAR</Text>
              <Text style={st.feedEmptyDesc}>Hold transmit to chirp</Text>
            </View>
          ) : messages.map(msg => {
            const mine = isMine(msg.sender_id);
            const playing = isPlayingId === msg.id;
            return (
              <TouchableOpacity
                key={msg.id}
                style={[st.msgCard, mine && st.msgMine, playing && st.msgPlaying]}
                onPress={() => { playChirpSound('receive'); playAudioBase64(msg.audio_base64, msg.id); }}
                activeOpacity={0.7}
              >
                <View style={st.msgTop}>
                  <View style={[st.msgLED, { backgroundColor: playing ? '#ff0a0a' : mine ? '#00ff41' : '#999' }]} />
                  <Text style={[st.msgSender, mine && st.msgSenderMine]}>{msg.sender_name}</Text>
                  <Text style={st.msgTs}>{fmtTs(msg.created_at)}</Text>
                  {msg.status === 'delivered' && <Text style={st.msgCheck}>✓</Text>}
                </View>
                <View style={st.msgWave}>
                  <Text style={[st.msgPlayIcon, playing && { color: '#ff0a0a' }]}>{playing ? '◼' : '▶'}</Text>
                  <View style={st.waveBarContainer}>
                    {[...Array(28)].map((_, i) => (
                      <View key={i} style={[st.waveBar, {
                        height: 3 + Math.sin(i * 0.55 + (msg.id.charCodeAt(0) || 0)) * 12 + Math.random() * 2,
                        backgroundColor: playing ? '#00ff41' : mine ? '#00ff4140' : '#33333360',
                      }]} />
                    ))}
                  </View>
                  <Text style={st.msgDur}>{msg.duration ? `${msg.duration}s` : ''}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Who Is Talking */}
        {whoIsTalking && (
          <View style={st.talkBar}>
            <Animated.View style={[st.talkDot, { opacity: waveAnim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) }]} />
            <Text style={st.talkText}>{whoIsTalking} · TRANSMITTING</Text>
          </View>
        )}

        {/* ═══ PTT ZONE ═══ */}
        <View style={[st.pttZone, { paddingBottom: Math.max(insets.bottom + 24, 40) }]}>
          {isRecording && (
            <View style={st.txBar}>
              <View style={st.txLED} />
              <Text style={st.txText}>TX {fmtTime(recDuration)}s</Text>
              <View style={st.txWaveform}>
                {[...Array(20)].map((_, i) => (
                  <View key={i} style={[st.txWaveBar, {
                    height: 4 + Math.sin(i * 0.7) * 14 + Math.random() * 6,
                  }]} />
                ))}
              </View>
            </View>
          )}
          {isTransmitting && (
            <View style={st.txBar}>
              <ActivityIndicator size="small" color="#B8860B" />
              <Text style={st.txText}>SENDING BURST...</Text>
            </View>
          )}

          {/* Lock Mode Toggle */}
          <TouchableOpacity
            style={[st.lockToggle, pttLocked && st.lockToggleActive]}
            onPress={() => {
              if (pttLocked && isRecording) { stopRecording(); }
              setPttLocked(!pttLocked);
            }}
          >
            <Text style={[st.lockIcon, pttLocked && st.lockIconActive]}>{pttLocked ? '◉' : '○'}</Text>
            <Text style={[st.lockLabel, pttLocked && st.lockLabelActive]}>
              {pttLocked ? 'LOCK ON' : 'HOLD MODE'}
            </Text>
          </TouchableOpacity>

          {/* THE BIG PTT BUTTON */}
          <View style={st.pttBtnWrap}>
            {isRecording && (
              <>
                {renderPulse(pulseA, 200)}
                {renderPulse(pulseB, 200)}
                {renderPulse(pulseC, 200)}
              </>
            )}
            <Animated.View style={[st.pttOuter, { transform: [{ scale: btnScale }] }]}>
              <TouchableOpacity
                style={[st.pttBtn, isRecording && st.pttBtnTX]}
                onPressIn={() => {
                  if (pttLocked) {
                    if (isRecording) stopRecording(); else startRecording();
                  } else {
                    startRecording();
                  }
                }}
                onPressOut={() => { if (!pttLocked) stopRecording(); }}
                activeOpacity={1}
                disabled={isTransmitting}
              >
                <View style={st.pttInner}>
                  {isRecording ? (
                    <>
                      <Animated.View style={[st.pttGlowRing, {
                        opacity: waveAnim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.8] }),
                      }]} />
                      <Text style={st.pttGlyphTX}>◉</Text>
                      <Text style={st.pttLabelTX}>{pttLocked ? 'TAP TO END' : 'TRANSMITTING'}</Text>
                    </>
                  ) : (
                    <>
                      <Text style={st.pttGlyph}>◎</Text>
                      <Text style={st.pttLabelReady}>{pttLocked ? 'TAP TO TALK' : 'HOLD TO TALK'}</Text>
                    </>
                  )}
                </View>
              </TouchableOpacity>
            </Animated.View>
          </View>

          <Text style={st.idLinePTT}>{callsign()}{user?.mirrors_id ? ` · ${user.mirrors_id}` : ''}</Text>
        </View>
      </View>
    );
  };

  // ═══════════════════════════════════════
  // SETTINGS VIEW — ACTION BUTTON + HALF DUPLEX
  // ═══════════════════════════════════════
  const renderSettings = () => (
    <ScrollView style={st.settingsScroll} contentContainerStyle={{ paddingBottom: insets.bottom + 40 }} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={st.settingsHeader}>
        <TouchableOpacity onPress={() => setView('home')} style={st.pttBack}>
          <Text style={st.pttBackIcon}>◁</Text>
        </TouchableOpacity>
        <View style={st.pttHeaderCenter}>
          <Text style={[st.pttChannelName, { color: MIRROR_RED }]}>CODES</Text>
          <Text style={st.settingsSubtitle}>ACTION BUTTON · HALF DUPLEX CONFIG</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Action Button Card */}
      <View style={st.settingsCard}>
        <View style={st.settingsCardHeader}>
          <Text style={st.settingsCardIcon}>◎</Text>
          <Text style={st.settingsCardTitle}>ACTION BUTTON SYNC</Text>
        </View>
        <Text style={st.settingsCardDesc}>
          Configure your iPhone Action Button to instantly activate CODES Direct Connect from any screen.
        </Text>
        <View style={st.settingsToggleRow}>
          <Text style={st.settingsToggleLabel}>ACTION BUTTON ENABLED</Text>
          <Switch
            value={actionButtonEnabled}
            onValueChange={(val) => {
              setActionButtonEnabled(val);
              playChirpSound(val ? 'connect' : 'error');
            }}
            trackColor={{ false: '#E8E0D0', true: '#B8860B' }}
            thumbColor={actionButtonEnabled ? '#FFF' : '#CCC'}
          />
        </View>
        <View style={st.settingsSteps}>
          <Text style={st.settingsStep}>1 → Settings → Action Button</Text>
          <Text style={st.settingsStep}>2 → Choose "Shortcut"</Text>
          <Text style={st.settingsStep}>3 → Select "CODES:I.D. PTT"</Text>
        </View>
        <Text style={st.settingsHint}>iPhone 15 Pro and later · Press and hold to transmit</Text>
      </View>

      {/* Half Duplex Card */}
      <View style={st.settingsCard}>
        <View style={st.settingsCardHeader}>
          <Text style={st.settingsCardIcon}>⚡</Text>
          <Text style={st.settingsCardTitle}>HALF DUPLEX MODE</Text>
        </View>
        <Text style={st.settingsCardDesc}>
          Classic Nextel Direct Connect protocol. One transmission at a time. When you talk, the channel locks. When you release, the channel opens.
        </Text>
        <View style={st.settingsToggleRow}>
          <Text style={st.settingsToggleLabel}>HALF DUPLEX ACTIVE</Text>
          <Switch
            value={halfDuplexActive}
            onValueChange={(val) => {
              setHalfDuplexActive(val);
              playChirpSound(val ? 'connect' : 'roger');
            }}
            trackColor={{ false: '#E8E0D0', true: '#B8860B' }}
            thumbColor={halfDuplexActive ? '#FFF' : '#CCC'}
          />
        </View>
        <View style={st.duplexVisual}>
          <View style={st.duplexRow}>
            <View style={[st.duplexBlock, halfDuplexActive && st.duplexBlockActive]}>
              <Text style={st.duplexBlockLabel}>TX</Text>
            </View>
            <Text style={st.duplexArrow}>{halfDuplexActive ? '→' : '⇄'}</Text>
            <View style={[st.duplexBlock, !halfDuplexActive && st.duplexBlockActive]}>
              <Text style={st.duplexBlockLabel}>RX</Text>
            </View>
          </View>
          <Text style={st.duplexDesc}>
            {halfDuplexActive
              ? 'HALF DUPLEX — Channel locks during transmission'
              : 'FULL DUPLEX — Simultaneous send and receive'}
          </Text>
        </View>
      </View>

      {/* Network Info */}
      <View style={st.settingsCard}>
        <View style={st.settingsCardHeader}>
          <Text style={st.settingsCardIcon}>⊞</Text>
          <Text style={st.settingsCardTitle}>NETWORK</Text>
        </View>
        <View style={st.netRow}>
          <Text style={st.netLabel}>PROTOCOL</Text>
          <Text style={st.netValue}>iDEN DIRECT CONNECT</Text>
        </View>
        <View style={st.netRow}>
          <Text style={st.netLabel}>NETWORK</Text>
          <Text style={st.netValue}>GODMODE SOUND</Text>
        </View>
        <View style={st.netRow}>
          <Text style={st.netLabel}>CALLSIGN</Text>
          <Text style={st.netValue}>{callsign()}</Text>
        </View>
        <View style={[st.netRow, { borderBottomWidth: 0 }]}>
          <Text style={st.netLabel}>MODE</Text>
          <Text style={st.netValue}>{halfDuplexActive ? 'HALF DUPLEX' : 'FULL DUPLEX'}</Text>
        </View>
      </View>
    </ScrollView>
  );

  // ═══════════════════════════════════════
  // MAIN RENDER
  // ═══════════════════════════════════════
  return (
    <View style={st.container}>
      <StatusBar barStyle="dark-content" />
      <View style={[st.safeArea, { paddingTop: insets.top }]}>
        <MirrorsIdBanner />

        {/* Top Bar — shown on home + settings */}
        {view !== 'ptt' && (
          <View style={st.topBar}>
            <TouchableOpacity onPress={() => view === 'home' ? router.back() : setView('home')} style={st.topBack}>
              <Text style={st.topBackIcon}>◁</Text>
            </TouchableOpacity>
            <View style={st.topCenter}>
              <Text style={st.topTitle}>CODES:I.D.</Text>
              <Text style={st.topSub}>DIRECT CONNECT · GODMODE NETWORK</Text>
            </View>
            <View style={{ width: 36 }} />
          </View>
        )}

        {view === 'home' && renderHome()}
        {view === 'ptt' && renderPTT()}
        {view === 'settings' && renderSettings()}
      </View>
    </View>
  );
}

// ═══════════════════════════════════════════════
// STYLES — NEXTEL WHITE / GOLD / MIRROR RED
// ═══════════════════════════════════════════════
const GOLD = '#B8860B';
const GOLD_LIGHT = '#DAA520';
const GOLD_DIM = '#C4A265';
const GOLD_FAINT = '#E8D5A8';
const MIRROR_RED = '#ff0a0a';
const WHITE = '#FFFFFF';
const OFF_WHITE = '#F8F6F0';
const BORDER_LIGHT = '#E8E0D0';

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: WHITE },
  safeArea: { flex: 1, backgroundColor: WHITE },

  // ═══ TOP BAR ═══
  topBar: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14,
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: BORDER_LIGHT,
    backgroundColor: WHITE,
  },
  topBack: { padding: 6 },
  topBackIcon: { color: GOLD, fontSize: 18, fontWeight: '700', fontFamily: 'TerminatorRealNFI' },
  topCenter: { flex: 1, alignItems: 'center' },
  topTitle: { color: MIRROR_RED, fontSize: 18, fontWeight: '800', letterSpacing: 4, fontFamily: 'TerminatorRealNFI' },
  topSub: { color: GOLD_DIM, fontSize: 7, letterSpacing: 2, marginTop: 1, fontFamily: 'TerminatorRealNFI' },

  // ═══ HOME ═══
  homeContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  homeHeader: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 2 },
  homeTitle: { color: MIRROR_RED, fontSize: 48, fontWeight: '900', letterSpacing: 8, fontFamily: 'TerminatorRealNFI' },
  homeTitleSub: { color: MIRROR_RED, fontSize: 22, fontWeight: '700', letterSpacing: 4, fontFamily: 'TerminatorRealNFI' },
  homeSubtitle: { color: GOLD_DIM, fontSize: 10, letterSpacing: 4, marginBottom: 28, fontFamily: 'TerminatorRealNFI' },
  signalRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 36 },
  signalBars: { color: GOLD_LIGHT, fontSize: 10, letterSpacing: 2, fontFamily: 'TerminatorRealNFI' },
  signalLabel: { color: GOLD_FAINT, fontSize: 8, letterSpacing: 2, fontFamily: 'TerminatorRealNFI' },

  // ═══ BUTTON GRID ═══
  btnGrid: { width: '100%', gap: 12 },
  dcButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 20, paddingHorizontal: 20,
    borderWidth: 2, borderColor: BORDER_LIGHT, backgroundColor: OFF_WHITE, borderRadius: 6,
  },
  dcButtonCodes: { borderColor: MIRROR_RED, backgroundColor: '#FFF5F5' },
  dcBtnInner: { flex: 1 },
  dcBtnIcon: { color: GOLD, fontSize: 24, marginBottom: 6 },
  dcBtnIconCodes: { color: MIRROR_RED },
  dcBtnLabel: { color: GOLD, fontSize: 18, fontWeight: '800', letterSpacing: 4, fontFamily: 'TerminatorRealNFI' },
  dcBtnLabelCodes: { color: MIRROR_RED },
  dcBtnSub: { color: GOLD_DIM, fontSize: 8, letterSpacing: 2, marginTop: 3, fontFamily: 'TerminatorRealNFI' },
  dcBtnSubCodes: { color: '#CC3333' },
  dcBtnIndicator: { paddingLeft: 12 },
  dcBtnDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: GOLD_LIGHT },
  dcBtnDotStatic: { width: 10, height: 10, borderRadius: 5 },

  idLine: { color: GOLD_FAINT, fontSize: 8, letterSpacing: 2, marginTop: 28, fontFamily: 'TerminatorRealNFI' },

  // ═══ PTT VIEW ═══
  pttContainer: { flex: 1, backgroundColor: WHITE },
  pttHeader: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12,
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: BORDER_LIGHT,
    backgroundColor: WHITE,
  },
  pttBack: { padding: 6 },
  pttBackIcon: { color: GOLD, fontSize: 16, fontWeight: '700', fontFamily: 'TerminatorRealNFI' },
  pttHeaderCenter: { flex: 1, alignItems: 'center' },
  pttChannelName: { color: GOLD, fontSize: 16, fontWeight: '800', letterSpacing: 4, fontFamily: 'TerminatorRealNFI' },
  pttStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  pttStatusDot: { width: 6, height: 6, borderRadius: 3 },
  pttStatusText: { fontSize: 8, fontWeight: '700', letterSpacing: 1, fontFamily: 'TerminatorRealNFI' },
  pttUsersText: { color: GOLD_DIM, fontSize: 8, fontFamily: 'TerminatorRealNFI' },

  // ═══ FEED ═══
  feed: { flex: 1, paddingHorizontal: 8, backgroundColor: WHITE },
  feedInner: { paddingVertical: 6, gap: 4 },
  feedEmpty: { alignItems: 'center', paddingTop: 60 },
  feedEmptyIcon: { color: GOLD_FAINT, fontSize: 44, marginBottom: 10 },
  feedEmptyTitle: { color: GOLD, fontSize: 12, fontWeight: '700', letterSpacing: 2, fontFamily: 'TerminatorRealNFI' },
  feedEmptyDesc: { color: GOLD_DIM, fontSize: 9, marginTop: 4, fontFamily: 'TerminatorRealNFI' },

  // ═══ MESSAGE ═══
  msgCard: { padding: 8, borderWidth: 1, borderColor: BORDER_LIGHT, backgroundColor: OFF_WHITE, borderRadius: 4 },
  msgMine: { backgroundColor: '#FDF8EC', borderColor: GOLD_FAINT },
  msgPlaying: { borderColor: GOLD_LIGHT },
  msgTop: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 4 },
  msgLED: { width: 5, height: 5, borderRadius: 3 },
  msgSender: { color: GOLD_DIM, fontSize: 9, fontWeight: '700', letterSpacing: 1, flex: 1, fontFamily: 'TerminatorRealNFI' },
  msgSenderMine: { color: GOLD },
  msgTs: { color: GOLD_FAINT, fontSize: 7, fontFamily: 'TerminatorRealNFI' },
  msgCheck: { color: GOLD_LIGHT, fontSize: 8 },
  msgWave: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  msgPlayIcon: { color: GOLD_DIM, fontSize: 9, width: 14 },
  waveBarContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 1, height: 18 },
  waveBar: { width: 2, borderRadius: 1 },
  msgDur: { color: GOLD_DIM, fontSize: 7, width: 24, textAlign: 'right', fontFamily: 'TerminatorRealNFI' },

  // ═══ TALKING BAR ═══
  talkBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 5, backgroundColor: '#FDF8EC', borderTopWidth: 1, borderTopColor: GOLD_FAINT,
  },
  talkDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: GOLD_LIGHT },
  talkText: { color: GOLD, fontSize: 9, fontWeight: '700', letterSpacing: 2, fontFamily: 'TerminatorRealNFI' },

  // ═══ PTT ZONE ═══
  pttZone: { alignItems: 'center', paddingTop: 8, borderTopWidth: 1, borderTopColor: BORDER_LIGHT, backgroundColor: WHITE },
  txBar: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  txLED: { width: 6, height: 6, borderRadius: 3, backgroundColor: MIRROR_RED },
  txText: { color: GOLD, fontSize: 10, fontWeight: '700', letterSpacing: 2, fontFamily: 'TerminatorRealNFI' },
  txWaveform: { flexDirection: 'row', alignItems: 'center', gap: 2, marginLeft: 8 },
  txWaveBar: { width: 3, backgroundColor: GOLD_LIGHT, borderRadius: 1 },

  lockToggle: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 3,
    borderWidth: 1, borderColor: BORDER_LIGHT, marginBottom: 6,
  },
  lockToggleActive: { borderColor: GOLD, backgroundColor: '#FDF8EC' },
  lockIcon: { color: GOLD_FAINT, fontSize: 12 },
  lockIconActive: { color: GOLD },
  lockLabel: { color: GOLD_FAINT, fontSize: 8, fontWeight: '700', letterSpacing: 1, fontFamily: 'TerminatorRealNFI' },
  lockLabelActive: { color: GOLD },

  pttBtnWrap: { width: 200, height: 200, justifyContent: 'center', alignItems: 'center', position: 'relative' },
  pulseRing: { position: 'absolute', borderWidth: 2, borderColor: GOLD_LIGHT },

  pttOuter: {
    width: 160, height: 160, borderRadius: 80,
    borderWidth: 3, borderColor: BORDER_LIGHT,
    justifyContent: 'center', alignItems: 'center', backgroundColor: OFF_WHITE,
  },
  pttBtn: {
    width: 144, height: 144, borderRadius: 72,
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: WHITE, borderWidth: 2, borderColor: GOLD_FAINT,
  },
  pttBtnTX: { backgroundColor: '#FDF8EC', borderColor: GOLD },
  pttInner: { alignItems: 'center', justifyContent: 'center' },
  pttGlowRing: {
    position: 'absolute', width: 120, height: 120, borderRadius: 60,
    borderWidth: 2, borderColor: GOLD_LIGHT,
  },
  pttGlyph: { color: GOLD, fontSize: 44, fontFamily: 'TerminatorRealNFI' },
  pttGlyphTX: { color: MIRROR_RED, fontSize: 48, fontFamily: 'TerminatorRealNFI' },
  pttLabelReady: { color: GOLD_DIM, fontSize: 8, fontWeight: '700', letterSpacing: 1, marginTop: 2, fontFamily: 'TerminatorRealNFI' },
  pttLabelTX: { color: MIRROR_RED, fontSize: 7, fontWeight: '700', letterSpacing: 2, marginTop: 2, fontFamily: 'TerminatorRealNFI' },

  idLinePTT: { color: GOLD_FAINT, fontSize: 7, letterSpacing: 1, marginTop: 4, fontFamily: 'TerminatorRealNFI' },

  // ═══ SETTINGS ═══
  settingsScroll: { flex: 1, backgroundColor: WHITE },
  settingsHeader: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12,
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: BORDER_LIGHT,
    backgroundColor: WHITE,
  },
  settingsSubtitle: { color: GOLD_DIM, fontSize: 7, letterSpacing: 2, marginTop: 2, fontFamily: 'TerminatorRealNFI' },

  settingsCard: {
    marginHorizontal: 16, marginTop: 14,
    borderWidth: 1, borderColor: BORDER_LIGHT, backgroundColor: OFF_WHITE,
    borderRadius: 6, padding: 18,
  },
  settingsCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  settingsCardIcon: { color: GOLD, fontSize: 22 },
  settingsCardTitle: { color: GOLD, fontSize: 13, fontWeight: '800', letterSpacing: 2, fontFamily: 'TerminatorRealNFI' },
  settingsCardDesc: { color: GOLD_DIM, fontSize: 10, lineHeight: 16, marginBottom: 14, fontFamily: 'TerminatorRealNFI' },

  settingsToggleRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 10, borderTopWidth: 1, borderTopColor: BORDER_LIGHT,
    borderBottomWidth: 1, borderBottomColor: BORDER_LIGHT, marginBottom: 12,
  },
  settingsToggleLabel: { color: GOLD, fontSize: 10, fontWeight: '700', letterSpacing: 1, fontFamily: 'TerminatorRealNFI' },

  settingsSteps: { gap: 6, marginBottom: 10 },
  settingsStep: { color: GOLD, fontSize: 11, fontWeight: '600', letterSpacing: 1, fontFamily: 'TerminatorRealNFI' },
  settingsHint: { color: GOLD_FAINT, fontSize: 8, letterSpacing: 1, fontFamily: 'TerminatorRealNFI' },

  // Half Duplex Visual
  duplexVisual: { alignItems: 'center', paddingTop: 8 },
  duplexRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 10 },
  duplexBlock: {
    width: 52, height: 52, borderRadius: 26,
    borderWidth: 2, borderColor: BORDER_LIGHT, backgroundColor: WHITE,
    justifyContent: 'center', alignItems: 'center',
  },
  duplexBlockActive: { borderColor: GOLD, backgroundColor: '#FDF8EC' },
  duplexBlockLabel: { color: GOLD, fontSize: 12, fontWeight: '800', letterSpacing: 2, fontFamily: 'TerminatorRealNFI' },
  duplexArrow: { color: GOLD_DIM, fontSize: 18, fontFamily: 'TerminatorRealNFI' },
  duplexDesc: { color: GOLD_DIM, fontSize: 8, letterSpacing: 1, textAlign: 'center', fontFamily: 'TerminatorRealNFI' },

  // Network Info
  netRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: BORDER_LIGHT,
  },
  netLabel: { color: GOLD_DIM, fontSize: 9, fontWeight: '600', letterSpacing: 1, fontFamily: 'TerminatorRealNFI' },
  netValue: { color: GOLD, fontSize: 9, fontWeight: '700', letterSpacing: 1, fontFamily: 'TerminatorRealNFI' },
});
