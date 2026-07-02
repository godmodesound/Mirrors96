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
  Modal,
  ActivityIndicator,
  Dimensions,
  TextInput,
  ScrollView,
  Alert,
  FlatList,
  Image,
  ImageBackground,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import * as Haptics from 'expo-haptics';
import * as Sharing from 'expo-sharing';
import ViewShot from 'react-native-view-shot';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Camera, CameraView } from 'expo-camera';
import { FREQUENCY_ARCHIVE } from '../src/FrequencyArchiveData';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ═══════════════════════════════════
// CONFIG & LIMITS
// ═══════════════════════════════════
const API_BASE =
  Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL ||
  process.env.EXPO_PUBLIC_BACKEND_URL ||
  '';
const WS_BASE = API_BASE.replace(/^https?/, 'wss');

const VOICE_CHIRP_LIMIT = 33; // seconds
const VIDEO_CHIRP_LIMIT = 96; // seconds

const STORAGE_KEYS = {
  MIRRORS_ID: 'mirrors_id',
  DISPLAY_NAME: 'mirrors_display_name',
  DEVICE_ID: 'mirrors_device_id',
  CONTACTS: 'mirrors_contacts',
  SELECTED_CONTACT: 'mirrors_selected_contact',
  CHIRP_HISTORY: 'chirp_history',
};

// ═══════════════════════════════════
// TYPES
// ═══════════════════════════════════
interface Contact {
  mirrors_id: string;
  display_name: string;
  nickname: string;
  is_online?: boolean;
  added_at?: string;
}

