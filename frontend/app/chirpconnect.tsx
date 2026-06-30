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

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ═══════════════════════════════════
// CONFIG
// ═══════════════════════════════════
const API_BASE =
  Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL ||
  process.env.EXPO_PUBLIC_BACKEND_URL ||
  '';
const WS_BASE = API_BASE.replace(/^https?/, 'wss');

const STORAGE_KEYS = {
  MIRRORS_ID: 'mirrors_id',
  DISPLAY_NAME: 'mirrors_display_name',
  DEVICE_ID: 'mirrors_device_id',
  CONTACTS: 'mirrors_contacts',
  SELECTED_CONTACT: 'mirrors_selected_contact',
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
  const [lastChirpTime, setLastChirpTime] = useState<string | null>(null);
  const [incomingFrom, setIncomingFrom] = useState<string | null>(null);

  // MIRRORS I.D. state
  const [mirrorsId, setMirrorsId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string>('');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);

  // Modal states
  const [activeTab, setActiveTab] = useState<'chirp' | 'contacts' | 'settings'>('chirp');
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
  }, []);

  const initializeMirrorsId = async () => {
    try {
      // Check for existing MIRRORS I.D.
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
        // Register new MIRRORS I.D.
        await registerMirrorsId();
      }
    } catch (error) {
      console.error('Error initializing MIRRORS I.D.:', error);
    }
  };

  const registerMirrorsId = async () => {
    setIsRegistering(true);
    try {
      // Generate device ID if not exists
      let deviceId = await AsyncStorage.getItem(STORAGE_KEYS.DEVICE_ID);
      if (!deviceId) {
        deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        await AsyncStorage.setItem(STORAGE_KEYS.DEVICE_ID, deviceId);
      }

      const response = await fetch(`${API_BASE}/api/mirrors/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          display_name: '',
          device_id: deviceId,
        }),
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

            Animated.sequence([
              Animated.timing(receiveAnim, { toValue: 1, duration: 200, useNativeDriver: false }),
              Animated.delay(2000),
              Animated.timing(receiveAnim, { toValue: 0, duration: 300, useNativeDriver: false }),
            ]).start(() => {
              setIsReceiving(false);
              setIncomingFrom(null);
            });

            // Play audio if present
            if (data.audio_base64) {
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
          }
        } catch {}
      };

      ws.onclose = () => {
        clearInterval((ws as any)._pingInterval);
        setConnectionStatus('offline');
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
    if (mirrorsId) {
      connectWebSocket();
    }
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
        body: JSON.stringify({
          mirrors_id: lookupResult.mirrors_id,
          nickname: lookupResult.display_name,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setContacts(data.contacts);
        await AsyncStorage.setItem(STORAGE_KEYS.CONTACTS, JSON.stringify(data.contacts));
        setShowAddContact(false);
        setNewContactId('');
        setLookupResult(null);
      }
    } catch (error) {
      console.error('Error adding contact:', error);
    }
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

    transmitTimerRef.current = setInterval(() => {
      setTransmitDuration(prev => prev + 0.1);
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

      if (selectedContact) {
        // Direct chirp to selected contact
        await fetch(`${API_BASE}/api/mirrors/chirp`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to_mirrors_id: selectedContact.mirrors_id,
            from_mirrors_id: mirrorsId,
            from_display_name: displayName,
            audio_base64: base64Audio,
            duration: Math.round(recordedDuration * 10) / 10,
          }),
        });
      } else {
        // Broadcast to all (using the old channel system)
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

  const timestamp = new Date().toISOString().split('T')[0].replace(/-/g, '.');

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
        <TouchableOpacity
          style={[styles.tab, activeTab === 'chirp' && styles.tabActive]}
          onPress={() => setActiveTab('chirp')}
        >
          <Text style={[styles.tabText, activeTab === 'chirp' && styles.tabTextActive]}>CHIRP</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'contacts' && styles.tabActive]}
          onPress={() => { setActiveTab('contacts'); refreshContacts(); }}
        >
          <Text style={[styles.tabText, activeTab === 'contacts' && styles.tabTextActive]}>CONTACTS</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'settings' && styles.tabActive]}
          onPress={() => setActiveTab('settings')}
        >
          <Text style={[styles.tabText, activeTab === 'settings' && styles.tabTextActive]}>SETTINGS</Text>
        </TouchableOpacity>
      </View>

      {/* CHIRP TAB */}
      {activeTab === 'chirp' && (
        <View style={styles.mainArea}>
          {/* Selected Contact Display */}
          {selectedContact ? (
            <View style={styles.selectedContactBar}>
              <Text style={styles.selectedLabel}>CHIRPING TO:</Text>
              <Text style={styles.selectedName}>{selectedContact.nickname || selectedContact.display_name}</Text>
              <Text style={styles.selectedId}>{selectedContact.mirrors_id}</Text>
              <TouchableOpacity onPress={() => selectContact(null)}>
                <Text style={styles.clearSelected}>✕</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.broadcastBar}>
              <Text style={styles.broadcastText}>◉ BROADCAST MODE</Text>
              <Text style={styles.broadcastSub}>Tap CONTACTS to select recipient</Text>
            </View>
          )}

          {/* Incoming indicator */}
          {isReceiving && (
            <Animated.View style={[styles.receiveIndicator, { backgroundColor: receiveGlow }]}>
              <Text style={styles.receiveText}>◉ INCOMING</Text>
              {incomingFrom && <Text style={styles.receiverName}>{incomingFrom}</Text>}
            </Animated.View>
          )}

          {/* Transmit status */}
          {isTransmitting && (
            <View style={styles.transmitStatus}>
              <Text style={styles.transmitLabel}>TRANSMITTING</Text>
              <Text style={styles.transmitTimer}>{formatDuration(transmitDuration)}</Text>
            </View>
          )}

          {/* THE BUTTON */}
          <View style={styles.pttWrapper}>
            {isTransmitting && (
              <Animated.View style={[styles.pttRing, { transform: [{ scale: ringScale }], opacity: ringOpacity }]} />
            )}
            <Animated.View style={[styles.pttGlow, { backgroundColor: glowColor }]} />
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

          {lastChirpTime && !isTransmitting && (
            <Text style={styles.lastChirp}>Last chirp: {lastChirpTime}</Text>
          )}
        </View>
      )}

      {/* CONTACTS TAB */}
      {activeTab === 'contacts' && (
        <ScrollView style={styles.contactsArea} contentContainerStyle={{ paddingBottom: 20 }}>
          {/* Add Contact Button */}
          <TouchableOpacity style={styles.addContactBtn} onPress={() => setShowAddContact(true)}>
            <Text style={styles.addContactText}>+ ADD CONTACT BY MIRRORS I.D.</Text>
          </TouchableOpacity>

          {/* Broadcast Option */}
          <TouchableOpacity
            style={[styles.contactRow, !selectedContact && styles.contactRowSelected]}
            onPress={() => selectContact(null)}
          >
            <View style={styles.contactIcon}>
              <Text style={styles.contactIconText}>◉</Text>
            </View>
            <View style={styles.contactInfo}>
              <Text style={styles.contactName}>BROADCAST</Text>
              <Text style={styles.contactId}>Send to all CODES users</Text>
            </View>
            {!selectedContact && <Text style={styles.contactCheck}>✓</Text>}
          </TouchableOpacity>

          {/* Contact List */}
          {contacts.map((contact) => (
            <TouchableOpacity
              key={contact.mirrors_id}
              style={[styles.contactRow, selectedContact?.mirrors_id === contact.mirrors_id && styles.contactRowSelected]}
              onPress={() => selectContact(contact)}
              onLongPress={() => {
                Alert.alert(
                  'Remove Contact',
                  `Remove ${contact.nickname || contact.display_name}?`,
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Remove', style: 'destructive', onPress: () => removeContact(contact.mirrors_id) },
                  ]
                );
              }}
            >
              <View style={[styles.contactIcon, contact.is_online && styles.contactIconOnline]}>
                <Text style={styles.contactIconText}>{contact.display_name?.charAt(0) || '?'}</Text>
              </View>
              <View style={styles.contactInfo}>
                <Text style={styles.contactName}>{contact.nickname || contact.display_name}</Text>
                <Text style={styles.contactId}>{contact.mirrors_id}</Text>
              </View>
              {selectedContact?.mirrors_id === contact.mirrors_id && (
                <Text style={styles.contactCheck}>✓</Text>
              )}
            </TouchableOpacity>
          ))}

          {contacts.length === 0 && (
            <Text style={styles.noContacts}>No contacts yet. Add someone by their MIRRORS I.D.</Text>
          )}
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
                    await fetch(`${API_BASE}/api/mirrors/${mirrorsId}/display_name?display_name=${encodeURIComponent(displayName)}`, {
                      method: 'PUT',
                    });
                  } catch {}
                }
              }}
            />
          </View>

          <View style={styles.settingSection}>
            <Text style={styles.settingSectionTitle}>iPHONE ACTION BUTTON</Text>
            <Text style={styles.settingHint}>Settings → Action Button → Shortcut → "Open CODES I.D."</Text>
            <TouchableOpacity
              style={styles.settingBtn}
              onPress={() => {
                if (Platform.OS === 'ios') {
                  Linking.openURL('app-settings:');
                }
              }}
            >
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

            <TextInput
              style={modalStyles.input}
              value={newContactId}
              onChangeText={setNewContactId}
              placeholder="e.g. ABC123"
              placeholderTextColor="#3a1010"
              autoCapitalize="characters"
              maxLength={6}
            />

            <TouchableOpacity style={modalStyles.lookupBtn} onPress={lookupContact} disabled={isLookingUp}>
              {isLookingUp ? (
                <ActivityIndicator color="#ff0a0a" size="small" />
              ) : (
                <Text style={modalStyles.lookupBtnText}>LOOKUP</Text>
              )}
            </TouchableOpacity>

            {lookupResult && (
              <View style={modalStyles.resultBox}>
                {lookupResult.error ? (
                  <Text style={modalStyles.errorText}>{lookupResult.error}</Text>
                ) : (
                  <>
                    <Text style={modalStyles.resultName}>{lookupResult.display_name}</Text>
                    <Text style={modalStyles.resultId}>{lookupResult.mirrors_id}</Text>
                    <View style={[modalStyles.onlineIndicator, lookupResult.is_online && modalStyles.onlineIndicatorActive]}>
                      <Text style={modalStyles.onlineText}>{lookupResult.is_online ? 'ONLINE' : 'OFFLINE'}</Text>
                    </View>
                    <TouchableOpacity style={modalStyles.addBtn} onPress={addContact}>
                      <Text style={modalStyles.addBtnText}>+ ADD TO CONTACTS</Text>
                    </TouchableOpacity>
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
            <Text style={shareStyles.title}>CHIRP RECORDED</Text>
            <Text style={shareStyles.duration}>{formatDuration(recordedDuration)}</Text>

            <ViewShot ref={viewShotRef} options={{ format: 'png', quality: 1 }}>
              <View style={shareStyles.lcdOuter}>
                <View style={shareStyles.lcdInner}>
                  <Text style={shareStyles.lcdTitle}>M̲I̲R̲R̲O̲R̲S̲</Text>
                  <Text style={shareStyles.lcdIdLabel}>IDENTIFICATION PROGRAM</Text>
                  <View style={shareStyles.lcdWaveform}>
                    {[...Array(12)].map((_, i) => (
                      <View key={i} style={[shareStyles.lcdWaveBar, { height: 8 + Math.sin(i * 0.8) * 12 + Math.random() * 6 }]} />
                    ))}
                  </View>
                  <Text style={shareStyles.lcdFrom}>{selectedContact ? `TO: ${selectedContact.mirrors_id}` : 'BROADCAST'}</Text>
                  <Text style={shareStyles.lcdFooter}>godmodesound.com // MIRRORS 96</Text>
                </View>
              </View>
            </ViewShot>

            <View style={shareStyles.actionRow}>
              <TouchableOpacity style={shareStyles.sendBtn} onPress={sendDirectChirp} disabled={isSharing}>
                {isSharing ? <ActivityIndicator color="#000" size="small" /> : (
                  <Text style={shareStyles.sendBtnText}>{selectedContact ? '▶ SEND' : '◉ BROADCAST'}</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity style={shareStyles.shareBtn} onPress={handleShareChirp} disabled={isSharing}>
                <Text style={shareStyles.shareBtnText}>SHARE</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={shareStyles.cancelBtn} onPress={() => setShowShareModal(false)}>
              <Text style={shareStyles.cancelBtnText}>CANCEL</Text>
            </TouchableOpacity>
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
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', backgroundColor: '#050202' },
  tabActive: { backgroundColor: '#0a0505', borderBottomWidth: 2, borderBottomColor: '#ff0a0a' },
  tabText: { color: '#3a1010', fontSize: 10, fontWeight: '700', letterSpacing: 2, fontFamily: 'TerminatorRealNFI' },
  tabTextActive: { color: '#ff0a0a' },

  mainArea: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 },

  selectedContactBar: { position: 'absolute', top: 20, alignItems: 'center', backgroundColor: '#0a0505', borderWidth: 1, borderColor: '#ff0a0a40', padding: 12, borderRadius: 4, width: '100%' },
  selectedLabel: { color: '#3a1010', fontSize: 8, letterSpacing: 2, fontFamily: 'TerminatorRealNFI' },
  selectedName: { color: '#ff0a0a', fontSize: 14, fontWeight: '700', marginTop: 4, fontFamily: 'TerminatorRealNFI' },
  selectedId: { color: '#5a1a1a', fontSize: 10, marginTop: 2, fontFamily: 'TerminatorRealNFI' },
  clearSelected: { color: '#ff0a0a', fontSize: 18, marginTop: 8 },

  broadcastBar: { position: 'absolute', top: 20, alignItems: 'center' },
  broadcastText: { color: '#ff0a0a', fontSize: 12, fontWeight: '700', letterSpacing: 2, fontFamily: 'TerminatorRealNFI' },
  broadcastSub: { color: '#3a1010', fontSize: 9, marginTop: 4 },

  receiveIndicator: { position: 'absolute', top: 80, left: 20, right: 20, paddingVertical: 16, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: '#00ff4440' },
  receiveText: { color: '#00ff44', fontSize: 14, fontWeight: '900', letterSpacing: 4, fontFamily: 'TerminatorRealNFI' },
  receiverName: { color: '#00ff44', fontSize: 10, letterSpacing: 2, marginTop: 4, opacity: 0.7, fontFamily: 'TerminatorRealNFI' },

  transmitStatus: { position: 'absolute', top: 80, alignItems: 'center' },
  transmitLabel: { color: '#ff0a0a', fontSize: 12, letterSpacing: 6, fontFamily: 'TerminatorRealNFI' },
  transmitTimer: { color: '#ff0a0a', fontSize: 32, fontWeight: '900', marginTop: 8, fontFamily: 'TerminatorRealNFI' },

  pttWrapper: { alignItems: 'center', justifyContent: 'center', width: 220, height: 220 },
  pttRing: { position: 'absolute', width: 180, height: 180, borderRadius: 90, borderWidth: 2, borderColor: '#ff0a0a' },
  pttGlow: { position: 'absolute', width: 200, height: 200, borderRadius: 100 },
  pttButton: { width: 180, height: 180, borderRadius: 90, backgroundColor: '#0a0303', borderWidth: 4, borderColor: '#2a0a0a', justifyContent: 'center', alignItems: 'center' },
  pttButtonActive: { backgroundColor: '#1a0505', borderColor: '#ff0a0a' },
  pttIcon: { color: '#ff0a0a', fontSize: 40, marginBottom: 8 },
  pttMainText: { color: '#ff0a0a', fontSize: 24, fontWeight: '900', letterSpacing: 6, fontFamily: 'TerminatorRealNFI' },
  pttSubText: { color: '#5a1a1a', fontSize: 9, letterSpacing: 2, marginTop: 8, fontFamily: 'TerminatorRealNFI' },

  lastChirp: { color: '#3a1010', fontSize: 10, letterSpacing: 1, marginTop: 30, fontFamily: 'TerminatorRealNFI' },

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

  settingsArea: { flex: 1, paddingHorizontal: 16, paddingTop: 12 },
  settingSection: { marginBottom: 24 },
  settingSectionTitle: { color: '#ff0a0a', fontSize: 10, fontWeight: '700', letterSpacing: 2, marginBottom: 8, fontFamily: 'TerminatorRealNFI' },
  idCard: { backgroundColor: '#050202', borderWidth: 1, borderColor: '#ff0a0a40', padding: 16, alignItems: 'center' },
  idCardValue: { color: '#ff0a0a', fontSize: 28, fontWeight: '900', letterSpacing: 6, fontFamily: 'TerminatorRealNFI' },
  idCardHint: { color: '#3a1010', fontSize: 9, marginTop: 8, textAlign: 'center' },
  settingInput: { backgroundColor: '#050202', borderWidth: 1, borderColor: '#2a0a0a', color: '#ff0a0a', fontSize: 14, padding: 12 },
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
  onlineIndicator: { marginTop: 8, paddingHorizontal: 12, paddingVertical: 4, backgroundColor: '#1a0808', borderRadius: 4 },
  onlineIndicatorActive: { backgroundColor: '#0a2a0a' },
  onlineText: { color: '#5a1a1a', fontSize: 9, letterSpacing: 2, fontFamily: 'TerminatorRealNFI' },
  addBtn: { backgroundColor: '#ff0a0a', paddingVertical: 12, paddingHorizontal: 20, marginTop: 12 },
  addBtnText: { color: '#000', fontSize: 11, fontWeight: '900', letterSpacing: 1, fontFamily: 'TerminatorRealNFI' },
  errorText: { color: '#ff0a0a', fontSize: 12, fontFamily: 'TerminatorRealNFI' },
  cancelBtn: { marginTop: 16, paddingVertical: 12, alignItems: 'center' },
  cancelBtnText: { color: '#5a1a1a', fontSize: 11, letterSpacing: 2, fontFamily: 'TerminatorRealNFI' },
});

const shareStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' },
  container: { width: SCREEN_WIDTH - 40, backgroundColor: '#0a0505', borderWidth: 1, borderColor: '#ff0a0a30', padding: 20 },
  title: { color: '#ff0a0a', fontSize: 16, fontWeight: '900', letterSpacing: 4, textAlign: 'center', fontFamily: 'TerminatorRealNFI' },
  duration: { color: '#5a1a1a', fontSize: 24, textAlign: 'center', marginTop: 8, fontFamily: 'TerminatorRealNFI' },
  lcdOuter: { backgroundColor: '#1a1a1a', padding: 12, marginTop: 16 },
  lcdInner: { backgroundColor: '#a89f4c', padding: 16, minHeight: 140 },
  lcdTitle: { color: '#2a2a6a', fontSize: 24, fontWeight: '900', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', textDecorationLine: 'underline' },
  lcdIdLabel: { color: '#2a2a6a', fontSize: 8, marginTop: 4, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  lcdWaveform: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3, marginTop: 16 },
  lcdWaveBar: { width: 5, backgroundColor: '#2a2a6a', borderRadius: 2 },
  lcdFrom: { color: '#2a2a6a', fontSize: 10, marginTop: 12, textAlign: 'center', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  lcdFooter: { color: '#2a2a6a', fontSize: 8, marginTop: 8, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  actionRow: { flexDirection: 'row', gap: 12, marginTop: 16 },
  sendBtn: { flex: 2, backgroundColor: '#ff0a0a', paddingVertical: 14, alignItems: 'center' },
  sendBtnText: { color: '#000', fontSize: 11, fontWeight: '900', letterSpacing: 2, fontFamily: 'TerminatorRealNFI' },
  shareBtn: { flex: 1, backgroundColor: '#050202', borderWidth: 1, borderColor: '#ff0a0a', paddingVertical: 14, alignItems: 'center' },
  shareBtnText: { color: '#ff0a0a', fontSize: 11, fontWeight: '700', letterSpacing: 1, fontFamily: 'TerminatorRealNFI' },
  cancelBtn: { marginTop: 12, paddingVertical: 12, alignItems: 'center' },
  cancelBtnText: { color: '#5a1a1a', fontSize: 10, letterSpacing: 2, fontFamily: 'TerminatorRealNFI' },
});
