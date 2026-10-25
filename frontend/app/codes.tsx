import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform,
  Animated, Easing, ActivityIndicator, Vibration, TextInput, Modal,
  FlatList, KeyboardAvoidingView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Audio, type AudioSound, type AudioRecording } from '../src/audioCompat';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import { useAuth } from '../src/AuthContext';
import * as FileSystem from 'expo-file-system';
import * as Haptics from 'expo-haptics';

import { skinStyles, SK } from '../src/skins';
import { useLayout } from '../src/useLayout';

const API_URL =
  Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL ||
  process.env.EXPO_PUBLIC_BACKEND_URL || '';


// ═══ TYPES ═══
type ChannelType = 'group' | 'private' | 'broadcast';
type ConnectionState = 'offline' | 'connecting' | 'online' | 'listening' | 'transmitting';

interface CodesChannel {
  id: string;
  name: string;
  channel_type: ChannelType;
  active_users: number;
  created_by: string;
  is_admin?: boolean;
  member_count?: number;
  muted_users?: string[];
}

interface CodesMessage {
  id: string;
  sender_name: string;
  sender_id: string;
  duration: number;
  created_at: string;
  audio_base64: string;
  status?: 'sending' | 'delivered' | 'played';
}

type ViewMode = 'channels' | 'chat' | 'admin' | 'create';

// ═══ CHIRP ENGINE ═══
const playChirp = async (type: 'connect' | 'disconnect' | 'transmit' | 'receive') => {
  try {
    if (Platform.OS !== 'web') {
      const feedbackMap = {
        connect: Haptics.NotificationFeedbackType.Success,
        disconnect: Haptics.NotificationFeedbackType.Warning,
        transmit: Haptics.ImpactFeedbackStyle.Heavy,
        receive: Haptics.NotificationFeedbackType.Success,
      };
      if (type === 'transmit') {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      } else {
        await Haptics.notificationAsync(feedbackMap[type] as any);
      }
    }
  } catch (e) {}
};