interface ChirpMessage {
  id: string;
  type: 'voice' | 'video' | 'codes';
  from_mirrors_id: string;
  to_mirrors_id: string;
  from_display_name: string;
  duration: number;
  timestamp: string;
  is_outgoing: boolean;
  played?: boolean;
  frequency_name?: string;
  frequencies?: number[];
}

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
  const [hasPermission, setHasPermission] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState(false);
  const [lastChirpTime, setLastChirpTime] = useState<string | null>(null);
  const [incomingFrom, setIncomingFrom] = useState<string | null>(null);

  // Chirp mode: voice, video, or codes
  const [chirpMode, setChirpMode] = useState<'voice' | 'video' | 'codes'>('voice');
  const [isRecordingVideo, setIsRecordingVideo] = useState(false);

  // Codes mode state
  const [selectedFrequency, setSelectedFrequency] = useState<{ name: string; frequencies: number[] } | null>(null);
  const [showFrequencyPicker, setShowFrequencyPicker] = useState(false);
  const [codesHoldTimer, setCodesHoldTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [codesHoldProgress, setCodesHoldProgress] = useState(0);
  const codesHoldIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // MIRRORS I.D. state
  const [mirrorsId, setMirrorsId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string>('');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);

  // Message history
  const [chirpHistory, setChirpHistory] = useState<ChirpMessage[]>([]);

  // Modal states
  const [activeTab, setActiveTab] = useState<'chirp' | 'messages' | 'contacts' | 'settings'>('chirp');
  const [showAddContact, setShowAddContact] = useState(false);
  const [newContactId, setNewContactId] = useState('');
  const [lookupResult, setLookupResult] = useState<any>(null);
  const [isLookingUp, setIsLookingUp] = useState(false);

  // Share modal state
  const [showShareModal, setShowShareModal] = useState(false);
  const [recordedAudioUri, setRecordedAudioUri] = useState<string | null>(null);
  const [recordedDuration, setRecordedDuration] = useState(0);
  const [isSharing, setIsSharing] = useState(false);

  // Refs
  const wsRef = useRef<WebSocket | null>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  const transmitTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const viewShotRef = useRef<ViewShot>(null);
  const cameraRef = useRef<CameraView>(null);

  // Animations
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const ringAnim = useRef(new Animated.Value(0)).current;
  const receiveAnim = useRef(new Animated.Value(0)).current;

  // ═══════════════════════════════════
  // INITIALIZE MIRRORS I.D.
  // ═══════════════════════════════════
  useEffect(() => {
    initializeMirrorsId();
    loadChirpHistory();
  }, []);

  const initializeMirrorsId = async () => {
    try {
      const storedId = await AsyncStorage.getItem(STORAGE_KEYS.MIRRORS_ID);
      const storedName = await AsyncStorage.getItem(STORAGE_KEYS.DISPLAY_NAME);
      const storedContacts = await AsyncStorage.getItem(STORAGE_KEYS.CONTACTS);
      const storedSelected = await AsyncStorage.getItem(STORAGE_KEYS.SELECTED_CONTACT);

      if (storedId) {
        setMirrorsId(storedId);
        setDisplayName(storedName || `USER_${storedId}`);
        if (storedContacts) setContacts(JSON.parse(storedContacts));
        if (storedSelected) setSelectedContact(JSON.parse(storedSelected));
      } else {
        await registerMirrorsId();
      }
    } catch (error) {
      console.error('Error initializing MIRRORS I.D.:', error);
    }
  };

  const registerMirrorsId = async () => {
    setIsRegistering(true);
    try {
      let deviceId = await AsyncStorage.getItem(STORAGE_KEYS.DEVICE_ID);
      if (!deviceId) {
        deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        await AsyncStorage.setItem(STORAGE_KEYS.DEVICE_ID, deviceId);
      }

      const response = await fetch(`${API_BASE}/api/mirrors/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ display_name: '', device_id: deviceId }),
      });

      if (response.ok) {
        const data = await response.json();
        setMirrorsId(data.mirrors_id);
        setDisplayName(data.display_name);
        await AsyncStorage.setItem(STORAGE_KEYS.MIRRORS_ID, data.mirrors_id);
        await AsyncStorage.setItem(STORAGE_KEYS.DISPLAY_NAME, data.display_name);
        if (data.contacts) {
          setContacts(data.contacts);
          await AsyncStorage.setItem(STORAGE_KEYS.CONTACTS, JSON.stringify(data.contacts));
        }
      }
    } catch (error) {
      console.error('Error registering MIRRORS I.D.:', error);
    }
    setIsRegistering(false);
  };

  const loadChirpHistory = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.CHIRP_HISTORY);
      if (stored) setChirpHistory(JSON.parse(stored));
    } catch {}
  };

  const saveChirpToHistory = async (chirp: ChirpMessage) => {
    const updated = [chirp, ...chirpHistory].slice(0, 50); // Keep last 50
    setChirpHistory(updated);
    await AsyncStorage.setItem(STORAGE_KEYS.CHIRP_HISTORY, JSON.stringify(updated));
  };

  // ═══════════════════════════════════
  // PERMISSIONS
  // ═══════════════════════════════════
  useEffect(() => {
    (async () => {
      if (Platform.OS !== 'web') {
        try {
          const { status: audioStatus } = await Audio.requestPermissionsAsync();
          setHasPermission(audioStatus === 'granted');
          if (audioStatus === 'granted') {
            await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
          }

          const { status: cameraStatus } = await Camera.requestCameraPermissionsAsync();
          setHasCameraPermission(cameraStatus === 'granted');
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
      Vibration.vibrate([0, 100, 50, 100, 50, 100]);
    } catch {
      Vibration.vibrate(100);
    }
  };

  // ═══════════════════════════════════
  // WEBSOCKET CONNECTION
  // ═══════════════════════════════════
  const connectWebSocket = useCallback(() => {
    if (!mirrorsId || wsRef.current?.readyState === WebSocket.OPEN) return;

    setConnectionStatus('connecting');

    try {
      const ws = new WebSocket(`${WS_BASE}/api/mirrors/live/${mirrorsId}`);

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
          if (data.type === 'incoming_chirp') {
            await playIncomingChirp();
            setIsReceiving(true);
            setIncomingFrom(data.from_display_name || data.from_mirrors_id);

            // Add to history
            const newChirp: ChirpMessage = {
              id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              type: data.chirp_type || 'voice',
              from_mirrors_id: data.from_mirrors_id,
              to_mirrors_id: mirrorsId || '',
              from_display_name: data.from_display_name,
              duration: data.duration || 0,
              timestamp: new Date().toISOString(),
              is_outgoing: false,
              played: false,
            };
            saveChirpToHistory(newChirp);

            Animated.sequence([
              Animated.timing(receiveAnim, { toValue: 1, duration: 200, useNativeDriver: false }),
              Animated.delay(2000),
              Animated.timing(receiveAnim, { toValue: 0, duration: 300, useNativeDriver: false }),
            ]).start(() => {
              setIsReceiving(false);
              setIncomingFrom(null);
            });

            if (data.audio_base64) {
              try {
                if (soundRef.current) await soundRef.current.unloadAsync();
                const { sound } = await Audio.Sound.createAsync(
                  { uri: `data:audio/m4a;base64,${data.audio_base64}` },
                  { shouldPlay: true }
                );
                soundRef.current = sound;
              } catch {}
            }
          }
        } catch {}
      };

      ws.onclose = () => {
        clearInterval((ws as any)._pingInterval);
        setConnectionStatus('offline');
        reconnectTimeoutRef.current = setTimeout(connectWebSocket, 3000);
      };

      ws.onerror = () => setConnectionStatus('offline');

      wsRef.current = ws;
    } catch {
      setConnectionStatus('offline');
      reconnectTimeoutRef.current = setTimeout(connectWebSocket, 5000);
    }
  }, [mirrorsId]);

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
    if (mirrorsId) connectWebSocket();
    return () => disconnectWebSocket();
  }, [mirrorsId]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && mirrorsId) connectWebSocket();
      else if (state === 'background') disconnectWebSocket();
    });
    return () => sub.remove();
  }, [connectWebSocket, disconnectWebSocket, mirrorsId]);

  // ═══════════════════════════════════
  // CONTACTS MANAGEMENT
  // ═══════════════════════════════════
  const lookupContact = async () => {
    if (!newContactId.trim()) return;
    setIsLookingUp(true);
    setLookupResult(null);

    try {
      const response = await fetch(`${API_BASE}/api/mirrors/lookup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mirrors_id: newContactId.trim().toUpperCase() }),
      });

      if (response.ok) {
        const data = await response.json();
        setLookupResult(data);
      } else {
        setLookupResult({ error: 'MIRRORS I.D. not found' });
      }
    } catch {
      setLookupResult({ error: 'Connection error' });
    }
    setIsLookingUp(false);
  };

  const addContact = async () => {
    if (!lookupResult || lookupResult.error || !mirrorsId) return;

    try {
      const response = await fetch(`${API_BASE}/api/mirrors/${mirrorsId}/contacts/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mirrors_id: lookupResult.mirrors_id, nickname: lookupResult.display_name }),
      });

      if (response.ok) {
        const data = await response.json();
        setContacts(data.contacts);
        await AsyncStorage.setItem(STORAGE_KEYS.CONTACTS, JSON.stringify(data.contacts));
        setShowAddContact(false);
        setNewContactId('');
        setLookupResult(null);
      }
    } catch {}
  };

  const removeContact = async (contactId: string) => {
    if (!mirrorsId) return;
    try {
      const response = await fetch(`${API_BASE}/api/mirrors/${mirrorsId}/contacts/remove`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mirrors_id: contactId }),
      });
      if (response.ok) {
        const data = await response.json();
        setContacts(data.contacts);
        await AsyncStorage.setItem(STORAGE_KEYS.CONTACTS, JSON.stringify(data.contacts));
        if (selectedContact?.mirrors_id === contactId) {
          setSelectedContact(null);
          await AsyncStorage.removeItem(STORAGE_KEYS.SELECTED_CONTACT);
        }
      }
    } catch {}
  };

  const selectContact = async (contact: Contact | null) => {
    setSelectedContact(contact);
    if (contact) {
      await AsyncStorage.setItem(STORAGE_KEYS.SELECTED_CONTACT, JSON.stringify(contact));
    } else {
      await AsyncStorage.removeItem(STORAGE_KEYS.SELECTED_CONTACT);
    }
    setActiveTab('chirp');
  };

  const refreshContacts = async () => {
    if (!mirrorsId) return;
    try {
      const response = await fetch(`${API_BASE}/api/mirrors/${mirrorsId}/contacts`);
      if (response.ok) {
        const data = await response.json();
        setContacts(data.contacts);
        await AsyncStorage.setItem(STORAGE_KEYS.CONTACTS, JSON.stringify(data.contacts));
      }
    } catch {}
  };

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
  // PTT TRANSMIT - VOICE
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

    const limit = chirpMode === 'voice' ? VOICE_CHIRP_LIMIT : VIDEO_CHIRP_LIMIT;

    transmitTimerRef.current = setInterval(() => {
      setTransmitDuration(prev => {
        if (prev >= limit - 1) {
          stopTransmit(false); // Auto-stop at limit
          return prev;
        }
        return prev + 0.1;
      });
    }, 100);

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

    if (cancelled || !recordingRef.current) {
      setTransmitDuration(0);
      return;
    }

    try {
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;

      if (uri && transmitDuration > 0.3) {
        setRecordedAudioUri(uri);
        setRecordedDuration(transmitDuration);
        setShowShareModal(true);
        setLastChirpTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      }
    } catch {}

    setTransmitDuration(0);
  };

  // ═══════════════════════════════════
  // SEND CHIRP
  // ═══════════════════════════════════
  const sendDirectChirp = async () => {
    if (!recordedAudioUri || !mirrorsId) {
      setShowShareModal(false);
      return;
    }

    setIsSharing(true);
    try {
      let base64Audio = '';
      if (Platform.OS !== 'web') {
        base64Audio = await FileSystem.readAsStringAsync(recordedAudioUri, { encoding: FileSystem.EncodingType.Base64 });
      }

      const toId = selectedContact?.mirrors_id || 'broadcast';
      const toName = selectedContact?.nickname || selectedContact?.display_name || 'BROADCAST';

      // Add to outgoing history
      const outgoingChirp: ChirpMessage = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: chirpMode,
        from_mirrors_id: mirrorsId,
        to_mirrors_id: toId,
        from_display_name: displayName,
        duration: recordedDuration,
        timestamp: new Date().toISOString(),
        is_outgoing: true,
      };
      saveChirpToHistory(outgoingChirp);

      if (selectedContact) {
        await fetch(`${API_BASE}/api/mirrors/chirp`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to_mirrors_id: selectedContact.mirrors_id,
            from_mirrors_id: mirrorsId,
            from_display_name: displayName,
            audio_base64: base64Audio,
            duration: Math.round(recordedDuration * 10) / 10,
            chirp_type: chirpMode,
          }),
        });
      } else {
        await fetch(`${API_BASE}/api/codes/transmit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            channel_id: 'codes-chirp',
            sender_name: displayName,
            sender_id: mirrorsId,
            audio_base64: base64Audio,
            duration: Math.round(recordedDuration * 10) / 10,
          }),
        });
      }
    } catch {}

    setIsSharing(false);
    setShowShareModal(false);
  };

  const handleShareChirp = async () => {
    if (!recordedAudioUri) return;
    setIsSharing(true);
    try {
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(recordedAudioUri, {
          mimeType: 'audio/m4a',
          dialogTitle: 'CODES Chirp',
          UTI: 'public.audio',
        });
      }
    } catch {}
    setIsSharing(false);
    setShowShareModal(false);
  };

  // ═══════════════════════════════════
  // ANIMATED VALUES
  // ═══════════════════════════════════
  const glowColor = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [chirpMode === 'voice' ? 'rgba(255, 10, 10, 0)' : 'rgba(10, 100, 255, 0)', 
                  chirpMode === 'voice' ? 'rgba(255, 10, 10, 0.4)' : 'rgba(10, 100, 255, 0.4)'],
  });

  const ringScale = ringAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 2] });
  const ringOpacity = ringAnim.interpolate({ inputRange: [0, 0.7, 1], outputRange: [0.5, 0.1, 0] });
  const receiveGlow = receiveAnim.interpolate({ inputRange: [0, 1], outputRange: ['rgba(0, 255, 68, 0)', 'rgba(0, 255, 68, 0.3)'] });

  const formatDuration = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = Math.floor(s % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatTimestamp = (ts: string) => {
    const date = new Date(ts);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString();
  };

  const limit = chirpMode === 'voice' ? VOICE_CHIRP_LIMIT : VIDEO_CHIRP_LIMIT;
  const progressPct = (transmitDuration / limit) * 100;

  // ═══════════════════════════════════
  // CODES MODE HANDLERS
  // ═══════════════════════════════════
  const handleCodesSend = async () => {
    if (!selectedFrequency) return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    // Add to chirp history
    const newChirp: ChirpMessage = {
      id: `codes_${Date.now()}`,
      type: 'codes',
      from_mirrors_id: mirrorsId || 'UNKNOWN',
      to_mirrors_id: selectedContact?.mirrors_id || 'broadcast',
      from_display_name: displayName,
      duration: 0,
      timestamp: new Date().toISOString(),
      is_outgoing: true,
      frequency_name: selectedFrequency.name,
      frequencies: selectedFrequency.frequencies,
    };
    
    const updatedHistory = [newChirp, ...chirpHistory];
    setChirpHistory(updatedHistory);
    await AsyncStorage.setItem(STORAGE_KEYS.CHIRP_HISTORY, JSON.stringify(updatedHistory));
    
    setLastChirpTime(new Date().toLocaleTimeString());
    Alert.alert('CODES Sent', `${selectedFrequency.name} sent${selectedContact ? ` to ${selectedContact.nickname || selectedContact.display_name}` : ' to broadcast'}`);
  };

  const handleCodesShare = async () => {
    if (!selectedFrequency || !viewShotRef.current?.capture) return;
    
    try {
      // Capture a shareable card image
      const uri = await viewShotRef.current.capture();
      const isAvailable = await Sharing.isAvailableAsync();
      
      if (isAvailable) {
        await Sharing.shareAsync(uri, {
          mimeType: 'image/png',
          dialogTitle: `Share ${selectedFrequency.name}`,
          UTI: 'public.png',
        });
      } else {
        // Fallback - share as text
        const message = `🔊 MIRRORS 96 CODES\n\n${selectedFrequency.name}\n${selectedFrequency.frequencies.join(' · ')} Hz\n\n432Hz calibrated frequency from godmodesound.com`;
        Alert.alert('Share CODES', message);
      }
    } catch (error) {
      console.error('Share error:', error);
    }
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

      {/* MIRRORS I.D. Display */}
      <View style={styles.idBar}>
        <Text style={styles.idLabel}>YOUR MIRRORS I.D.</Text>
        <Text style={styles.idValue}>{mirrorsId || '------'}</Text>
        <Text style={styles.idName}>{displayName}</Text>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabBar}>
        <TouchableOpacity style={[styles.tab, activeTab === 'chirp' && styles.tabActive]} onPress={() => setActiveTab('chirp')}>
          <Text style={[styles.tabText, activeTab === 'chirp' && styles.tabTextActive]}>CHIRP</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === 'messages' && styles.tabActive]} onPress={() => setActiveTab('messages')}>
          <Text style={[styles.tabText, activeTab === 'messages' && styles.tabTextActive]}>MESSAGES</Text>
          {chirpHistory.filter(c => !c.played && !c.is_outgoing).length > 0 && (
            <View style={styles.badge}><Text style={styles.badgeText}>{chirpHistory.filter(c => !c.played && !c.is_outgoing).length}</Text></View>
          )}
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === 'contacts' && styles.tabActive]} onPress={() => { setActiveTab('contacts'); refreshContacts(); }}>
          <Text style={[styles.tabText, activeTab === 'contacts' && styles.tabTextActive]}>CONTACTS</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === 'settings' && styles.tabActive]} onPress={() => setActiveTab('settings')}>
          <Text style={[styles.tabText, activeTab === 'settings' && styles.tabTextActive]}>⚙</Text>
        </TouchableOpacity>
      </View>

      {/* CHIRP TAB */}
      {activeTab === 'chirp' && (
        <View style={styles.mainArea}>
          {/* Mode Toggle */}
          <View style={styles.modeToggle}>
            <TouchableOpacity style={[styles.modeBtn, chirpMode === 'voice' && styles.modeBtnActive]} onPress={() => setChirpMode('voice')}>
              <Text style={[styles.modeBtnText, chirpMode === 'voice' && styles.modeBtnTextActive]}>🎤 VOICE</Text>
              <Text style={styles.modeLimit}>{VOICE_CHIRP_LIMIT}s limit</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.modeBtn, chirpMode === 'video' && styles.modeBtnActiveVideo]} onPress={() => setChirpMode('video')}>
              <Text style={[styles.modeBtnText, chirpMode === 'video' && styles.modeBtnTextActive]}>📹 VIDEO</Text>
              <Text style={styles.modeLimit}>{VIDEO_CHIRP_LIMIT}s limit</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.modeBtn, chirpMode === 'codes' && styles.modeBtnActiveCodes]} onPress={() => setChirpMode('codes')}>
              <Text style={[styles.modeBtnText, chirpMode === 'codes' && styles.modeBtnTextActive]}>◎ CODES</Text>
              <Text style={styles.modeLimit}>3s = share</Text>
            </TouchableOpacity>
          </View>

          {/* Selected Contact Display */}
          {selectedContact ? (
            <View style={styles.selectedContactBar}>
              <Text style={styles.selectedLabel}>CHIRPING TO:</Text>
              <Text style={styles.selectedName}>{selectedContact.nickname || selectedContact.display_name}</Text>
              <Text style={styles.selectedId}>{selectedContact.mirrors_id}</Text>
              <TouchableOpacity onPress={() => selectContact(null)}><Text style={styles.clearSelected}>✕</Text></TouchableOpacity>
            </View>
          ) : (
            <View style={styles.broadcastBar}>
              <Text style={styles.broadcastText}>◉ BROADCAST MODE</Text>
              <Text style={styles.broadcastSub}>Tap CONTACTS to select recipient</Text>
            </View>
          )}

          {/* Progress indicator when recording */}
          {isTransmitting && (
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${progressPct}%` }, chirpMode === 'video' && styles.progressFillVideo]} />
              </View>
              <Text style={styles.progressText}>{formatDuration(transmitDuration)} / {formatDuration(limit)}</Text>
            </View>
          )}

          {/* Incoming indicator */}
          {isReceiving && (
            <Animated.View style={[styles.receiveIndicator, { backgroundColor: receiveGlow }]}>
              <Text style={styles.receiveText}>◉ INCOMING</Text>
              {incomingFrom && <Text style={styles.receiverName}>{incomingFrom}</Text>}
            </Animated.View>
          )}

          {/* THE BUTTON - Voice/Video modes */}
          {(chirpMode === 'voice' || chirpMode === 'video') && (
            <View style={styles.pttWrapper}>
              {isTransmitting && (
                <Animated.View style={[styles.pttRing, { transform: [{ scale: ringScale }], opacity: ringOpacity }, chirpMode === 'video' && styles.pttRingVideo]} />
              )}
              <Animated.View style={[styles.pttGlow, { backgroundColor: glowColor }]} />
              <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                <TouchableOpacity
                  onPressIn={startTransmit}
                  onPressOut={() => stopTransmit(false)}
                  activeOpacity={0.9}
                >
                  <ImageBackground
                    source={require('../assets/images/chirp-button-bg.jpg')}
                    style={[styles.pttButton, isTransmitting && styles.pttButtonActive, chirpMode === 'video' && styles.pttButtonVideo]}
                    imageStyle={styles.pttButtonImage}
                    resizeMode="cover"
                  >
                    <View style={styles.pttButtonOverlay}>
                      <Text style={[styles.pttIcon, { color: isTransmitting ? '#fff' : '#ff0a0a' }]}>{isTransmitting ? 'Ω' : 'Α'}</Text>
                      <Text style={[styles.pttMainText, chirpMode === 'video' && styles.pttMainTextVideo]}>
                        {chirpMode === 'voice' ? 'VOICE' : 'VIDEO'}
                      </Text>
                      <Text style={[styles.pttSubText, isTransmitting && { color: '#ff6060' }]}>{isTransmitting ? 'Ω RELEASE' : 'Α HOLD'}</Text>
                    </View>
                  </ImageBackground>
                </TouchableOpacity>
              </Animated.View>
            </View>
          )}

          {/* CODES MODE - Frequency Selection & Send */}
          {chirpMode === 'codes' && (
            <View style={styles.codesContainer}>
              {/* Frequency Picker Button */}
              <TouchableOpacity 
                style={styles.freqPickerBtn} 
                onPress={() => setShowFrequencyPicker(true)}
              >
                {selectedFrequency ? (
                  <View style={styles.selectedFreqDisplay}>
                    <Text style={styles.selectedFreqName}>{selectedFrequency.name}</Text>
                    <Text style={styles.selectedFreqHz}>{selectedFrequency.frequencies.join(' · ')} Hz</Text>
                  </View>
                ) : (
                  <View style={styles.selectFreqPrompt}>
                    <Text style={styles.selectFreqIcon}>◎</Text>
                    <Text style={styles.selectFreqText}>SELECT FREQUENCY FROM ARCHIVE</Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* CODES Send Button */}
              {selectedFrequency && (
                <View style={styles.codesSendWrapper}>
                  <TouchableOpacity
                    style={[styles.codesSendBtn, codesHoldProgress > 0 && styles.codesSendBtnHolding]}
                    onPressIn={() => {
                      // Start hold timer for 3-second AirDrop/Share
                      setCodesHoldProgress(0);
                      const startTime = Date.now();
                      codesHoldIntervalRef.current = setInterval(() => {
                        const elapsed = (Date.now() - startTime) / 1000;
                        setCodesHoldProgress(Math.min(elapsed / 3, 1));
                        if (elapsed >= 3) {
                          // Trigger AirDrop/Share
                          if (codesHoldIntervalRef.current) clearInterval(codesHoldIntervalRef.current);
                          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                          handleCodesShare();
                        }
                      }, 50);
                    }}
                    onPressOut={() => {
                      if (codesHoldIntervalRef.current) clearInterval(codesHoldIntervalRef.current);
                      if (codesHoldProgress < 1) {
                        // Quick tap = send via platform
                        handleCodesSend();
                      }
                      setCodesHoldProgress(0);
                    }}
                    activeOpacity={0.9}
                  >
                    <ImageBackground
                      source={require('../assets/images/chirp-button-bg.jpg')}
                      style={styles.pttButton}
                      imageStyle={styles.pttButtonImage}
                      resizeMode="cover"
                    >
                      <View style={styles.pttButtonOverlay}>
                        <Text style={[styles.pttIcon, { color: '#ff0a0a' }]}>◎</Text>
                        <Text style={styles.pttMainText}>CODES</Text>
                        <Text style={styles.pttSubText}>{codesHoldProgress > 0 ? `${Math.floor(codesHoldProgress * 3)}s...` : 'TAP=SEND · HOLD=SHARE'}</Text>
                      </View>
                    </ImageBackground>
                  </TouchableOpacity>
                  {/* Hold progress ring */}
                  {codesHoldProgress > 0 && (
                    <View style={[styles.codesProgressRing, { opacity: codesHoldProgress }]}>
                      <View style={[styles.codesProgressFill, { height: `${codesHoldProgress * 100}%` }]} />
                    </View>
                  )}
                </View>
              )}

              <Text style={styles.codesHint}>
                {selectedFrequency 
                  ? 'TAP to send via platform · HOLD 3s for AirDrop/Text'
                  : 'Choose a frequency to send to contacts'}
              </Text>
            </View>
          )}

          {lastChirpTime && !isTransmitting && <Text style={styles.lastChirp}>Last chirp: {lastChirpTime}</Text>}
        </View>
      )}

      {/* MESSAGES TAB */}
      {activeTab === 'messages' && (
        <FlatList
          data={chirpHistory}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 20 }}
          ListEmptyComponent={<Text style={styles.noMessages}>No messages yet. Send or receive a chirp!</Text>}
          renderItem={({ item }) => (
            <View style={[styles.messageRow, item.is_outgoing && styles.messageRowOutgoing]}>
              <View style={styles.messageIcon}>
                <Text style={styles.messageIconText}>{item.type === 'voice' ? '🎤' : '📹'}</Text>
              </View>
              <View style={styles.messageContent}>
                <View style={styles.messageHeader}>
                  <Text style={styles.messageName}>
                    {item.is_outgoing ? `→ ${item.to_mirrors_id === 'broadcast' ? 'BROADCAST' : item.to_mirrors_id}` : item.from_display_name}
                  </Text>
                  <Text style={styles.messageTime}>{formatTimestamp(item.timestamp)}</Text>
                </View>
                <View style={styles.messageBody}>
                  <View style={styles.waveform}>
                    {[...Array(20)].map((_, i) => (
                      <View key={i} style={[styles.waveBar, { height: 4 + Math.random() * 12 }]} />
                    ))}
                  </View>
                  <Text style={styles.messageDuration}>{formatDuration(item.duration)}</Text>
                </View>
                <Text style={styles.messageType}>{item.type.toUpperCase()} CHIRP</Text>
              </View>
            </View>
          )}
        />
      )}

      {/* CONTACTS TAB */}
      {activeTab === 'contacts' && (
        <ScrollView style={styles.contactsArea} contentContainerStyle={{ paddingBottom: 20 }}>
          <TouchableOpacity style={styles.addContactBtn} onPress={() => setShowAddContact(true)}>
            <Text style={styles.addContactText}>+ ADD CONTACT BY MIRRORS I.D.</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.contactRow, !selectedContact && styles.contactRowSelected]} onPress={() => selectContact(null)}>
            <View style={styles.contactIcon}><Text style={styles.contactIconText}>◉</Text></View>
            <View style={styles.contactInfo}>
              <Text style={styles.contactName}>BROADCAST</Text>
              <Text style={styles.contactId}>Send to all CODES users</Text>
            </View>
            {!selectedContact && <Text style={styles.contactCheck}>✓</Text>}
          </TouchableOpacity>

          {contacts.map((contact) => (
            <TouchableOpacity
              key={contact.mirrors_id}
              style={[styles.contactRow, selectedContact?.mirrors_id === contact.mirrors_id && styles.contactRowSelected]}
              onPress={() => selectContact(contact)}
              onLongPress={() => {
                Alert.alert('Remove Contact', `Remove ${contact.nickname || contact.display_name}?`, [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Remove', style: 'destructive', onPress: () => removeContact(contact.mirrors_id) },
                ]);
              }}
            >
              <View style={[styles.contactIcon, contact.is_online && styles.contactIconOnline]}>
                <Text style={styles.contactIconText}>{contact.display_name?.charAt(0) || '?'}</Text>
              </View>
              <View style={styles.contactInfo}>
                <Text style={styles.contactName}>{contact.nickname || contact.display_name}</Text>
                <Text style={styles.contactId}>{contact.mirrors_id}</Text>
              </View>
              {selectedContact?.mirrors_id === contact.mirrors_id && <Text style={styles.contactCheck}>✓</Text>}
            </TouchableOpacity>
          ))}

          {contacts.length === 0 && <Text style={styles.noContacts}>No contacts yet. Add someone by their MIRRORS I.D.</Text>}
        </ScrollView>
      )}

      {/* SETTINGS TAB */}
      {activeTab === 'settings' && (
        <ScrollView style={styles.settingsArea} contentContainerStyle={{ paddingBottom: 20 }}>
          <View style={styles.settingSection}>
            <Text style={styles.settingSectionTitle}>YOUR MIRRORS I.D.</Text>
            <View style={styles.idCard}>
              <Text style={styles.idCardValue}>{mirrorsId || '------'}</Text>
              <Text style={styles.idCardHint}>Share this code with others to connect</Text>
            </View>
          </View>

          <View style={styles.settingSection}>
            <Text style={styles.settingSectionTitle}>DISPLAY NAME</Text>
            <TextInput
              style={styles.settingInput}
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Enter your name..."
              placeholderTextColor="#3a1010"
              onEndEditing={async () => {
                await AsyncStorage.setItem(STORAGE_KEYS.DISPLAY_NAME, displayName);
                if (mirrorsId) {
                  try {
                    await fetch(`${API_BASE}/api/mirrors/${mirrorsId}/display_name?display_name=${encodeURIComponent(displayName)}`, { method: 'PUT' });
                  } catch {}
                }
              }}
            />
          </View>

          <View style={styles.settingSection}>
            <Text style={styles.settingSectionTitle}>CHIRP LIMITS</Text>
            <View style={styles.limitsInfo}>
              <View style={styles.limitRow}><Text style={styles.limitLabel}>🎤 Voice:</Text><Text style={styles.limitValue}>{VOICE_CHIRP_LIMIT} seconds</Text></View>
              <View style={styles.limitRow}><Text style={styles.limitLabel}>📹 Video:</Text><Text style={styles.limitValue}>{VIDEO_CHIRP_LIMIT} seconds</Text></View>
            </View>
          </View>

          <View style={styles.settingSection}>
            <Text style={styles.settingSectionTitle}>iPHONE ACTION BUTTON</Text>
            <Text style={styles.settingHint}>Settings → Action Button → Shortcut → "Open CODES I.D."</Text>
            <TouchableOpacity style={styles.settingBtn} onPress={() => { if (Platform.OS === 'ios') Linking.openURL('app-settings:'); }}>
              <Text style={styles.settingBtnText}>OPEN SETTINGS</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {/* ADD CONTACT MODAL */}
      <Modal visible={showAddContact} transparent animationType="fade" onRequestClose={() => setShowAddContact(false)}>
        <View style={modalStyles.overlay}>
          <View style={modalStyles.container}>
            <Text style={modalStyles.title}>ADD CONTACT</Text>
            <Text style={modalStyles.subtitle}>Enter their MIRRORS I.D.</Text>
            <TextInput style={modalStyles.input} value={newContactId} onChangeText={setNewContactId} placeholder="e.g. ABC123" placeholderTextColor="#3a1010" autoCapitalize="characters" maxLength={6} />
            <TouchableOpacity style={modalStyles.lookupBtn} onPress={lookupContact} disabled={isLookingUp}>
              {isLookingUp ? <ActivityIndicator color="#ff0a0a" size="small" /> : <Text style={modalStyles.lookupBtnText}>LOOKUP</Text>}
            </TouchableOpacity>
            {lookupResult && (
              <View style={modalStyles.resultBox}>
                {lookupResult.error ? <Text style={modalStyles.errorText}>{lookupResult.error}</Text> : (
                  <>
                    <Text style={modalStyles.resultName}>{lookupResult.display_name}</Text>
                    <Text style={modalStyles.resultId}>{lookupResult.mirrors_id}</Text>
                    <TouchableOpacity style={modalStyles.addBtn} onPress={addContact}><Text style={modalStyles.addBtnText}>+ ADD TO CONTACTS</Text></TouchableOpacity>
                  </>
                )}
              </View>
            )}
            <TouchableOpacity style={modalStyles.cancelBtn} onPress={() => { setShowAddContact(false); setNewContactId(''); setLookupResult(null); }}>
              <Text style={modalStyles.cancelBtnText}>CANCEL</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* SHARE CHIRP MODAL */}
      <Modal visible={showShareModal} animationType="fade" transparent onRequestClose={() => setShowShareModal(false)}>
        <View style={shareStyles.overlay}>
          <View style={shareStyles.container}>
            <Text style={shareStyles.title}>{chirpMode === 'voice' ? '🎤 VOICE' : '📹 VIDEO'} CHIRP RECORDED</Text>
            <Text style={shareStyles.duration}>{formatDuration(recordedDuration)}</Text>
            <View style={shareStyles.waveformLarge}>
              {[...Array(30)].map((_, i) => (
                <View key={i} style={[shareStyles.waveBarLarge, { height: 10 + Math.sin(i * 0.5) * 20 + Math.random() * 10 }]} />
              ))}
            </View>
            <Text style={shareStyles.toText}>{selectedContact ? `TO: ${selectedContact.nickname || selectedContact.mirrors_id}` : 'BROADCAST TO ALL'}</Text>
            <View style={shareStyles.actionRow}>
              <TouchableOpacity style={shareStyles.sendBtn} onPress={sendDirectChirp} disabled={isSharing}>
                {isSharing ? <ActivityIndicator color="#000" size="small" /> : <Text style={shareStyles.sendBtnText}>{selectedContact ? '▶ SEND' : '◉ BROADCAST'}</Text>}
              </TouchableOpacity>
              <TouchableOpacity style={shareStyles.shareBtn} onPress={handleShareChirp} disabled={isSharing}>
                <Text style={shareStyles.shareBtnText}>SHARE</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={shareStyles.cancelBtn} onPress={() => setShowShareModal(false)}><Text style={shareStyles.cancelBtnText}>CANCEL</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* FREQUENCY PICKER MODAL */}
      <Modal visible={showFrequencyPicker} transparent animationType="slide" onRequestClose={() => setShowFrequencyPicker(false)}>
        <View style={freqPickerStyles.overlay}>
          <View style={freqPickerStyles.container}>
            <View style={freqPickerStyles.header}>
              <Text style={freqPickerStyles.title}>SELECT FREQUENCY</Text>
              <TouchableOpacity onPress={() => setShowFrequencyPicker(false)}>
                <Text style={freqPickerStyles.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>
            <Text style={freqPickerStyles.subtitle}>Choose from the archive to send</Text>
            <FlatList
              data={FREQUENCY_ARCHIVE.slice(0, 50)}
              keyExtractor={(item, idx) => `${item.name}-${idx}`}
              contentContainerStyle={{ paddingBottom: 20 }}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={[freqPickerStyles.freqItem, selectedFrequency?.name === item.name && freqPickerStyles.freqItemSelected]}
                  onPress={() => {
                    setSelectedFrequency({ name: item.name, frequencies: item.frequencies });
                    setShowFrequencyPicker(false);
                  }}
                >
                  <View style={freqPickerStyles.freqInfo}>
                    <Text style={freqPickerStyles.freqName}>{item.name}</Text>
                    <Text style={freqPickerStyles.freqHz}>{item.frequencies.join(' · ')} Hz</Text>
                  </View>
                  <Text style={freqPickerStyles.freqCategory}>{item.category.toUpperCase()}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ═══════════════════════════════════
// STYLES
// ═══════════════════════════════════
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#1a0808' },
  backBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  backText: { color: '#ff0a0a', fontSize: 20 },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { color: '#ff0a0a', fontSize: 28, fontWeight: '900', letterSpacing: 8, fontFamily: 'TerminatorRealNFI' },
  headerSub: { color: '#5a1a1a', fontSize: 12, letterSpacing: 8, marginTop: 2, fontFamily: 'TerminatorRealNFI' },
  statusArea: { width: 44, alignItems: 'center' },
  statusDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#ff0a0a', marginBottom: 4 },
  statusDotOnline: { backgroundColor: '#00ff44' },
  statusText: { color: '#5a1a1a', fontSize: 8, letterSpacing: 2, fontFamily: 'TerminatorRealNFI' },

  idBar: { alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#1a0808', backgroundColor: '#050202' },
  idLabel: { color: '#3a1010', fontSize: 8, letterSpacing: 2, fontFamily: 'TerminatorRealNFI' },
  idValue: { color: '#ff0a0a', fontSize: 24, fontWeight: '900', letterSpacing: 6, marginTop: 4, fontFamily: 'TerminatorRealNFI' },
  idName: { color: '#5a1a1a', fontSize: 10, marginTop: 2, fontFamily: 'TerminatorRealNFI' },

  tabBar: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#1a0808' },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', backgroundColor: '#050202', flexDirection: 'row', justifyContent: 'center' },
  tabActive: { backgroundColor: '#0a0505', borderBottomWidth: 2, borderBottomColor: '#ff0a0a' },
  tabText: { color: '#3a1010', fontSize: 9, fontWeight: '700', letterSpacing: 1, fontFamily: 'TerminatorRealNFI' },
  tabTextActive: { color: '#ff0a0a' },
  badge: { backgroundColor: '#ff0a0a', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2, marginLeft: 4 },
  badgeText: { color: '#000', fontSize: 9, fontWeight: '900' },

  mainArea: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 },

  modeToggle: { flexDirection: 'row', position: 'absolute', top: 12, gap: 8 },
  modeBtn: { paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: '#2a0a0a', backgroundColor: '#050202', alignItems: 'center' },
  modeBtnActive: { borderColor: '#ff0a0a', backgroundColor: '#1a0505' },
  modeBtnActiveVideo: { borderColor: '#0a64ff', backgroundColor: '#050a1a' },
  modeBtnActiveCodes: { borderColor: '#ffa500', backgroundColor: '#1a0f05' },
  modeBtnText: { color: '#5a1a1a', fontSize: 10, fontWeight: '700', fontFamily: 'TerminatorRealNFI' },
  modeBtnTextActive: { color: '#fff' },
  modeLimit: { color: '#3a1010', fontSize: 7, marginTop: 2 },

  selectedContactBar: { position: 'absolute', top: 60, alignItems: 'center', backgroundColor: '#0a0505', borderWidth: 1, borderColor: '#ff0a0a40', padding: 10, width: '100%' },
  selectedLabel: { color: '#3a1010', fontSize: 8, letterSpacing: 2, fontFamily: 'TerminatorRealNFI' },
  selectedName: { color: '#ff0a0a', fontSize: 14, fontWeight: '700', marginTop: 2, fontFamily: 'TerminatorRealNFI' },
  selectedId: { color: '#5a1a1a', fontSize: 10, marginTop: 2, fontFamily: 'TerminatorRealNFI' },
  clearSelected: { color: '#ff0a0a', fontSize: 16, marginTop: 6 },

  broadcastBar: { position: 'absolute', top: 60, alignItems: 'center' },
  broadcastText: { color: '#ff0a0a', fontSize: 12, fontWeight: '700', letterSpacing: 2, fontFamily: 'TerminatorRealNFI' },
  broadcastSub: { color: '#3a1010', fontSize: 9, marginTop: 4 },

  progressContainer: { position: 'absolute', top: 110, width: '100%', alignItems: 'center' },
  progressBar: { width: '80%', height: 4, backgroundColor: '#1a0808', borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#ff0a0a' },
  progressFillVideo: { backgroundColor: '#0a64ff' },
  progressText: { color: '#ff0a0a', fontSize: 10, marginTop: 4, fontFamily: 'TerminatorRealNFI' },

  receiveIndicator: { position: 'absolute', top: 130, left: 20, right: 20, paddingVertical: 12, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: '#00ff4440' },
  receiveText: { color: '#00ff44', fontSize: 14, fontWeight: '900', letterSpacing: 4, fontFamily: 'TerminatorRealNFI' },
  receiverName: { color: '#00ff44', fontSize: 10, letterSpacing: 2, marginTop: 4, opacity: 0.7, fontFamily: 'TerminatorRealNFI' },

  pttWrapper: { alignItems: 'center', justifyContent: 'center', width: 200, height: 200 },
  pttRing: { position: 'absolute', width: 160, height: 160, borderRadius: 80, borderWidth: 2, borderColor: '#ff0a0a' },
  pttRingVideo: { borderColor: '#0a64ff' },
  pttGlow: { position: 'absolute', width: 180, height: 180, borderRadius: 90 },
  pttButton: { width: 160, height: 160, borderRadius: 80, overflow: 'hidden', borderWidth: 4, borderColor: '#2a0a0a', justifyContent: 'center', alignItems: 'center' },
  pttButtonImage: { borderRadius: 76 },
  pttButtonOverlay: { flex: 1, width: '100%', justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.35)' },
  pttButtonActive: { borderColor: '#ff0a0a' },
  pttButtonVideo: { borderColor: '#0a2a4a' },
  pttIcon: { fontSize: 36, marginBottom: 6, color: '#ff0a0a', textShadowColor: '#000', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
  pttMainText: { color: '#fff', fontSize: 20, fontWeight: '900', letterSpacing: 4, fontFamily: 'TerminatorRealNFI', textShadowColor: '#000', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
  pttMainTextVideo: { color: '#0a64ff' },
  pttSubText: { color: '#aaa', fontSize: 8, letterSpacing: 1, marginTop: 6, fontFamily: 'TerminatorRealNFI', textShadowColor: '#000', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },

  lastChirp: { color: '#3a1010', fontSize: 10, letterSpacing: 1, marginTop: 20, fontFamily: 'TerminatorRealNFI' },

  // Codes Mode
  codesContainer: { flex: 1, width: '100%', paddingHorizontal: 20, paddingTop: 80, alignItems: 'center' },
  freqPickerBtn: { width: '100%', backgroundColor: '#050202', borderWidth: 1, borderColor: '#ffa500', padding: 16, marginBottom: 20 },
  selectedFreqDisplay: { alignItems: 'center' },
  selectedFreqName: { color: '#ffa500', fontSize: 14, fontWeight: '700', textAlign: 'center', fontFamily: 'TerminatorRealNFI' },
  selectedFreqHz: { color: '#ff0a0a', fontSize: 11, marginTop: 6, fontFamily: 'TerminatorRealNFI' },
  selectFreqPrompt: { alignItems: 'center', paddingVertical: 8 },
  selectFreqIcon: { color: '#ffa500', fontSize: 32, marginBottom: 8 },
  selectFreqText: { color: '#5a1a1a', fontSize: 10, letterSpacing: 2, fontFamily: 'TerminatorRealNFI' },
  codesSendWrapper: { position: 'relative', alignItems: 'center', justifyContent: 'center' },
  codesSendBtn: {},
  codesSendBtnHolding: { opacity: 0.9 },
  codesProgressRing: { position: 'absolute', width: 180, height: 180, borderRadius: 90, borderWidth: 3, borderColor: '#ffa500', overflow: 'hidden' },
  codesProgressFill: { position: 'absolute', bottom: 0, width: '100%', backgroundColor: 'rgba(255,165,0,0.3)' },
  codesHint: { color: '#5a1a1a', fontSize: 9, textAlign: 'center', marginTop: 20, letterSpacing: 1, fontFamily: 'TerminatorRealNFI' },

  // Messages
  noMessages: { color: '#3a1010', fontSize: 11, textAlign: 'center', marginTop: 40 },
  messageRow: { flexDirection: 'row', backgroundColor: '#050202', borderWidth: 1, borderColor: '#1a0808', padding: 12, marginBottom: 8, borderLeftWidth: 3, borderLeftColor: '#00ff44' },
  messageRowOutgoing: { borderLeftColor: '#ff0a0a' },
  messageIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#1a0808', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  messageIconText: { fontSize: 16 },
  messageContent: { flex: 1 },
  messageHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  messageName: { color: '#ff0a0a', fontSize: 12, fontWeight: '700', fontFamily: 'TerminatorRealNFI' },
  messageTime: { color: '#3a1010', fontSize: 9 },
  messageBody: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  waveform: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 2 },
  waveBar: { width: 3, backgroundColor: '#ff0a0a40', borderRadius: 1 },
  messageDuration: { color: '#5a1a1a', fontSize: 10, fontFamily: 'TerminatorRealNFI' },
  messageType: { color: '#3a1010', fontSize: 8, marginTop: 4, letterSpacing: 1 },

  // Contacts
  contactsArea: { flex: 1, paddingHorizontal: 16, paddingTop: 12 },
  addContactBtn: { backgroundColor: '#0a0505', borderWidth: 1, borderColor: '#ff0a0a', paddingVertical: 14, alignItems: 'center', marginBottom: 12 },
  addContactText: { color: '#ff0a0a', fontSize: 11, fontWeight: '700', letterSpacing: 2, fontFamily: 'TerminatorRealNFI' },
  contactRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#050202', borderWidth: 1, borderColor: '#1a0808', padding: 12, marginBottom: 8 },
  contactRowSelected: { borderColor: '#ff0a0a', backgroundColor: '#0a0505' },
  contactIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#1a0808', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  contactIconOnline: { backgroundColor: '#0a2a0a', borderWidth: 1, borderColor: '#00ff44' },
  contactIconText: { color: '#ff0a0a', fontSize: 16, fontWeight: '700' },
  contactInfo: { flex: 1 },
  contactName: { color: '#ff0a0a', fontSize: 13, fontWeight: '700', fontFamily: 'TerminatorRealNFI' },
  contactId: { color: '#5a1a1a', fontSize: 10, marginTop: 2, fontFamily: 'TerminatorRealNFI' },
  contactCheck: { color: '#ff0a0a', fontSize: 18, marginLeft: 12 },
  noContacts: { color: '#3a1010', fontSize: 11, textAlign: 'center', marginTop: 20 },

  // Settings
  settingsArea: { flex: 1, paddingHorizontal: 16, paddingTop: 12 },
  settingSection: { marginBottom: 20 },
  settingSectionTitle: { color: '#ff0a0a', fontSize: 10, fontWeight: '700', letterSpacing: 2, marginBottom: 8, fontFamily: 'TerminatorRealNFI' },
  idCard: { backgroundColor: '#050202', borderWidth: 1, borderColor: '#ff0a0a40', padding: 16, alignItems: 'center' },
  idCardValue: { color: '#ff0a0a', fontSize: 28, fontWeight: '900', letterSpacing: 6, fontFamily: 'TerminatorRealNFI' },
  idCardHint: { color: '#3a1010', fontSize: 9, marginTop: 8, textAlign: 'center' },
  settingInput: { backgroundColor: '#050202', borderWidth: 1, borderColor: '#2a0a0a', color: '#ff0a0a', fontSize: 14, padding: 12 },
  limitsInfo: { backgroundColor: '#050202', borderWidth: 1, borderColor: '#1a0808', padding: 12 },
  limitRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  limitLabel: { color: '#5a1a1a', fontSize: 12 },
  limitValue: { color: '#ff0a0a', fontSize: 12, fontFamily: 'TerminatorRealNFI' },
  settingHint: { color: '#3a1010', fontSize: 10, marginBottom: 12 },
  settingBtn: { backgroundColor: '#050202', borderWidth: 1, borderColor: '#2a0a0a', paddingVertical: 12, alignItems: 'center' },
  settingBtnText: { color: '#5a1a1a', fontSize: 10, letterSpacing: 2, fontFamily: 'TerminatorRealNFI' },
});

const modalStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' },
  container: { width: SCREEN_WIDTH - 40, backgroundColor: '#0a0505', borderWidth: 1, borderColor: '#ff0a0a30', padding: 24 },
  title: { color: '#ff0a0a', fontSize: 18, fontWeight: '900', letterSpacing: 4, textAlign: 'center', fontFamily: 'TerminatorRealNFI' },
  subtitle: { color: '#5a1a1a', fontSize: 10, textAlign: 'center', marginTop: 8, fontFamily: 'TerminatorRealNFI' },
  input: { backgroundColor: '#050202', borderWidth: 1, borderColor: '#2a0a0a', color: '#ff0a0a', fontSize: 24, padding: 16, textAlign: 'center', marginTop: 20, letterSpacing: 6, fontFamily: 'TerminatorRealNFI' },
  lookupBtn: { backgroundColor: '#ff0a0a', paddingVertical: 14, alignItems: 'center', marginTop: 16 },
  lookupBtnText: { color: '#000', fontSize: 12, fontWeight: '900', letterSpacing: 2, fontFamily: 'TerminatorRealNFI' },
  resultBox: { backgroundColor: '#050202', borderWidth: 1, borderColor: '#ff0a0a40', padding: 16, marginTop: 16, alignItems: 'center' },
  resultName: { color: '#ff0a0a', fontSize: 16, fontWeight: '700', fontFamily: 'TerminatorRealNFI' },
  resultId: { color: '#5a1a1a', fontSize: 12, marginTop: 4, fontFamily: 'TerminatorRealNFI' },
  addBtn: { backgroundColor: '#ff0a0a', paddingVertical: 12, paddingHorizontal: 20, marginTop: 12 },
  addBtnText: { color: '#000', fontSize: 11, fontWeight: '900', letterSpacing: 1, fontFamily: 'TerminatorRealNFI' },
  errorText: { color: '#ff0a0a', fontSize: 12, fontFamily: 'TerminatorRealNFI' },
  cancelBtn: { marginTop: 16, paddingVertical: 12, alignItems: 'center' },
  cancelBtnText: { color: '#5a1a1a', fontSize: 11, letterSpacing: 2, fontFamily: 'TerminatorRealNFI' },
});

const shareStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' },
  container: { width: SCREEN_WIDTH - 40, backgroundColor: '#0a0505', borderWidth: 1, borderColor: '#ff0a0a30', padding: 20, alignItems: 'center' },
  title: { color: '#ff0a0a', fontSize: 14, fontWeight: '900', letterSpacing: 2, fontFamily: 'TerminatorRealNFI' },
  duration: { color: '#fff', fontSize: 36, fontWeight: '300', marginTop: 8, fontFamily: 'TerminatorRealNFI' },
  waveformLarge: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3, marginTop: 20, marginBottom: 16 },
  waveBarLarge: { width: 6, backgroundColor: '#ff0a0a', borderRadius: 3 },
  toText: { color: '#5a1a1a', fontSize: 10, letterSpacing: 2, marginBottom: 16, fontFamily: 'TerminatorRealNFI' },
  actionRow: { flexDirection: 'row', gap: 12, width: '100%' },
  sendBtn: { flex: 2, backgroundColor: '#ff0a0a', paddingVertical: 14, alignItems: 'center' },
  sendBtnText: { color: '#000', fontSize: 11, fontWeight: '900', letterSpacing: 2, fontFamily: 'TerminatorRealNFI' },
  shareBtn: { flex: 1, backgroundColor: '#050202', borderWidth: 1, borderColor: '#ff0a0a', paddingVertical: 14, alignItems: 'center' },
  shareBtnText: { color: '#ff0a0a', fontSize: 11, fontWeight: '700', letterSpacing: 1, fontFamily: 'TerminatorRealNFI' },
  cancelBtn: { marginTop: 12, paddingVertical: 12, alignItems: 'center' },
  cancelBtnText: { color: '#5a1a1a', fontSize: 10, letterSpacing: 2, fontFamily: 'TerminatorRealNFI' },
});

const freqPickerStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'flex-end' },
  container: { height: '70%', backgroundColor: '#0a0505', borderTopWidth: 2, borderTopColor: '#ff0a0a' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#1a0808' },
  title: { color: '#ff0a0a', fontSize: 16, fontWeight: '900', letterSpacing: 4, fontFamily: 'TerminatorRealNFI' },
  closeBtn: { color: '#ff0a0a', fontSize: 20 },
  subtitle: { color: '#5a1a1a', fontSize: 10, textAlign: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#1a0808', fontFamily: 'TerminatorRealNFI' },
  freqItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#1a0808' },
  freqItemSelected: { backgroundColor: '#1a0808' },
  freqInfo: { flex: 1 },
  freqName: { color: '#ff0a0a', fontSize: 13, fontWeight: '600', fontFamily: 'TerminatorRealNFI' },
  freqHz: { color: '#5a1a1a', fontSize: 10, marginTop: 4, fontFamily: 'TerminatorRealNFI' },
  freqCategory: { color: '#3a1010', fontSize: 9, letterSpacing: 1, fontFamily: 'TerminatorRealNFI' },
});
