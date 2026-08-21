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
  PanResponder,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import GodmodeSlider from '../src/GodmodeSlider';
import Svg, { Path, Circle as SvgCircle, Text as SvgText, G, Line } from 'react-native-svg';
import { AudioEngine } from '../src/AudioEngine';
import { ParticleLab } from '../src/GodmodeFeatures';
import { MirrorsWheel, CAMELOT_KEYS, CamelotKey } from '../src/MirrorsWheel';
import { FREQUENCY_ARCHIVE, ARCHIVE_CATEGORIES, FrequencyEntry } from '../src/FrequencyArchiveData';
import { PLAYABLE_ALBUMS, ALBUMS, Album, Track } from '../src/AlbumData';
import { Audio } from 'expo-av';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MirrorsIdBanner from '../src/MirrorsIdBanner';
import DisclaimerFooter from '../src/DisclaimerFooter';
import { FrequencyMap } from '../src/FrequencyMap';
import { FullSpectrumMeter, AudioMeterScale } from '../src/SpectrumMeters';
import ScopeNodePanel from '../src/ScopeNodePanel';
import LatticeFramework from '../src/LatticeFramework';
import SendCodesModal from '../src/SendCodesModal';

import { skinStyles, SK, useSkin } from '../src/skins';

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

// 7 wavetable types → AudioEngine oscillator/PeriodicWave ids
export type WaveKey = 'SINE' | 'TRI' | 'SAW' | 'SQR' | 'PLS' | 'ORG' | 'BEL';
const WAVE_KEYS: WaveKey[] = ['SINE', 'TRI', 'SAW', 'SQR', 'PLS', 'ORG', 'BEL'];
const WAVE_ENGINE: Record<WaveKey, string> = { SINE: 'sine', TRI: 'triangle', SAW: 'sawtooth', SQR: 'square', PLS: 'pulse', ORG: 'organ', BEL: 'bell' };

interface ToneLayer {
  id: number;
  frequency: number;
  gain: number;
  isPlaying: boolean;
  wave?: WaveKey;
}

// Analog Dial Component — touch-drag to sweep frequency live (log scale, 1 Hz — 26 kHz)
const AnalogDial = ({
  frequency,
  maxFreq = 26000,
  onChange,
  onSweepStart,
  onSweepEnd,
}: {
  frequency: number;
  maxFreq?: number;
  onChange?: (f: number) => void;
  onSweepStart?: () => void;
  onSweepEnd?: () => void;
}) => {
  const size = 90;
  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2 - 8;
  const innerRadius = radius - 10;
  const ratio = Math.min(Math.max(frequency, 1) / maxFreq, 1);
  const angle = -135 + ratio * 270;
  const radians = (angle * Math.PI) / 180;
  const needleLen = innerRadius - 4;
  const nx = cx + needleLen * Math.cos(radians);
  const ny = cy + needleLen * Math.sin(radians);

  // Touch-sweep: log-scale drag on the dial (horizontal or diagonal)
  const freqRef = useRef(frequency);
  freqRef.current = frequency;
  const startRef = useRef(frequency);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const onSweepStartRef = useRef(onSweepStart);
  onSweepStartRef.current = onSweepStart;
  const onSweepEndRef = useRef(onSweepEnd);
  onSweepEndRef.current = onSweepEnd;
  const [sweeping, setSweeping] = useState(false);

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !!onChangeRef.current,
      onMoveShouldSetPanResponder: (_, g) => !!onChangeRef.current && (Math.abs(g.dx) > 1 || Math.abs(g.dy) > 1),
      onPanResponderGrant: () => {
        startRef.current = freqRef.current;
        setSweeping(true);
        onSweepStartRef.current && onSweepStartRef.current();
      },
      onPanResponderMove: (_, g) => {
        const cb = onChangeRef.current;
        if (!cb) return;
        // Combined horizontal + inverted vertical drag = log sweep
        const delta = (g.dx - g.dy) / 220; // full travel ≈ 220px per octave-decade
        const min = 1;
        const max = maxFreq;
        const lmin = Math.log(min);
        const lmax = Math.log(max);
        const cur = Math.log(Math.max(startRef.current, min));
        const nv = Math.exp(Math.min(lmax, Math.max(lmin, cur + delta * (lmax - lmin))));
        cb(Math.round(nv * 10) / 10);
      },
      onPanResponderRelease: () => { setSweeping(false); onSweepEndRef.current && onSweepEndRef.current(); },
      onPanResponderTerminate: () => { setSweeping(false); onSweepEndRef.current && onSweepEndRef.current(); },
    })
  ).current;

  return (
    <View style={dialStyles.container} {...(onChange ? pan.panHandlers : {})}>
      <Svg width={size} height={size}>
        {/* Outer chrome ring */}
        <SvgCircle cx={cx} cy={cy} r={radius} stroke={SK('#9aa4b2')} strokeWidth={sweeping ? 2 : 1.5} fill="none" opacity={sweeping ? 0.95 : 0.6} />
        {/* Middle ring */}
        <SvgCircle cx={cx} cy={cy} r={radius - 5} stroke={SK('#5a646f')} strokeWidth={0.5} fill="none" opacity={0.5} />
        {/* Inner ring */}
        <SvgCircle cx={cx} cy={cy} r={innerRadius} stroke={SK('#ff0a0a')} strokeWidth={1} fill={SK('#0b0e12')} opacity={0.8} />
        {/* Glow circle */}
        <SvgCircle cx={cx} cy={cy} r={sweeping ? 6 : 4} fill={SK('#ff0a0a')} opacity={sweeping ? 0.9 : 0.6} />
        {/* Needle */}
        <Line x1={cx} y1={cy} x2={nx} y2={ny} stroke={sweeping ? SK('#ffb0b0') : SK('#ff6060')} strokeWidth={sweeping ? 2.5 : 2} strokeLinecap="round" />
        {/* Needle tip */}
        <SvgCircle cx={nx} cy={ny} r={sweeping ? 4 : 3} fill={sweeping ? SK('#ffffff') : SK('#ff8080')} />
      </Svg>
      <Text style={[dialStyles.label, sweeping && dialStyles.labelActive]}>{sweeping ? 'SWEEP' : 'ANALOG'}</Text>
    </View>
  );
};

const dialStyles = skinStyles({
  container: { alignItems: 'center' },
  label: {
    color: '#5a1a1a',
    fontSize: 8,
    fontFamily: 'TerminatorRealNFI',
    marginTop: 2,
  },
  labelActive: {
    color: '#ff8080',
  },
});

// CamelotWheel / MirrorsWheel component imported from ../src/MirrorsWheel