export default function CodesScreen() {
  const insets = useSafeAreaInsets();
  const layout = useLayout();
  const router = useRouter();
  const { user, token } = useAuth();

  // View State
  const [viewMode, setViewMode] = useState<ViewMode>('channels');
  const [connectionState, setConnectionState] = useState<ConnectionState>('offline');

  // Channel State
  const [channels, setChannels] = useState<CodesChannel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<CodesChannel | null>(null);
  const [channelFilter, setChannelFilter] = useState<'all' | ChannelType>('all');

  // Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [isTransmitting, setIsTransmitting] = useState(false);
  const [messages, setMessages] = useState<CodesMessage[]>([]);
  const [activeUsers, setActiveUsers] = useState(0);
  const [isPlayingId, setIsPlayingId] = useState<string | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [hasPermission, setHasPermission] = useState(false);
  const [whoIsTalking, setWhoIsTalking] = useState<string | null>(null);

  // Admin State
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelType, setNewChannelType] = useState<ChannelType>('group');
  const [inviteUsername, setInviteUsername] = useState('');
  const [channelMembers, setChannelMembers] = useState<any[]>([]);
  const [adminLoading, setAdminLoading] = useState(false);

  // Refs
  const recordingRef = useRef<AudioRecording | null>(null);
  const soundRef = useRef<AudioSound | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const durationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const messagesEndRef = useRef<ScrollView | null>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Animations
  const pulseRing1 = useRef(new Animated.Value(0)).current;
  const pulseRing2 = useRef(new Animated.Value(0)).current;
  const pulseRing3 = useRef(new Animated.Value(0)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;
  const signalAnim = useRef(new Animated.Value(0)).current;
  const connectionPulse = useRef(new Animated.Value(0)).current;

  // ═══ LIFECYCLE ═══
  useEffect(() => {
    requestPermissions();
    fetchChannels();
    // Connection pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(connectionPulse, { toValue: 1, duration: 1500, useNativeDriver: true }),
        Animated.timing(connectionPulse, { toValue: 0.3, duration: 1500, useNativeDriver: true }),
      ])
    ).start();
    return () => {
      cleanupWS();
      cleanupAudio();
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  useEffect(() => {
    if (selectedChannel) {
      connectToChannel(selectedChannel.id);
      fetchMessages(selectedChannel.id);
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = setInterval(() => fetchMessages(selectedChannel.id), 4000);
    }
    return () => { if (pollIntervalRef.current) clearInterval(pollIntervalRef.current); };
  }, [selectedChannel?.id]);

  // ═══ PERMISSIONS ═══
  const requestPermissions = async () => {
    try {
      if (Platform.OS !== 'web') {
        const { status } = await Audio.requestPermissionsAsync();
        setHasPermission(status === 'granted');
      } else {
        setHasPermission(true);
      }
    } catch (e) {}
  };

  // ═══ DATA FETCHING ═══
  const fetchChannels = async () => {
    try {
      const headers: any = {};
      if (token) headers.Authorization = `Bearer ${token}`;
      const res = await fetch(`${API_URL}/api/codes/channels`, { headers });
      if (res.ok) {
        const data = await res.json();
        setChannels(data.channels || []);
      }
    } catch (e) {}
  };

  const fetchMessages = async (channelId: string) => {
    try {
      const res = await fetch(`${API_URL}/api/codes/messages/${channelId}?limit=30`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      }
    } catch (e) {}
  };

  // ═══ WEBSOCKET ═══
  const connectToChannel = (channelId: string) => {
    cleanupWS();
    setConnectionState('connecting');
    try {
      const wsUrl = API_URL.replace('https://', 'wss://').replace('http://', 'ws://');
      const senderName = user?.display_name || user?.username || 'ANONYMOUS';
      const senderId = user?.id || `anon-${Date.now()}`;
      const ws = new WebSocket(`${wsUrl}/api/codes/live/${channelId}?user_id=${senderId}&user_name=${encodeURIComponent(senderName)}`);

      ws.onopen = () => {
        setConnectionState('online');
        playChirp('connect');
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'user_count') {
            setActiveUsers(data.count);
          } else if (data.type === 'presence') {
            setActiveUsers(data.online_count || 0);
          } else if (data.type === 'new_message') {
            setMessages((prev) => [...prev, {
              id: data.message_id,
              sender_name: data.sender_name,
              sender_id: data.sender_id,
              duration: data.duration,
              created_at: data.created_at,
              audio_base64: data.audio_base64,
              status: 'delivered',
            }]);
            setWhoIsTalking(data.sender_name);
            playChirp('receive');
            setConnectionState('listening');
            playAudioFromBase64(data.audio_base64, data.message_id);
          } else if (data.type === 'user_transmitting') {
            setWhoIsTalking(data.sender_name);
            setConnectionState('listening');
          } else if (data.type === 'user_stopped') {
            setWhoIsTalking(null);
            setConnectionState('online');
          }
        } catch (e) {}
      };

      ws.onerror = () => { setConnectionState('offline'); };
      ws.onclose = () => { setConnectionState('offline'); };
      wsRef.current = ws;
    } catch (e) { setConnectionState('offline'); }
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

  // ═══ RECORDING ═══
  const startRecording = async () => {
    if (!hasPermission) { await requestPermissions(); return; }
    try {
      await cleanupAudio();
      await playChirp('transmit');

      // Notify channel we're transmitting
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'transmitting',
          sender_name: (user?.display_name || user?.username || 'ANONYMOUS').toUpperCase(),
          sender_id: user?.id || '',
        }));
      }

      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      recordingRef.current = recording;
      setIsRecording(true);
      setConnectionState('transmitting');
      setRecordingDuration(0);

      durationIntervalRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 0.1);
      }, 100);

      startTransmitAnimation();
      Animated.spring(buttonScale, { toValue: 0.9, useNativeDriver: true }).start();
    } catch (e) {
      setIsRecording(false);
      setConnectionState('online');
    }
  };

  const stopRecording = async () => {
    if (!recordingRef.current) return;
    setIsRecording(false);
    setConnectionState('online');
    stopTransmitAnimation();
    Animated.spring(buttonScale, { toValue: 1, useNativeDriver: true }).start();

    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }

    // Notify channel we stopped
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'stopped' }));
    }

    try {
      await recordingRef.current.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;
      await playChirp('disconnect');

      if (uri && recordingDuration > 0.3) {
        await transmitAudio(uri);
      }
    } catch (e) {
      recordingRef.current = null;
    }
  };

  const transmitAudio = async (uri: string) => {
    if (!selectedChannel) return;
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

      const senderName = (user?.display_name || user?.username || 'ANONYMOUS').toUpperCase();
      const senderId = user?.id || `anon-${Date.now()}`;

      const res = await fetch(`${API_URL}/api/codes/transmit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel_id: selectedChannel.id,
          sender_name: senderName,
          sender_id: senderId,
          audio_base64: audioBase64,
          duration: Math.round(recordingDuration * 10) / 10,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => [...prev, {
          id: data.message_id,
          sender_name: senderName,
          sender_id: senderId,
          duration: Math.round(recordingDuration * 10) / 10,
          created_at: new Date().toISOString(),
          audio_base64: audioBase64,
          status: 'delivered',
        }]);
      }
    } catch (e) {}
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

      await Audio.setAudioModeAsync({ allowsRecordingIOS: false, playsInSilentModeIOS: true });

      const uri = `data:audio/m4a;base64,${base64}`;
      const { sound } = await Audio.Sound.createAsync({ uri }, { shouldPlay: true, volume: 1.0 });
      soundRef.current = sound;

      sound.setOnPlaybackStatusUpdate((status: any) => {
        if (status.isLoaded && status.didJustFinish) {
          setIsPlayingId(null);
          setWhoIsTalking(null);
          setConnectionState('online');
          sound.unloadAsync();
          soundRef.current = null;
        }
      });
    } catch (e) {
      setIsPlayingId(null);
      setWhoIsTalking(null);
    }
  };

  // ═══ ADMIN ACTIONS ═══
  const createChannel = async () => {
    if (!newChannelName.trim()) return;
    setAdminLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/codes/channels`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          name: newChannelName.trim().toUpperCase(),
          channel_type: newChannelType,
          is_public: newChannelType !== 'private',
          created_by: user?.id || 'anonymous',
        }),
      });
      if (res.ok) {
        setNewChannelName('');
        fetchChannels();
        setViewMode('channels');
      }
    } catch (e) {}
    setAdminLoading(false);
  };

  const deleteChannel = async (channelId: string) => {
    try {
      const res = await fetch(`${API_URL}/api/codes/channels/${channelId}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) fetchChannels();
    } catch (e) {}
  };

  const inviteUser = async (channelId: string) => {
    if (!inviteUsername.trim()) return;
    try {
      const res = await fetch(`${API_URL}/api/codes/channels/${channelId}/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ username: inviteUsername.trim() }),
      });
      if (res.ok) {
        setInviteUsername('');
        fetchChannelMembers(channelId);
      }
    } catch (e) {}
  };

  const muteUser = async (channelId: string, userId: string) => {
    try {
      await fetch(`${API_URL}/api/codes/channels/${channelId}/mute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ user_id: userId }),
      });
      fetchChannelMembers(channelId);
    } catch (e) {}
  };

  const fetchChannelMembers = async (channelId: string) => {
    try {
      const res = await fetch(`${API_URL}/api/codes/channels/${channelId}/members`);
      if (res.ok) {
        const data = await res.json();
        setChannelMembers(data.members || []);
      }
    } catch (e) {}
  };

  // ═══ ANIMATIONS ═══
  const startTransmitAnimation = () => {
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
    try { return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }
    catch { return ''; }
  };

  const getStateColor = () => {
    switch (connectionState) {
      case 'online': return '#00ff41';
      case 'connecting': return '#ffaa00';
      case 'transmitting': return '#ff0a0a';
      case 'listening': return '#00aaff';
      default: return '#3a1010';
    }
  };

  const getStateLabel = () => {
    switch (connectionState) {
      case 'online': return 'ONLINE';
      case 'connecting': return 'CONNECTING...';
      case 'transmitting': return 'TRANSMITTING';
      case 'listening': return 'RECEIVING';
      default: return 'OFFLINE';
    }
  };

  const filteredChannels = channels.filter(ch =>
    channelFilter === 'all' ? true : ch.channel_type === channelFilter
  );

  const channelTypeIcon = (type: ChannelType) => {
    switch (type) {
      case 'private': return '◈';
      case 'broadcast': return '◉';
      default: return '◎';
    }
  };

  const senderName = (user?.display_name || user?.username || 'ANONYMOUS').toUpperCase();

  // ═══ PULSE RING ═══
  const renderPulseRing = (anim: Animated.Value, size: number) => (
    <Animated.View
      style={[styles.pulseRing, {
        width: size, height: size, borderRadius: size / 2,
        opacity: anim.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0] }),
        transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.8] }) }],
      }]}
    />
  );

  // ═══════════════════════════════════
  // RENDER: CHANNEL LIST
  // ═══════════════════════════════════
  const renderChannelList = () => (
    <View style={styles.channelListContainer}>
      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        {(['all', 'group', 'private', 'broadcast'] as const).map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.filterBtn, channelFilter === f && styles.filterBtnActive]}
            onPress={() => setChannelFilter(f)}
          >
            <Text style={[styles.filterText, channelFilter === f && styles.filterTextActive]}>
              {f === 'all' ? 'ALL' : f.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Channel Cards */}
      <ScrollView style={styles.channelScroll} showsVerticalScrollIndicator={false} contentContainerStyle={[{ paddingBottom: insets.bottom + 100 }, layout.frame]}>
        {filteredChannels.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyGlyph}>◎</Text>
            <Text style={styles.emptyTitle}>NO CHANNELS</Text>
            <Text style={styles.emptyText}>Create a channel to start communicating</Text>
          </View>
        ) : (
          filteredChannels.map(ch => (
            <TouchableOpacity
              key={ch.id}
              style={styles.channelCard}
              onPress={() => {
                setSelectedChannel(ch);
                setViewMode('chat');
                playChirp('connect');
              }}
              activeOpacity={0.7}
            >
              <View style={styles.channelCardLeft}>
                <Text style={styles.channelTypeIcon}>{channelTypeIcon(ch.channel_type)}</Text>
                <View style={styles.channelCardInfo}>
                  <Text style={styles.channelCardName}>{ch.name}</Text>
                  <Text style={styles.channelCardMeta}>
                    {ch.channel_type.toUpperCase()} · {ch.active_users} ACTIVE
                  </Text>
                </View>
              </View>
              <View style={styles.channelCardRight}>
                {ch.active_users > 0 && (
                  <Animated.View style={[styles.liveDot, { opacity: connectionPulse }]} />
                )}
                <Text style={styles.channelArrow}>▸</Text>
              </View>
            </TouchableOpacity>
          ))
        )}

        {/* Create Channel Button */}
        <TouchableOpacity
          style={styles.createChannelBtn}
          onPress={() => setViewMode('create')}
          activeOpacity={0.7}
        >
          <Text style={styles.createChannelIcon}>+</Text>
          <Text style={styles.createChannelText}>CREATE CHANNEL</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );

  // ═══════════════════════════════════
  // RENDER: CHAT VIEW
  // ═══════════════════════════════════
  const renderChatView = () => {
    if (!selectedChannel) return null;
    return (
      <View style={styles.chatContainer}>
        {/* Channel Header */}
        <View style={styles.chatHeader}>
          <TouchableOpacity onPress={() => { setViewMode('channels'); cleanupWS(); }} style={styles.chatBackBtn}>
            <Text style={styles.chatBackIcon}>◁</Text>
          </TouchableOpacity>
          <View style={styles.chatHeaderCenter}>
            <Text style={styles.chatHeaderName}>{selectedChannel.name}</Text>
            <View style={styles.chatHeaderStatus}>
              <View style={[styles.statusDot, { backgroundColor: getStateColor() }]} />
              <Text style={[styles.chatHeaderState, { color: getStateColor() }]}>{getStateLabel()}</Text>
              <Text style={styles.chatHeaderUsers}> · {activeUsers} ONLINE</Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={() => {
              fetchChannelMembers(selectedChannel.id);
              setShowAdminModal(true);
            }}
            style={styles.chatAdminBtn}
          >
            <Text style={styles.chatAdminIcon}>⚙</Text>
          </TouchableOpacity>
        </View>

        {/* Messages Feed */}
        <ScrollView
          ref={messagesEndRef}
          style={styles.feed}
          contentContainerStyle={styles.feedContent}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => messagesEndRef.current?.scrollToEnd?.({ animated: true })}
        >
          {messages.length === 0 ? (
            <View style={styles.emptyFeed}>
              <Text style={styles.emptyFeedGlyph}>◎</Text>
              <Text style={styles.emptyFeedTitle}>CHANNEL CLEAR</Text>
              <Text style={styles.emptyFeedText}>Hold the button below to transmit</Text>
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
                    <View style={[styles.msgDot, { backgroundColor: isPlaying ? SK('#ff0a0a') : isMine ? SK('#ff3040') : SK('#3a1010') }]} />
                    <Text style={[styles.msgName, isMine && styles.msgNameMine]}>{msg.sender_name}</Text>
                    <Text style={styles.msgTime}>{formatTimestamp(msg.created_at)}</Text>
                    {msg.status === 'delivered' && <Text style={styles.msgDelivered}>✓</Text>}
                  </View>
                  <View style={styles.msgWave}>
                    <Text style={[styles.msgPlay, isPlaying && styles.msgPlayActive]}>
                      {isPlaying ? '◼' : '▶'}
                    </Text>
                    <View style={styles.waveContainer}>
                      {[...Array(24)].map((_, i) => (
                        <View
                          key={i}
                          style={[styles.waveBar, {
                            height: 3 + Math.sin(i * 0.6) * 10 + Math.random() * 3,
                            backgroundColor: isPlaying ? SK('#ff0a0a') : isMine ? SK('#ff304060') : SK('#3a101060'),
                          }]}
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

        {/* Who Is Talking Bar */}
        {whoIsTalking && (
          <View style={styles.talkingBar}>
            <Animated.View style={[styles.talkingDot, { opacity: signalAnim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) }]} />
            <Text style={styles.talkingText}>{whoIsTalking} IS TALKING</Text>
          </View>
        )}

        {/* PTT ZONE */}
        <View style={[styles.pttZone, { paddingBottom: Math.max(insets.bottom + 80, 100) }]}>
          {isRecording && (
            <View style={styles.recBar}>
              <View style={styles.recLED} />
              <Text style={styles.recText}>TX {formatTime(recordingDuration)}s</Text>
            </View>
          )}
          {isTransmitting && (
            <View style={styles.recBar}>
              <ActivityIndicator size="small" color={SK('#ff0a0a')} />
              <Text style={styles.recText}>SENDING...</Text>
            </View>
          )}

          <View style={styles.pttBtnContainer}>
            {isRecording && (
              <>
                {renderPulseRing(pulseRing1, 170)}
                {renderPulseRing(pulseRing2, 170)}
                {renderPulseRing(pulseRing3, 170)}
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
                <View style={styles.pttInner}>
                  {isRecording ? (
                    <>
                      <Animated.Text style={[styles.pttGlyph, { opacity: signalAnim.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) }]}>◉</Animated.Text>
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

          <Text style={styles.idLine}>
            {user ? `${senderName} · ${user.mirrors_id}` : 'ANONYMOUS · SIGN IN FOR CODES ID'}
          </Text>
        </View>

        {/* Admin Modal */}
        <Modal visible={showAdminModal} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { paddingTop: insets.top + 10 }]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>CHANNEL ADMIN</Text>
                <TouchableOpacity onPress={() => setShowAdminModal(false)} style={styles.modalClose}>
                  <Text style={styles.modalCloseText}>✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
                <Text style={styles.adminSectionTitle}>{selectedChannel.name}</Text>
                <Text style={styles.adminMeta}>{selectedChannel.channel_type.toUpperCase()} · {activeUsers} ONLINE</Text>

                {/* Invite User */}
                <Text style={styles.adminLabel}>INVITE USER</Text>
                <View style={styles.adminInputRow}>
                  <TextInput
                    style={styles.adminInput}
                    placeholder="USERNAME"
                    placeholderTextColor={SK('#3a1010')}
                    value={inviteUsername}
                    onChangeText={setInviteUsername}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity style={styles.adminActionBtn} onPress={() => inviteUser(selectedChannel.id)}>
                    <Text style={styles.adminActionBtnText}>INVITE</Text>
                  </TouchableOpacity>
                </View>

                {/* Members */}
                <Text style={styles.adminLabel}>MEMBERS ({channelMembers.length})</Text>
                {channelMembers.map((m, i) => (
                  <View key={i} style={styles.memberRow}>
                    <Text style={styles.memberName}>{m.display_name || m.username}</Text>
                    <Text style={styles.memberRole}>{m.is_muted ? 'MUTED' : 'ACTIVE'}</Text>
                    <TouchableOpacity onPress={() => muteUser(selectedChannel.id, m.user_id)}>
                      <Text style={styles.muteBtn}>{m.is_muted ? 'UNMUTE' : 'MUTE'}</Text>
                    </TouchableOpacity>
                  </View>
                ))}

                {/* Delete Channel */}
                <TouchableOpacity
                  style={styles.deleteChannelBtn}
                  onPress={() => {
                    deleteChannel(selectedChannel.id);
                    setShowAdminModal(false);
                    setViewMode('channels');
                    setSelectedChannel(null);
                  }}
                >
                  <Text style={styles.deleteChannelText}>DELETE CHANNEL</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </Modal>
      </View>
    );
  };

  // ═══════════════════════════════════
  // RENDER: CREATE CHANNEL
  // ═══════════════════════════════════
  const renderCreateChannel = () => (
    <KeyboardAvoidingView style={styles.createContainer} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.createHeader}>
        <TouchableOpacity onPress={() => setViewMode('channels')} style={styles.chatBackBtn}>
          <Text style={styles.chatBackIcon}>◁</Text>
        </TouchableOpacity>
        <Text style={styles.createTitle}>NEW CHANNEL</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.createForm} showsVerticalScrollIndicator={false} contentContainerStyle={[{ paddingBottom: insets.bottom + 100 }, layout.frame]}>
        <Text style={styles.createLabel}>CHANNEL NAME</Text>
        <TextInput
          style={styles.createInput}
          placeholder="ENTER NAME"
          placeholderTextColor={SK('#3a1010')}
          value={newChannelName}
          onChangeText={setNewChannelName}
          maxLength={32}
          autoCapitalize="characters"
        />

        <Text style={styles.createLabel}>CHANNEL TYPE</Text>
        <View style={styles.typeRow}>
          {(['group', 'private', 'broadcast'] as ChannelType[]).map(t => (
            <TouchableOpacity
              key={t}
              style={[styles.typeBtn, newChannelType === t && styles.typeBtnActive]}
              onPress={() => setNewChannelType(t)}
            >
              <Text style={styles.typeIcon}>{channelTypeIcon(t)}</Text>
              <Text style={[styles.typeText, newChannelType === t && styles.typeTextActive]}>{t.toUpperCase()}</Text>
              <Text style={styles.typeDesc}>
                {t === 'group' ? 'Open channel' : t === 'private' ? '1-to-1 / invite only' : 'Admin speaks'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.createSubmitBtn, adminLoading && { opacity: 0.5 }]}
          onPress={createChannel}
          disabled={adminLoading || !newChannelName.trim()}
        >
          {adminLoading ? (
            <ActivityIndicator color={SK('#000')} size="small" />
          ) : (
            <Text style={styles.createSubmitText}>CREATE CHANNEL</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );

  // ═══════════════════════════════════
  // MAIN RENDER
  // ═══════════════════════════════════
  return (
    <View style={styles.container}>
      <View style={[styles.safeArea, { paddingTop: insets.top }]}>
        {/* Top Header */}
        {viewMode === 'channels' || viewMode === 'create' ? (
          <View style={styles.mainHeader}>
            <TouchableOpacity onPress={() => router.back()} style={styles.mainBackBtn}>
              <Text style={styles.mainBackIcon}>◁</Text>
            </TouchableOpacity>
            <View style={styles.mainHeaderCenter}>
              <Text style={styles.mainHeaderTitle}>CODES</Text>
              <Text style={styles.mainHeaderSub}>DIRECT CONNECT · GODMODE NETWORK</Text>
            </View>
            <Animated.View style={[styles.mainStatusDot, { backgroundColor: getStateColor(), opacity: connectionPulse }]} />
          </View>
        ) : null}

        {viewMode === 'channels' && renderChannelList()}
        {viewMode === 'chat' && renderChatView()}
        {viewMode === 'create' && renderCreateChannel()}
      </View>
    </View>
  );
}

// ═══════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════
const styles = skinStyles({
  container: { flex: 1, backgroundColor: '#000' },
  safeArea: { flex: 1 },

  // ═══ MAIN HEADER ═══
  mainHeader: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14,
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#1a0808',
  },
  mainBackBtn: { padding: 6 },
  mainBackIcon: { color: '#ff0a0a', fontSize: 18, fontWeight: '700' },
  mainHeaderCenter: { flex: 1, alignItems: 'center' },
  mainHeaderTitle: { color: '#ff0a0a', fontSize: 20, fontWeight: '700', letterSpacing: 6 },
  mainHeaderSub: { color: '#3a1010', fontSize: 8, letterSpacing: 2, marginTop: 2 },
  mainStatusDot: { width: 8, height: 8, borderRadius: 4 },

  // ═══ FILTER ROW ═══
  filterRow: {
    flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 8,
    gap: 6, borderBottomWidth: 1, borderBottomColor: '#0a0505',
  },
  filterBtn: {
    flex: 1, paddingVertical: 8, alignItems: 'center',
    borderWidth: 1, borderColor: '#1a0808', borderRadius: 4,
  },
  filterBtnActive: { borderColor: '#ff0a0a', backgroundColor: '#150505' },
  filterText: { color: '#3a1010', fontSize: 9, fontWeight: '700', letterSpacing: 1 },
  filterTextActive: { color: '#ff0a0a' },

  // ═══ CHANNEL LIST ═══
  channelListContainer: { flex: 1 },
  channelScroll: { flex: 1, paddingHorizontal: 12, paddingTop: 8 },

  channelCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 14, paddingHorizontal: 14, marginBottom: 6,
    borderWidth: 1, borderColor: '#1a0808', backgroundColor: '#050202', borderRadius: 6,
  },
  channelCardLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  channelTypeIcon: { color: '#ff0a0a', fontSize: 22 },
  channelCardInfo: { flex: 1 },
  channelCardName: { color: '#ff3040', fontSize: 13, fontWeight: '700', letterSpacing: 2 },
  channelCardMeta: { color: '#3a1010', fontSize: 9, marginTop: 2, letterSpacing: 1 },
  channelCardRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#00ff41' },
  channelArrow: { color: '#3a1010', fontSize: 14 },

  createChannelBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 16, marginTop: 8,
    borderWidth: 1, borderColor: '#ff0a0a40', borderStyle: 'dashed', borderRadius: 6,
  },
  createChannelIcon: { color: '#ff0a0a', fontSize: 20 },
  createChannelText: { color: '#ff0a0a', fontSize: 11, fontWeight: '700', letterSpacing: 2 },

  // ═══ EMPTY STATE ═══
  emptyState: { alignItems: 'center', paddingTop: 80 },
  emptyGlyph: { color: '#1a0808', fontSize: 60, marginBottom: 12 },
  emptyTitle: { color: '#3a1010', fontSize: 14, fontWeight: '700', letterSpacing: 3 },
  emptyText: { color: '#2a0a0a', fontSize: 10, marginTop: 6 },

  // ═══ CHAT VIEW ═══
  chatContainer: { flex: 1 },
  chatHeader: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12,
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#1a0808',
  },
  chatBackBtn: { padding: 8 },
  chatBackIcon: { color: '#ff0a0a', fontSize: 16, fontWeight: '700' },
  chatHeaderCenter: { flex: 1, alignItems: 'center' },
  chatHeaderName: { color: '#ff0a0a', fontSize: 14, fontWeight: '700', letterSpacing: 3 },
  chatHeaderStatus: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  chatHeaderState: { fontSize: 8, fontWeight: '700', letterSpacing: 1 },
  chatHeaderUsers: { color: '#3a1010', fontSize: 8 },
  chatAdminBtn: { padding: 8 },
  chatAdminIcon: { color: '#5a1a1a', fontSize: 18 },

  // ═══ FEED ═══
  feed: { flex: 1, paddingHorizontal: 10 },
  feedContent: { paddingVertical: 8, gap: 6 },
  emptyFeed: { alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  emptyFeedGlyph: { color: '#1a0808', fontSize: 50, marginBottom: 10 },
  emptyFeedTitle: { color: '#3a1010', fontSize: 12, fontWeight: '700', letterSpacing: 3 },
  emptyFeedText: { color: '#2a0a0a', fontSize: 10, marginTop: 4 },

  // ═══ MESSAGE CARD ═══
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
  msgDelivered: { color: '#00ff41', fontSize: 8 },
  msgWave: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  msgPlay: { color: '#3a1010', fontSize: 10, width: 16 },
  msgPlayActive: { color: '#ff0a0a' },
  waveContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 1.5, height: 20 },
  waveBar: { width: 2, borderRadius: 1 },
  msgDur: { color: '#3a1010', fontSize: 8, width: 28, textAlign: 'right' },

  // ═══ TALKING BAR ═══
  talkingBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 6, backgroundColor: '#150505',
    borderTopWidth: 1, borderTopColor: '#ff0a0a40',
  },
  talkingDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#ff0a0a' },
  talkingText: { color: '#ff0a0a', fontSize: 10, fontWeight: '700', letterSpacing: 2 },

  // ═══ PTT ZONE ═══
  pttZone: {
    alignItems: 'center', paddingTop: 10,
    borderTopWidth: 1, borderTopColor: '#1a0808', backgroundColor: '#020101',
  },
  recBar: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  recLED: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#ff0a0a' },
  recText: { color: '#ff0a0a', fontSize: 11, fontWeight: '700', letterSpacing: 2 },

  pttBtnContainer: {
    width: 170, height: 170, justifyContent: 'center', alignItems: 'center',
    position: 'relative',
  },
  pulseRing: { position: 'absolute', borderWidth: 2, borderColor: '#ff0a0a' },
  pttOuter: {
    width: 140, height: 140, borderRadius: 70,
    borderWidth: 3, borderColor: '#2a0a0a',
    justifyContent: 'center', alignItems: 'center', backgroundColor: '#060303',
  },
  pttBtn: {
    width: 126, height: 126, borderRadius: 63,
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#0a0505', borderWidth: 2, borderColor: '#1a0808',
  },
  pttBtnActive: { backgroundColor: '#1a0808', borderColor: '#ff0a0a' },
  pttInner: { alignItems: 'center', justifyContent: 'center' },
  pttGlyph: { color: '#ff0a0a', fontSize: 42 },
  pttLabel: { color: '#5a1a1a', fontSize: 8, fontWeight: '700', letterSpacing: 1, marginTop: 2 },
  pttLabelActive: { color: '#ff0a0a', fontSize: 7, fontWeight: '700', letterSpacing: 2, marginTop: 2 },

  idLine: { color: '#2a0a0a', fontSize: 8, letterSpacing: 1, marginTop: 6 },

  // ═══ ADMIN MODAL ═══
  modalOverlay: { flex: 1, backgroundColor: '#000000ee' },
  modalContent: { flex: 1, paddingHorizontal: 16 },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#1a0808',
  },
  modalTitle: { color: '#ff0a0a', fontSize: 16, fontWeight: '700', letterSpacing: 3 },
  modalClose: { padding: 8 },
  modalCloseText: { color: '#5a1a1a', fontSize: 18 },

  adminSectionTitle: { color: '#ff3040', fontSize: 18, fontWeight: '700', letterSpacing: 2, marginTop: 20 },
  adminMeta: { color: '#3a1010', fontSize: 9, letterSpacing: 1, marginTop: 4, marginBottom: 24 },
  adminLabel: { color: '#5a1a1a', fontSize: 10, fontWeight: '700', letterSpacing: 2, marginTop: 20, marginBottom: 8 },
  adminInputRow: { flexDirection: 'row', gap: 8 },
  adminInput: {
    flex: 1, borderWidth: 1, borderColor: '#2a0a0a', backgroundColor: '#0a0505',
    paddingHorizontal: 12, paddingVertical: 10, color: '#ff0a0a', fontSize: 12,
  },
  adminActionBtn: {
    backgroundColor: '#ff0a0a', paddingHorizontal: 16, justifyContent: 'center',
  },
  adminActionBtnText: { color: '#000', fontSize: 10, fontWeight: '700', letterSpacing: 1 },

  memberRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#0a0505', gap: 10,
  },
  memberName: { color: '#ff3040', fontSize: 11, flex: 1 },
  memberRole: { color: '#3a1010', fontSize: 8, letterSpacing: 1 },
  muteBtn: { color: '#ff0a0a', fontSize: 9, fontWeight: '700', letterSpacing: 1 },

  deleteChannelBtn: {
    marginTop: 40, paddingVertical: 14, alignItems: 'center',
    borderWidth: 1, borderColor: '#ff0a0a', borderRadius: 4,
  },
  deleteChannelText: { color: '#ff0a0a', fontSize: 11, fontWeight: '700', letterSpacing: 2 },

  // ═══ CREATE CHANNEL ═══
  createContainer: { flex: 1 },
  createHeader: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12,
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#1a0808',
  },
  createTitle: { flex: 1, textAlign: 'center', color: '#ff0a0a', fontSize: 16, fontWeight: '700', letterSpacing: 3 },

  createForm: { flex: 1, paddingHorizontal: 16, paddingTop: 20 },
  createLabel: { color: '#5a1a1a', fontSize: 10, fontWeight: '700', letterSpacing: 2, marginBottom: 8, marginTop: 16 },
  createInput: {
    borderWidth: 1, borderColor: '#2a0a0a', backgroundColor: '#0a0505',
    paddingHorizontal: 14, paddingVertical: 14, color: '#ff0a0a',
    fontSize: 14, letterSpacing: 2, fontWeight: '700',
  },

  typeRow: { gap: 8, marginTop: 4 },
  typeBtn: {
    padding: 14, borderWidth: 1, borderColor: '#1a0808',
    backgroundColor: '#050202', borderRadius: 6, flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  typeBtnActive: { borderColor: '#ff0a0a', backgroundColor: '#150505' },
  typeIcon: { color: '#ff0a0a', fontSize: 22 },
  typeText: { color: '#3a1010', fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  typeTextActive: { color: '#ff0a0a' },
  typeDesc: { color: '#2a0a0a', fontSize: 8, marginLeft: 'auto' },

  createSubmitBtn: {
    backgroundColor: '#ff0a0a', paddingVertical: 16, alignItems: 'center',
    marginTop: 32, borderRadius: 4,
  },
  createSubmitText: { color: '#000', fontSize: 13, fontWeight: '700', letterSpacing: 3 },
});
