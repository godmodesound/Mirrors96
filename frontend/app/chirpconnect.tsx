import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
  TextInput,
  ScrollView,
  Alert,
  FlatList,
  Image,
  ImageBackground,
  KeyboardAvoidingView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLayout } from '../src/useLayout';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { Audio, type AudioSound, type AudioRecording } from '../src/audioCompat';
import ChirpVideo from '../src/ChirpVideo';
import { Camera, CameraView, CameraType } from 'expo-camera';
import ViewShot, { type ViewShotRef } from 'react-native-view-shot';
import Constants from 'expo-constants';
import { FREQUENCY_ARCHIVE } from '../src/FrequencyArchiveData';
import { AudioEngine } from '../src/AudioEngine';
import GoogleSignInButton from '../src/GoogleSignInButton';
import AppleSignInButton from '../src/AppleSignInButton';

import { skinStyles, SK } from '../src/skins';


// ═══════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════
const VOICE_CHIRP_LIMIT = 33;
const VIDEO_CHIRP_LIMIT = 96;

const API_BASE = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || 
  (Platform.OS === 'web' ? '' : 'https://binaural-preview.preview.emergentagent.com');
const WS_BASE = API_BASE.replace('https://', 'wss://').replace('http://', 'ws://');

const STORAGE_KEYS = {
  MIRRORS_ID: '@mirrors_id',
  DISPLAY_NAME: '@mirrors_display_name',
  DEVICE_ID: '@mirrors_device_id',
  CONTACTS: '@mirrors_contacts',
  SELECTED_CONTACT: '@mirrors_selected_contact',
  CHIRP_HISTORY: '@chirp_history',
  HAPTIC_SETTINGS: '@codes_haptic_settings',
  AVATAR: '@mirrors_avatar',
  CHAT_STYLE: '@codes_chat_style',
};

// Chat bubble themes — customizable chat style
const CHAT_THEMES = {
  INFRARED: { bubble: '#1a0808', border: '#ff0a0a55', accent: '#ff0a0a', text: '#ff6b6b' },
  MATRIX: { bubble: '#041007', border: '#00ff4155', accent: '#00ff41', text: '#7dffa0' },
  MONO: { bubble: '#121212', border: '#444444', accent: '#ffffff', text: '#cccccc' },
} as const;
type ChatStyleKey = keyof typeof CHAT_THEMES;

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════
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
  media_uri?: string;
  frequency_name?: string;
  frequencies?: number[];
}

interface Contact {
  mirrors_id: string;
  display_name: string;
  nickname?: string;
  added_at: string;
}

// ═══════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════
import LandingScope from '../src/LandingScope';