export default function TerminalScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ freqs?: string; fname?: string }>();
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
  const [loadedArchiveName, setLoadedArchiveName] = useState<string | null>(null);
  const [archiveViewMode, setArchiveViewMode] = useState<'codex' | 'a-z' | 'lab'>('a-z');
  const [selectedCodex, setSelectedCodex] = useState<string | null>(null);
  const [sendCodesModalVisible, setSendCodesModalVisible] = useState(false);
  const { setPickerOpen } = useSkin();
  const logoTaps = useRef(0);
  const logoTapTs = useRef(0);

  // ═══ LOAD FREQUENCIES FROM ARCHIVE (via route params) ═══
  useEffect(() => {
    if (params.freqs) {
      try {
        const freqArr = params.freqs.split(',').map(f => parseFloat(f)).filter(f => !isNaN(f) && f > 0);
        if (freqArr.length > 0) {
          const newLayers: ToneLayer[] = freqArr.slice(0, 8).map((f, i) => ({
            id: i + 1,
            frequency: f,
            gain: 0.4,
            isPlaying: false,
          }));
          setLayers(newLayers);
          setLoadedArchiveName(params.fname ? decodeURIComponent(params.fname as string) : null);
        }
      } catch {}
    }
  }, [params.freqs]);

  // ═══ Particle Lab Music Player ═══
  const [plSelectedAlbum, setPlSelectedAlbum] = useState<Album>(PLAYABLE_ALBUMS[0]);
  const [plSelectedTrack, setPlSelectedTrack] = useState<Track | null>(null);
  const [plIsPlaying, setPlIsPlaying] = useState(false);
  const [plAlbumDropdownOpen, setPlAlbumDropdownOpen] = useState(false);
  const [plTrackDropdownOpen, setPlTrackDropdownOpen] = useState(false);
  const plSoundRef = useRef<Audio.Sound | null>(null);

  const plPlayTrack = async (track: Track) => {
    try {
      // Stop any lingering expo-av instance
      if (plSoundRef.current) {
        try { await plSoundRef.current.unloadAsync(); } catch {}
        plSoundRef.current = null;
      }
      setPlSelectedTrack(track);
      setPlIsPlaying(true);
      setPlTrackDropdownOpen(false);
      // Route through AudioEngine so the master-bus analyser (CymaScope) sees the song
      AudioEngine.stopMedia();
      AudioEngine.unlockAudio();
      AudioEngine.playMedia(track.previewUrl, () => {
        setPlIsPlaying(false);
        setPlSelectedTrack(null);
      });
    } catch (e) {
      console.log('Particle Lab playback error:', e);
      setPlIsPlaying(false);
    }
  };

  const plStopTrack = async () => {
    AudioEngine.stopMedia();
    if (plSoundRef.current) {
      try { await plSoundRef.current.stopAsync(); } catch {}
      try { await plSoundRef.current.unloadAsync(); } catch {}
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
      // Stop any lingering expo-av instance
      if (slSoundRef.current) {
        try { await slSoundRef.current.unloadAsync(); } catch {}
        slSoundRef.current = null;
      }
      // Also stop particle lab playback
      if (plSoundRef.current) {
        try { await plSoundRef.current.stopAsync(); } catch {}
        try { await plSoundRef.current.unloadAsync(); } catch {}
        plSoundRef.current = null;
        setPlIsPlaying(false);
        setPlSelectedTrack(null);
      }
      const trackKey = `${albumName}-${track.number}`;
      if (slPlayingTrack === trackKey) {
        AudioEngine.stopMedia();
        setSlPlayingTrack(null);
        return;
      }
      setSlPlayingTrack(trackKey);
      // Route through AudioEngine so the CymaScope reacts to the song
      AudioEngine.stopMedia();
      AudioEngine.unlockAudio();
      AudioEngine.playMedia(track.previewUrl, () => setSlPlayingTrack(null));
    } catch (e) {
      console.log('Sound Lab playback error:', e);
      setSlPlayingTrack(null);
    }
  };

  const slStopPreview = async () => {
    AudioEngine.stopMedia();
    if (slSoundRef.current) {
      try { await slSoundRef.current.stopAsync(); } catch {}
      try { await slSoundRef.current.unloadAsync(); } catch {}
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
    // Audio persists across pages for universal sync (harmonic layering).
    // Users stop audio via explicit STOP controls, not by navigation.
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
      layers.forEach(layer => AudioEngine.startTone(layer.id, layer.frequency, layer.gain, WAVE_ENGINE[layer.wave || 'SINE']));
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

  // ═══ LINK LAYERS — when enabled, dragging any Analog dial shifts all layers by the same ratio ═══
  const [layersLinked, setLayersLinked] = useState(false);

  // ═══ SCALAR — compact knob within CODES LAB header. Uses Layer 1's freq as carrier;
  //     the knob modulates the scalar PULSE (0.10 → 40 Hz), Schumann-band by default.
  const SCALAR_A_ID = 91;
  const SCALAR_B_ID = 92;
  const SCALAR_GAIN = 0.25;
  const [scalarOn, setScalarOn] = useState(false);
  const [scalarHz, setScalarHz] = useState(7.83); // Schumann default
  const [scalarSweep, setScalarSweep] = useState<'off' | 'up' | 'down' | 'pingpong'>('off');
  const scalarOnRef = useRef(scalarOn);
  scalarOnRef.current = scalarOn;
  const scalarHzRef = useRef(scalarHz);
  scalarHzRef.current = scalarHz;

  // Continuous sweep — log-space traversal of 0.10Hz → 40Hz
  useEffect(() => {
    if (scalarSweep === 'off') return;
    const MIN = 0.10, MAX = 40.0;
    const L_MIN = Math.log(MIN), L_MAX = Math.log(MAX);
    let dir: 1 | -1 = scalarSweep === 'down' ? -1 : 1;
    const stepMs = 60;
    const octPerSec = 0.35; // rate: ~0.35 octaves/sec → covers 8+ octaves in ~24s
    const stepLog = octPerSec * Math.LN2 * (stepMs / 1000);
    const t = setInterval(() => {
      const cur = Math.log(Math.max(scalarHzRef.current, MIN));
      let next = cur + dir * stepLog;
      if (next >= L_MAX) {
        next = L_MAX;
        if (scalarSweep === 'pingpong') dir = -1;
        else if (scalarSweep === 'up') next = L_MIN;
      } else if (next <= L_MIN) {
        next = L_MIN;
        if (scalarSweep === 'pingpong') dir = 1;
        else if (scalarSweep === 'down') next = L_MAX;
      }
      const hzNew = Math.round(Math.exp(next) * 100) / 100;
      setScalarHz(hzNew);
    }, stepMs);
    return () => clearInterval(t);
  }, [scalarSweep]);

  // ═══ $-CODES / GODMODE — scalar-augmented tier. Rewires the engine's
  //     organizing chain (dual-DDS sidebands ± pulse/2 + AM burst + opposed-coil
  //     interference) so every generated tone becomes measurable field output. ═══
  const [godMode, setGodModeState] = useState(AudioEngine.getGodMode());
  const godModeRef = useRef(godMode);
  godModeRef.current = godMode;
  const toggleGodMode = () => {
    const next = !godMode;
    setGodModeState(next);
    AudioEngine.setGodMode(next, scalarHzRef.current); // live-rebuilds all sounding chains
  };
  // Keep the god chain's pulse locked to the scalar knob value
  useEffect(() => {
    if (godModeRef.current) AudioEngine.setGodMode(true, scalarHz);
  }, [scalarHz]);

  // ═══ PRESETS — save/load current layer session to AsyncStorage ═══
  type LayerPreset = { id: number; frequency: number; gain: number; wave?: WaveKey };
  type Preset = { name: string; ts: number; layers: LayerPreset[]; scalar: boolean; linked: boolean };
  const [presets, setPresets] = useState<Preset[]>([]);
  const [presetListOpen, setPresetListOpen] = useState(false);
  const PRESET_KEY = '@codes_lab_presets_v1';

  const loadPresets = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(PRESET_KEY);
      if (raw) setPresets(JSON.parse(raw));
    } catch {}
  }, []);
  useEffect(() => { loadPresets(); }, [loadPresets]);

  const savePreset = async () => {
    const name = `PRESET ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;
    const p: Preset = {
      name,
      ts: Date.now(),
      layers: layers.map(l => ({ id: l.id, frequency: l.frequency, gain: l.gain, wave: l.wave || 'SINE' })),
      scalar: scalarOnRef.current,
      linked: layersLinked,
    };
    const next = [p, ...presets].slice(0, 12);
    setPresets(next);
    try { await AsyncStorage.setItem(PRESET_KEY, JSON.stringify(next)); } catch {}
  };

  const applyPresetById = (ts: number) => {
    const p = presets.find(x => x.ts === ts);
    if (!p) return;
    // stop existing layers
    layers.forEach(l => AudioEngine.stopTone(l.id));
    // rehydrate
    const nextLayers = p.layers.map(l => ({ ...l, isPlaying: false }));
    setLayers(nextLayers);
    setLayersLinked(!!p.linked);
    // restart audio if currently playing
    if (isPlaying) {
      nextLayers.forEach(l => AudioEngine.startTone(l.id, l.frequency, l.gain, WAVE_ENGINE[l.wave || 'SINE']));
    }
    // scalar
    if (p.scalar && !scalarOnRef.current) toggleScalar();
    if (!p.scalar && scalarOnRef.current) toggleScalar();
    setPresetListOpen(false);
  };

  const deletePreset = async (ts: number) => {
    const next = presets.filter(p => p.ts !== ts);
    setPresets(next);
    try { await AsyncStorage.setItem(PRESET_KEY, JSON.stringify(next)); } catch {}
  };

  const carrierFreqRef = useRef(432);
  useEffect(() => { carrierFreqRef.current = layers[0]?.frequency || 432; }, [layers]);

  const toggleScalar = () => {
    if (scalarOn) {
      AudioEngine.stopTone(SCALAR_A_ID);
      AudioEngine.stopTone(SCALAR_B_ID);
      setScalarOn(false);
    } else {
      const c = carrierFreqRef.current;
      const p = scalarHzRef.current;
      AudioEngine.startTone(SCALAR_A_ID, Math.max(1, c - p / 2), SCALAR_GAIN);
      AudioEngine.startTone(SCALAR_B_ID, c + p / 2, SCALAR_GAIN);
      setScalarOn(true);
    }
  };

  // Track carrier live — when Layer 1's freq OR pulse Hz changes, retune scalar
  useEffect(() => {
    if (!scalarOnRef.current) return;
    const c = layers[0]?.frequency || 432;
    const p = scalarHz;
    AudioEngine.updateFreq(SCALAR_A_ID, Math.max(1, c - p / 2));
    AudioEngine.updateFreq(SCALAR_B_ID, c + p / 2);
  }, [layers, scalarHz]);

  const updateLayerFrequency = (id: number, frequency: number) => {
    if (layersLinked && layers.length > 1) {
      const source = layers.find(l => l.id === id);
      if (!source || source.frequency <= 0) return;
      const ratio = frequency / source.frequency;
      const next = layers.map(l => {
        const nf = Math.min(26000, Math.max(1, Math.round(l.frequency * ratio * 10) / 10));
        return { ...l, frequency: nf };
      });
      setLayers(next);
      if (isPlaying) {
        next.forEach(l => AudioEngine.updateFreq(l.id, l.frequency));
      }
    } else {
      setLayers(layers.map(l => l.id === id ? { ...l, frequency } : l));
      if (isPlaying) AudioEngine.updateFreq(id, frequency);
    }
  };

  // ═══ One-tap frequency editing ═══
  const [editingFreqId, setEditingFreqId] = useState<number | null>(null);
  const [freqInput, setFreqInput] = useState('');

  const commitFreqEdit = (id: number) => {
    const parsed = parseFloat(freqInput.replace(',', '.'));
    if (!isNaN(parsed)) {
      const clamped = Math.min(26000, Math.max(0.01, Math.round(parsed * 100) / 100));
      updateLayerFrequency(id, clamped);
    }
    setEditingFreqId(null);
    setFreqInput('');
  };

  // ═══ Pending lab load (shared CODES tapped in CODES I.D.) ═══
  const applyPendingLabLoad = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem('@pending_lab_load');
      if (!raw) return;
      await AsyncStorage.removeItem('@pending_lab_load');
      const { name, frequencies } = JSON.parse(raw);
      if (!Array.isArray(frequencies) || frequencies.length === 0) return;
      const newLayers = frequencies.slice(0, 5).map((f: number, i: number) => ({
        id: i + 1,
        frequency: Math.min(26000, Math.max(1, f)),
        gain: 0.5,
        isPlaying: false,
      }));
      setLayers(newLayers);
      setLoadedArchiveName(name || 'SHARED CODES');
    } catch {}
  }, []);

  useFocusEffect(
    useCallback(() => {
      applyPendingLabLoad();
    }, [applyPendingLabLoad])
  );

  const updateLayerGain = (id: number, gain: number) => {
    setLayers(layers.map(l => l.id === id ? { ...l, gain } : l));
    if (isPlaying) AudioEngine.updateGain(id, gain);
  };

  // ═══ SCALAR FREQ METER — shift the ENTIRE spectrum (all nodes) in 0.01 Hz steps ═══
  const layersLiveRef = useRef(layers);
  useEffect(() => { layersLiveRef.current = layers; }, [layers]);
  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;

  const shiftSpectrum = useCallback((delta: number) => {
    const next = layersLiveRef.current.map(l => ({
      ...l,
      frequency: Math.min(26000, Math.max(0.01, Math.round((l.frequency + delta) * 100) / 100)),
    }));
    layersLiveRef.current = next; // sync so hold-to-repeat accumulates between renders
    setLayers(next);
    if (isPlayingRef.current) next.forEach(l => AudioEngine.updateFreq(l.id, l.frequency));
  }, []);

  const setSpectrumTo = useCallback((value: number) => {
    const base = layersLiveRef.current[0]?.frequency || 432;
    const v = Math.min(26000, Math.max(0.01, value));
    shiftSpectrum(Math.round((v - base) * 100) / 100);
  }, [shiftSpectrum]);

  const updateLayerWave = (id: number, w: WaveKey) => {
    setLayers(prev => prev.map(l => l.id === id ? { ...l, wave: w } : l));
    if (isPlaying) AudioEngine.updateWave(id, WAVE_ENGINE[w]);
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
    const freqs = entry.frequencies.slice(0, 5).map(f => Math.min(26000, Math.max(1, f)));
    let nextId = layers.length ? Math.max(...layers.map(l => l.id)) + 1 : 1;
    const next = layers.map((l, i) => (i < freqs.length ? { ...l, frequency: freqs[i] } : l));
    for (let i = layers.length; i < freqs.length; i++) {
      next.push({ id: nextId++, frequency: freqs[i], gain: 0.5, isPlaying: false });
    }
    setLayers(next);
    if (isPlaying) {
      next.slice(0, freqs.length).forEach(l => AudioEngine.updateFreq(l.id, l.frequency));
    }
    setLoadedArchiveName(entry.name);
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
          {/* ══════ TOP NAV BAR ══════ */}
          <View style={styles.topNav}>
            {/* LEFT — MIRRORS ID Logo */}
            <TouchableOpacity onPress={() => router.push('/chirpconnect')} activeOpacity={0.8}>
              <Image
                source={{ uri: 'https://customer-assets.emergentagent.com/job_e121e09e-99f3-472d-8697-f5a5be5cce59/artifacts/x7wgp9g9_MIRRORS%20ID.jpeg' }}
                style={styles.navLogoLeft}
                resizeMode="contain"
              />
            </TouchableOpacity>

            {/* CENTER — Nav Pills */}
            <View style={styles.navPills}>
              <TouchableOpacity style={styles.navPill} onPress={() => router.push('/library')}>
                <Text style={styles.navPillText}>CODES</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.navPill} onPress={() => router.push('/sound')}>
                <Text style={styles.navPillText}>90.6</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.navPill} onPress={() => Linking.openURL('https://earth.google.com/web/')}>
                <Text style={styles.navPillText}>GODMODE</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.navPill} onPress={() => Linking.openURL('https://soundcloud.com/codes-godmode/sets/dj-sets')}>
                <Text style={styles.navPillText}>DJ SETS</Text>
              </TouchableOpacity>
            </View>

            {/* RIGHT — 96 Logo */}
            <TouchableOpacity onPress={() => Linking.openURL('https://earth.google.com/web/')} activeOpacity={0.8}>
              <Image
                source={{ uri: 'https://customer-assets.emergentagent.com/job_e121e09e-99f3-472d-8697-f5a5be5cce59/artifacts/c5jwbmte_MIRRORS_1024x1024.jpg' }}
                style={styles.navLogoRight}
                resizeMode="cover"
              />
            </TouchableOpacity>
          </View>

          {/* ══════ HERO ══════ */}
          <View style={styles.heroSection}>
            {/* Single Clean Hero Image — long-press (or 3 quick taps) = hidden SKIN selector */}
            <Pressable
              style={styles.heroLogoPress}
              delayLongPress={500}
              onLongPress={() => setPickerOpen(true)}
              onPress={() => {
                const now = Date.now();
                logoTaps.current = now - logoTapTs.current < 1200 ? logoTaps.current + 1 : 1;
                logoTapTs.current = now;
                if (logoTaps.current >= 3) {
                  logoTaps.current = 0;
                  setPickerOpen(true);
                }
              }}
              testID="hero-logo"
            >
              <Image
                source={{ uri: 'https://customer-assets-rejwkqb3.emergentagent.net/job_e121e09e-99f3-472d-8697-f5a5be5cce59/artifacts/aw1xtg9j_Screenshot%202026-08-02%20at%2012.36.59%E2%80%AFAM.png' }}
                style={styles.heroImage}
                resizeMode="contain"
              />
            </Pressable>
            
            {/* Text Content Below Image */}
            <View style={styles.heroContent}>
              <Text style={styles.heroBrand}>GODMODE SOUND</Text>
              <Text style={styles.heroTagline}>The Future. Now.</Text>
              <View style={styles.heroRow}>
                <TouchableOpacity style={styles.libraryBtn} onPress={() => router.push('/library')}>
                  <Text style={styles.libraryBtnText}>LIBRARY</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* SCOPE ⟷ NODE — moved directly under LIBRARY. Still cymatics face.
              Reflects live tones from CODES_LAB (frequencies + playing state). */}
          <View style={styles.scopeUnderLibrary}>
            <ScopeNodePanel
              frequencies={layers.map(l => l.frequency)}
              playing={isPlaying}
              scalarBeatHz={scalarOn || (godMode && isPlaying) ? scalarHz : 0}
            />
          </View>

          {/* Tone Layers - Analog Style */}
          <View style={[styles.section, styles.t800Frame]}>
            <View style={styles.toneLayerHeaderRow}>
              <View>
                <Text style={styles.sectionTitle}>&gt; CODES_LAB</Text>
                <Text style={styles.t800Tag}>T-800 // CSM-101 HUD</Text>
              </View>
              <View style={styles.headerBtnRow}>
                <TouchableOpacity
                  style={styles.sendCodesBubble}
                  onPress={() => setSendCodesModalVisible(true)}
                >
                  <Text style={styles.sendCodesBubbleText}>SEND CODES</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.archiveBubble}
                  onPress={() => setArchiveModalVisible(true)}
                >
                  <View style={styles.archiveBubbleDot} />
                  <Text style={styles.archiveBubbleText}>CODES ARCHIVE</Text>
                </TouchableOpacity>
              </View>
            </View>
            {/* Lab controls — folded into the CODES LAB header */}
            <View style={styles.headerChipRow}>
              <TouchableOpacity style={styles.labPresetChip} onPress={savePreset} activeOpacity={0.7}>
                <Text style={styles.labPresetChipTxt}>◆ SAVE</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.labPresetChip} onPress={() => setPresetListOpen(o => !o)} activeOpacity={0.7}>
                <Text style={styles.labPresetChipTxt}>◆ LOAD {presets.length > 0 ? `(${presets.length})` : ''}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.linkBtn, layersLinked && styles.linkBtnActive]}
                onPress={() => setLayersLinked(v => !v)}
                activeOpacity={0.7}
              >
                <Text style={[styles.linkBtnText, layersLinked && styles.linkBtnTextActive]}>
                  {layersLinked ? '◈ LNK' : '◇ LNK'}
                </Text>
              </TouchableOpacity>
              {/* $-CODES tier — GodMode scalar-augmented generator */}
              <TouchableOpacity
                style={[styles.godChip, godMode && styles.godChipActive]}
                onPress={toggleGodMode}
                activeOpacity={0.7}
              >
                <Text style={[styles.godChipTxt, godMode && styles.godChipTxtActive]}>
                  {godMode ? '$ GODMODE' : '$ CODES'}
                </Text>
              </TouchableOpacity>
              {/* SCALAR — folded into the CODES LAB header (pulse toggle + step + sweep) */}
              <TouchableOpacity
                style={[styles.scalarBtn, scalarOn && styles.scalarBtnActive]}
                onPress={toggleScalar}
                activeOpacity={0.7}
              >
                <Text style={[styles.scalarBtnText, scalarOn && styles.scalarBtnTextActive]}>
                  {scalarOn ? '◈' : '◇'} SCLR {scalarHz.toFixed(2)}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.scalarStepBtn}
                onPress={() => { if (scalarSweep !== 'off') setScalarSweep('off'); setScalarHz(h => Math.max(0.1, Math.round((h / 1.25) * 100) / 100)); }}
                activeOpacity={0.7}
              >
                <Text style={styles.scalarStepTxt}>−</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.scalarStepBtn}
                onPress={() => { if (scalarSweep !== 'off') setScalarSweep('off'); setScalarHz(h => Math.min(40, Math.round((h * 1.25) * 100) / 100)); }}
                activeOpacity={0.7}
              >
                <Text style={styles.scalarStepTxt}>+</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.scalarStepBtn, scalarSweep !== 'off' && styles.scalarBtnActive]}
                onPress={() => setScalarSweep(s => (s === 'off' ? 'up' : s === 'up' ? 'down' : s === 'down' ? 'pingpong' : 'off'))}
                activeOpacity={0.7}
              >
                <Text style={[styles.scalarStepTxt, scalarSweep !== 'off' && styles.scalarBtnTextActive]}>
                  {scalarSweep === 'off' ? 'SWP' : scalarSweep === 'up' ? 'SWP▲' : scalarSweep === 'down' ? 'SWP▼' : 'SWP◆'}
                </Text>
              </TouchableOpacity>
            </View>

            {presetListOpen && (
              <View style={styles.presetPanel}>
                {presets.length === 0 && (
                  <Text style={styles.presetEmpty}>NO PRESETS SAVED · tap ◆ SAVE to snapshot the current lab</Text>
                )}
                {presets.map(p => (
                  <View key={p.ts} style={styles.presetRow}>
                    <TouchableOpacity style={styles.presetRowMain} onPress={() => applyPresetById(p.ts)} activeOpacity={0.7}>
                      <Text style={styles.presetRowName}>{p.name}</Text>
                      <Text style={styles.presetRowMeta}>
                        {p.layers.length}× · {p.layers[0]?.frequency.toFixed(1)}Hz{p.scalar ? ' · SCLR' : ''}{p.linked ? ' · LNK' : ''}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.presetDelBtn} onPress={() => deletePreset(p.ts)} activeOpacity={0.7}>
                      <Text style={styles.presetDelTxt}>×</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {loadedArchiveName && (
              <View style={styles.loadedBanner}>
                <View style={styles.loadedDot} />
                <Text style={styles.loadedText}>LOADED: {loadedArchiveName}</Text>
                <TouchableOpacity
                  style={[styles.loadedPlayBtn, isPlaying && styles.loadedPlayBtnActive]}
                  onPress={handlePlay}
                >
                  <Text style={[styles.loadedPlayText, isPlaying && styles.loadedPlayTextActive]}>
                    {isPlaying ? '■ STOP' : '▶ PLAY'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => { if (isPlaying) handlePlay(); setLoadedArchiveName(null); setLayers([{ id: 1, frequency: 432, gain: 0.5, isPlaying: false }]); }}>
                  <Text style={styles.loadedClear}>✕</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* SCOPE moved to hero section — directly under LIBRARY */}

            {/* ═══ LATTICE FRAMEWORK — infuses "The Lattice That Binds All Dimensions"
                 into the lab; maps carrier freq to its dimensional/energetic slot. ═══ */}
            <LatticeFramework baseFreq={layers[0]?.frequency || 432} />

            {layers.map((layer, index) => {
              // XYZ coordinates for this Node — X: log-freq position, Y: gain, Z: depth
              const xPct = Math.min(1, Math.max(0, (Math.log(Math.max(layer.frequency, 1)) - Math.log(1)) / (Math.log(26000) - Math.log(1))));
              const yPct = Math.min(1, Math.max(0, layer.gain));
              const zPct = layers.length > 1 ? index / (layers.length - 1) : 0;
              return (
              <View key={layer.id} style={[styles.layerCard, layersLinked && styles.layerCardLinked]}>
                {/* XYZ NODE header — dedicated coordinate area per Node */}
                <View style={styles.xyzHeader}>
                  <View style={styles.xyzLabelBlock}>
                    <Text style={styles.xyzNodeName}>◈ NODE {index + 1}</Text>
                    <Text style={styles.xyzOrbTag}>ORB · {layer.frequency.toFixed(1)} Hz</Text>
                  </View>
                  <View style={styles.xyzAxes}>
                    <View style={styles.xyzAxis}>
                      <Text style={styles.xyzAxisLabel}>X</Text>
                      <View style={styles.xyzTrack}><View style={[styles.xyzFill, { width: `${xPct * 100}%`, backgroundColor: SK('#ff0a0a') }]} /></View>
                      <Text style={styles.xyzAxisVal}>{Math.round(xPct * 100)}</Text>
                    </View>
                    <View style={styles.xyzAxis}>
                      <Text style={styles.xyzAxisLabel}>Y</Text>
                      <View style={styles.xyzTrack}><View style={[styles.xyzFill, { width: `${yPct * 100}%`, backgroundColor: SK('#ffd75e') }]} /></View>
                      <Text style={styles.xyzAxisVal}>{Math.round(yPct * 100)}</Text>
                    </View>
                    <View style={styles.xyzAxis}>
                      <Text style={styles.xyzAxisLabel}>Z</Text>
                      <View style={styles.xyzTrack}><View style={[styles.xyzFill, { width: `${zPct * 100}%`, backgroundColor: SK('#5fc9ff') }]} /></View>
                      <Text style={styles.xyzAxisVal}>{index + 1}/{layers.length}</Text>
                    </View>
                  </View>
                  {layers.length > 1 && (
                    <TouchableOpacity onPress={() => removeLayer(layer.id)} style={styles.removeBtn}>
                      <Text style={styles.removeBtnText}>X</Text>
                    </TouchableOpacity>
                  )}
                </View>

                <View style={styles.layerTopRow}>
                  {/* Analog Dial — touch-drag to sweep this layer's frequency live */}
                  <AnalogDial
                    frequency={layer.frequency}
                    maxFreq={26000}
                    onChange={(f) => updateLayerFrequency(layer.id, f)}
                  />
                  {/* Controls */}
                  <View style={styles.layerControls}>
                    {/* Full EM Spectrum Meter (future plug-in bandwidths) */}
                    <FullSpectrumMeter frequency={layer.frequency} />
                    {/* Frequency Slider — 0Hz-26kHz audio meter */}
                    <GodmodeSlider
                      style={styles.slider}
                      minimumValue={1}
                      maximumValue={26000}
                      value={layer.frequency}
                      onValueChange={(val) => updateLayerFrequency(layer.id, Math.round(val * 10) / 10)}
                      minimumTrackTintColor={SK('#ff0a0a')}
                      maximumTrackTintColor={SK('#333333')}
                      thumbTintColor={SK('#ff6060')}
                    />
                    <AudioMeterScale />
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
                        minimumTrackTintColor={SK('#ff3040')}
                        maximumTrackTintColor={SK('#333333')}
                        thumbTintColor={SK('#ff6060')}
                      />
                    </View>
                  </View>
                </View>
                {/* Digital Readout — tap to edit */}
                <View style={styles.digitalReadout}>
                  {editingFreqId === layer.id ? (
                    <TextInput
                      style={styles.digitalHzInput}
                      value={freqInput}
                      onChangeText={setFreqInput}
                      keyboardType="decimal-pad"
                      autoFocus
                      selectTextOnFocus
                      maxLength={8}
                      onBlur={() => commitFreqEdit(layer.id)}
                      onSubmitEditing={() => commitFreqEdit(layer.id)}
                      returnKeyType="done"
                    />
                  ) : (
                    <TouchableOpacity
                      onPress={() => { setEditingFreqId(layer.id); setFreqInput(layer.frequency.toFixed(2)); }}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.digitalHz}>{layer.frequency.toFixed(2)} Hz</Text>
                      <Text style={styles.digitalTapHint}>TAP TO EDIT · ±0.01</Text>
                    </TouchableOpacity>
                  )}
                  <Text style={styles.digitalLabel}>Digital</Text>
                </View>
                {/* WAVE TABLE — 7 oscillator types, live-switchable */}
                <View style={styles.waveRow}>
                  {WAVE_KEYS.map(w => {
                    const active = (layer.wave || 'SINE') === w;
                    return (
                      <TouchableOpacity
                        key={w}
                        style={[styles.waveChip, active && styles.waveChipActive]}
                        onPress={() => updateLayerWave(layer.id, w)}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.waveChipTxt, active && styles.waveChipTxtActive]}>{w}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                {layer.isPlaying && (
                  <Text style={styles.transmitting}>■ TRANSMITTING</Text>
                )}
              </View>
              );
            })}

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

          {/* SCALAR is now folded into the LINK bar (◈ SCALAR toggle) — no dedicated section */}

          {/* ══════ SOUND LAB ══════ */}
          <View style={slabStyles.container}>
            <View style={slabStyles.headerRow}>
              <View style={slabStyles.headerLeft}>
                <View style={slabStyles.headerDot} />
                <Text style={slabStyles.headerTitle}>SOUND LAB</Text>
              </View>
              <Text style={slabStyles.headerMeta}>{ALBUMS.length} albums {'\u00B7'} {ALBUMS.reduce((acc, a) => acc + a.tracks.length, 0)} tracks</Text>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={slabStyles.albumScroll} contentContainerStyle={{ gap: 12, paddingHorizontal: 16, paddingRight: 20 }}>
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

                    {isExpanded && hasTracks && (
                      <View style={slabStyles.trackList}>
                        {album.tracks.map((track) => {
                          const trackKey = `${album.name}-${track.number}`;
                          const isPlaying = slPlayingTrack === trackKey;
                          return (
                            <View key={track.number} style={slabStyles.trackRow}>
                              <TouchableOpacity style={slabStyles.trackPlayBtn} onPress={() => slPlayPreview(track, album.name)}>
                                <Text style={[slabStyles.trackPlayIcon, isPlaying && slabStyles.trackPlayIconActive]}>
                                  {isPlaying ? '\u25A0' : '\u25B6'}
                                </Text>
                              </TouchableOpacity>
                              <Text style={[slabStyles.trackName, isPlaying && slabStyles.trackNameActive]} numberOfLines={1}>{track.name}</Text>
                              <View style={slabStyles.trackFreeTag}>
                                <Text style={slabStyles.trackFreeText}>FREE</Text>
                              </View>
                            </View>
                          );
                        })}
                      </View>
                    )}
                  </View>
                );
              })}
            </ScrollView>

            {/* Support Discography - All Music Free */}
            <TouchableOpacity
              style={slabStyles.discographyBtn}
              onPress={() => slHandleCheckout('album', 'GODMODE DISCOGRAPHY', '', 'VINCE SINNOTT')}
            >
              <Text style={slabStyles.discographyText}>DISCOGRAPHY</Text>
            </TouchableOpacity>
            <Text style={slabStyles.freeAccessText}>ALL MUSIC FREE · STREAMING ENABLED</Text>

            {slPlayingTrack && (
              <View style={slabStyles.nowPlayingBar}>
                <View style={slabStyles.npDot} />
                <Text style={slabStyles.npLabel} numberOfLines={1}>PREVIEW: {slPlayingTrack.toUpperCase()}</Text>
                <TouchableOpacity onPress={slStopPreview}>
                  <Text style={slabStyles.npStopBtn}>{'\u25A0'} STOP</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* ══════ FREQUENCY LAB / MERKABA ══════ */}
          <View style={styles.section}>
            <FrequencyMap
              onFrequencySelect={(freq) => {
                console.log('Frequency selected from map:', freq);
                updateLayerFrequency(layers[0].id, freq);
              }}
              showBrainMirror={false}
            />
          </View>

          {/* ══════ MIRRORS WHEEL ══════ */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>&gt; MIRRORS_WHEEL</Text>
            <Text style={styles.sectionSub}>HARMONIC RESONANCE MIRROR SYSTEM — 432Hz — Tap to emit</Text>

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
                      <Text style={[styles.pianoKeyNum, { color: isActive ? SK('#fff') : pk.color }]}>
                        {pianoMode === '13' ? pk.key : pk.major} · {pk.note}
                      </Text>
                    </View>

                    {/* Right: freq */}
                    <View style={styles.pianoKeyRight}>
                      <Text style={[styles.pianoFreq, { color: isActive ? pk.color : SK('#5a1a1a') }]}>{pk.freq} Hz</Text>
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

          {/* ══════ FOOTER — Disclaimer + Legal Links ══════ */}
          <View style={styles.footerLinks}>
            <View style={styles.footerLinksRow}>
              <TouchableOpacity onPress={() => router.push('/about')}><Text style={styles.footerLinkText}>About</Text></TouchableOpacity>
              <Text style={styles.footerSep}>·</Text>
              <TouchableOpacity onPress={() => router.push('/privacy')}><Text style={styles.footerLinkText}>Privacy</Text></TouchableOpacity>
              <Text style={styles.footerSep}>·</Text>
              <TouchableOpacity onPress={() => router.push('/terms')}><Text style={styles.footerLinkText}>Terms</Text></TouchableOpacity>
            </View>
          </View>
          <DisclaimerFooter />

          <View style={{ height: 20 }} />
        </ScrollView>
      </View>

      {/* ═══════ CODES ARCHIVE MODAL ═══════ */}
      <Modal
        visible={archiveModalVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => { setArchiveModalVisible(false); AudioEngine.stopMulti(); setArchivePlayingItem(null); setSelectedCodex(null); }}
      >
        <View style={archiveStyles.modalContainer}>
          <View style={[archiveStyles.modalSafeArea, { paddingTop: insets.top }]}>
            {/* Decorative Header with Diamonds */}
            <View style={archiveStyles.headerDecoration}>
              <Text style={archiveStyles.headerDiamond}>◆</Text>
              <View style={archiveStyles.headerLine} />
              <Text style={archiveStyles.headerDiamond}>◆</Text>
            </View>
            
            {/* Main Header */}
            <View style={archiveStyles.modalHeader}>
              <Text style={archiveStyles.modalTitle}>CODES ARCHIVE</Text>
              <Text style={archiveStyles.modalSubtitle}>CONSOLIDATED ANNOTATED FREQUENCY LIST</Text>
              <Text style={archiveStyles.modalStats}>
                {FREQUENCY_ARCHIVE.length} FREQUENCIES · {ARCHIVE_CATEGORIES.length - 1} CODICES · 432Hz CALIBRATED
              </Text>
              {/* ═══ TIER SELECT — STANDARD vs $-CODES (scalar-augmented GodMode) ═══ */}
              <View style={archiveStyles.tierRow}>
                <TouchableOpacity
                  style={[archiveStyles.tierBtn, !godMode && archiveStyles.tierBtnActive]}
                  onPress={() => { if (godMode) toggleGodMode(); }}
                  activeOpacity={0.7}
                >
                  <Text style={[archiveStyles.tierBtnText, !godMode && archiveStyles.tierBtnTextActive]}>STANDARD</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[archiveStyles.tierBtn, godMode && archiveStyles.tierBtnGold]}
                  onPress={() => { if (!godMode) toggleGodMode(); }}
                  activeOpacity={0.7}
                >
                  <Text style={[archiveStyles.tierBtnText, godMode && archiveStyles.tierBtnTextGold]}>$-CODES · GODMODE</Text>
                </TouchableOpacity>
              </View>
              {godMode && (
                <Text style={archiveStyles.tierMeta}>
                  SCALAR-AUGMENTED · DUAL-DDS ±{(scalarHz / 2).toFixed(2)}Hz SIDEBANDS · AM BURST {scalarHz.toFixed(2)}Hz · OPPOSED-COIL FIELD
                </Text>
              )}
              <TouchableOpacity
                style={archiveStyles.modalCloseBtn}
                onPress={() => { setArchiveModalVisible(false); AudioEngine.stopMulti(); setArchivePlayingItem(null); setSelectedCodex(null); }}
              >
                <Text style={archiveStyles.modalCloseBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Search Bar */}
            <View style={archiveStyles.searchContainer}>
              <Text style={archiveStyles.searchIcon}>⊕</Text>
              <TextInput
                style={archiveStyles.searchInput}
                placeholder="Search conditions, frequencies..."
                placeholderTextColor={SK('#5a1a1a')}
                value={archiveSearch}
                onChangeText={setArchiveSearch}
              />
              {archiveSearch.length > 0 && (
                <TouchableOpacity onPress={() => setArchiveSearch('')}>
                  <Text style={archiveStyles.clearBtn}>✕</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Tab Navigation: CODEX | A-Z | LAB */}
            <View style={archiveStyles.tabRow}>
              <TouchableOpacity
                style={[archiveStyles.tabBtn, archiveViewMode === 'codex' && archiveStyles.tabBtnActive]}
                onPress={() => { setArchiveViewMode('codex'); setSelectedCodex(null); }}
              >
                <Text style={[archiveStyles.tabBtnText, archiveViewMode === 'codex' && archiveStyles.tabBtnTextActive]}>CODEX</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[archiveStyles.tabBtn, archiveViewMode === 'a-z' && archiveStyles.tabBtnActive]}
                onPress={() => { setArchiveViewMode('a-z'); setSelectedCodex(null); }}
              >
                <Text style={[archiveStyles.tabBtnText, archiveViewMode === 'a-z' && archiveStyles.tabBtnTextActive]}>A - Z</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[archiveStyles.tabBtn, archiveViewMode === 'lab' && archiveStyles.tabBtnActive]}
                onPress={() => { setArchiveViewMode('lab'); setSelectedCodex(null); }}
              >
                <Text style={[archiveStyles.tabBtnText, archiveViewMode === 'lab' && archiveStyles.tabBtnTextActive]}>LAB</Text>
              </TouchableOpacity>
            </View>

            {/* Now Playing Bar */}
            {archivePlayingItem && (
              <View style={archiveStyles.nowPlaying}>
                <View style={archiveStyles.nowPlayingDot} />
                <Text style={archiveStyles.nowPlayingText} numberOfLines={1}>TRANSMITTING: {archivePlayingItem}</Text>
                <TouchableOpacity onPress={() => { AudioEngine.stopMulti(); setArchivePlayingItem(null); }}>
                  <Text style={archiveStyles.stopAllBtn}>[STOP]</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* CODEX VIEW - Category List */}
            {archiveViewMode === 'codex' && !selectedCodex && (
              <ScrollView style={archiveStyles.codexScroll} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 90 }}>
                {ARCHIVE_CATEGORIES.filter(cat => cat.id !== 'all').map((cat) => {
                  const entryCount = FREQUENCY_ARCHIVE.filter(f => f.category === cat.id).length;
                  return (
                    <TouchableOpacity
                      key={cat.id}
                      style={archiveStyles.codexRow}
                      onPress={() => setSelectedCodex(cat.id)}
                    >
                      <View style={archiveStyles.codexIconWrap}>
                        <Text style={archiveStyles.codexIcon}>{cat.icon}</Text>
                      </View>
                      <View style={archiveStyles.codexInfo}>
                        <Text style={archiveStyles.codexName}>{cat.latinName}</Text>
                        <Text style={archiveStyles.codexEntryCount}>{entryCount} ENTRIES</Text>
                      </View>
                      <Text style={archiveStyles.codexArrow}>▶</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}

            {/* CODEX VIEW - Selected Category Entries */}
            {archiveViewMode === 'codex' && selectedCodex && (
              <>
                <TouchableOpacity style={archiveStyles.backBtn} onPress={() => setSelectedCodex(null)}>
                  <Text style={archiveStyles.backBtnText}>◀ BACK TO CODEX</Text>
                </TouchableOpacity>
                <FlatList
                  data={FREQUENCY_ARCHIVE.filter(f => f.category === selectedCodex && (archiveSearch.length === 0 || f.name.toLowerCase().includes(archiveSearch.toLowerCase())))}
                  keyExtractor={(item, index) => `${item.name}-${index}`}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{ paddingBottom: insets.bottom + 90, paddingHorizontal: 16 }}
                  renderItem={({ item }) => {
                    const isPlaying = archivePlayingItem === item.name;
                    return (
                      <View style={[archiveStyles.archiveCard, isPlaying && archiveStyles.archiveCardActive]}>
                        <View style={archiveStyles.archiveCardHeader}>
                          <View style={archiveStyles.archiveCardInfo}>
                            <Text style={archiveStyles.archiveCardName}>{godMode ? '$ ' : ''}{item.name}</Text>
                            <Text style={archiveStyles.archiveCardCategory}>{item.frequencies.length} FREQUENCIES{godMode ? ' · $-CODE' : ''}</Text>
                          </View>
                        </View>
                        <View style={archiveStyles.freqChipRow}>
                          {item.frequencies.slice(0, 6).map((f, i) => (
                            <Text key={i} style={archiveStyles.freqChip}>{f} Hz</Text>
                          ))}
                          {item.frequencies.length > 6 && <Text style={archiveStyles.freqChip}>+{item.frequencies.length - 6}</Text>}
                        </View>
                        <View style={archiveStyles.actionRow}>
                          <TouchableOpacity
                            style={[archiveStyles.playBtn, isPlaying && archiveStyles.playBtnActive]}
                            onPress={() => handleArchivePlayFrequency(item.name, item.frequencies)}
                          >
                            <Text style={[archiveStyles.playBtnText, isPlaying && archiveStyles.playBtnTextActive]}>
                              {isPlaying ? '■ STOP' : '▶ PLAY'}
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={archiveStyles.loadBtn} onPress={() => handleArchiveLoadFrequency(item)}>
                            <Text style={archiveStyles.loadBtnText}>LOAD → LAB</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  }}
                />
              </>
            )}

            {/* A-Z VIEW - Alphabetical List */}
            {archiveViewMode === 'a-z' && (
              <FlatList
                data={filteredArchive.sort((a, b) => a.name.localeCompare(b.name))}
                keyExtractor={(item, index) => `${item.name}-${index}`}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: insets.bottom + 90, paddingHorizontal: 16 }}
                renderItem={({ item }) => {
                  const isPlaying = archivePlayingItem === item.name;
                  return (
                    <View style={[archiveStyles.archiveCard, isPlaying && archiveStyles.archiveCardActive]}>
                      <View style={archiveStyles.archiveCardHeader}>
                        <View style={archiveStyles.archiveCardInfo}>
                          <Text style={archiveStyles.archiveCardName}>{godMode ? '$ ' : ''}{item.name}</Text>
                          <Text style={archiveStyles.archiveCardCategory}>{item.category.toUpperCase()} · {item.frequencies.length} FREQ{godMode ? ' · $-CODE' : ''}</Text>
                        </View>
                      </View>
                      <View style={archiveStyles.freqChipRow}>
                        {item.frequencies.slice(0, 6).map((f, i) => (
                          <Text key={i} style={archiveStyles.freqChip}>{f} Hz</Text>
                        ))}
                        {item.frequencies.length > 6 && <Text style={archiveStyles.freqChip}>+{item.frequencies.length - 6}</Text>}
                      </View>
                      <View style={archiveStyles.actionRow}>
                        <TouchableOpacity
                          style={[archiveStyles.playBtn, isPlaying && archiveStyles.playBtnActive]}
                          onPress={() => handleArchivePlayFrequency(item.name, item.frequencies)}
                        >
                          <Text style={[archiveStyles.playBtnText, isPlaying && archiveStyles.playBtnTextActive]}>
                            {isPlaying ? '■ STOP' : '▶ PLAY'}
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={archiveStyles.loadBtn} onPress={() => handleArchiveLoadFrequency(item)}>
                          <Text style={archiveStyles.loadBtnText}>LOAD → LAB</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                }}
              />
            )}

            {/* LAB VIEW - Recent & Favorites */}
            {archiveViewMode === 'lab' && (
              <ScrollView style={archiveStyles.labScroll} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 90 }}>
                {/* Recent Frequencies */}
                {freqHistory.length > 0 && (
                  <View style={archiveStyles.labSection}>
                    <Text style={archiveStyles.labSectionTitle}>RECENT FREQUENCIES</Text>
                    {freqHistory.slice(0, 8).map((item: any, idx: number) => (
                      <TouchableOpacity
                        key={idx}
                        style={archiveStyles.labRow}
                        onPress={() => {
                          const entry = FREQUENCY_ARCHIVE.find(f => f.name === item.name);
                          if (entry) handleArchiveLoadFrequency(entry);
                          else {
                            updateLayerFrequency(layers[0].id, item.frequency);
                            setArchiveModalVisible(false);
                          }
                        }}
                      >
                        <Text style={archiveStyles.labRowFreq}>{item.frequency} Hz</Text>
                        <Text style={archiveStyles.labRowName}>{item.name}</Text>
                        <Text style={archiveStyles.labRowArrow}>▶</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
                
                {/* Quick Access Presets */}
                <View style={archiveStyles.labSection}>
                  <Text style={archiveStyles.labSectionTitle}>SOLFEGGIO SACRUM</Text>
                  {FREQUENCY_ARCHIVE.filter(f => f.category === 'solfeggio').slice(0, 6).map((item, idx) => (
                    <TouchableOpacity
                      key={idx}
                      style={archiveStyles.labRow}
                      onPress={() => handleArchiveLoadFrequency(item)}
                    >
                      <Text style={archiveStyles.labRowFreq}>{item.frequencies[0]} Hz</Text>
                      <Text style={archiveStyles.labRowName}>{item.name}</Text>
                      <Text style={archiveStyles.labRowArrow}>▶</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* ═══════ SEND CODES MODAL ═══════ */}
      <SendCodesModal
        visible={sendCodesModalVisible}
        onClose={() => setSendCodesModalVisible(false)}
        layers={layers}
        loadedArchiveName={loadedArchiveName}
      />

    </View>
  );
}

const styles = skinStyles({
  container: { flex: 1, backgroundColor: '#000000' },
  safeArea: { flex: 1 },
  scrollView: { flex: 1, paddingHorizontal: 0 },

  // ── TOP NAV ──
  topNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1a0505',
  },
  godmodeBox: {
    borderWidth: 1,
    borderColor: '#ff0a0a',
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: '#0a0303',
  },
  godmodeText: {
    color: '#ff0a0a',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2,
    fontFamily: 'TerminatorRealNFI',
  },
  navLogoLeft: {
    width: 40,
    height: 32,
    borderRadius: 0,
  },
  navLogoRight: {
    width: 32,
    height: 32,
    borderRadius: 0,
  },
  navPills: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginHorizontal: 8,
  },
  navPill: {
    borderWidth: 1,
    borderColor: '#ff0a0a',
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: 'transparent',
  },
  navPillText: {
    color: '#ff0a0a',
    fontSize: 7,
    fontWeight: '700',
    letterSpacing: 1.5,
  },

  // ── HERO ──
  heroSection: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  heroImage: {
    width: '100%',
    height: 200,
  },
  heroLogoPress: {
    width: '100%',
  },
  heroContent: { 
    alignItems: 'center',
    paddingTop: 8,
  },
  heroTitle: {
    color: '#ff0a0a',
    fontSize: 26,
    fontWeight: '900',
    fontFamily: 'TerminatorRealNFI',
    letterSpacing: 4,
    textAlign: 'center',
  },
  heroArtist: {
    color: '#8a3a3a',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 2,
    marginTop: 6,
    fontFamily: 'TerminatorRealNFI',
  },
  heroBrand: {
    color: '#ff0a0a',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 3,
    fontFamily: 'TerminatorRealNFI',
  },
  heroTagline: {
    color: '#8a3a3a',
    fontSize: 9,
    fontWeight: '500',
    letterSpacing: 1.5,
    marginTop: 4,
    fontStyle: 'italic',
  },
  heroRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 14,
  },
  heroSub: {
    color: '#ff0a0a55',
    fontSize: 9,
    fontWeight: '400',
    letterSpacing: 2,
    flex: 1,
  },
  libraryBtn: {
    borderWidth: 1,
    borderColor: '#ff0a0a',
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: 'transparent',
  },
  libraryBtnText: {
    color: '#ff0a0a',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 2,
  },
  scopeUnderLibrary: {
    marginTop: 18,
    paddingHorizontal: 20,
  },
  section: { marginTop: 24, paddingHorizontal: 20 },
  footerLinks: {
    marginTop: 24,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  footerLinksRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  footerLinkText: {
    color: '#444',
    fontSize: 9,
    fontWeight: '400',
    letterSpacing: 2,
  },
  footerSep: {
    color: '#222',
    fontSize: 8,
  },
  loadedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#0a0a0a',
    borderWidth: 0,
    borderLeftWidth: 2,
    borderLeftColor: '#ff0a0a',
    borderRadius: 0,
    marginTop: 8,
    marginHorizontal: 20,
  },
  loadedDot: {
    width: 6,
    height: 6,
    borderRadius: 0,
    backgroundColor: '#ff0a0a',
  },
  loadedText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 2,
    flex: 1,
  },
  loadedClear: {
    color: '#666',
    fontSize: 14,
    paddingHorizontal: 4,
  },
  loadedPlayBtn: {
    borderWidth: 1,
    borderColor: '#ff0a0a',
    borderRadius: 6,
    paddingVertical: 5,
    paddingHorizontal: 12,
    marginRight: 10,
  },
  loadedPlayBtnActive: {
    backgroundColor: '#ff0a0a',
  },
  loadedPlayText: {
    color: '#ff0a0a',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  loadedPlayTextActive: {
    color: '#000',
  },
  sectionTitle: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 4,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  sectionSub: {
    color: '#444',
    fontSize: 9,
    fontWeight: '300',
    letterSpacing: 1,
    marginBottom: 12,
    textAlign: 'center',
  },
  // Layer Card — T-800 gunmetal chassis
  layerCard: {
    backgroundColor: '#0b0e12',
    borderWidth: 1,
    borderColor: '#1c232d',
    borderLeftWidth: 2,
    borderLeftColor: '#ff0a0a',
    borderRadius: 4,
    padding: 16,
    marginBottom: 6,
  },
  layerTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  layerControls: { flex: 1 },
  layerLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  layerTitle: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 2,
  },
  removeBtn: {
    backgroundColor: 'transparent',
    width: 24,
    height: 24,
    borderRadius: 0,
    borderWidth: 1,
    borderColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeBtnText: { color: '#666', fontSize: 12, fontWeight: '300' },
  slider: { width: '100%', height: 28 },
  bandRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginTop: 4,
  },
  bandLabel: {
    color: '#4a525e',
    fontSize: 8,
    fontWeight: '400',
    letterSpacing: 1,
  },
  bandLabelActive: {
    color: '#ff2a2a',
    fontWeight: '600',
  },
  gainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  gainLabel: {
    color: '#444',
    fontSize: 8,
    fontWeight: '400',
    letterSpacing: 1,
    width: 30,
  },
  gainSlider: { flex: 1, height: 24 },
  digitalReadout: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#070a0e',
    borderWidth: 1,
    borderColor: '#1c232d',
    borderBottomWidth: 2,
    borderBottomColor: '#ff0a0a',
    borderRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginTop: 12,
  },
  digitalHz: {
    color: '#d7dee8',
    fontSize: 28,
    fontWeight: '200',
    letterSpacing: 2,
  },
  digitalHzInput: {
    color: '#ff0a0a',
    fontSize: 28,
    fontWeight: '300',
    letterSpacing: 2,
    borderBottomWidth: 1.5,
    borderBottomColor: '#ff0a0a',
    paddingVertical: 0,
    minWidth: 120,
  },
  digitalTapHint: {
    color: '#5a1a1a',
    fontSize: 7,
    letterSpacing: 2,
    marginTop: 2,
  },
  digitalLabel: {
    color: '#7d8794',
    fontSize: 10,
    fontWeight: '300',
    letterSpacing: 2,
  },
  // WAVE TABLE chips — 7 oscillator types
  waveRow: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 8,
  },
  waveChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: '#2a3340',
    borderRadius: 3,
    backgroundColor: '#0b0e12',
  },
  waveChipActive: { borderColor: '#ff0a0a', backgroundColor: '#ff0a0a' },
  waveChipTxt: { color: '#7d8794', fontSize: 7, fontWeight: '900', letterSpacing: 0.5 },
  waveChipTxtActive: { color: '#000' },
  transmitting: {
    color: '#ff0a0a',
    fontSize: 9,
    fontWeight: '400',
    letterSpacing: 3,
    textAlign: 'center',
    marginTop: 8,
  },
  addLayerBtn: {
    padding: 14,
    borderWidth: 1,
    borderColor: '#2a3340',
    borderStyle: 'dashed',
    borderRadius: 4,
    alignItems: 'center',
    backgroundColor: '#070a0e',
  },
  addLayerText: {
    color: '#8a94a2',
    fontSize: 10,
    fontWeight: '400',
    letterSpacing: 3,
  },
  // ═══ T-800 HUD SKIN — gunmetal chrome + infrared ═══
  t800Frame: {
    borderWidth: 1,
    borderColor: '#232b36',
    borderTopWidth: 2,
    borderTopColor: '#ff0a0a',
    borderRadius: 4,
    marginHorizontal: 12,
    paddingHorizontal: 12,
    paddingVertical: 14,
    backgroundColor: '#060809',
  },
  t800Tag: {
    color: '#7d8794',
    fontSize: 7,
    fontWeight: '900',
    letterSpacing: 2,
    marginTop: 2,
  },
  headerChipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
    marginTop: 2,
  },
  linkBtn: {
    borderWidth: 1,
    borderColor: '#2a3340',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 4,
    backgroundColor: '#0b0e12',
  },
  linkBtnActive: {
    borderColor: '#ff0a0a',
    backgroundColor: '#ff0a0a',
  },
  linkBtnText: {
    color: '#c8c8c8',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2,
  },
  linkBtnTextActive: { color: '#000' },
  scalarBtn: {
    borderWidth: 1,
    borderColor: '#5fc9ff',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 4,
    backgroundColor: '#070a0e',
  },
  scalarBtnActive: {
    borderColor: '#5fc9ff',
    backgroundColor: '#5fc9ff',
  },
  scalarBtnText: {
    color: '#5fc9ff',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  scalarBtnTextActive: { color: '#000' },
  scalarStepBtn: {
    borderWidth: 1,
    borderColor: '#2a3340',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 4,
    backgroundColor: '#0b0e12',
    minWidth: 28,
    alignItems: 'center',
  },
  scalarStepTxt: {
    color: '#5fc9ff',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
  },
  godChip: {
    borderWidth: 1,
    borderColor: '#c9a227',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 4,
    backgroundColor: '#0e0a04',
  },
  godChipActive: {
    borderColor: '#ffd75e',
    backgroundColor: '#ffd75e',
  },
  godChipTxt: {
    color: '#ffd75e',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  godChipTxtActive: { color: '#000' },
  labPresetChip: {
    borderWidth: 1,
    borderColor: '#2a3340',
    paddingHorizontal: 7,
    paddingVertical: 6,
    borderRadius: 4,
    backgroundColor: '#0b0e12',
  },
  labPresetChipTxt: {
    color: '#c9d2dd',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  presetPanel: {
    marginTop: 6,
    padding: 8,
    backgroundColor: '#050303',
    borderWidth: 1,
    borderColor: '#180808',
    borderRadius: 8,
    gap: 4,
  },
  presetEmpty: {
    color: '#5a3a3a',
    fontSize: 9,
    fontStyle: 'italic',
    letterSpacing: 1,
    textAlign: 'center',
    paddingVertical: 8,
  },
  presetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0a0505',
    borderWidth: 1,
    borderColor: '#1a0a0a',
    borderRadius: 6,
  },
  presetRowMain: { flex: 1, paddingVertical: 8, paddingHorizontal: 10 },
  presetRowName: { color: '#ffb0b0', fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  presetRowMeta: { color: '#7a5050', fontSize: 8, letterSpacing: 1, marginTop: 2 },
  presetDelBtn: { paddingHorizontal: 12, paddingVertical: 8 },
  presetDelTxt: { color: '#ff6060', fontSize: 16, fontWeight: '900' },
  layerCardLinked: {
    borderColor: '#ff0a0a',
    shadowColor: '#ff0a0a',
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  // ═══ XYZ NODE HEADER — dedicated coordinate area per Node ═══
  xyzHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 4,
    backgroundColor: '#070a0e',
    borderWidth: 1,
    borderColor: '#232b36',
  },
  xyzLabelBlock: { minWidth: 78 },
  xyzNodeName: {
    color: '#ff0a0a',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  xyzOrbTag: {
    color: '#8a4040',
    fontSize: 8,
    letterSpacing: 1,
    fontWeight: '700',
    marginTop: 1,
  },
  xyzAxes: {
    flex: 1,
    gap: 3,
  },
  xyzAxis: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  xyzAxisLabel: {
    color: '#8a8a8a',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1,
    width: 8,
  },
  xyzTrack: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#10151c',
    overflow: 'hidden',
  },
  xyzFill: { height: '100%', borderRadius: 2 },
  xyzAxisVal: {
    color: '#c8c8c8',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.5,
    minWidth: 26,
    textAlign: 'right',
  },
  controlsContainer: { alignItems: 'center', marginTop: 24 },
  playButton: {
    borderWidth: 1,
    borderColor: '#aab4c2',
    paddingHorizontal: 48,
    paddingVertical: 14,
    backgroundColor: '#0b0e12',
    borderRadius: 4,
  },
  playButtonActive: { borderColor: '#ff0a0a', backgroundColor: '#ff0a0a' },
  playButtonText: {
    color: '#d7dee8',
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 4,
  },
  playButtonTextActive: { color: '#ffffff' },
  // Dialpad Layout for Sacred Frequencies
  dialpadContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  dialpadKey: {
    width: '23%',
    aspectRatio: 1,
    borderWidth: 1,
    borderColor: '#ff0a0a30',
    borderRadius: 8,
    backgroundColor: '#0a0505',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dialpadFreq: {
    color: '#ff0a0a',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  dialpadLabel: {
    color: '#ff0a0a50',
    fontSize: 6,
    fontWeight: '700',
    letterSpacing: 1,
    marginTop: 2,
  },
  presetGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 1 },
  presetChip: {
    borderWidth: 1,
    borderColor: '#222',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#0a0a0a',
    borderRadius: 0,
  },
  presetText: {
    color: '#888',
    fontSize: 10,
    fontWeight: '400',
    letterSpacing: 2,
  },
  // Camelot Wheel
  stopCamelotBtn: {
    marginTop: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#333',
    backgroundColor: 'transparent',
    borderRadius: 0,
    alignItems: 'center',
  },
  stopCamelotText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '400',
    letterSpacing: 3,
  },
  viewAllBtn: {
    padding: 14,
    borderWidth: 1,
    borderColor: '#ffffff',
    backgroundColor: 'transparent',
    borderRadius: 0,
    alignItems: 'center',
  },
  viewAllText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 3,
  },
  viewAllSub: {
    color: '#444',
    fontSize: 9,
    fontWeight: '300',
    letterSpacing: 1,
    marginTop: 4,
  },
  soundToggle: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#222',
    backgroundColor: 'transparent',
    borderRadius: 0,
  },
  soundToggleActive: {
    borderColor: '#ffffff',
    backgroundColor: '#0a0a0a',
  },
  soundToggleText: {
    color: '#444',
    fontSize: 9,
    fontWeight: '400',
    letterSpacing: 2,
  },
  soundToggleTextActive: {
    color: '#ffffff',
  },
  pianoToggle: {
    flexDirection: 'row',
    gap: 1,
    marginBottom: 16,
  },
  pianoToggleBtn: {
    flex: 1,
    paddingVertical: 10,
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
    flexWrap: 'wrap',
    gap: 8,
  },
  headerBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sendCodesBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ff0a0a',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  sendCodesBubbleText: {
    color: '#000',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.5,
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
const plStyles = skinStyles({
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
const slabStyles = skinStyles({
  container: {
    marginTop: 8,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: '#ff0a0a',
    paddingVertical: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
    gap: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ff0a0a',
  },
  headerTitle: {
    color: '#ff0a0a',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 3,
  },
  headerMeta: {
    flex: 1,
    color: '#ff0a0a55',
    fontSize: 9,
    letterSpacing: 1,
  },
  openStoreBtn: {
    borderWidth: 1,
    borderColor: '#ff0a0a',
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: 'transparent',
  },
  openStoreText: {
    color: '#ff0a0a',
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 2,
  },
  albumScroll: {
    marginTop: 0,
  },
  albumCard: {
    width: 130,
    backgroundColor: 'transparent',
    borderWidth: 0,
    padding: 0,
  },
  albumCardExpanded: {
    width: 200,
  },
  albumCover: {
    width: '100%',
    height: 130,
    borderRadius: 0,
    marginBottom: 8,
  },
  albumName: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  albumMeta: {
    color: '#555',
    fontSize: 8,
    letterSpacing: 1,
    marginTop: 2,
  },
  discographyBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#ff0a0a',
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
    marginTop: 16,
    marginHorizontal: 16,
  },
  discographyText: {
    color: '#ff0a0a',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2,
  },
  freeAccessText: {
    color: '#00ff00',
    fontSize: 8,
    fontWeight: '600',
    letterSpacing: 2,
    textAlign: 'center',
    marginTop: 8,
    marginHorizontal: 16,
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
  trackFreeTag: {
    backgroundColor: '#00aa00',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  trackFreeText: {
    color: '#000000',
    fontSize: 7,
    fontWeight: '900',
    letterSpacing: 1,
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

// ═══════ CODES ARCHIVE MODAL STYLES ═══════
const archiveStyles = skinStyles({
  modalContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  modalSafeArea: {
    flex: 1,
  },
  headerDecoration: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerDiamond: {
    color: '#ff0a0a',
    fontSize: 10,
  },
  headerLine: {
    width: 1,
    height: 24,
    backgroundColor: '#ff0a0a',
    marginHorizontal: 8,
  },
  modalHeader: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1a0808',
    position: 'relative',
  },
  modalTitle: {
    color: '#ff0a0a',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 4,
    fontFamily: 'TerminatorRealNFI',
    textAlign: 'center',
  },
  modalSubtitle: {
    color: '#5a1a1a',
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 2,
    marginTop: 6,
    fontFamily: 'TerminatorRealNFI',
  },
  modalStats: {
    color: '#3a1010',
    fontSize: 8,
    fontWeight: '600',
    letterSpacing: 1.5,
    marginTop: 4,
    fontFamily: 'TerminatorRealNFI',
  },
  tierRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 10,
  },
  tierBtn: {
    borderWidth: 1,
    borderColor: '#2a1010',
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#0b0505',
  },
  tierBtnActive: {
    borderColor: '#c9d2dd',
    backgroundColor: '#c9d2dd',
  },
  tierBtnGold: {
    borderColor: '#ffd75e',
    backgroundColor: '#ffd75e',
  },
  tierBtnText: {
    color: '#5a4a30',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  tierBtnTextActive: { color: '#000' },
  tierBtnTextGold: { color: '#000' },
  tierMeta: {
    color: '#c9a227',
    fontSize: 7,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginTop: 6,
    textAlign: 'center',
  },
  modalCloseBtn: {
    position: 'absolute',
    top: 0,
    right: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  modalCloseBtnText: {
    color: '#ff0a0a',
    fontSize: 18,
    fontWeight: '300',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#2a0a0a',
    backgroundColor: '#0a0303',
    paddingHorizontal: 14,
    borderRadius: 0,
  },
  searchIcon: {
    color: '#ff0a0a',
    fontSize: 16,
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    color: '#ff3040',
    fontSize: 13,
    paddingVertical: Platform.OS === 'ios' ? 14 : 12,
    letterSpacing: 0.5,
  },
  clearBtn: {
    color: '#ff0a0a',
    fontSize: 14,
    paddingHorizontal: 8,
  },
  tabRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 14,
    gap: 0,
  },
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#2a0a0a',
    backgroundColor: '#050202',
  },
  tabBtnActive: {
    borderColor: '#ff0a0a',
    backgroundColor: '#0f0505',
  },
  tabBtnText: {
    color: '#5a1a1a',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
    fontFamily: 'TerminatorRealNFI',
  },
  tabBtnTextActive: {
    color: '#ff0a0a',
  },
  nowPlaying: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: '#0a0303',
    borderWidth: 1,
    borderColor: '#ff0a0a40',
    paddingHorizontal: 12,
    paddingVertical: 10,
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
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    fontFamily: 'TerminatorRealNFI',
  },
  stopAllBtn: {
    color: '#ff0a0a',
    fontSize: 10,
    fontWeight: '800',
    fontFamily: 'TerminatorRealNFI',
  },
  // CODEX VIEW STYLES
  codexScroll: {
    flex: 1,
    marginTop: 12,
  },
  codexRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#1a0808',
    backgroundColor: '#050202',
    marginBottom: 2,
  },
  codexIconWrap: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  codexIcon: {
    color: '#ff0a0a',
    fontSize: 20,
  },
  codexInfo: {
    flex: 1,
  },
  codexName: {
    color: '#ff0a0a',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 2,
    fontFamily: 'TerminatorRealNFI',
  },
  codexEntryCount: {
    color: '#5a1a1a',
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 1.5,
    marginTop: 3,
    fontFamily: 'TerminatorRealNFI',
  },
  codexArrow: {
    color: '#3a1010',
    fontSize: 10,
  },
  backBtn: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    paddingVertical: 10,
  },
  backBtnText: {
    color: '#ff0a0a',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    fontFamily: 'TerminatorRealNFI',
  },
  // LAB VIEW STYLES
  labScroll: {
    flex: 1,
    marginTop: 12,
  },
  labSection: {
    marginHorizontal: 16,
    marginBottom: 20,
  },
  labSectionTitle: {
    color: '#ff0a0a',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: 10,
    fontFamily: 'TerminatorRealNFI',
  },
  labRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#1a0808',
    backgroundColor: '#050202',
    marginBottom: 2,
  },
  labRowFreq: {
    color: '#ff0a0a',
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'TerminatorRealNFI',
    width: 70,
  },
  labRowName: {
    flex: 1,
    color: '#5a1a1a',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1,
    fontFamily: 'TerminatorRealNFI',
  },
  labRowArrow: {
    color: '#3a1010',
    fontSize: 10,
  },
  // ARCHIVE CARD STYLES
  archiveCard: {
    backgroundColor: '#0a0303',
    borderWidth: 1,
    borderColor: '#1a0808',
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
    fontFamily: 'TerminatorRealNFI',
  },
  archiveCardCategory: {
    color: '#5a1a1a',
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 2,
    fontFamily: 'TerminatorRealNFI',
  },
  freqChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    marginBottom: 12,
  },
  freqChip: {
    color: '#ff0a0a',
    fontSize: 9,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#ff0a0a30',
    backgroundColor: '#0f0303',
    letterSpacing: 0.5,
    fontFamily: 'TerminatorRealNFI',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  playBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#ff0a0a50',
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
    fontFamily: 'TerminatorRealNFI',
  },
  playBtnTextActive: {
    color: '#000000',
  },
  loadBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#3a1010',
    backgroundColor: '#050202',
    minHeight: 44,
  },
  loadBtnText: {
    color: '#5a1a1a',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
    fontFamily: 'TerminatorRealNFI',
  },
});
