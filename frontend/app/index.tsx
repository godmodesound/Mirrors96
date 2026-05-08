import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Image,
  Linking,
  Dimensions,
  Modal,
  TextInput,
  FlatList,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import GodmodeSlider from '../src/GodmodeSlider';
import Svg, { Path, Circle as SvgCircle, Text as SvgText, G, Line } from 'react-native-svg';
import { AudioEngine } from '../src/AudioEngine';
import { ParticleLab, GodmodeEarth } from '../src/GodmodeFeatures';
import { MirrorsWheel, CAMELOT_KEYS, CamelotKey } from '../src/MirrorsWheel';
import { FREQUENCY_ARCHIVE, ARCHIVE_CATEGORIES, FrequencyEntry } from '../src/FrequencyArchiveData';
import { PLAYABLE_ALBUMS, ALBUMS, Album, Track } from '../src/AlbumData';
import { Audio } from 'expo-av';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MirrorsIdBanner from '../src/MirrorsIdBanner';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const API_URL =
  Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL ||
  process.env.EXPO_PUBLIC_BACKEND_URL || '';

// CAMELOT_KEYS imported from ../src/MirrorsWheel

// 13-Chakra Piano Scale Data (432Hz chromatic scale)
const PIANO_KEYS = [
  { key: 13, note: 'C',  freq: 512,   chakra13: 'Godhead', chakra8: 'Godhead', major: 8, color: '#CE93D8', half: true },
  { key: 12, note: 'B',  freq: 486,   chakra13: 'Crown', chakra8: 'Pineal', major: 7, color: '#CE93D8', half: false },
  { key: 11, note: 'A#', freq: 456,   chakra13: '45\u00B0', chakra8: null, major: null, color: '#7C4DFF', half: false },
  { key: 10, note: 'A',  freq: 432,   chakra13: '3rd Eye', chakra8: '3rd Eye', major: 6, color: '#7C4DFF', half: false },
  { key: 9,  note: 'G#', freq: 406.4, chakra13: 'Nose', chakra8: null, major: null, color: '#29B6F6', half: false },
  { key: 8,  note: 'G',  freq: 384,   chakra13: 'Chin', chakra8: 'Throat', major: 5, color: '#29B6F6', half: false },
  { key: 7,  note: 'F#', freq: 362,   chakra13: 'Throat', chakra8: null, major: null, color: '#29B6F6', half: false },
  { key: 6,  note: 'F',  freq: 341.3, chakra13: 'Heart (Personal)', chakra8: null, major: null, color: '#43A047', half: false },
  { key: 5,  note: 'E',  freq: 324,   chakra13: 'Heart (Christ)', chakra8: 'Heart (Christ)', major: 4, color: '#43A047', half: false },
  { key: 4,  note: 'D#', freq: 304.4, chakra13: 'Solar Plexus', chakra8: null, major: null, color: '#FDD835', half: false },
  { key: 3,  note: 'D',  freq: 288,   chakra13: 'Will-Ego', chakra8: 'Will-Ego', major: 3, color: '#FDD835', half: false },
  { key: 2,  note: 'C#', freq: 271.2, chakra13: 'Sex', chakra8: 'Sex', major: 2, color: '#FF6D00', half: false },
  { key: 1,  note: 'C',  freq: 256,   chakra13: 'Survival', chakra8: 'Survival', major: 1, color: '#E53935', half: true },
];

interface ToneLayer {
  id: number;
  frequency: number;
  gain: number;
  isPlaying: boolean;
}

// Analog Dial Component
const AnalogDial = ({ frequency, maxFreq = 2000 }: { frequency: number; maxFreq?: number }) => {
  const size = 90;
  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2 - 8;
  const innerRadius = radius - 10;
  // Map frequency to angle (-135deg to 135deg, 270 deg sweep)
  const ratio = Math.min(frequency / maxFreq, 1);
  const angle = -135 + ratio * 270;
  const radians = (angle * Math.PI) / 180;
  const needleLen = innerRadius - 4;
  const nx = cx + needleLen * Math.cos(radians);
  const ny = cy + needleLen * Math.sin(radians);

  return (
    <View style={dialStyles.container}>
      <Svg width={size} height={size}>
        {/* Outer ring */}
        <SvgCircle cx={cx} cy={cy} r={radius} stroke="#ff0a0a" strokeWidth={1.5} fill="none" opacity={0.6} />
        {/* Middle ring */}
        <SvgCircle cx={cx} cy={cy} r={radius - 5} stroke="#ff0a0a" strokeWidth={0.5} fill="none" opacity={0.3} />
        {/* Inner ring */}
        <SvgCircle cx={cx} cy={cy} r={innerRadius} stroke="#ff0a0a" strokeWidth={1} fill="#0a0505" opacity={0.8} />
        {/* Glow circle */}
        <SvgCircle cx={cx} cy={cy} r={4} fill="#ff0a0a" opacity={0.6} />
        {/* Needle */}
        <Line x1={cx} y1={cy} x2={nx} y2={ny} stroke="#ff6060" strokeWidth={2} strokeLinecap="round" />
        {/* Needle tip */}
        <SvgCircle cx={nx} cy={ny} r={3} fill="#ff8080" />
      </Svg>
      <Text style={dialStyles.label}>Analog</Text>
    </View>
  );
};

const dialStyles = StyleSheet.create({
  container: { alignItems: 'center' },
  label: {
    color: '#5a1a1a',
    fontSize: 8,
    fontFamily: 'TerminatorRealNFI',
    marginTop: 2,
  },
});

// CamelotWheel / MirrorsWheel component imported from ../src/MirrorsWheel