export default function ChirpConnect() {
  const insets = useSafeAreaInsets();
  const layout = useLayout();
  const router = useRouter();

  // Core State
  const [mirrorsId, setMirrorsId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'offline' | 'connecting' | 'online'>('offline');

  // Permissions
  const [hasAudioPermission, setHasAudioPermission] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState(false);
  const [hasMicPermission, setHasMicPermission] = useState(false);
  const [permissionsChecked, setPermissionsChecked] = useState(false);

  // Tabs & Mode
  const [activeTab, setActiveTab] = useState<'chirp' | 'messages' | 'contacts' | 'settings'>('chirp');
  const [chirpMode, setChirpMode] = useState<'voice' | 'video' | 'codes'>('voice');

  // Contacts
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [showAddContact, setShowAddContact] = useState(false);
  const [newContactId, setNewContactId] = useState('');
  const [lookupResult, setLookupResult] = useState<any>(null);
  const [isLookingUp, setIsLookingUp] = useState(false);

  // Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [recordedMedia, setRecordedMedia] = useState<{ uri: string; type: 'voice' | 'video'; duration: number } | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // Video Recording
  const [cameraType, setCameraType] = useState<CameraType>('front');
  const [isVideoRecording, setIsVideoRecording] = useState(false);

  // Codes Mode
  const [selectedFrequency, setSelectedFrequency] = useState<{ name: string; frequencies: number[]; category: string } | null>(null);
  const [showFrequencyPicker, setShowFrequencyPicker] = useState(false);
  const [codesSearchQuery, setCodesSearchQuery] = useState('');
  const [codesSelectedCategory, setCodesSelectedCategory] = useState<string | null>(null);

  // Messages (Chat Sandbox)
  const [chirpHistory, setChirpHistory] = useState<ChirpMessage[]>([]);
  const [isReceiving, setIsReceiving] = useState(false);
  const [incomingFrom, setIncomingFrom] = useState('');

  // Customization (Settings)
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [hapticsEnabled, setHapticsEnabled] = useState(true);
  const [hapticIntensity, setHapticIntensity] = useState<'LIGHT' | 'MEDIUM' | 'HEAVY'>('HEAVY');
  const [hapticPulses, setHapticPulses] = useState<1 | 2 | 3>(1);
  const [chatStyle, setChatStyle] = useState<ChatStyleKey>('INFRARED');

  // Identity editing (Settings)
  const [editName, setEditName] = useState('');
  const [editId, setEditId] = useState('');
  const [isSavingIdentity, setIsSavingIdentity] = useState(false);

  // Message playback
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [videoPlayback, setVideoPlayback] = useState<ChirpMessage | null>(null);
  const playbackSoundRef = useRef<AudioSound | null>(null);

  // Refs
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recordingRef = useRef<AudioRecording | null>(null);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cameraRef = useRef<CameraView>(null);
  const viewShotRef = useRef<ViewShotRef>(null);

  // Animations
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  // ═══════════════════════════════════════════════════════════
  // PERMISSIONS - iOS 26 COMPATIBLE
  // ═══════════════════════════════════════════════════════════
  const requestAllPermissions = useCallback(async () => {
    try {
      // Audio/Microphone Permission
      const { status: audioStatus } = await Audio.requestPermissionsAsync();
      const audioGranted = audioStatus === 'granted';
      setHasAudioPermission(audioGranted);
      setHasMicPermission(audioGranted);

      if (audioGranted) {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          shouldDuckAndroid: true,
        });
      }

      // Camera Permission
      const { status: cameraStatus } = await Camera.requestCameraPermissionsAsync();
      setHasCameraPermission(cameraStatus === 'granted');

      // Microphone for Camera (separate on iOS)
      const { status: micStatus } = await Camera.requestMicrophonePermissionsAsync();
      setHasMicPermission(micStatus === 'granted');

      setPermissionsChecked(true);
    } catch (error) {
      console.error('Permission error:', error);
      setPermissionsChecked(true);
    }
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'web') {
      requestAllPermissions();
    } else {
      setPermissionsChecked(true);
      setHasAudioPermission(true);
    }
  }, []);

  // ═══════════════════════════════════════════════════════════
  // INITIALIZATION
  // ═══════════════════════════════════════════════════════════
  useEffect(() => {
    initializeMirrorsId();
    loadChirpHistory();
    loadCustomization();
  }, []);

  // Keep identity edit fields in sync
  useEffect(() => {
    setEditName(displayName);
    setEditId(mirrorsId || '');
  }, [displayName, mirrorsId]);

  // Cleanup playback on unmount (voice memo playback only — generator layers persist for universal sync)
  useEffect(() => {
    return () => {
      playbackSoundRef.current?.unloadAsync().catch(() => {});
    };
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
      console.error('Init error:', error);
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
      }
    } catch (error) {
      console.error('Registration error:', error);
      // Generate local fallback ID
      const fallbackId = Math.random().toString(36).substr(2, 6).toUpperCase();
      setMirrorsId(fallbackId);
      await AsyncStorage.setItem(STORAGE_KEYS.MIRRORS_ID, fallbackId);
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
    const updated = [chirp, ...chirpHistory].slice(0, 100);
    setChirpHistory(updated);
    await AsyncStorage.setItem(STORAGE_KEYS.CHIRP_HISTORY, JSON.stringify(updated));
  };

  // ═══════════════════════════════════════════════════════════
  // WEBSOCKET
  // ═══════════════════════════════════════════════════════════
  const connectWebSocket = useCallback(() => {
    if (!mirrorsId || wsRef.current?.readyState === WebSocket.OPEN) return;
    setConnectionStatus('connecting');

    try {
      const ws = new WebSocket(`${WS_BASE}/api/mirrors/live/${mirrorsId}`);
      ws.onopen = () => setConnectionStatus('online');
      ws.onclose = () => {
        setConnectionStatus('offline');
        reconnectTimeoutRef.current = setTimeout(() => connectWebSocket(), 5000);
      };
      ws.onerror = () => setConnectionStatus('offline');
      ws.onmessage = async (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'incoming_chirp') {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            Vibration.vibrate([0, 100, 50, 100]);
            setIsReceiving(true);
            setIncomingFrom(data.from_display_name || data.from_mirrors_id);
            
            const newChirp: ChirpMessage = {
              id: `${Date.now()}-incoming`,
              type: data.chirp_type || 'voice',
              from_mirrors_id: data.from_mirrors_id,
              to_mirrors_id: mirrorsId || '',
              from_display_name: data.from_display_name,
              duration: data.duration || 0,
              timestamp: new Date().toISOString(),
              is_outgoing: false,
            };
            await saveChirpToHistory(newChirp);
            
            setTimeout(() => setIsReceiving(false), 3000);
          }
        } catch {}
      };
      wsRef.current = ws;
    } catch {
      setConnectionStatus('offline');
    }
  }, [mirrorsId]);

  useEffect(() => {
    if (mirrorsId) connectWebSocket();
    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      wsRef.current?.close();
    };
  }, [mirrorsId, connectWebSocket]);

  // ═══════════════════════════════════════════════════════════
  // HAPTIC ENGINE — settings-aware (-style PTT feedback)
  // ═══════════════════════════════════════════════════════════
  const fireHaptic = async (
    intensity: 'LIGHT' | 'MEDIUM' | 'HEAVY' = hapticIntensity,
    pulses: number = hapticPulses,
    enabled: boolean = hapticsEnabled,
  ) => {
    if (!enabled || Platform.OS === 'web') return;
    const style =
      intensity === 'LIGHT' ? Haptics.ImpactFeedbackStyle.Light :
      intensity === 'MEDIUM' ? Haptics.ImpactFeedbackStyle.Medium :
      Haptics.ImpactFeedbackStyle.Heavy;
    for (let i = 0; i < pulses; i++) {
      await Haptics.impactAsync(style);
      if (i < pulses - 1) await new Promise(r => setTimeout(r, 90));
    }
  };

  const playStartFeedback = async () => {
    await fireHaptic();
    if (hapticsEnabled) Vibration.vibrate([0, 60, 40, 60]);
  };

  const playStopFeedback = async () => {
    if (!hapticsEnabled) return;
    if (Platform.OS !== 'web') {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    Vibration.vibrate([0, 30, 50, 30]);
  };

  // ═══════════════════════════════════════════════════════════
  // CUSTOMIZATION — haptic settings + profile image
  // ═══════════════════════════════════════════════════════════
  const loadCustomization = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.HAPTIC_SETTINGS);
      if (stored) {
        const s = JSON.parse(stored);
        if (typeof s.enabled === 'boolean') setHapticsEnabled(s.enabled);
        if (s.intensity) setHapticIntensity(s.intensity);
        if (s.pulses) setHapticPulses(s.pulses);
      }
      const avatar = await AsyncStorage.getItem(STORAGE_KEYS.AVATAR);
      if (avatar) setAvatarUri(avatar);
      const style = await AsyncStorage.getItem(STORAGE_KEYS.CHAT_STYLE);
      if (style && style in CHAT_THEMES) setChatStyle(style as ChatStyleKey);
    } catch {}
  };

  const saveHapticSettings = async (updates: { enabled?: boolean; intensity?: 'LIGHT' | 'MEDIUM' | 'HEAVY'; pulses?: 1 | 2 | 3 }) => {
    const next = {
      enabled: updates.enabled !== undefined ? updates.enabled : hapticsEnabled,
      intensity: updates.intensity ?? hapticIntensity,
      pulses: updates.pulses ?? hapticPulses,
    };
    setHapticsEnabled(next.enabled);
    setHapticIntensity(next.intensity);
    setHapticPulses(next.pulses);
    await AsyncStorage.setItem(STORAGE_KEYS.HAPTIC_SETTINGS, JSON.stringify(next));
    // Preview the new feel immediately
    fireHaptic(next.intensity, next.pulses, next.enabled);
  };

  const pickAvatar = async () => {
    try {
      let perm = await ImagePicker.getMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        if (perm.canAskAgain) {
          perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        }
        if (!perm.granted) {
          Alert.alert('Photos Access Needed', 'Allow photo access to set your CODES I.D. image.', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
          ]);
          return;
        }
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
        base64: true,
      });
      if (!result.canceled && result.assets?.[0]) {
        const asset = result.assets[0];
        const uri = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
        setAvatarUri(uri);
        await AsyncStorage.setItem(STORAGE_KEYS.AVATAR, uri);
        fireHaptic('MEDIUM', 1, true);
      }
    } catch (error) {
      console.error('Avatar pick error:', error);
    }
  };

  const removeAvatar = async () => {
    setAvatarUri(null);
    await AsyncStorage.removeItem(STORAGE_KEYS.AVATAR);
  };

  const setChatStyleAndSave = async (style: ChatStyleKey) => {
    setChatStyle(style);
    await AsyncStorage.setItem(STORAGE_KEYS.CHAT_STYLE, style);
    fireHaptic('LIGHT', 1, true);
  };

  // ═══════════════════════════════════════════════════════════
  // IDENTITY — edit display name & MIRRORS I.D.
  // ═══════════════════════════════════════════════════════════
  const saveIdentity = async () => {
    const newName = editName.trim();
    const newId = editId.trim().toUpperCase();
    if (!newName) {
      Alert.alert('Invalid Name', 'Display name cannot be empty.');
      return;
    }
    if (!/^[A-Z0-9]{4,10}$/.test(newId)) {
      Alert.alert('Invalid MIRRORS I.D.', 'Use 4-10 letters/numbers only.');
      return;
    }
    setIsSavingIdentity(true);
    try {
      let currentId = mirrorsId || newId;
      // Change I.D. (if edited)
      if (newId !== mirrorsId) {
        try {
          const res = await fetch(`${API_BASE}/api/mirrors/${mirrorsId}/change_id?new_id=${newId}`, { method: 'PUT' });
          if (res.status === 409) {
            Alert.alert('I.D. Taken', `${newId} is already in use. Choose another.`);
            setIsSavingIdentity(false);
            return;
          }
        } catch {}
        currentId = newId;
        setMirrorsId(currentId);
        await AsyncStorage.setItem(STORAGE_KEYS.MIRRORS_ID, currentId);
      }
      // Display name (if edited)
      if (newName !== displayName) {
        try {
          await fetch(`${API_BASE}/api/mirrors/${currentId}/display_name?display_name=${encodeURIComponent(newName)}`, { method: 'PUT' });
        } catch {}
        setDisplayName(newName);
        await AsyncStorage.setItem(STORAGE_KEYS.DISPLAY_NAME, newName);
      }
      fireHaptic('MEDIUM', 1, true);
      Alert.alert('Identity Updated', `${newName} · ${currentId}`);
    } catch {
      Alert.alert('Error', 'Could not save identity.');
    }
    setIsSavingIdentity(false);
  };

  // ═══════════════════════════════════════════════════════════
  // MESSAGE PLAYBACK — hear back voice / video / codes
  // ═══════════════════════════════════════════════════════════
  const stopPlayback = async () => {
    if (playbackSoundRef.current) {
      await playbackSoundRef.current.unloadAsync().catch(() => {});
      playbackSoundRef.current = null;
    }
    AudioEngine.stopMulti();
    setPlayingId(null);
  };

  // Load a shared CODES message straight into the CODES LAB on the main terminal
  const loadCodesInLab = async (item: ChirpMessage) => {
    if (!item.frequencies?.length) return;
    await AsyncStorage.setItem('@pending_lab_load', JSON.stringify({
      name: item.frequency_name || 'SHARED CODES',
      frequencies: item.frequencies,
    }));
    fireHaptic('MEDIUM', 1, true);
    await stopPlayback();
    router.push('/');
  };

  const playMessage = async (item: ChirpMessage) => {
    // Tap again to stop
    if (playingId === item.id) {
      await stopPlayback();
      return;
    }
    await stopPlayback();

    if (item.type === 'voice') {
      if (!item.media_uri) {
        Alert.alert('Not Available', 'This recording is no longer on this device.');
        return;
      }
      try {
        await Audio.setAudioModeAsync({ allowsRecordingIOS: false, playsInSilentModeIOS: true });
        const { sound } = await Audio.Sound.createAsync({ uri: item.media_uri }, { shouldPlay: true });
        playbackSoundRef.current = sound;
        setPlayingId(item.id);
        sound.setOnPlaybackStatusUpdate((st: any) => {
          if (st.didJustFinish) {
            sound.unloadAsync().catch(() => {});
            playbackSoundRef.current = null;
            setPlayingId(null);
          }
        });
      } catch {
        Alert.alert('Playback Unavailable', 'This recording could not be played.');
      }
    } else if (item.type === 'video') {
      if (!item.media_uri) {
        Alert.alert('Not Available', 'This video is no longer on this device.');
        return;
      }
      setVideoPlayback(item);
    } else if (item.type === 'codes' && item.frequencies?.length) {
      AudioEngine.playMulti(item.frequencies, 0.3);
      setPlayingId(item.id);
      setTimeout(() => {
        AudioEngine.stopMulti();
        setPlayingId(p => (p === item.id ? null : p));
      }, 8000);
    }
  };

  // ═══════════════════════════════════════════════════════════
  // VOICE RECORDING
  // ═══════════════════════════════════════════════════════════
  const startVoiceRecording = async () => {
    if (!hasAudioPermission) {
      Alert.alert('Permission Required', 'Microphone access is needed to record voice mirrors.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Settings', onPress: () => Linking.openSettings() },
      ]);
      return;
    }

    try {
      await playStartFeedback();

      // Prepare recorder FIRST (HIGH_QUALITY preset = valid AAC config on iOS 26/27, Android & web)
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      recordingRef.current = recording;

      // Recorder is live — now start UI feedback
      setIsRecording(true);
      setRecordingDuration(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration(prev => {
          if (prev >= VOICE_CHIRP_LIMIT - 0.1) {
            stopVoiceRecording();
            return prev;
          }
          return prev + 0.1;
        });
      }, 100);

      // Animate
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.1, duration: 400, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        ])
      ).start();
    } catch (error: any) {
      // Clean recovery — no console.error (avoids dev-overlay CONSOLE ERROR toast)
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      pulseAnim.stopAnimation();
      Animated.timing(pulseAnim, { toValue: 1, duration: 150, useNativeDriver: true }).start();
      recordingRef.current = null;
      setIsRecording(false);
      setRecordingDuration(0);
      console.log('Voice recording unavailable:', error?.message || error);
      Alert.alert(
        'Microphone Unavailable',
        'Could not access the microphone. Check that no other app is using it and that mic access is allowed.',
        [
          { text: 'OK', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Linking.openSettings() },
        ]
      );
    }
  };

  const stopVoiceRecording = async () => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }

    pulseAnim.stopAnimation();
    Animated.timing(pulseAnim, { toValue: 1, duration: 150, useNativeDriver: true }).start();

    if (!recordingRef.current) {
      setIsRecording(false);
      return;
    }

    try {
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;
      await playStopFeedback();

      if (uri && recordingDuration > 0.5) {
        setRecordedMedia({ uri, type: 'voice', duration: recordingDuration });
        setShowPreview(true);
      }
    } catch (error: any) {
      console.log('Stop recording issue:', error?.message || error);
    }

    setIsRecording(false);
    setRecordingDuration(0);
  };

  // ═══════════════════════════════════════════════════════════
  // VIDEO RECORDING
  // ═══════════════════════════════════════════════════════════
  const startVideoRecording = async () => {
    if (!hasCameraPermission || !hasMicPermission) {
      Alert.alert(
        'Permissions Required',
        'Camera and microphone access are needed to record video mirrors.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Linking.openSettings() },
        ]
      );
      return;
    }

    if (!cameraRef.current) {
      Alert.alert('Error', 'Camera not ready. Please try again.');
      return;
    }

    try {
      await playStartFeedback();
      setIsRecording(true);
      setIsVideoRecording(true);
      setRecordingDuration(0);

      // Start timer
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration(prev => {
          if (prev >= VIDEO_CHIRP_LIMIT - 0.1) {
            stopVideoRecording();
            return prev;
          }
          return prev + 0.1;
        });
      }, 100);

      // Start video recording
      const video = await cameraRef.current.recordAsync({
        maxDuration: VIDEO_CHIRP_LIMIT,
      });

      if (video?.uri) {
        setRecordedMedia({ uri: video.uri, type: 'video', duration: recordingDuration });
        setShowPreview(true);
      }
    } catch (error: any) {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      setIsRecording(false);
      setIsVideoRecording(false);
      setRecordingDuration(0);
      console.log('Video recording unavailable:', error?.message || error);
      Alert.alert('Recording Error', 'Failed to start video recording.');
    }
  };

  const stopVideoRecording = async () => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }

    try {
      if (cameraRef.current && isVideoRecording) {
        await cameraRef.current.stopRecording();
      }
      await playStopFeedback();
    } catch (error) {
      console.error('Stop video error:', error);
    }

    setIsRecording(false);
    setIsVideoRecording(false);
  };

  // ═══════════════════════════════════════════════════════════
  // SEND CHIRP
  // ═══════════════════════════════════════════════════════════
  const sendChirp = async () => {
    if (!recordedMedia || !mirrorsId) return;

    setIsSending(true);
    try {
      const toId = selectedContact?.mirrors_id || 'broadcast';
      const toName = selectedContact?.nickname || selectedContact?.display_name || 'BROADCAST';

      // Save to history
      const newChirp: ChirpMessage = {
        id: `${Date.now()}-outgoing`,
        type: recordedMedia.type,
        from_mirrors_id: mirrorsId,
        to_mirrors_id: toId,
        from_display_name: displayName,
        duration: recordedMedia.duration,
        timestamp: new Date().toISOString(),
        is_outgoing: true,
        media_uri: recordedMedia.uri,
      };
      await saveChirpToHistory(newChirp);

      // Send via WebSocket if connected
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        let base64Data = '';
        if (Platform.OS !== 'web') {
          base64Data = await FileSystem.readAsStringAsync(recordedMedia.uri, { 
            encoding: FileSystem.EncodingType.Base64 
          });
        }

        wsRef.current.send(JSON.stringify({
          type: 'chirp',
          chirp_type: recordedMedia.type,
          to_mirrors_id: toId,
          duration: recordedMedia.duration,
          audio_data: base64Data,
        }));
      }

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Mirror Sent', `${recordedMedia.type.toUpperCase()} mirror sent to ${toName}`);
    } catch (error) {
      console.error('Send error:', error);
      Alert.alert('Error', 'Failed to send mirror.');
    }

    setIsSending(false);
    setShowPreview(false);
    setRecordedMedia(null);
  };

  // ═══════════════════════════════════════════════════════════
  // CODES MODE
  // ═══════════════════════════════════════════════════════════
  const sendCodesChirp = async () => {
    if (!selectedFrequency || !mirrorsId) return;

    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const newChirp: ChirpMessage = {
      id: `${Date.now()}-codes`,
      type: 'codes',
      from_mirrors_id: mirrorsId,
      to_mirrors_id: selectedContact?.mirrors_id || 'broadcast',
      from_display_name: displayName,
      duration: 0,
      timestamp: new Date().toISOString(),
      is_outgoing: true,
      frequency_name: selectedFrequency.name,
      frequencies: selectedFrequency.frequencies,
    };

    await saveChirpToHistory(newChirp);
    Alert.alert('CODES Sent', `${selectedFrequency.name} sent successfully.`);
  };

  const shareCodesExternal = async () => {
    if (!selectedFrequency) return;

    const message = `🔊 MIRRORS 96 CODES\n\n${selectedFrequency.name}\n${selectedFrequency.frequencies.join(' · ')} Hz\n\n432Hz calibrated frequency\ngodmodesound.com`;

    try {
      const available = await Sharing.isAvailableAsync();
      if (available && viewShotRef.current?.capture) {
        const uri = await viewShotRef.current.capture();
        await Sharing.shareAsync(uri, { mimeType: 'image/png' });
      } else {
        Alert.alert('Share CODES', message);
      }
    } catch {
      Alert.alert('Share CODES', message);
    }
  };

  // ═══════════════════════════════════════════════════════════
  // CONTACTS
  // ═══════════════════════════════════════════════════════════
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
        setLookupResult(await response.json());
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

  const selectContact = async (contact: Contact | null) => {
    setSelectedContact(contact);
    if (contact) {
      await AsyncStorage.setItem(STORAGE_KEYS.SELECTED_CONTACT, JSON.stringify(contact));
    } else {
      await AsyncStorage.removeItem(STORAGE_KEYS.SELECTED_CONTACT);
    }
    setActiveTab('chirp');
  };

  // ═══════════════════════════════════════════════════════════
  // COMPUTED VALUES
  // ═══════════════════════════════════════════════════════════
  const currentLimit = chirpMode === 'voice' ? VOICE_CHIRP_LIMIT : VIDEO_CHIRP_LIMIT;
  const progressPercent = (recordingDuration / currentLimit) * 100;

  const filteredFrequencies = useMemo(() => {
    return FREQUENCY_ARCHIVE.filter(item => {
      const matchesSearch = !codesSearchQuery || 
        item.name.toLowerCase().includes(codesSearchQuery.toLowerCase()) ||
        item.category.toLowerCase().includes(codesSearchQuery.toLowerCase()) ||
        item.frequencies.some(f => f.toString().includes(codesSearchQuery));
      const matchesCategory = !codesSelectedCategory || item.category === codesSelectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [codesSearchQuery, codesSelectedCategory]);

  const categories = useMemo(() => {
    return Array.from(new Set(FREQUENCY_ARCHIVE.map(f => f.category))).sort();
  }, []);

  // ═══════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════
  if (!permissionsChecked || isRegistering) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={SK('#ff0a0a')} />
          <Text style={styles.loadingText}>{isRegistering ? 'GENERATING MIRRORS I.D...' : 'INITIALIZING...'}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LandingScope testID="id-scope" />
      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.headerLeft}>
            <Image
              source={avatarUri ? { uri: avatarUri } : require('../assets/images/codes-id-button.jpg')}
              style={styles.headerAvatar}
            />
            <Text style={styles.headerTitle}>CODES I.D.</Text>
          </View>
          <View style={[styles.statusBadge, connectionStatus === 'online' && styles.statusOnline]}>
            <View style={[styles.statusDot, connectionStatus === 'online' && styles.statusDotOnline]} />
            <Text style={styles.statusText}>{connectionStatus.toUpperCase()}</Text>
          </View>
        </View>
        <Text style={styles.mirrorsIdText}>MIRRORS I.D. {mirrorsId}</Text>
      </View>

      {/* TAB NAVIGATION */}
      <View style={styles.tabBar}>
        {(['chirp', 'messages', 'contacts', 'settings'] as const).map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab === 'chirp' ? '◎' : tab === 'messages' ? '💬' : tab === 'contacts' ? '👥' : '⚙'}
            </Text>
            <Text style={[styles.tabLabel, activeTab === tab && styles.tabLabelActive]}>
              {tab === 'chirp' ? 'MIRROR' : tab.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* CHIRP TAB */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {activeTab === 'chirp' && (
        <View style={styles.chirpContainer}>
          {/* Mode Toggle */}
          <View style={styles.modeToggle}>
            {(['voice', 'video', 'codes'] as const).map(mode => (
              <TouchableOpacity
                key={mode}
                style={[styles.modeBtn, chirpMode === mode && styles.modeBtnActive]}
                onPress={() => setChirpMode(mode)}
              >
                <Text style={[styles.modeBtnIcon, chirpMode === mode && styles.modeBtnIconActive]}>
                  {mode === 'voice' ? '🎤' : mode === 'video' ? '📹' : '◎'}
                </Text>
                <Text style={[styles.modeBtnText, chirpMode === mode && styles.modeBtnTextActive]}>
                  {mode.toUpperCase()}
                </Text>
                <Text style={styles.modeBtnLimit}>
                  {mode === 'voice' ? `${VOICE_CHIRP_LIMIT}s` : mode === 'video' ? `${VIDEO_CHIRP_LIMIT}s` : 'SHARE'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Recipient Display */}
          <TouchableOpacity style={styles.recipientBar} onPress={() => setActiveTab('contacts')}>
            <Text style={styles.recipientLabel}>TO:</Text>
            <Text style={styles.recipientName}>
              {selectedContact?.nickname || selectedContact?.display_name || 'BROADCAST (ALL)'}
            </Text>
            <Text style={styles.recipientArrow}>›</Text>
          </TouchableOpacity>

          {/* VOICE/VIDEO MODE */}
          {(chirpMode === 'voice' || chirpMode === 'video') && (
            <View style={styles.recordingArea}>
              {/* Video Camera Preview */}
              {chirpMode === 'video' && hasCameraPermission && (
                <View style={[styles.cameraContainer, { width: layout.contentWidth - 64 }]}>
                  <CameraView
                    ref={cameraRef}
                    style={styles.cameraPreview}
                    facing={cameraType}
                    mode="video"
                  />
                  <TouchableOpacity
                    style={styles.flipCameraBtn}
                    onPress={() => setCameraType(cameraType === 'front' ? 'back' : 'front')}
                  >
                    <Text style={styles.flipCameraText}>⟳</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Recording Timer */}
              {isRecording && (
                <View style={styles.timerContainer}>
                  <View style={styles.recordingIndicator}>
                    <View style={styles.recordingDot} />
                    <Text style={styles.recordingLabel}>REC</Text>
                  </View>
                  <Text style={styles.timerText}>
                    {Math.floor(recordingDuration)}:{(Math.floor((recordingDuration % 1) * 10)).toString().padStart(1, '0')}s
                  </Text>
                  <View style={styles.progressBar}>
                    <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
                  </View>
                  <Text style={styles.limitText}>{currentLimit}s limit</Text>
                </View>
              )}

              {/* PTT Button — -style with haptic + visual feedback */}
              <Animated.View style={[styles.pttWrapper, { transform: [{ scale: pulseAnim }] }]}>
                {isRecording && <View style={styles.pttGlowRing} />}
                <TouchableOpacity
                  style={[styles.pttButton, isRecording && styles.pttButtonActive]}
                  onPressIn={chirpMode === 'voice' ? startVoiceRecording : startVideoRecording}
                  onPressOut={chirpMode === 'voice' ? stopVoiceRecording : stopVideoRecording}
                  activeOpacity={0.9}
                >
                  <ImageBackground
                    source={require('../assets/images/codes-id-button.jpg')}
                    style={styles.pttButtonBg}
                    imageStyle={styles.pttButtonImage}
                    resizeMode="cover"
                  >
                    <View style={[styles.pttOverlay, isRecording && styles.pttOverlayActive]}>
                      <Text style={[styles.pttSymbol, isRecording && styles.pttSymbolActive]}>
                        {isRecording ? 'Ω' : 'Α'}
                      </Text>
                      <Text style={styles.pttModeText}>{chirpMode.toUpperCase()}</Text>
                      <Text style={styles.pttHintText}>
                        {isRecording ? 'RELEASE TO SEND' : 'HOLD TO RECORD'}
                      </Text>
                    </View>
                  </ImageBackground>
                </TouchableOpacity>
              </Animated.View>

              {/* Permission Warning */}
              {((chirpMode === 'voice' && !hasAudioPermission) || 
                (chirpMode === 'video' && (!hasCameraPermission || !hasMicPermission))) && (
                <TouchableOpacity style={styles.permissionWarning} onPress={() => Linking.openSettings()}>
                  <Text style={styles.permissionWarningText}>
                    ⚠ {chirpMode === 'voice' ? 'Microphone' : 'Camera & Microphone'} permission required
                  </Text>
                  <Text style={styles.permissionWarningLink}>Tap to open Settings</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* CODES MODE */}
          {chirpMode === 'codes' && (
            <View style={styles.codesArea}>
              {/* Frequency Selector */}
              <TouchableOpacity
                style={styles.freqSelector}
                onPress={() => setShowFrequencyPicker(true)}
              >
                {selectedFrequency ? (
                  <View style={styles.selectedFreqInfo}>
                    <Text style={styles.selectedFreqName}>{selectedFrequency.name}</Text>
                    <Text style={styles.selectedFreqHz}>
                      {selectedFrequency.frequencies.join(' · ')} Hz
                    </Text>
                    <Text style={styles.selectedFreqCategory}>{selectedFrequency.category.toUpperCase()}</Text>
                  </View>
                ) : (
                  <View style={styles.selectFreqPrompt}>
                    <Text style={styles.selectFreqIcon}>◎</Text>
                    <Text style={styles.selectFreqText}>SELECT FREQUENCY FROM ARCHIVE</Text>
                    <Text style={styles.selectFreqCount}>{FREQUENCY_ARCHIVE.length} frequencies available</Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* Send Buttons */}
              {selectedFrequency && (
                <View style={styles.codesSendButtons}>
                  <TouchableOpacity style={styles.codesSendBtn} onPress={sendCodesChirp}>
                    <Text style={styles.codesSendBtnText}>SEND VIA PLATFORM</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.codesShareBtn} onPress={shareCodesExternal}>
                    <Text style={styles.codesShareBtnText}>AIRDROP / TEXT</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
        </View>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* MESSAGES TAB - CHAT SANDBOX */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {activeTab === 'messages' && (
        <View style={styles.messagesContainer}>
          <Text style={styles.messagesTitle}>MIRROR HISTORY</Text>
          {chirpHistory.length === 0 ? (
            <View style={styles.emptyMessages}>
              <Text style={styles.emptyMessagesIcon}>💬</Text>
              <Text style={styles.emptyMessagesText}>No mirrors yet</Text>
              <Text style={styles.emptyMessagesHint}>Send or receive a mirror to start</Text>
            </View>
          ) : (
            <FlatList
              data={chirpHistory}
              keyExtractor={item => item.id}
              contentContainerStyle={styles.messagesList}
              renderItem={({ item }) => {
                const theme = CHAT_THEMES[chatStyle];
                const isPlaying = playingId === item.id;
                return (
                  <View style={[styles.messageItem, item.is_outgoing ? styles.messageOutgoing : styles.messageIncoming]}>
                    <TouchableOpacity
                      style={[styles.messageBubble, { backgroundColor: theme.bubble, borderColor: isPlaying ? theme.accent : theme.border }]}
                      onPress={() => playMessage(item)}
                      activeOpacity={0.8}
                    >
                      <View style={styles.messageHeader}>
                        <Text style={[styles.messageType, { color: theme.accent }]}>
                          {item.type === 'voice' ? '🎤' : item.type === 'video' ? '📹' : '◎'} {item.type.toUpperCase()}
                        </Text>
                        {item.duration > 0 && (
                          <Text style={[styles.messageDuration, { color: theme.text }]}>{item.duration.toFixed(1)}s</Text>
                        )}
                      </View>
                      {item.type === 'codes' && item.frequency_name && (
                        <View style={styles.messageFreq}>
                          <Text style={[styles.messageFreqName, { color: theme.text }]}>{item.frequency_name}</Text>
                          <Text style={[styles.messageFreqHz, { color: theme.accent }]}>{item.frequencies?.join(' · ')} Hz</Text>
                          <TouchableOpacity
                            style={[styles.loadInLabBtn, { borderColor: theme.accent }]}
                            onPress={() => loadCodesInLab(item)}
                            activeOpacity={0.8}
                          >
                            <Text style={[styles.loadInLabText, { color: theme.accent }]}>⧉ TAP TO LOAD IN LAB</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                      <Text style={[styles.messagePlayHint, { color: isPlaying ? theme.accent : theme.text }]}>
                        {isPlaying ? '■ PLAYING — TAP TO STOP' : item.type === 'video' ? '▶ TAP TO WATCH' : '▶ TAP TO PLAY'}
                      </Text>
                      <View style={styles.messageFooter}>
                        <Text style={[styles.messageFrom, { color: theme.text }]}>
                          {item.is_outgoing ? `TO: ${item.to_mirrors_id}` : `FROM: ${item.from_display_name}`}
                        </Text>
                        <Text style={styles.messageTime}>
                          {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  </View>
                );
              }}
            />
          )}
        </View>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* VIDEO PLAYBACK MODAL */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <Modal visible={!!videoPlayback} transparent animationType="fade" onRequestClose={() => setVideoPlayback(null)}>
        <View style={styles.videoModalOverlay}>
          {videoPlayback?.media_uri && (
            <ChirpVideo uri={videoPlayback.media_uri} style={styles.videoPlayer} />
          )}
          <TouchableOpacity style={styles.videoCloseBtn} onPress={() => setVideoPlayback(null)}>
            <Text style={styles.videoCloseText}>CLOSE</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* CONTACTS TAB */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {activeTab === 'contacts' && (
        <ScrollView style={styles.contactsContainer} contentContainerStyle={[{ paddingBottom: insets.bottom + 100 }, layout.frame]}>
          <TouchableOpacity
            style={[styles.contactItem, !selectedContact && styles.contactItemSelected]}
            onPress={() => selectContact(null)}
          >
            <Text style={styles.contactIcon}>📡</Text>
            <View style={styles.contactInfo}>
              <Text style={styles.contactName}>BROADCAST</Text>
              <Text style={styles.contactId}>Send to all contacts</Text>
            </View>
            {!selectedContact && <Text style={styles.contactCheck}>✓</Text>}
          </TouchableOpacity>

          {contacts.map(contact => (
            <TouchableOpacity
              key={contact.mirrors_id}
              style={[styles.contactItem, selectedContact?.mirrors_id === contact.mirrors_id && styles.contactItemSelected]}
              onPress={() => selectContact(contact)}
            >
              <Text style={styles.contactIcon}>👤</Text>
              <View style={styles.contactInfo}>
                <Text style={styles.contactName}>{contact.nickname || contact.display_name}</Text>
                <Text style={styles.contactId}>{contact.mirrors_id}</Text>
              </View>
              {selectedContact?.mirrors_id === contact.mirrors_id && <Text style={styles.contactCheck}>✓</Text>}
            </TouchableOpacity>
          ))}

          <TouchableOpacity style={styles.addContactBtn} onPress={() => setShowAddContact(true)}>
            <Text style={styles.addContactBtnText}>+ ADD CONTACT</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* SETTINGS TAB */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {activeTab === 'settings' && (
        <ScrollView style={styles.settingsContainer} contentContainerStyle={[{ paddingBottom: insets.bottom + 100 }, layout.frame]}>
          <View style={styles.settingSection}>
            <Text style={styles.settingLabel}>ACCOUNT</Text>
            <GoogleSignInButton mirrorsId={mirrorsId || undefined} />
            <AppleSignInButton mirrorsId={mirrorsId || undefined} />
            <Text style={styles.settingInfo}>Optional — link your Google or Apple account to your MIRRORS I.D.</Text>
          </View>
          <View style={styles.settingSection}>
            <Text style={styles.settingLabel}>IDENTITY</Text>
            <Text style={styles.identityFieldLabel}>DISPLAY NAME</Text>
            <TextInput
              style={styles.identityInput}
              value={editName}
              onChangeText={setEditName}
              placeholder="Display name"
              placeholderTextColor={SK('#5a1a1a')}
              maxLength={24}
            />
            <Text style={styles.identityFieldLabel}>MIRRORS I.D. (4-10 LETTERS/NUMBERS)</Text>
            <TextInput
              style={styles.identityInput}
              value={editId}
              onChangeText={t => setEditId(t.toUpperCase())}
              placeholder="MIRRORS I.D."
              placeholderTextColor={SK('#5a1a1a')}
              autoCapitalize="characters"
              maxLength={10}
            />
            <TouchableOpacity style={styles.identitySaveBtn} onPress={saveIdentity} disabled={isSavingIdentity}>
              {isSavingIdentity ? (
                <ActivityIndicator color={SK('#000')} size="small" />
              ) : (
                <Text style={styles.identitySaveText}>SAVE IDENTITY</Text>
              )}
            </TouchableOpacity>
          </View>
          <View style={styles.settingSection}>
            <Text style={styles.settingLabel}>CHAT STYLE</Text>
            <View style={styles.hapticOptionRow}>
              {(Object.keys(CHAT_THEMES) as ChatStyleKey[]).map(styleKey => (
                <TouchableOpacity
                  key={styleKey}
                  style={[
                    styles.hapticOption,
                    { borderColor: CHAT_THEMES[styleKey].accent },
                    chatStyle === styleKey && { backgroundColor: CHAT_THEMES[styleKey].bubble },
                  ]}
                  onPress={() => setChatStyleAndSave(styleKey)}
                >
                  <Text style={[styles.hapticOptionText, { color: CHAT_THEMES[styleKey].accent }]}>{styleKey}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.settingInfo}>Changes the look of your MIRROR HISTORY chat</Text>
          </View>
          <View style={styles.settingSection}>
            <Text style={styles.settingLabel}>MIRROR LIMITS</Text>
            <Text style={styles.settingInfo}>Voice: {VOICE_CHIRP_LIMIT} seconds</Text>
            <Text style={styles.settingInfo}>Video: {VIDEO_CHIRP_LIMIT} seconds</Text>
          </View>
          <View style={styles.settingSection}>
            <Text style={styles.settingLabel}>PROFILE IMAGE</Text>
            <View style={styles.avatarRow}>
              <Image
                source={avatarUri ? { uri: avatarUri } : require('../assets/images/codes-id-button.jpg')}
                style={styles.avatarPreview}
              />
              <View style={styles.avatarActions}>
                <TouchableOpacity style={styles.avatarUploadBtn} onPress={pickAvatar}>
                  <Text style={styles.avatarUploadText}>UPLOAD IMAGE</Text>
                </TouchableOpacity>
                {avatarUri && (
                  <TouchableOpacity style={styles.avatarRemoveBtn} onPress={removeAvatar}>
                    <Text style={styles.avatarRemoveText}>REMOVE</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
            <Text style={styles.settingInfo}>Customize your CODES I.D.</Text>
          </View>
          <View style={styles.settingSection}>
            <Text style={styles.settingLabel}>HAPTIC ENGINE</Text>
            <TouchableOpacity
              style={[styles.hapticToggle, hapticsEnabled && styles.hapticToggleOn]}
              onPress={() => saveHapticSettings({ enabled: !hapticsEnabled })}
            >
              <View style={[styles.hapticToggleDot, hapticsEnabled && styles.hapticToggleDotOn]} />
              <Text style={[styles.hapticToggleText, hapticsEnabled && styles.hapticToggleTextOn]}>
                {hapticsEnabled ? 'HAPTICS ON' : 'HAPTICS OFF'}
              </Text>
            </TouchableOpacity>
            <Text style={styles.hapticRowLabel}>INTENSITY</Text>
            <View style={styles.hapticOptionRow}>
              {(['LIGHT', 'MEDIUM', 'HEAVY'] as const).map(lvl => (
                <TouchableOpacity
                  key={lvl}
                  style={[styles.hapticOption, hapticIntensity === lvl && styles.hapticOptionActive, !hapticsEnabled && styles.hapticOptionDisabled]}
                  onPress={() => saveHapticSettings({ intensity: lvl })}
                  disabled={!hapticsEnabled}
                >
                  <Text style={[styles.hapticOptionText, hapticIntensity === lvl && styles.hapticOptionTextActive]}>{lvl}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.hapticRowLabel}>PULSE FREQUENCY</Text>
            <View style={styles.hapticOptionRow}>
              {([1, 2, 3] as const).map(p => (
                <TouchableOpacity
                  key={p}
                  style={[styles.hapticOption, hapticPulses === p && styles.hapticOptionActive, !hapticsEnabled && styles.hapticOptionDisabled]}
                  onPress={() => saveHapticSettings({ pulses: p })}
                  disabled={!hapticsEnabled}
                >
                  <Text style={[styles.hapticOptionText, hapticPulses === p && styles.hapticOptionTextActive]}>{p}X</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.settingInfo}>Fires when you press the MIRROR button — tap an option to feel it</Text>
          </View>
          <View style={styles.settingSection}>
            <Text style={styles.settingLabel}>iPHONE ACTION BUTTON</Text>
            <View style={styles.actionBtnCard}>
              <Text style={styles.actionBtnStep}>1. iPhone Settings → Action Button</Text>
              <Text style={styles.actionBtnStep}>2. Select SHORTCUT → Open App</Text>
              <Text style={styles.actionBtnStep}>3. Choose this app — CODES I.D. is one press away</Text>
            </View>
            <Text style={styles.settingInfo}>Instant PTT access, Direct Connect style (requires installed build)</Text>
          </View>
          <View style={styles.settingSection}>
            <Text style={styles.settingLabel}>PERMISSIONS</Text>
            <Text style={styles.settingInfo}>Microphone: {hasAudioPermission ? '✓ Granted' : '✕ Denied'}</Text>
            <Text style={styles.settingInfo}>Camera: {hasCameraPermission ? '✓ Granted' : '✕ Denied'}</Text>
          </View>
        </ScrollView>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* MODALS */}
      {/* ═══════════════════════════════════════════════════════════ */}

      {/* Preview Modal */}
      <Modal visible={showPreview} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.previewModal}>
            <Text style={styles.previewTitle}>
              {recordedMedia?.type === 'voice' ? '🎤 VOICE' : '📹 VIDEO'} MIRROR
            </Text>
            <Text style={styles.previewDuration}>{recordedMedia?.duration.toFixed(1)}s</Text>
            <Text style={styles.previewTo}>
              TO: {selectedContact?.nickname || selectedContact?.display_name || 'BROADCAST'}
            </Text>
            <View style={styles.previewButtons}>
              <TouchableOpacity style={styles.previewSendBtn} onPress={sendChirp} disabled={isSending}>
                {isSending ? (
                  <ActivityIndicator size="small" color={SK('#000')} />
                ) : (
                  <Text style={styles.previewSendBtnText}>SEND MIRROR</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity style={styles.previewCancelBtn} onPress={() => { setShowPreview(false); setRecordedMedia(null); }}>
                <Text style={styles.previewCancelBtnText}>CANCEL</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Contact Modal */}
      <Modal visible={showAddContact} transparent animationType="slide">
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.addContactModal}>
            <Text style={styles.addContactTitle}>ADD CONTACT</Text>
            <TextInput
              style={styles.addContactInput}
              placeholder="Enter MIRRORS I.D."
              placeholderTextColor={SK('#5a1a1a')}
              value={newContactId}
              onChangeText={setNewContactId}
              autoCapitalize="characters"
              autoCorrect={false}
            />
            <TouchableOpacity style={styles.addContactLookupBtn} onPress={lookupContact} disabled={isLookingUp}>
              {isLookingUp ? (
                <ActivityIndicator size="small" color={SK('#ff0a0a')} />
              ) : (
                <Text style={styles.addContactLookupText}>LOOKUP</Text>
              )}
            </TouchableOpacity>
            {lookupResult && (
              <View style={styles.lookupResult}>
                {lookupResult.error ? (
                  <Text style={styles.lookupError}>{lookupResult.error}</Text>
                ) : (
                  <>
                    <Text style={styles.lookupName}>{lookupResult.display_name}</Text>
                    <Text style={styles.lookupId}>{lookupResult.mirrors_id}</Text>
                    <TouchableOpacity style={styles.lookupAddBtn} onPress={addContact}>
                      <Text style={styles.lookupAddText}>ADD TO CONTACTS</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            )}
            <TouchableOpacity style={styles.addContactCancelBtn} onPress={() => { setShowAddContact(false); setNewContactId(''); setLookupResult(null); }}>
              <Text style={styles.addContactCancelText}>CANCEL</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Frequency Picker Modal */}
      <Modal visible={showFrequencyPicker} transparent animationType="slide" onRequestClose={() => setShowFrequencyPicker(false)}>
        <View style={styles.freqPickerOverlay}>
          <View style={styles.freqPickerContainer}>
            {/* Header */}
            <View style={styles.freqPickerHeader}>
              <View>
                <Text style={styles.freqPickerTitle}>CODES ARCHIVE</Text>
                <Text style={styles.freqPickerSubtitle}>{FREQUENCY_ARCHIVE.length} frequencies · 432Hz</Text>
              </View>
              <TouchableOpacity onPress={() => { setShowFrequencyPicker(false); setCodesSearchQuery(''); setCodesSelectedCategory(null); }}>
                <Text style={styles.freqPickerClose}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Search */}
            <View style={styles.freqSearchBar}>
              <Text style={styles.freqSearchIcon}>⌕</Text>
              <TextInput
                style={styles.freqSearchInput}
                placeholder="Search frequencies..."
                placeholderTextColor={SK('#5a1a1a')}
                value={codesSearchQuery}
                onChangeText={setCodesSearchQuery}
              />
              {codesSearchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setCodesSearchQuery('')}>
                  <Text style={styles.freqSearchClear}>✕</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Categories */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.freqCategories}>
              <TouchableOpacity
                style={[styles.freqCatPill, !codesSelectedCategory && styles.freqCatPillActive]}
                onPress={() => setCodesSelectedCategory(null)}
              >
                <Text style={[styles.freqCatText, !codesSelectedCategory && styles.freqCatTextActive]}>ALL</Text>
              </TouchableOpacity>
              {categories.map(cat => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.freqCatPill, codesSelectedCategory === cat && styles.freqCatPillActive]}
                  onPress={() => setCodesSelectedCategory(codesSelectedCategory === cat ? null : cat)}
                >
                  <Text style={[styles.freqCatText, codesSelectedCategory === cat && styles.freqCatTextActive]}>
                    {cat.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* List */}
            <FlatList
              data={filteredFrequencies}
              keyExtractor={(item, i) => `${item.name}-${i}`}
              contentContainerStyle={styles.freqList}
              initialNumToRender={20}
              ListEmptyComponent={
                <View style={styles.freqEmpty}>
                  <Text style={styles.freqEmptyText}>No frequencies found</Text>
                </View>
              }
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.freqItem, selectedFrequency?.name === item.name && styles.freqItemSelected]}
                  onPress={() => {
                    setSelectedFrequency({ name: item.name, frequencies: item.frequencies, category: item.category });
                    setShowFrequencyPicker(false);
                    setCodesSearchQuery('');
                    setCodesSelectedCategory(null);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                >
                  <View style={styles.freqItemInfo}>
                    <Text style={styles.freqItemName}>{item.name}</Text>
                    <Text style={styles.freqItemHz}>{item.frequencies.join(' · ')} Hz</Text>
                  </View>
                  <Text style={styles.freqItemCat}>{item.category.toUpperCase()}</Text>
                </TouchableOpacity>
              )}
            />

            {/* Footer */}
            <View style={styles.freqFooter}>
              <Text style={styles.freqFooterText}>{filteredFrequencies.length} results</Text>
            </View>
          </View>
        </View>
      </Modal>

      {/* Bottom Safe Area */}
      <View style={{ height: insets.bottom + 80 }} />
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════
const styles = skinStyles({
  container: { flex: 1, backgroundColor: '#000' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#ff0a0a', marginTop: 16, fontSize: 12, letterSpacing: 2 },

  // Header
  header: { paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#1a0808' },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerAvatar: { width: 32, height: 32, borderRadius: 16, borderWidth: 1.5, borderColor: '#ff0a0a' },
  headerTitle: { color: '#ff0a0a', fontSize: 20, fontWeight: '900', letterSpacing: 4 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, backgroundColor: '#1a0808', borderRadius: 12 },
  statusOnline: { backgroundColor: '#0a1a0a' },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#5a1a1a', marginRight: 6 },
  statusDotOnline: { backgroundColor: '#00ff00' },
  statusText: { color: '#5a1a1a', fontSize: 9, fontWeight: '700', letterSpacing: 1 },
  mirrorsIdText: { color: '#5a1a1a', fontSize: 11, marginTop: 6, letterSpacing: 2 },

  // Tabs
  tabBar: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#1a0808' },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 12 },
  tabActive: { borderBottomWidth: 2, borderBottomColor: '#ff0a0a' },
  tabText: { fontSize: 18 },
  tabTextActive: {},
  tabLabel: { color: '#5a1a1a', fontSize: 8, marginTop: 4, letterSpacing: 1 },
  tabLabelActive: { color: '#ff0a0a' },

  // Chirp Container
  chirpContainer: { flex: 1, padding: 16 },

  // Mode Toggle
  modeToggle: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  modeBtn: { flex: 1, alignItems: 'center', paddingVertical: 12, backgroundColor: '#0a0505', borderWidth: 1, borderColor: '#2a0a0a', borderRadius: 8 },
  modeBtnActive: { borderColor: '#ff0a0a', backgroundColor: '#1a0808' },
  modeBtnIcon: { fontSize: 20, opacity: 0.5 },
  modeBtnIconActive: { opacity: 1 },
  modeBtnText: { color: '#5a1a1a', fontSize: 10, fontWeight: '700', marginTop: 4, letterSpacing: 1 },
  modeBtnTextActive: { color: '#ff0a0a' },
  modeBtnLimit: { color: '#3a1010', fontSize: 8, marginTop: 2 },

  // Recipient
  recipientBar: { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: '#0a0505', borderRadius: 8, marginBottom: 16 },
  recipientLabel: { color: '#5a1a1a', fontSize: 10, marginRight: 8 },
  recipientName: { flex: 1, color: '#ff0a0a', fontSize: 12, fontWeight: '600' },
  recipientArrow: { color: '#5a1a1a', fontSize: 18 },

  // Recording Area
  recordingArea: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // Camera
  cameraContainer: { height: 200, borderRadius: 12, overflow: 'hidden', marginBottom: 20, backgroundColor: '#0a0505' },
  cameraPreview: { flex: 1 },
  flipCameraBtn: { position: 'absolute', top: 10, right: 10, backgroundColor: 'rgba(0,0,0,0.5)', padding: 8, borderRadius: 20 },
  flipCameraText: { color: '#fff', fontSize: 20 },

  // Timer
  timerContainer: { alignItems: 'center', marginBottom: 20 },
  recordingIndicator: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  recordingDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#ff0a0a', marginRight: 8 },
  recordingLabel: { color: '#ff0a0a', fontSize: 12, fontWeight: '700', letterSpacing: 2 },
  timerText: { color: '#fff', fontSize: 48, fontWeight: '200' },
  progressBar: { width: 200, height: 4, backgroundColor: '#2a0a0a', borderRadius: 2, marginTop: 12 },
  progressFill: { height: '100%', backgroundColor: '#ff0a0a', borderRadius: 2 },
  limitText: { color: '#5a1a1a', fontSize: 10, marginTop: 8 },

  // PTT Button
  pttWrapper: { alignItems: 'center', justifyContent: 'center' },
  pttButton: { width: 160, height: 160, borderRadius: 80, overflow: 'hidden', borderWidth: 4, borderColor: '#2a0a0a' },
  pttButtonActive: { borderColor: '#ff0a0a' },
  pttButtonBg: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  pttButtonImage: { borderRadius: 76 },
  pttOverlay: { flex: 1, width: '100%', justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.4)' },
  pttOverlayActive: { backgroundColor: 'rgba(255,10,10,0.18)' },
  pttGlowRing: { position: 'absolute', width: 190, height: 190, borderRadius: 95, borderWidth: 3, borderColor: '#ff0a0a', opacity: 0.85, shadowColor: '#ff0a0a', shadowOpacity: 0.9, shadowRadius: 18, shadowOffset: { width: 0, height: 0 }, elevation: 12 },
  pttSymbol: { color: '#ff0a0a', fontSize: 36, fontWeight: '900' },
  pttSymbolActive: { color: '#fff' },
  pttModeText: { color: '#fff', fontSize: 16, fontWeight: '700', marginTop: 4, letterSpacing: 2 },
  pttHintText: { color: '#888', fontSize: 8, marginTop: 8, letterSpacing: 1 },

  // Permission Warning
  permissionWarning: { marginTop: 20, padding: 16, backgroundColor: '#1a0808', borderRadius: 8, alignItems: 'center' },
  permissionWarningText: { color: '#ff6060', fontSize: 12, textAlign: 'center' },
  permissionWarningLink: { color: '#ff0a0a', fontSize: 10, marginTop: 8, textDecorationLine: 'underline' },

  // Codes Area
  codesArea: { flex: 1, alignItems: 'center', paddingTop: 20 },
  freqSelector: { width: '100%', padding: 20, backgroundColor: '#0a0505', borderWidth: 1, borderColor: '#ff0a0a', borderRadius: 8 },
  selectedFreqInfo: { alignItems: 'center' },
  selectedFreqName: { color: '#ff0a0a', fontSize: 16, fontWeight: '700', textAlign: 'center' },
  selectedFreqHz: { color: '#ff6060', fontSize: 12, marginTop: 6 },
  selectedFreqCategory: { color: '#5a1a1a', fontSize: 9, marginTop: 4, letterSpacing: 2 },
  selectFreqPrompt: { alignItems: 'center' },
  selectFreqIcon: { color: '#ff0a0a', fontSize: 32, marginBottom: 8 },
  selectFreqText: { color: '#5a1a1a', fontSize: 11, letterSpacing: 2 },
  selectFreqCount: { color: '#3a1010', fontSize: 9, marginTop: 6 },
  codesSendButtons: { flexDirection: 'row', gap: 12, marginTop: 20, width: '100%' },
  codesSendBtn: { flex: 1, backgroundColor: '#ff0a0a', paddingVertical: 14, borderRadius: 8, alignItems: 'center' },
  codesSendBtnText: { color: '#000', fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  codesShareBtn: { flex: 1, backgroundColor: '#0a0505', borderWidth: 1, borderColor: '#ff0a0a', paddingVertical: 14, borderRadius: 8, alignItems: 'center' },
  codesShareBtnText: { color: '#ff0a0a', fontSize: 11, fontWeight: '700', letterSpacing: 1 },

  // Messages
  messagesContainer: { flex: 1, padding: 16 },
  messagesTitle: { color: '#ff0a0a', fontSize: 14, fontWeight: '700', letterSpacing: 2, marginBottom: 16 },
  emptyMessages: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyMessagesIcon: { fontSize: 48, opacity: 0.3 },
  emptyMessagesText: { color: '#5a1a1a', fontSize: 14, marginTop: 16 },
  emptyMessagesHint: { color: '#3a1010', fontSize: 11, marginTop: 8 },
  messagesList: { paddingBottom: 20 },
  messageItem: { marginBottom: 12 },
  messageOutgoing: { alignItems: 'flex-end' },
  messageIncoming: { alignItems: 'flex-start' },
  messageBubble: { backgroundColor: '#0a0505', borderWidth: 1, borderColor: '#2a0a0a', borderRadius: 12, padding: 12, maxWidth: '80%' },
  messageHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  messageType: { color: '#ff0a0a', fontSize: 11, fontWeight: '700' },
  messageDuration: { color: '#5a1a1a', fontSize: 10 },
  messageFreq: { backgroundColor: '#1a0808', padding: 8, borderRadius: 6, marginBottom: 8 },
  loadInLabBtn: { marginTop: 8, borderWidth: 1, borderRadius: 6, paddingVertical: 8, alignItems: 'center' },
  loadInLabText: { fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
  messageFreqName: { color: '#ff0a0a', fontSize: 12, fontWeight: '600' },
  messageFreqHz: { color: '#5a1a1a', fontSize: 10, marginTop: 2 },
  messageFooter: { flexDirection: 'row', justifyContent: 'space-between' },
  messageFrom: { color: '#3a1010', fontSize: 9 },
  messageTime: { color: '#3a1010', fontSize: 9 },

  // Contacts
  contactsContainer: { flex: 1, padding: 16 },
  contactItem: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#0a0505', borderRadius: 8, marginBottom: 8, borderWidth: 1, borderColor: 'transparent' },
  contactItemSelected: { borderColor: '#ff0a0a', backgroundColor: '#1a0808' },
  contactIcon: { fontSize: 24, marginRight: 12 },
  contactInfo: { flex: 1 },
  contactName: { color: '#ff0a0a', fontSize: 14, fontWeight: '600' },
  contactId: { color: '#5a1a1a', fontSize: 10, marginTop: 2 },
  contactCheck: { color: '#ff0a0a', fontSize: 18 },
  addContactBtn: { padding: 16, backgroundColor: '#0a0505', borderRadius: 8, borderWidth: 1, borderColor: '#2a0a0a', borderStyle: 'dashed', alignItems: 'center', marginTop: 8 },
  addContactBtnText: { color: '#5a1a1a', fontSize: 12, letterSpacing: 2 },

  // Settings
  settingsContainer: { flex: 1, padding: 16 },
  settingSection: { marginBottom: 24 },
  settingLabel: { color: '#5a1a1a', fontSize: 10, letterSpacing: 2, marginBottom: 8 },
  settingValue: { color: '#ff0a0a', fontSize: 18, fontWeight: '600' },
  settingInfo: { color: '#888', fontSize: 12, marginTop: 4 },

  // Profile image (Settings)
  avatarRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 4 },
  avatarPreview: { width: 72, height: 72, borderRadius: 36, borderWidth: 2, borderColor: '#ff0a0a' },
  avatarActions: { gap: 8 },
  avatarUploadBtn: { backgroundColor: '#ff0a0a', paddingVertical: 10, paddingHorizontal: 18, borderRadius: 8, alignItems: 'center' },
  avatarUploadText: { color: '#000', fontSize: 11, fontWeight: '900', letterSpacing: 2 },
  avatarRemoveBtn: { paddingVertical: 8, paddingHorizontal: 18, borderRadius: 8, borderWidth: 1, borderColor: '#2a0a0a', alignItems: 'center' },
  avatarRemoveText: { color: '#5a1a1a', fontSize: 10, letterSpacing: 2 },

  // Haptic engine (Settings)
  hapticToggle: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#0a0505', borderWidth: 1, borderColor: '#2a0a0a', borderRadius: 8, padding: 14, marginBottom: 12 },
  hapticToggleOn: { borderColor: '#ff0a0a', backgroundColor: '#1a0808' },
  hapticToggleDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#3a1010' },
  hapticToggleDotOn: { backgroundColor: '#ff0a0a' },
  hapticToggleText: { color: '#5a1a1a', fontSize: 12, fontWeight: '700', letterSpacing: 2 },
  hapticToggleTextOn: { color: '#ff0a0a' },
  hapticRowLabel: { color: '#5a1a1a', fontSize: 9, letterSpacing: 2, marginBottom: 6, marginTop: 4 },
  hapticOptionRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  hapticOption: { flex: 1, paddingVertical: 12, borderWidth: 1, borderColor: '#2a0a0a', borderRadius: 8, alignItems: 'center', backgroundColor: '#0a0505' },
  hapticOptionActive: { borderColor: '#ff0a0a', backgroundColor: '#1a0808' },
  hapticOptionDisabled: { opacity: 0.35 },
  hapticOptionText: { color: '#5a1a1a', fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  hapticOptionTextActive: { color: '#ff0a0a' },

  // Action button (Settings)
  actionBtnCard: { backgroundColor: '#0a0505', borderWidth: 1, borderColor: '#2a0a0a', borderRadius: 8, padding: 14, gap: 6 },
  actionBtnStep: { color: '#888', fontSize: 12 },

  // Identity editing (Settings)
  identityFieldLabel: { color: '#5a1a1a', fontSize: 9, letterSpacing: 2, marginBottom: 6, marginTop: 4 },
  identityInput: { backgroundColor: '#0a0505', borderWidth: 1, borderColor: '#2a0a0a', borderRadius: 8, color: '#ff0a0a', fontSize: 16, fontWeight: '700', letterSpacing: 1, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 12 },
  identitySaveBtn: { backgroundColor: '#ff0a0a', paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  identitySaveText: { color: '#000', fontSize: 12, fontWeight: '900', letterSpacing: 2 },

  // Message playback
  messagePlayHint: { fontSize: 9, letterSpacing: 1.5, marginTop: 6, fontWeight: '700' },
  videoModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' },
  videoPlayer: { width: '92%', aspectRatio: 9 / 16, maxHeight: '75%', backgroundColor: '#000', borderRadius: 12 },
  videoCloseBtn: { marginTop: 20, borderWidth: 1.5, borderColor: '#ff0a0a', borderRadius: 8, paddingVertical: 12, paddingHorizontal: 40 },
  videoCloseText: { color: '#ff0a0a', fontSize: 12, fontWeight: '900', letterSpacing: 3 },

  // Modal Overlay
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' },

  // Preview Modal
  previewModal: { width: '88%', maxWidth: 440, backgroundColor: '#0a0505', borderWidth: 1, borderColor: '#ff0a0a', borderRadius: 12, padding: 24, alignItems: 'center' },
  previewTitle: { color: '#ff0a0a', fontSize: 16, fontWeight: '700', letterSpacing: 2 },
  previewDuration: { color: '#fff', fontSize: 48, fontWeight: '200', marginVertical: 16 },
  previewTo: { color: '#5a1a1a', fontSize: 11, letterSpacing: 2, marginBottom: 24 },
  previewButtons: { width: '100%', gap: 12 },
  previewSendBtn: { backgroundColor: '#ff0a0a', paddingVertical: 16, borderRadius: 8, alignItems: 'center' },
  previewSendBtnText: { color: '#000', fontSize: 14, fontWeight: '900', letterSpacing: 2 },
  previewCancelBtn: { paddingVertical: 12, alignItems: 'center' },
  previewCancelBtnText: { color: '#5a1a1a', fontSize: 12, letterSpacing: 2 },

  // Add Contact Modal
  addContactModal: { width: '88%', maxWidth: 440, backgroundColor: '#0a0505', borderWidth: 1, borderColor: '#ff0a0a', borderRadius: 12, padding: 24 },
  addContactTitle: { color: '#ff0a0a', fontSize: 16, fontWeight: '700', letterSpacing: 2, textAlign: 'center', marginBottom: 20 },
  addContactInput: { backgroundColor: '#050202', borderWidth: 1, borderColor: '#2a0a0a', borderRadius: 8, padding: 16, color: '#ff0a0a', fontSize: 16, textAlign: 'center', letterSpacing: 4 },
  addContactLookupBtn: { backgroundColor: '#ff0a0a', paddingVertical: 14, borderRadius: 8, marginTop: 12, alignItems: 'center' },
  addContactLookupText: { color: '#000', fontSize: 12, fontWeight: '700', letterSpacing: 2 },
  lookupResult: { marginTop: 20, padding: 16, backgroundColor: '#1a0808', borderRadius: 8, alignItems: 'center' },
  lookupError: { color: '#ff6060', fontSize: 12 },
  lookupName: { color: '#fff', fontSize: 16, fontWeight: '600' },
  lookupId: { color: '#5a1a1a', fontSize: 12, marginTop: 4 },
  lookupAddBtn: { backgroundColor: '#00aa00', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 6, marginTop: 12 },
  lookupAddText: { color: '#fff', fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  addContactCancelBtn: { marginTop: 16, alignItems: 'center', paddingVertical: 12 },
  addContactCancelText: { color: '#5a1a1a', fontSize: 12, letterSpacing: 2 },

  // Frequency Picker
  freqPickerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.98)', justifyContent: 'flex-end' },
  freqPickerContainer: { height: '85%', backgroundColor: '#050202', borderTopLeftRadius: 16, borderTopRightRadius: 16, borderTopWidth: 2, borderTopColor: '#ff0a0a' },
  freqPickerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: 20 },
  freqPickerTitle: { color: '#ff0a0a', fontSize: 18, fontWeight: '900', letterSpacing: 4 },
  freqPickerSubtitle: { color: '#5a1a1a', fontSize: 10, marginTop: 4 },
  freqPickerClose: { color: '#ff0a0a', fontSize: 24, padding: 4 },
  freqSearchBar: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginBottom: 12, backgroundColor: '#0a0505', borderRadius: 8, paddingHorizontal: 12, borderWidth: 1, borderColor: '#2a0a0a' },
  freqSearchIcon: { color: '#5a1a1a', fontSize: 18, marginRight: 8 },
  freqSearchInput: { flex: 1, height: 44, color: '#ff0a0a', fontSize: 14 },
  freqSearchClear: { color: '#5a1a1a', fontSize: 16, padding: 4 },
  freqCategories: { maxHeight: 44, marginHorizontal: 16, marginBottom: 8 },
  freqCatPill: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#0a0505', borderWidth: 1, borderColor: '#2a0a0a', borderRadius: 16, marginRight: 8 },
  freqCatPillActive: { backgroundColor: '#1a0808', borderColor: '#ff0a0a' },
  freqCatText: { color: '#5a1a1a', fontSize: 9, fontWeight: '700', letterSpacing: 1 },
  freqCatTextActive: { color: '#ff0a0a' },
  freqList: { paddingBottom: 80 },
  freqEmpty: { padding: 40, alignItems: 'center' },
  freqEmptyText: { color: '#5a1a1a', fontSize: 14 },
  freqItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#1a0808' },
  freqItemSelected: { backgroundColor: '#1a0808', borderLeftWidth: 3, borderLeftColor: '#ff0a0a' },
  freqItemInfo: { flex: 1, marginRight: 12 },
  freqItemName: { color: '#ff0a0a', fontSize: 13, fontWeight: '600' },
  freqItemHz: { color: '#5a1a1a', fontSize: 10, marginTop: 4 },
  freqItemCat: { color: '#3a1010', fontSize: 8, letterSpacing: 1 },
  freqFooter: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 12, backgroundColor: '#050202', borderTopWidth: 1, borderTopColor: '#1a0808', alignItems: 'center' },
  freqFooterText: { color: '#3a1010', fontSize: 10, letterSpacing: 1 },
});