export default function TerminalScreen() {
  const router = useRouter();
  const [layers, setLayers] = useState<ToneLayer[]>([
    { id: 1, frequency: 432, gain: 0.5, isPlaying: false },
  ]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeCamelotKey, setActiveCamelotKey] = useState<string | null>(null);
  const [camelotInfo, setCamelotInfo] = useState<{ note: string; freq: number; color: string } | null>(null);
  const [pianoMode, setPianoMode] = useState<'13' | '8'>('13');
  const [activePianoKey, setActivePianoKey] = useState<number | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [archiveModalVisible, setArchiveModalVisible] = useState(false);
  const [archiveSearch, setArchiveSearch] = useState('');
  const [archiveCategory, setArchiveCategory] = useState('all');
  const [archivePlayingItem, setArchivePlayingItem] = useState<string | null>(null);

  // ═══ Particle Lab Music Player ═══
  const [plSelectedAlbum, setPlSelectedAlbum] = useState<Album>(PLAYABLE_ALBUMS[0]);
  const [plSelectedTrack, setPlSelectedTrack] = useState<Track | null>(null);
  const [plIsPlaying, setPlIsPlaying] = useState(false);
  const [plAlbumDropdownOpen, setPlAlbumDropdownOpen] = useState(false);
  const [plTrackDropdownOpen, setPlTrackDropdownOpen] = useState(false);
  const plSoundRef = useRef<Audio.Sound | null>(null);

  const plPlayTrack = async (track: Track) => {
    try {
      if (plSoundRef.current) {
        await plSoundRef.current.unloadAsync();
        plSoundRef.current = null;
      }
      setPlSelectedTrack(track);
      setPlIsPlaying(true);
      setPlTrackDropdownOpen(false);
      const { sound } = await Audio.Sound.createAsync(
        { uri: track.previewUrl },
        { shouldPlay: true }
      );
      plSoundRef.current = sound;
      sound.setOnPlaybackStatusUpdate((status: any) => {
        if (status.didJustFinish) {
          setPlIsPlaying(false);
          setPlSelectedTrack(null);
        }
      });
    } catch (e) {
      console.log('Particle Lab playback error:', e);
      setPlIsPlaying(false);
    }
  };

  const plStopTrack = async () => {
    if (plSoundRef.current) {
      await plSoundRef.current.stopAsync();
      await plSoundRef.current.unloadAsync();
      plSoundRef.current = null;
    }
    setPlIsPlaying(false);
    setPlSelectedTrack(null);
  };

  useEffect(() => {
    return () => {
      if (plSoundRef.current) {
        plSoundRef.current.unloadAsync();
      }
    };
  }, []);

  // ═══ Sound Lab State ═══
  const [slExpandedAlbum, setSlExpandedAlbum] = useState<string | null>(null);
  const [slPlayingTrack, setSlPlayingTrack] = useState<string | null>(null);
  const slSoundRef = useRef<Audio.Sound | null>(null);
  const [slCheckoutLoading, setSlCheckoutLoading] = useState(false);

  const slPlayPreview = async (track: Track, albumName: string) => {
    try {
      // Stop any existing playback
      if (slSoundRef.current) {
        await slSoundRef.current.unloadAsync();
        slSoundRef.current = null;
      }
      // Also stop particle lab playback
      if (plSoundRef.current) {
        await plSoundRef.current.stopAsync();
        await plSoundRef.current.unloadAsync();
        plSoundRef.current = null;
        setPlIsPlaying(false);
        setPlSelectedTrack(null);
      }
      const trackKey = `${albumName}-${track.number}`;
      if (slPlayingTrack === trackKey) {
        setSlPlayingTrack(null);
        return;
      }
      setSlPlayingTrack(trackKey);
      const { sound } = await Audio.Sound.createAsync(
        { uri: track.previewUrl },
        { shouldPlay: true }
      );
      slSoundRef.current = sound;
      sound.setOnPlaybackStatusUpdate((status: any) => {
        if (status.didJustFinish) {
          setSlPlayingTrack(null);
        }
      });
    } catch (e) {
      console.log('Sound Lab playback error:', e);
      setSlPlayingTrack(null);
    }
  };

  const slStopPreview = async () => {
    if (slSoundRef.current) {
      await slSoundRef.current.stopAsync();
      await slSoundRef.current.unloadAsync();
      slSoundRef.current = null;
    }
    setSlPlayingTrack(null);
  };

  const slHandleCheckout = async (type: 'album' | 'single', name: string, coverUrl: string, artistName: string) => {
    if (slCheckoutLoading) return;
    setSlCheckoutLoading(true);
    try {
      const baseUrl = Platform.OS === 'web' ? window.location.origin : API_URL;
      const res = await fetch(`${API_URL}/api/sound/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          name,
          artist: artistName,
          cover_url: coverUrl,
          success_url: `${baseUrl}/`,
          cancel_url: `${baseUrl}/`,
        }),
      });
      const data = await res.json();
      if (data.checkout_url) {
        if (Platform.OS === 'web') {
          window.location.href = data.checkout_url;
        } else {
          Linking.openURL(data.checkout_url);
        }
      }
    } catch (e) {
      console.log('Checkout error:', e);
    } finally {
      setSlCheckoutLoading(false);
    }
  };

  useEffect(() => {
    return () => {
      if (slSoundRef.current) {
        slSoundRef.current.unloadAsync();
      }
    };
  }, []);

  // Derive active frequency + color for Particle Lab sync
  const activeFrequency = camelotInfo?.freq
    || (activePianoKey !== null ? PIANO_KEYS.find(pk => pk.key === activePianoKey)?.freq : 0)
    || 0;
  const activeColor = camelotInfo?.color
    || (activePianoKey !== null ? PIANO_KEYS.find(pk => pk.key === activePianoKey)?.color : undefined)
    || undefined;

  const handlePianoPress = (pk: typeof PIANO_KEYS[0]) => {
    if (activePianoKey === pk.key) {
      AudioEngine.stopCamelot();
      setActivePianoKey(null);
    } else {
      if (isPlaying) {
        AudioEngine.stopAll();
        setIsPlaying(false);
        setLayers(layers.map(l => ({ ...l, isPlaying: false })));
      }
      AudioEngine.playCamelot(pk.freq);
      setActivePianoKey(pk.key);
    }
  };

  useEffect(() => {
    return () => { AudioEngine.stopAll(); AudioEngine.stopCamelot(); };
  }, []);

  const handlePlay = () => {
    AudioEngine.stopCamelot();
    setActiveCamelotKey(null);
    setCamelotInfo(null);
    if (isPlaying) {
      AudioEngine.stopAll();
      setIsPlaying(false);
      setLayers(layers.map(l => ({ ...l, isPlaying: false })));
    } else {
      layers.forEach(layer => AudioEngine.startTone(layer.id, layer.frequency, layer.gain));
      setIsPlaying(true);
      setLayers(layers.map(l => ({ ...l, isPlaying: true })));
    }
  };

  const addLayer = () => {
    const newId = Math.max(...layers.map(l => l.id), 0) + 1;
    setLayers([...layers, { id: newId, frequency: 324, gain: 0.5, isPlaying: false }]);
  };

  const removeLayer = (id: number) => {
    if (layers.length > 1) {
      AudioEngine.stopTone(id);
      setLayers(layers.filter(l => l.id !== id));
    }
  };

  const updateLayerFrequency = (id: number, frequency: number) => {
    setLayers(layers.map(l => l.id === id ? { ...l, frequency } : l));
    if (isPlaying) AudioEngine.updateFreq(id, frequency);
  };

  const updateLayerGain = (id: number, gain: number) => {
    setLayers(layers.map(l => l.id === id ? { ...l, gain } : l));
    if (isPlaying) AudioEngine.updateGain(id, gain);
  };

  const handleCamelotPress = (key: CamelotKey) => {
    console.log('[MirrorsWheel] Pressed:', key.id, key.note, key.freq, 'Hz');
    if (activeCamelotKey === key.id) {
      AudioEngine.stopCamelot();
      setActiveCamelotKey(null);
      setCamelotInfo(null);
    } else {
      if (isPlaying) {
        AudioEngine.stopAll();
        setIsPlaying(false);
        setLayers(layers.map(l => ({ ...l, isPlaying: false })));
      }
      AudioEngine.playCamelot(key.freq);
      setActiveCamelotKey(key.id);
      setCamelotInfo({ note: key.note, freq: key.freq, color: key.color });
    }
  };

  const getFrequencyBand = (freq: number) => {
    if (freq < 60) return 'SUB';
    if (freq < 250) return 'LOW';
    if (freq < 2000) return 'MID';
    if (freq < 6000) return 'HIGH';
    return 'ULTRA';
  };

  // ═══ FREQUENCY ARCHIVE HELPERS ═══
  const filteredArchive = FREQUENCY_ARCHIVE.filter(item => {
    const matchesCategory = archiveCategory === 'all' || item.category === archiveCategory;
    const matchesSearch = archiveSearch.length === 0 || item.name.toLowerCase().includes(archiveSearch.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // ═══ Frequency History (User Memory) ═══
  const [freqHistory, setFreqHistory] = useState<any[]>([]);
  const { user } = (() => { try { return require('../src/AuthContext').useAuth(); } catch { return { user: null }; } })();

  const loadFreqHistory = async () => {
    if (!user) return;
    try {
      const token = await AsyncStorage.getItem('mirrors_token');
      if (!token) return;
      const res = await fetch(`${API_URL}/api/frequency/history`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setFreqHistory(data.history || []);
      }
    } catch (e) {
      console.log('Failed to load frequency history:', e);
    }
  };

  const saveToFreqHistory = async (entry: FrequencyEntry) => {
    if (!user) {
      // Save locally via AsyncStorage if not logged in
      try {
        const stored = await AsyncStorage.getItem('freq_history_local');
        const local = stored ? JSON.parse(stored) : [];
        const newItem = {
          frequency: entry.frequencies[0],
          name: entry.name,
          category: entry.category,
          note: entry.frequencies.join(', ') + ' Hz',
          timestamp: new Date().toISOString(),
        };
        // Remove duplicates
        const filtered = local.filter((h: any) => h.name !== entry.name);
        const updated = [newItem, ...filtered].slice(0, 50);
        await AsyncStorage.setItem('freq_history_local', JSON.stringify(updated));
        setFreqHistory(updated);
      } catch (e) {
        console.log('Local history save error:', e);
      }
      return;
    }
    try {
      const token = await AsyncStorage.getItem('mirrors_token');
      await fetch(`${API_URL}/api/frequency/history`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          frequency: entry.frequencies[0],
          name: entry.name,
          category: entry.category,
          note: entry.frequencies.join(', ') + ' Hz',
        }),
      });
      loadFreqHistory();
    } catch (e) {
      console.log('History save error:', e);
    }
  };

  useEffect(() => {
    // Load history on mount
    const loadLocal = async () => {
      try {
        const stored = await AsyncStorage.getItem('freq_history_local');
        if (stored) setFreqHistory(JSON.parse(stored));
      } catch {}
    };
    if (user) loadFreqHistory();
    else loadLocal();
  }, [user]);

  const handleArchiveLoadFrequency = (entry: FrequencyEntry) => {
    // Load first frequency into layer 1
    const firstFreq = entry.frequencies[0];
    updateLayerFrequency(layers[0].id, firstFreq);

    // If multi-frequency, add additional layers
    if (entry.frequencies.length > 1) {
      const newLayers = [...layers];
      entry.frequencies.slice(1).forEach((freq, idx) => {
        const existingLayer = newLayers[idx + 1];
        if (existingLayer) {
          newLayers[idx + 1] = { ...existingLayer, frequency: freq };
        }
      });
      setLayers(newLayers);
    }
    // Save to history
    saveToFreqHistory(entry);
    setArchiveModalVisible(false);
  };

  const handleArchivePlayFrequency = (name: string, frequencies: number[]) => {
    if (archivePlayingItem === name) {
      AudioEngine.stopMulti();
      setArchivePlayingItem(null);
    } else {
      AudioEngine.playMulti(frequencies, 0.3);
      setArchivePlayingItem(name);
    }
  };

  const getBandPosition = (freq: number) => {
    if (freq < 60) return 0;
    if (freq < 250) return 1;
    if (freq < 2000) return 2;
    if (freq < 6000) return 3;
    return 4;
  };

  const BANDS = ['SUB', 'LOW', 'MID', 'HIGH', 'ULTRA'];

  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <View style={[styles.safeArea, { paddingTop: insets.top }]}>
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 90 }}>
          {/* Header with minimal logo */}
          <View style={styles.header}>
            <View style={styles.headerRow}>
              <Image
                source={require('../assets/images/logo.jpg')}
                style={styles.miniLogo}
                resizeMode="cover"
              />
              <View style={styles.headerTextBlock}>
                <TouchableOpacity onPress={() => router.push('/chirpconnect')} activeOpacity={0.7}>
                  <Image
                    source={{ uri: 'https://customer-assets.emergentagent.com/job_e121e09e-99f3-472d-8697-f5a5be5cce59/artifacts/x7wgp9g9_MIRRORS%20ID.jpeg' }}
                    style={styles.mirrorsIdBanner}
                    resizeMode="contain"
                  />
                </TouchableOpacity>
                <View style={styles.bubbleRow}>
                  <TouchableOpacity
                    style={styles.bubble}
                    onPress={() => Linking.openURL('https://earth.google.com/web/')}
                  >
                    <View style={styles.bubbleDot} />
                    <Text style={styles.bubbleText}>GODMODE</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.bubble}
                    onPress={() => router.push('/library')}
                  >
                    <View style={styles.bubbleDot} />
                    <Text style={styles.bubbleText}>Archive</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.bubble}
                    onPress={() => router.push('/sound')}
                  >
                    <View style={styles.bubbleDot} />
                    <Text style={styles.bubbleText}>90.6</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.bubble}
                    onPress={() => Linking.openURL('https://soundcloud.com/codes-godmode/sets/dj-sets')}
                  >
                    <View style={styles.bubbleDot} />
                    <Text style={styles.bubbleText}>DJ SETS</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.bubble}
                    onPress={() => router.push('/store')}
                  >
                    <View style={[styles.bubbleDot, { backgroundColor: '#ff3040' }]} />
                    <Text style={styles.bubbleText}>STORE</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.bubble}
                    onPress={() => router.push('/chirpconnect')}
                  >
                    <View style={[styles.bubbleDot, { backgroundColor: '#00ff41' }]} />
                    <Text style={styles.bubbleText}>CODES</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>

          {/* ══════ SOUND LAB — Albums with Buy & Preview ══════ */}
          <View style={styles.section}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={styles.sectionTitle}>&gt; SOUND_LAB</Text>
              <TouchableOpacity onPress={() => router.push('/store')} style={slabStyles.openStoreBtn}>
                <Text style={slabStyles.openStoreText}>OPEN STORE</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.sectionSub}>{ALBUMS.length} albums · {ALBUMS.reduce((acc, a) => acc + a.tracks.length, 0)} tracks</Text>

            {/* Buy Full Discography */}
            <TouchableOpacity
              style={slabStyles.discographyBtn}
              onPress={() => slHandleCheckout('album', 'GODMODE DISCOGRAPHY', '', 'VINCE SINNOTT')}
            >
              <Text style={slabStyles.discographyText}>BUY FULL DISCOGRAPHY — $13</Text>
            </TouchableOpacity>

            {/* Album Grid */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={slabStyles.albumScroll} contentContainerStyle={{ gap: 10, paddingRight: 8 }}>
              {ALBUMS.map((album) => {
                const isExpanded = slExpandedAlbum === album.id;
                const hasTracks = album.tracks.length > 0;
                return (
                  <View key={album.id} style={[slabStyles.albumCard, isExpanded && slabStyles.albumCardExpanded]}>
                    <TouchableOpacity onPress={() => setSlExpandedAlbum(isExpanded ? null : album.id)} activeOpacity={0.8}>
                      <Image source={{ uri: album.coverUrl }} style={slabStyles.albumCover} />
                      <Text style={slabStyles.albumName} numberOfLines={1}>{album.name.toUpperCase()}</Text>
                      <Text style={slabStyles.albumMeta}>{hasTracks ? `${album.tracks.length} tracks` : 'Album'}</Text>
                    </TouchableOpacity>

                    {/* Buy Album Button */}
                    <TouchableOpacity
                      style={slabStyles.buyAlbumBtn}
                      onPress={() => slHandleCheckout('album', album.name, album.coverUrl, album.artist)}
                    >
                      <Text style={slabStyles.buyAlbumText}>BUY ALBUM $13</Text>
                    </TouchableOpacity>

                    {/* Expanded Track List */}
                    {isExpanded && hasTracks && (
                      <View style={slabStyles.trackList}>
                        {album.tracks.map((track) => {
                          const trackKey = `${album.name}-${track.number}`;
                          const isPlaying = slPlayingTrack === trackKey;
                          return (
                            <View key={track.number} style={slabStyles.trackRow}>
                              <TouchableOpacity
                                style={slabStyles.trackPlayBtn}
                                onPress={() => slPlayPreview(track, album.name)}
                              >
                                <Text style={[slabStyles.trackPlayIcon, isPlaying && slabStyles.trackPlayIconActive]}>
                                  {isPlaying ? '■' : '▶'}
                                </Text>
                              </TouchableOpacity>
                              <Text style={[slabStyles.trackName, isPlaying && slabStyles.trackNameActive]} numberOfLines={1}>{track.name}</Text>
                              <TouchableOpacity
                                style={slabStyles.trackBuyBtn}
                                onPress={() => slHandleCheckout('single', `${album.name} — ${track.name}`, album.coverUrl, album.artist)}
                              >
                                <Text style={slabStyles.trackBuyText}>$1.96</Text>
                              </TouchableOpacity>
                            </View>
                          );
                        })}
                      </View>
                    )}
                  </View>
                );
              })}
            </ScrollView>

            {/* Now Playing Bar */}
            {slPlayingTrack && (
              <View style={slabStyles.nowPlayingBar}>
                <View style={slabStyles.npDot} />
                <Text style={slabStyles.npLabel} numberOfLines={1}>PREVIEW: {slPlayingTrack.toUpperCase()}</Text>
                <TouchableOpacity onPress={slStopPreview}>
                  <Text style={slabStyles.npStopBtn}>■ STOP</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Tone Layers - Analog Style */}
          <View style={styles.section}>
            <View style={styles.toneLayerHeaderRow}>
              <Text style={styles.sectionTitle}>&gt; TONE_LAYERS [MONO]</Text>
              <TouchableOpacity
                style={styles.archiveBubble}
                onPress={() => setArchiveModalVisible(true)}
              >
                <View style={styles.archiveBubbleDot} />
                <Text style={styles.archiveBubbleText}>FREQ ARCHIVE</Text>
              </TouchableOpacity>
            </View>

            {layers.map((layer, index) => (
              <View key={layer.id} style={styles.layerCard}>
                <View style={styles.layerTopRow}>
                  {/* Analog Dial */}
                  <AnalogDial frequency={layer.frequency} />
                  {/* Controls */}
                  <View style={styles.layerControls}>
                    <View style={styles.layerLabelRow}>
                      <Text style={styles.layerTitle}>Layer {index + 1}</Text>
                      {layers.length > 1 && (
                        <TouchableOpacity onPress={() => removeLayer(layer.id)} style={styles.removeBtn}>
                          <Text style={styles.removeBtnText}>X</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                    {/* Frequency Slider */}
                    <GodmodeSlider
                      style={styles.slider}
                      minimumValue={1}
                      maximumValue={2000}
                      value={layer.frequency}
                      onValueChange={(val) => updateLayerFrequency(layer.id, val)}
                      minimumTrackTintColor="#ff0a0a"
                      maximumTrackTintColor="#333333"
                      thumbTintColor="#ff6060"
                    />
                    {/* Band Labels */}
                    <View style={styles.bandRow}>
                      {BANDS.map((band, i) => (
                        <Text
                          key={band}
                          style={[
                            styles.bandLabel,
                            getBandPosition(layer.frequency) === i && styles.bandLabelActive,
                          ]}
                        >
                          {band}
                        </Text>
                      ))}
                    </View>
                    {/* Gain slider */}
                    <View style={styles.gainRow}>
                      <Text style={styles.gainLabel}>Gain:</Text>
                      <GodmodeSlider
                        style={styles.gainSlider}
                        minimumValue={0}
                        maximumValue={1}
                        value={layer.gain}
                        onValueChange={(val) => updateLayerGain(layer.id, val)}
                        minimumTrackTintColor="#ff3040"
                        maximumTrackTintColor="#333333"
                        thumbTintColor="#ff6060"
                      />
                    </View>
                  </View>
                </View>
                {/* Digital Readout */}
                <View style={styles.digitalReadout}>
                  <Text style={styles.digitalHz}>{layer.frequency.toFixed(1)} Hz</Text>
                  <Text style={styles.digitalLabel}>Digital</Text>
                </View>
                {layer.isPlaying && (
                  <Text style={styles.transmitting}>■ TRANSMITTING</Text>
                )}
              </View>
            ))}

            <TouchableOpacity style={styles.addLayerBtn} onPress={addLayer}>
              <Text style={styles.addLayerText}>[+] ADD_LAYER</Text>
            </TouchableOpacity>
          </View>

          {/* Play Controls */}
          <View style={styles.controlsContainer}>
            <TouchableOpacity
              style={[styles.playButton, isPlaying && styles.playButtonActive]}
              onPress={handlePlay}
            >
              <Text style={[styles.playButtonText, isPlaying && styles.playButtonTextActive]}>
                {isPlaying ? '[ ■ STOP ]' : '[ ▶ EXECUTE ]'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Sacred Frequencies */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>&gt; SACRED_FREQUENCIES</Text>
            <View style={styles.presetGrid}>
              {[432, 528, 639, 741, 852, 963, 174, 285, 396, 417].map(freq => (
                <TouchableOpacity
                  key={freq}
                  style={styles.presetChip}
                  onPress={() => updateLayerFrequency(layers[0].id, freq)}
                >
                  <Text style={styles.presetText}>{freq}Hz</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Mirrors Wheel */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>&gt; MIRRORS_WHEEL</Text>
            <Text style={styles.sectionSub}>Liquid Metal × Harmonic Mixing Engine — 432Hz — Tap to emit</Text>

            <MirrorsWheel
              activeKey={activeCamelotKey}
              onKeyPress={handleCamelotPress}
              isEmitting={!!activeCamelotKey}
            />

            {activeCamelotKey && (
              <TouchableOpacity
                style={styles.stopCamelotBtn}
                onPress={() => { AudioEngine.stopCamelot(); setActiveCamelotKey(null); setCamelotInfo(null); }}
              >
                <Text style={styles.stopCamelotText}>[ ■ STOP FREQUENCY ]</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* ══════ CHAKRA PIANO SCALE — "13" ══════ */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>&gt; CHAKRA_PIANO_SCALE</Text>
            <Text style={styles.sectionSub}>Tap keys to play — 13 chromatic + 8 major scale</Text>

            {/* Mode Toggle */}
            <View style={styles.pianoToggle}>
              <TouchableOpacity
                style={[styles.pianoToggleBtn, pianoMode === '13' && styles.pianoToggleBtnActive]}
                onPress={() => setPianoMode('13')}
              >
                <Text style={[styles.pianoToggleText, pianoMode === '13' && styles.pianoToggleTextActive]}>13-Chakra</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.pianoToggleBtn, pianoMode === '8' && styles.pianoToggleBtnActive]}
                onPress={() => setPianoMode('8')}
              >
                <Text style={[styles.pianoToggleText, pianoMode === '8' && styles.pianoToggleTextActive]}>8-Chakra</Text>
              </TouchableOpacity>
            </View>

            {/* Piano Keys */}
            <View style={styles.pianoContainer}>
              {PIANO_KEYS.map((pk) => {
                const isInMajor = pk.major !== null;
                const showKey = pianoMode === '13' || isInMajor;
                if (!showKey) return null;
                const isActive = activePianoKey === pk.key;
                const isSharp = pk.note.includes('#');
                return (
                  <TouchableOpacity
                    key={pk.key}
                    style={[
                      styles.pianoKey,
                      isSharp && styles.pianoKeySharp,
                      isActive && { borderColor: pk.color, backgroundColor: pk.color + '20' },
                    ]}
                    onPress={() => handlePianoPress(pk)}
                  >
                    {/* Left: half marker + chakra13 name */}
                    <View style={styles.pianoKeyLeft}>
                      {pk.half && <Text style={[styles.pianoHalf, { color: pk.color }]}>1/2</Text>}
                      <Text style={[styles.pianoChakraName, { color: pk.color }]} numberOfLines={1}>
                        {pianoMode === '13' ? pk.chakra13 : (pk.chakra8 || pk.chakra13)}
                      </Text>
                    </View>

                    {/* Center: key number + note */}
                    <View style={[styles.pianoKeyCenter, { backgroundColor: pk.color + (isActive ? '40' : '15') }]}>
                      <Text style={[styles.pianoKeyNum, { color: isActive ? '#fff' : pk.color }]}>
                        {pianoMode === '13' ? pk.key : pk.major} · {pk.note}
                      </Text>
                    </View>

                    {/* Right: freq */}
                    <View style={styles.pianoKeyRight}>
                      <Text style={[styles.pianoFreq, { color: isActive ? pk.color : '#5a1a1a' }]}>{pk.freq} Hz</Text>
                    </View>

                    {/* Far right: major scale number (8-chakra mode) */}
                    {pianoMode === '13' && isInMajor && (
                      <View style={styles.pianoMajorBadge}>
                        <Text style={[styles.pianoMajorNum, { color: pk.color }]}>{pk.major}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Piano Legend */}
            <View style={styles.pianoLegendBox}>
              <Text style={styles.pianoLegendTitle}>PINEAL ACCESS</Text>
              <Text style={styles.pianoLegendText}>Crown + 45° + 3rd Eye — upper triad gateway</Text>
              <View style={styles.pianoLegendDivider} />
              <Text style={styles.pianoLegendText}>13-chakra = chromatic scale | 8-chakra = major scale</Text>
              <Text style={styles.pianoLegendText}>*Change at the throat (F#)</Text>
            </View>
          </View>

          {/* ══════ PARTICLE LAB — synced with Mirrors Wheel ══════ */}
          <View style={styles.section}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={styles.sectionTitle}>&gt; PARTICLE_LAB</Text>
              <TouchableOpacity
                style={[styles.soundToggle, soundEnabled && styles.soundToggleActive]}
                onPress={() => setSoundEnabled(!soundEnabled)}
              >
                <Text style={[styles.soundToggleText, soundEnabled && styles.soundToggleTextActive]}>
                  {soundEnabled ? 'SOUND ON' : 'SOUND OFF'}
                </Text>
              </TouchableOpacity>
            </View>

            <ParticleLab
              height={350}
              activeFrequency={activeFrequency}
              activeColor={activeColor}
              soundEnabled={soundEnabled}
            />
          </View>


          {/* ══════ GODMODE EARTH ══════ */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>&gt; GODMODE</Text>
            <Text style={styles.sectionSub}>Interactive Google Earth — Search any location</Text>
            <GodmodeEarth height={450} />
          </View>

          {/* Quick Archive Access */}
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.viewAllBtn}
              onPress={() => router.push('/library')}
            >
              <Text style={styles.viewAllText}>[ VIEW FULL ARCHIVE → ]</Text>
              <Text style={styles.viewAllSub}>32+ CONDITIONS | ALL CATEGORIES</Text>
            </TouchableOpacity>
          </View>

          <View style={{ height: 20 }} />
        </ScrollView>
      </View>

      {/* ═══════ FREQUENCY ARCHIVE MODAL ═══════ */}
      <Modal
        visible={archiveModalVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => { setArchiveModalVisible(false); AudioEngine.stopMulti(); setArchivePlayingItem(null); }}
      >
        <View style={archiveStyles.modalContainer}>
          <View style={[archiveStyles.modalSafeArea, { paddingTop: insets.top }]}>
            {/* Header */}
            <View style={archiveStyles.modalHeader}>
              <View style={archiveStyles.modalHeaderLeft}>
                <Text style={archiveStyles.modalTitle}>FREQUENCY ARCHIVE</Text>
                <Text style={archiveStyles.modalSubtitle}>
                  {FREQUENCY_ARCHIVE.length} CONDITIONS | 432Hz CALIBRATED
                </Text>
              </View>
              <TouchableOpacity
                style={archiveStyles.modalCloseBtn}
                onPress={() => { setArchiveModalVisible(false); AudioEngine.stopMulti(); setArchivePlayingItem(null); }}
              >
                <Text style={archiveStyles.modalCloseBtnText}>[X]</Text>
              </TouchableOpacity>
            </View>

            {/* Search */}
            <View style={archiveStyles.searchContainer}>
              <Text style={archiveStyles.searchPrompt}>&gt;</Text>
              <TextInput
                style={archiveStyles.searchInput}
                placeholder="search_condition..."
                placeholderTextColor="#3a1010"
                value={archiveSearch}
                onChangeText={setArchiveSearch}
              />
              {archiveSearch.length > 0 && (
                <TouchableOpacity onPress={() => setArchiveSearch('')}>
                  <Text style={archiveStyles.clearBtn}>[X]</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Category Tabs */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={archiveStyles.categoryScroll}
              contentContainerStyle={archiveStyles.categoryContainer}
            >
              {ARCHIVE_CATEGORIES.map(cat => (
                <TouchableOpacity
                  key={cat.id}
                  style={[archiveStyles.categoryTab, archiveCategory === cat.id && archiveStyles.categoryTabActive]}
                  onPress={() => setArchiveCategory(cat.id)}
                >
                  <Text style={[archiveStyles.categoryLabel, archiveCategory === cat.id && archiveStyles.categoryLabelActive]}>
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Recent Frequencies (User Memory) */}
            {freqHistory.length > 0 && (
              <View style={archiveStyles.recentSection}>
                <Text style={archiveStyles.recentTitle}>RECENT FREQUENCIES</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingRight: 8 }}>
                  {freqHistory.slice(0, 10).map((item: any, idx: number) => (
                    <TouchableOpacity
                      key={idx}
                      style={archiveStyles.recentChip}
                      onPress={() => {
                        // Find matching archive entry and load it
                        const entry = FREQUENCY_ARCHIVE.find(f => f.name === item.name);
                        if (entry) {
                          handleArchiveLoadFrequency(entry);
                        } else {
                          // Load single frequency directly
                          updateLayerFrequency(layers[0].id, item.frequency);
                          setArchiveModalVisible(false);
                        }
                      }}
                    >
                      <Text style={archiveStyles.recentChipFreq}>{item.frequency} Hz</Text>
                      <Text style={archiveStyles.recentChipName} numberOfLines={1}>{item.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Now Playing Bar */}
            {archivePlayingItem && (
              <View style={archiveStyles.nowPlaying}>
                <View style={archiveStyles.nowPlayingDot} />
                <Text style={archiveStyles.nowPlayingText} numberOfLines={1}>NOW PLAYING: {archivePlayingItem}</Text>
                <TouchableOpacity onPress={() => { AudioEngine.stopMulti(); setArchivePlayingItem(null); }}>
                  <Text style={archiveStyles.stopAllBtn}>[STOP]</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Result Count */}
            <Text style={archiveStyles.resultCount}>
              SHOWING {filteredArchive.length} OF {FREQUENCY_ARCHIVE.length} CONDITIONS
            </Text>

            {/* Frequency List */}
            <FlatList
              data={filteredArchive}
              keyExtractor={(item, index) => `${item.name}-${index}`}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: insets.bottom + 90, paddingHorizontal: 16 }}
              renderItem={({ item }) => {
                const isPlaying = archivePlayingItem === item.name;
                return (
                  <View style={[archiveStyles.archiveCard, isPlaying && archiveStyles.archiveCardActive]}>
                    <View style={archiveStyles.archiveCardHeader}>
                      <View style={archiveStyles.archiveCardInfo}>
                        <Text style={archiveStyles.archiveCardName}>
                          {item.icon ? `${item.icon} ` : ''}{item.name}
                        </Text>
                        <Text style={archiveStyles.archiveCardCategory}>
                          {item.category.toUpperCase()} | {item.frequencies.length} freq{item.frequencies.length > 1 ? 's' : ''}
                        </Text>
                      </View>
                    </View>
                    {/* Frequency chips */}
                    <View style={archiveStyles.freqChipRow}>
                      {item.frequencies.map((f, i) => (
                        <Text key={i} style={archiveStyles.freqChip}>{f} Hz</Text>
                      ))}
                    </View>
                    {/* Action buttons */}
                    <View style={archiveStyles.actionRow}>
                      <TouchableOpacity
                        style={[archiveStyles.playBtn, isPlaying && archiveStyles.playBtnActive]}
                        onPress={() => handleArchivePlayFrequency(item.name, item.frequencies)}
                      >
                        <Text style={[archiveStyles.playBtnText, isPlaying && archiveStyles.playBtnTextActive]}>
                          {isPlaying ? '[ STOP ]' : '[ PLAY ]'}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={archiveStyles.loadBtn}
                        onPress={() => handleArchiveLoadFrequency(item)}
                      >
                        <Text style={archiveStyles.loadBtnText}>[ LOAD → LAYER ]</Text>
                      </TouchableOpacity>
                    </View>
                    {isPlaying && (
                      <View style={archiveStyles.transmitBar}>
                        <View style={archiveStyles.transmitDot} />
                        <Text style={archiveStyles.transmitText}>TRANSMITTING</Text>
                      </View>
                    )}
                  </View>
                );
              }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  safeArea: { flex: 1 },
  scrollView: { flex: 1, paddingHorizontal: 16 },
  header: { paddingTop: 12, paddingBottom: 8 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  miniLogo: {
    width: 52,
    height: 52,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ff0a0a40',
  },
  headerTextBlock: { flex: 1 },
  mirrorsIdBanner: {
    width: '100%',
    height: 48,
    borderRadius: 4,
  },
  terminalTitle: {
    color: '#ff0a0a',
    fontSize: 14,
    fontFamily: 'TerminatorRealNFI',
    fontWeight: '700',
  },
  bubbleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 6,
  },
  bubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#0a0505',
    borderWidth: 1,
    borderColor: '#ff0a0a',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  bubbleDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#ff0a0a',
  },
  bubbleText: {
    color: '#ff0a0a',
    fontSize: 9,
    fontWeight: '700',
    fontFamily: 'TerminatorRealNFI',
  },
  section: { marginTop: 18 },
  sectionTitle: {
    color: '#ff0a0a',
    fontSize: 11,
    fontFamily: 'TerminatorRealNFI',
    marginBottom: 10,
  },
  sectionSub: {
    color: '#5a1a1a',
    fontSize: 9,
    fontFamily: 'TerminatorRealNFI',
    marginBottom: 10,
    textAlign: 'center',
  },
  // Layer Card - Analog style
  layerCard: {
    backgroundColor: '#0a0505',
    borderWidth: 1,
    borderColor: '#2a0a0a',
    padding: 12,
    marginBottom: 10,
  },
  layerTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  layerControls: { flex: 1 },
  layerLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  layerTitle: {
    color: '#ff3040',
    fontSize: 10,
    fontFamily: 'TerminatorRealNFI',
  },
  removeBtn: {
    backgroundColor: '#2a0a0a',
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeBtnText: { color: '#ff3040', fontSize: 10, fontWeight: '700' },
  slider: { width: '100%', height: 28 },
  bandRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginTop: 2,
  },
  bandLabel: {
    color: '#3a1010',
    fontSize: 8,
    fontFamily: 'TerminatorRealNFI',
  },
  bandLabelActive: {
    color: '#ff0a0a',
    fontWeight: '700',
  },
  gainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  gainLabel: {
    color: '#5a1a1a',
    fontSize: 8,
    fontFamily: 'TerminatorRealNFI',
    width: 30,
  },
  gainSlider: { flex: 1, height: 24 },
  digitalReadout: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0d0404',
    borderWidth: 1,
    borderColor: '#ff0a0a40',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 8,
  },
  digitalHz: {
    color: '#ff0a0a',
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'TerminatorRealNFI',
  },
  digitalLabel: {
    color: '#5a1a1a',
    fontSize: 9,
    fontFamily: 'TerminatorRealNFI',
  },
  transmitting: {
    color: '#ff0a0a',
    fontSize: 9,
    fontFamily: 'TerminatorRealNFI',
    textAlign: 'center',
    marginTop: 6,
  },
  addLayerBtn: {
    padding: 10,
    borderWidth: 1,
    borderColor: '#2a0a0a',
    borderStyle: 'dashed',
    alignItems: 'center',
  },
  addLayerText: {
    color: '#ff0a0a',
    fontSize: 10,
    fontFamily: 'TerminatorRealNFI',
  },
  controlsContainer: { alignItems: 'center', marginTop: 18 },
  playButton: {
    borderWidth: 2,
    borderColor: '#ff0a0a',
    paddingHorizontal: 36,
    paddingVertical: 12,
    backgroundColor: '#0a0505',
  },
  playButtonActive: { borderColor: '#ff3040', backgroundColor: '#1a0505' },
  playButtonText: {
    color: '#ff0a0a',
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'TerminatorRealNFI',
  },
  playButtonTextActive: { color: '#ff3040' },
  presetGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  presetChip: {
    borderWidth: 1,
    borderColor: '#ff0a0a',
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: '#0a0505',
  },
  presetText: {
    color: '#ff0a0a',
    fontSize: 10,
    fontFamily: 'TerminatorRealNFI',
  },
  // Camelot Wheel (styles now in MirrorsWheel component, keep info box styles)
  stopCamelotBtn: {
    marginTop: 10,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#ff0a0a',
    backgroundColor: '#1a0505',
    alignItems: 'center',
  },
  stopCamelotText: {
    color: '#ff0a0a',
    fontSize: 11,
    fontWeight: '700',
  },
  viewAllBtn: {
    padding: 12,
    borderWidth: 2,
    borderColor: '#ff0a0a',
    backgroundColor: '#0a0505',
    alignItems: 'center',
  },
  viewAllText: {
    color: '#ff0a0a',
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'TerminatorRealNFI',
  },
  viewAllSub: {
    color: '#5a1a1a',
    fontSize: 8,
    fontFamily: 'TerminatorRealNFI',
    marginTop: 3,
  },
  soundToggle: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: '#2a0a0a',
    backgroundColor: '#0a0505',
  },
  soundToggleActive: {
    borderColor: '#ff0a0a',
    backgroundColor: '#1a0505',
  },
  soundToggleText: {
    color: '#5a1a1a',
    fontSize: 8,
    fontFamily: 'TerminatorRealNFI',
    fontWeight: '700',
  },
  soundToggleTextActive: {
    color: '#ff0a0a',
  },
  pianoToggle: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  pianoToggleBtn: {
    flex: 1,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#2a0a0a',
    backgroundColor: '#0a0505',
    alignItems: 'center',
  },
  pianoToggleBtnActive: {
    borderColor: '#ff0a0a',
    backgroundColor: '#150505',
  },
  pianoToggleText: {
    color: '#5a1a1a',
    fontSize: 10,
    fontFamily: 'TerminatorRealNFI',
    fontWeight: '700',
  },
  pianoToggleTextActive: {
    color: '#ff0a0a',
  },
  pianoContainer: {
    borderWidth: 1,
    borderColor: '#2a0a0a',
    backgroundColor: '#0a0505',
  },
  pianoKey: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#1a0808',
    paddingVertical: 8,
    paddingHorizontal: 8,
    minHeight: 44,
  },
  pianoKeySharp: {
    backgroundColor: '#050202',
  },
  pianoKeyLeft: {
    width: 90,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pianoHalf: {
    fontSize: 7,
    fontFamily: 'TerminatorRealNFI',
  },
  pianoChakraName: {
    fontSize: 8,
    fontFamily: 'TerminatorRealNFI',
    fontWeight: '700',
  },
  pianoKeyCenter: {
    flex: 1,
    paddingVertical: 6,
    paddingHorizontal: 10,
    alignItems: 'center',
    marginHorizontal: 6,
  },
  pianoKeyNum: {
    fontSize: 12,
    fontFamily: 'TerminatorRealNFI',
    fontWeight: '700',
  },
  pianoKeyRight: {
    width: 55,
    alignItems: 'flex-end',
  },
  pianoFreq: {
    fontSize: 9,
    fontFamily: 'TerminatorRealNFI',
  },
  pianoMajorBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2a0a0a',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  pianoMajorNum: {
    fontSize: 8,
    fontFamily: 'TerminatorRealNFI',
    fontWeight: '700',
  },
  pianoLegendBox: {
    borderWidth: 1,
    borderColor: '#2a0a0a',
    padding: 10,
    marginTop: 8,
    backgroundColor: '#050202',
  },
  pianoLegendTitle: {
    color: '#ff3040',
    fontSize: 9,
    fontFamily: 'TerminatorRealNFI',
    fontWeight: '700',
    marginBottom: 4,
  },
  pianoLegendText: {
    color: '#5a1a1a',
    fontSize: 8,
    fontFamily: 'TerminatorRealNFI',
    lineHeight: 13,
  },
  pianoLegendDivider: {
    height: 1,
    backgroundColor: '#1a0808',
    marginVertical: 6,
  },
  toneLayerHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  archiveBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a0505',
    borderWidth: 1,
    borderColor: '#ff0a0a',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
  },
  archiveBubbleDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ff0a0a',
    shadowColor: '#ff0a0a',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  archiveBubbleText: {
    color: '#ff0a0a',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
});

// ═══════ PARTICLE LAB MUSIC PLAYER STYLES ═══════
const plStyles = StyleSheet.create({
  musicControls: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
    marginBottom: 4,
    zIndex: 100,
  },
  dropdownWrap: {
    flex: 1,
    position: 'relative',
    zIndex: 100,
  },
  dropdownBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0a0000',
    borderWidth: 1,
    borderColor: '#1a0808',
    paddingHorizontal: 8,
    paddingVertical: 8,
    gap: 6,
  },
  dropdownCover: {
    width: 22,
    height: 22,
    borderRadius: 2,
  },
  dropdownLabel: {
    flex: 1,
    color: '#ff0a0a',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.5,
    fontFamily: 'TerminatorRealNFI',
  },
  dropdownArrow: {
    color: '#5a1a1a',
    fontSize: 8,
  },
  dropdownList: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#080000',
    borderWidth: 1,
    borderColor: '#1a0808',
    borderTopWidth: 0,
    maxHeight: 200,
    zIndex: 999,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 8,
    gap: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#0d0303',
  },
  dropdownItemActive: {
    backgroundColor: '#1a0505',
  },
  dropdownItemCover: {
    width: 20,
    height: 20,
    borderRadius: 2,
  },
  dropdownItemText: {
    flex: 1,
    color: '#5a1a1a',
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 1,
    fontFamily: 'TerminatorRealNFI',
  },
  dropdownItemTextActive: {
    color: '#ff0a0a',
  },
  trackNum: {
    color: '#3a0808',
    fontSize: 9,
    fontWeight: '700',
    width: 18,
    fontFamily: 'TerminatorRealNFI',
  },
  nowPlaying: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0d0000',
    borderWidth: 1,
    borderColor: '#ff0a0a30',
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 4,
    gap: 8,
  },
  npPulse: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ff0a0a',
  },
  npText: {
    flex: 1,
    color: '#ff0a0a',
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 1.5,
    fontFamily: 'TerminatorRealNFI',
  },
  npStop: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  npStopText: {
    color: '#ff0a0a',
    fontSize: 14,
  },
});

// ═══════ SOUND LAB STYLES ═══════
const slabStyles = StyleSheet.create({
  openStoreBtn: {
    borderWidth: 1,
    borderColor: '#ff0a0a40',
    paddingHorizontal: 12,
    paddingVertical: 5,
    backgroundColor: '#0a0000',
  },
  openStoreText: {
    color: '#ff0a0a',
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 2,
    fontFamily: 'TerminatorRealNFI',
  },
  discographyBtn: {
    backgroundColor: '#ff0a0a',
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
    marginTop: 10,
    borderRadius: 50,
    shadowColor: '#ff0a0a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 5,
  },
  discographyText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2,
    fontFamily: 'TerminatorRealNFI',
  },
  albumScroll: {
    marginTop: 10,
  },
  albumCard: {
    width: 140,
    backgroundColor: '#0a0000',
    borderWidth: 1,
    borderColor: '#1a0505',
    padding: 8,
  },
  albumCardExpanded: {
    width: 200,
    borderColor: '#ff0a0a40',
  },
  albumCover: {
    width: '100%',
    height: 120,
    borderRadius: 2,
    marginBottom: 6,
  },
  albumName: {
    color: '#ff0a0a',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
    fontFamily: 'TerminatorRealNFI',
  },
  albumMeta: {
    color: '#5a1a1a',
    fontSize: 8,
    letterSpacing: 1,
    marginTop: 2,
    fontFamily: 'TerminatorRealNFI',
  },
  buyAlbumBtn: {
    backgroundColor: '#ff0a0a',
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginTop: 8,
    borderRadius: 50,
    shadowColor: '#ff0a0a',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
  buyAlbumText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 2,
    fontFamily: 'TerminatorRealNFI',
  },
  trackList: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#1a0505',
    paddingTop: 6,
  },
  trackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    gap: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#0d0303',
  },
  trackPlayBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ff0a0a30',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#050000',
  },
  trackPlayIcon: {
    color: '#5a1a1a',
    fontSize: 10,
  },
  trackPlayIconActive: {
    color: '#ff0a0a',
  },
  trackName: {
    flex: 1,
    color: '#5a1a1a',
    fontSize: 8,
    letterSpacing: 1,
    fontFamily: 'TerminatorRealNFI',
  },
  trackNameActive: {
    color: '#ff0a0a',
  },
  trackBuyBtn: {
    backgroundColor: '#ff0a0a',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 50,
    shadowColor: '#ff0a0a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 3,
  },
  trackBuyText: {
    color: '#fff',
    fontSize: 7,
    fontWeight: '700',
    letterSpacing: 1,
    fontFamily: 'TerminatorRealNFI',
  },
  nowPlayingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0d0000',
    borderWidth: 1,
    borderColor: '#ff0a0a30',
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 8,
    gap: 8,
  },
  npDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ff0a0a',
  },
  npLabel: {
    flex: 1,
    color: '#ff0a0a',
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 1.5,
    fontFamily: 'TerminatorRealNFI',
  },
  npStopBtn: {
    color: '#ff0a0a',
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 1,
    fontFamily: 'TerminatorRealNFI',
  },
});

// ═══════ FREQUENCY ARCHIVE MODAL STYLES ═══════
const archiveStyles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  modalSafeArea: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1a0808',
  },
  modalHeaderLeft: {
    flex: 1,
  },
  modalTitle: {
    color: '#ff0a0a',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 3,
  },
  modalSubtitle: {
    color: '#5a1a1a',
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 2,
    marginTop: 2,
  },
  modalCloseBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#ff0a0a40',
    borderRadius: 4,
  },
  modalCloseBtnText: {
    color: '#ff0a0a',
    fontSize: 13,
    fontWeight: '800',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#2a0a0a',
    backgroundColor: '#0a0303',
    paddingHorizontal: 12,
    borderRadius: 4,
  },
  searchPrompt: {
    color: '#ff0a0a',
    fontSize: 14,
    fontWeight: '800',
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#ff3040',
    fontSize: 13,
    fontWeight: '500',
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
    letterSpacing: 1,
  },
  clearBtn: {
    color: '#ff0a0a',
    fontSize: 12,
    fontWeight: '800',
    paddingHorizontal: 8,
  },
  categoryScroll: {
    maxHeight: 40,
    marginTop: 10,
  },
  categoryContainer: {
    paddingHorizontal: 16,
    gap: 6,
  },
  categoryTab: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: '#1a0808',
    borderRadius: 4,
    backgroundColor: '#050202',
  },
  categoryTabActive: {
    borderColor: '#ff0a0a',
    backgroundColor: '#1a0505',
  },
  categoryLabel: {
    color: '#3a1010',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  categoryLabelActive: {
    color: '#ff0a0a',
  },
  recentSection: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1a0808',
  },
  recentTitle: {
    color: '#ff0a0a',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: 8,
    fontFamily: 'TerminatorRealNFI',
  },
  recentChip: {
    backgroundColor: '#0d0303',
    borderWidth: 1,
    borderColor: '#ff0a0a30',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 4,
    minWidth: 80,
    alignItems: 'center',
  },
  recentChipFreq: {
    color: '#ff0a0a',
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'TerminatorRealNFI',
  },
  recentChipName: {
    color: '#5a1a1a',
    fontSize: 7,
    letterSpacing: 1,
    marginTop: 2,
    fontFamily: 'TerminatorRealNFI',
    maxWidth: 80,
  },
  nowPlaying: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 10,
    backgroundColor: '#0a0303',
    borderWidth: 1,
    borderColor: '#ff0a0a40',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 4,
    gap: 8,
  },
  nowPlayingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ff0a0a',
  },
  nowPlayingText: {
    flex: 1,
    color: '#ff3040',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1,
  },
  stopAllBtn: {
    color: '#ff0a0a',
    fontSize: 10,
    fontWeight: '800',
  },
  resultCount: {
    color: '#3a1010',
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 2,
    paddingHorizontal: 16,
    marginTop: 10,
    marginBottom: 6,
  },
  archiveCard: {
    backgroundColor: '#0a0303',
    borderWidth: 1,
    borderColor: '#1a0808',
    borderRadius: 6,
    padding: 14,
    marginBottom: 8,
  },
  archiveCardActive: {
    borderColor: '#ff0a0a60',
    backgroundColor: '#0f0505',
  },
  archiveCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  archiveCardInfo: {
    flex: 1,
  },
  archiveCardName: {
    color: '#ff3040',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  archiveCardCategory: {
    color: '#3a1010',
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 2,
  },
  freqChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    marginBottom: 10,
  },
  freqChip: {
    color: '#ff0a0a',
    fontSize: 9,
    fontWeight: '700',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: '#ff0a0a30',
    borderRadius: 3,
    backgroundColor: '#0f0303',
    letterSpacing: 0.5,
    overflow: 'hidden',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  playBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: '#ff0a0a50',
    borderRadius: 4,
    backgroundColor: '#0a0303',
    minHeight: 44,
  },
  playBtnActive: {
    backgroundColor: '#ff0a0a',
    borderColor: '#ff0a0a',
  },
  playBtnText: {
    color: '#ff0a0a',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2,
  },
  playBtnTextActive: {
    color: '#000000',
  },
  loadBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: '#3a1010',
    borderRadius: 4,
    backgroundColor: '#050202',
    minHeight: 44,
  },
  loadBtnText: {
    color: '#5a1a1a',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
  },
  transmitBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 6,
  },
  transmitDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ff0a0a',
  },
  transmitText: {
    color: '#ff0a0a',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 3,
  },
});
