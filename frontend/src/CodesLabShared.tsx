import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Platform,
  PanResponder,
} from 'react-native';
import Svg, { Circle, Line, Text as SvgText, G } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AudioEngine } from './AudioEngine';
import GodmodeSlider from './GodmodeSlider';
import { FullSpectrumMeter, AudioMeterScale } from './SpectrumMeters';
import CymaticScope from './CymaticScope';
import TEModules from './TEModules';

// ═══════════════════════════════════
// SHARED CODES LAB COMPONENT
// Syncs frequency state across screens
// ═══════════════════════════════════

const STORAGE_KEY = 'codes_lab_state';
const BANDS = ['SUB', 'LOW', 'MID', 'HIGH', 'ULTRA'];

interface ToneLayer {
  id: number;
  frequency: number;
  gain: number;
  isPlaying: boolean;
}

interface CodesLabProps {
  onFrequencyChange?: (layers: ToneLayer[]) => void;
  onLoadedNameChange?: (name: string | null) => void;
  compact?: boolean;
}

// Analog Dial Component — touch-drag to sweep frequency (log scale, 1 Hz — 26 kHz)
const AnalogDial = ({
  frequency,
  onChange,
  onSweepStart,
  onSweepEnd,
}: {
  frequency: number;
  onChange?: (f: number) => void;
  onSweepStart?: () => void;
  onSweepEnd?: () => void;
}) => {
  const size = 70;
  const center = size / 2;
  const radius = 28;

  const minAngle = -135;
  const maxAngle = 135;
  const angle = minAngle + Math.min((frequency - 1) / 25999, 1) * (maxAngle - minAngle);
  const radians = (angle * Math.PI) / 180;

  const needleLength = radius - 6;
  const needleX = center + needleLength * Math.sin(radians);
  const needleY = center - needleLength * Math.cos(radians);

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
        const delta = (g.dx - g.dy) / 220;
        const min = 1, max = 26000;
        const lmin = Math.log(min), lmax = Math.log(max);
        const cur = Math.log(Math.max(startRef.current, min));
        const nv = Math.exp(Math.min(lmax, Math.max(lmin, cur + delta * (lmax - lmin))));
        cb(Math.round(nv * 10) / 10);
      },
      onPanResponderRelease: () => { setSweeping(false); onSweepEndRef.current && onSweepEndRef.current(); },
      onPanResponderTerminate: () => { setSweeping(false); onSweepEndRef.current && onSweepEndRef.current(); },
    })
  ).current;

  return (
    <View style={dialStyles.dialContainer} {...(onChange ? pan.panHandlers : {})}>
      <Svg width={size} height={size}>
        <Circle cx={center} cy={center} r={radius} fill="none" stroke={sweeping ? '#ff0a0a' : '#1a0808'} strokeWidth={2} />
        <Circle cx={center} cy={center} r={radius - 4} fill="#050303" />
        {[-135, -90, -45, 0, 45, 90, 135].map((tickAngle, i) => {
          const tickRad = (tickAngle * Math.PI) / 180;
          const inner = radius - 8;
          const outer = radius - 3;
          return (
            <Line
              key={i}
              x1={center + inner * Math.sin(tickRad)}
              y1={center - inner * Math.cos(tickRad)}
              x2={center + outer * Math.sin(tickRad)}
              y2={center - outer * Math.cos(tickRad)}
              stroke={sweeping ? '#ff4040' : '#3a1010'}
              strokeWidth={1}
            />
          );
        })}
        <Line
          x1={center}
          y1={center}
          x2={needleX}
          y2={needleY}
          stroke={sweeping ? '#ffb0b0' : '#ff0a0a'}
          strokeWidth={sweeping ? 2.5 : 2}
          strokeLinecap="round"
        />
        <Circle cx={center} cy={center} r={sweeping ? 4 : 3} fill={sweeping ? '#ffffff' : '#ff0a0a'} />
      </Svg>
      <Text style={[dialStyles.dialLabel, sweeping && dialStyles.dialLabelActive]}>{sweeping ? 'SWEEP' : 'ANALOG'}</Text>
    </View>
  );
};

const dialStyles = StyleSheet.create({
  dialContainer: { alignItems: 'center' },
  dialLabel: { color: '#3a1010', fontSize: 7, marginTop: 2, letterSpacing: 2 },
  dialLabelActive: { color: '#ff8080' },
});

export default function CodesLabShared({ onFrequencyChange, onLoadedNameChange, compact = false }: CodesLabProps) {
  const [layers, setLayers] = useState<ToneLayer[]>([
    { id: 1, frequency: 432, gain: 0.5, isPlaying: false },
  ]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loadedArchiveName, setLoadedArchiveName] = useState<string | null>(null);

  // Load saved state on mount
  useEffect(() => {
    loadState();
  }, []);

  // Save state when layers change
  useEffect(() => {
    saveState();
    onFrequencyChange?.(layers);
  }, [layers]);

  useEffect(() => {
    onLoadedNameChange?.(loadedArchiveName);
  }, [loadedArchiveName]);

  const loadState = async () => {
    try {
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.layers) setLayers(parsed.layers);
        if (parsed.loadedName) setLoadedArchiveName(parsed.loadedName);
      }
    } catch {}
  };

  const saveState = async () => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({
        layers,
        loadedName: loadedArchiveName,
      }));
    } catch {}
  };

  // Throttled live-audio update — restart playMulti with new freqs while sweeping (only when playing)
  const sweepRAFRef = useRef<number | null>(null);
  const pendingFreqsRef = useRef<number[] | null>(null);
  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;

  const scheduleLiveResync = (nextLayers: { frequency: number; gain: number }[]) => {
    if (!isPlayingRef.current) return;
    pendingFreqsRef.current = nextLayers.map(l => l.frequency);
    if (sweepRAFRef.current != null) return;
    sweepRAFRef.current = requestAnimationFrame(() => {
      sweepRAFRef.current = null;
      const freqs = pendingFreqsRef.current;
      pendingFreqsRef.current = null;
      if (!freqs || !isPlayingRef.current) return;
      const avgGain = nextLayers.reduce((s, l) => s + l.gain, 0) / nextLayers.length;
      AudioEngine.playMulti(freqs, avgGain);
    });
  };

  // LINK LAYERS — sync all layers by ratio when any is swept
  const [layersLinked, setLayersLinked] = useState(false);

  const updateLayerFrequency = (id: number, freq: number) => {
    setLayers(prev => {
      let next;
      if (layersLinked && prev.length > 1) {
        const source = prev.find(l => l.id === id);
        if (!source || source.frequency <= 0) {
          next = prev;
        } else {
          const ratio = freq / source.frequency;
          next = prev.map(l => ({
            ...l,
            frequency: Math.min(26000, Math.max(1, Math.round(l.frequency * ratio * 10) / 10)),
          }));
        }
      } else {
        next = prev.map(l => l.id === id ? { ...l, frequency: Math.round(freq * 10) / 10 } : l);
      }
      scheduleLiveResync(next);
      return next;
    });
  };

  // One-tap frequency editing
  const [editingFreqId, setEditingFreqId] = useState<number | null>(null);
  const [freqInput, setFreqInput] = useState('');

  const commitFreqEdit = (id: number) => {
    const parsed = parseFloat(freqInput.replace(',', '.'));
    if (!isNaN(parsed)) {
      updateLayerFrequency(id, Math.min(26000, Math.max(1, parsed)));
    }
    setEditingFreqId(null);
    setFreqInput('');
  };

  const updateLayerGain = (id: number, gain: number) => {
    setLayers(prev => prev.map(l => l.id === id ? { ...l, gain } : l));
  };

  const addLayer = () => {
    if (layers.length >= 5) return;
    const newId = Math.max(...layers.map(l => l.id)) + 1;
    setLayers([...layers, { id: newId, frequency: 432, gain: 0.5, isPlaying: false }]);
  };

  const removeLayer = (id: number) => {
    if (layers.length <= 1) return;
    setLayers(layers.filter(l => l.id !== id));
  };

  const handlePlay = () => {
    if (isPlaying) {
      AudioEngine.stopMulti();
      setIsPlaying(false);
      setLayers(prev => prev.map(l => ({ ...l, isPlaying: false })));
    } else {
      const freqs = layers.map(l => l.frequency);
      const avgGain = layers.reduce((sum, l) => sum + l.gain, 0) / layers.length;
      AudioEngine.playMulti(freqs, avgGain);
      setIsPlaying(true);
      setLayers(prev => prev.map(l => ({ ...l, isPlaying: true })));
    }
  };

  const getBandPosition = (freq: number): number => {
    if (freq < 60) return 0;
    if (freq < 250) return 1;
    if (freq < 2000) return 2;
    if (freq < 8000) return 3;
    return 4;
  };

  const clearLoaded = () => {
    setLoadedArchiveName(null);
    setLayers([{ id: 1, frequency: 432, gain: 0.5, isPlaying: false }]);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>&gt; CODES_LAB</Text>
      </View>

      {/* Loaded indicator */}
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
          <TouchableOpacity onPress={clearLoaded}>
            <Text style={styles.loadedClear}>✕</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Cymatic Oscilloscope — real-time frequency feedback */}
      <CymaticScope frequencies={layers.map(l => l.frequency)} playing={isPlaying} />

      {/* LINK LAYERS — sync all Analog nodes so a sweep on one shifts all together (ratio-locked) */}
      <View style={styles.linkBar}>
        <View style={styles.linkBarLeft}>
          <View style={[styles.linkBarDot, layersLinked && styles.linkBarDotActive]} />
          <Text style={styles.linkBarLabel}>NODES {'\u2192'} {layers.length}</Text>
        </View>
        <TouchableOpacity
          style={[styles.linkBtn, layersLinked && styles.linkBtnActive]}
          onPress={() => setLayersLinked(v => !v)}
          activeOpacity={0.7}
        >
          <Text style={[styles.linkBtnText, layersLinked && styles.linkBtnTextActive]}>
            {layersLinked ? '◈ LINKED' : '◇ LINK ALL'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Layer Cards */}
      {layers.map((layer, index) => (
        <View key={layer.id} style={[styles.layerCard, layersLinked && styles.layerCardLinked]}>
          <View style={styles.layerTopRow}>
            <AnalogDial
              frequency={layer.frequency}
              onChange={(f) => updateLayerFrequency(layer.id, f)}
            />
            <View style={styles.layerControls}>
              <View style={styles.layerLabelRow}>
                <Text style={styles.layerTitle}>Layer {index + 1}</Text>
                {layers.length > 1 && (
                  <TouchableOpacity onPress={() => removeLayer(layer.id)} style={styles.removeBtn}>
                    <Text style={styles.removeBtnText}>X</Text>
                  </TouchableOpacity>
                )}
              </View>
              {/* Full EM Spectrum Meter (future plug-in bandwidths) */}
              <FullSpectrumMeter frequency={layer.frequency} />
              <GodmodeSlider
                style={styles.slider}
                minimumValue={1}
                maximumValue={26000}
                value={layer.frequency}
                onValueChange={(val) => updateLayerFrequency(layer.id, val)}
                minimumTrackTintColor="#ff0a0a"
                maximumTrackTintColor="#333333"
                thumbTintColor="#ff6060"
              />
              <AudioMeterScale />
              <View style={styles.bandRow}>
                {BANDS.map((band, i) => (
                  <Text
                    key={band}
                    style={[styles.bandLabel, getBandPosition(layer.frequency) === i && styles.bandLabelActive]}
                  >
                    {band}
                  </Text>
                ))}
              </View>
              {!compact && (
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
              )}
            </View>
          </View>
          <View style={styles.digitalReadout}>
            {editingFreqId === layer.id ? (
              <TextInput
                style={styles.digitalHzInput}
                value={freqInput}
                onChangeText={setFreqInput}
                keyboardType="decimal-pad"
                autoFocus
                selectTextOnFocus
                maxLength={6}
                onBlur={() => commitFreqEdit(layer.id)}
                onSubmitEditing={() => commitFreqEdit(layer.id)}
                returnKeyType="done"
              />
            ) : (
              <TouchableOpacity
                onPress={() => { setEditingFreqId(layer.id); setFreqInput(String(layer.frequency)); }}
                activeOpacity={0.7}
              >
                <Text style={styles.digitalHz}>{layer.frequency.toFixed(1)} Hz</Text>
                <Text style={styles.digitalTapHint}>TAP TO EDIT</Text>
              </TouchableOpacity>
            )}
            <Text style={styles.digitalLabel}>Digital</Text>
          </View>
          {layer.isPlaying && (
            <Text style={styles.transmitting}>■ TRANSMITTING</Text>
          )}
        </View>
      ))}

      {/* Add Layer */}
      {layers.length < 5 && (
        <TouchableOpacity style={styles.addLayerBtn} onPress={addLayer}>
          <Text style={styles.addLayerText}>[+] ADD_LAYER</Text>
        </TouchableOpacity>
      )}

      {/* Execute Button */}
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

      {/* ══════ TE MODULES — SWEEP + SCALAR ══════ */}
      <TEModules />
    </View>
  );
}

// Export a function to load frequency from archive entry
export const loadFrequencyToLab = async (frequencies: number[], name: string) => {
  try {
    const layers: ToneLayer[] = frequencies.slice(0, 5).map((freq, i) => ({
      id: i + 1,
      frequency: freq,
      gain: 0.5,
      isPlaying: false,
    }));
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({
      layers,
      loadedName: name,
    }));
  } catch {}
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#050202',
    borderWidth: 1,
    borderColor: '#1a0808',
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 12,
  },
  header: {
    marginBottom: 8,
  },
  headerTitle: {
    color: '#ff0a0a',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 2,
  },
  loadedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0a0505',
    borderWidth: 1,
    borderColor: '#ff0a0a30',
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 10,
    gap: 8,
  },
  loadedDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ff0a0a',
  },
  loadedText: {
    flex: 1,
    color: '#ff0a0a',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1,
  },
  loadedClear: {
    color: '#5a1a1a',
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
  layerCard: {
    backgroundColor: '#0a0505',
    borderWidth: 1,
    borderColor: '#1a0808',
    padding: 10,
    marginBottom: 8,
  },
  layerCardLinked: {
    borderColor: '#ff0a0a',
    shadowColor: '#ff0a0a',
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  linkBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    marginTop: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#080606',
    borderWidth: 1,
    borderColor: '#1a0a0a',
    borderRadius: 8,
  },
  linkBarLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  linkBarDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#3a1010' },
  linkBarDotActive: { backgroundColor: '#ff0a0a' },
  linkBarLabel: { color: '#8a8a8a', fontSize: 10, letterSpacing: 2, fontWeight: '800' },
  linkBtn: {
    borderWidth: 1,
    borderColor: '#333',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#0a0a0a',
  },
  linkBtnActive: { borderColor: '#ff0a0a', backgroundColor: '#ff0a0a' },
  linkBtnText: { color: '#c8c8c8', fontSize: 10, fontWeight: '900', letterSpacing: 2 },
  linkBtnTextActive: { color: '#000' },
  layerTopRow: {
    flexDirection: 'row',
    gap: 12,
  },
  layerControls: {
    flex: 1,
  },
  layerLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  layerTitle: {
    color: '#ff0a0a',
    fontSize: 11,
    fontWeight: '700',
  },
  removeBtn: {
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  removeBtnText: {
    color: '#5a1a1a',
    fontSize: 10,
    fontWeight: '800',
  },
  slider: {
    height: 30,
  },
  bandRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  bandLabel: {
    color: '#3a1010',
    fontSize: 8,
    fontWeight: '600',
  },
  bandLabelActive: {
    color: '#ff0a0a',
  },
  gainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
  },
  gainLabel: {
    color: '#5a1a1a',
    fontSize: 9,
  },
  gainSlider: {
    flex: 1,
    height: 24,
  },
  digitalReadout: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#1a0808',
  },
  digitalHz: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '200',
    letterSpacing: 2,
  },
  digitalHzInput: {
    color: '#ff0a0a',
    fontSize: 28,
    fontWeight: '300',
    letterSpacing: 1,
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
    color: '#3a1010',
    fontSize: 9,
    letterSpacing: 2,
  },
  transmitting: {
    color: '#ff0a0a',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 3,
    marginTop: 6,
    textAlign: 'center',
  },
  addLayerBtn: {
    alignItems: 'center',
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#1a0808',
    borderStyle: 'dashed',
    marginBottom: 10,
  },
  addLayerText: {
    color: '#5a1a1a',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2,
  },
  controlsContainer: {
    marginTop: 4,
  },
  playButton: {
    backgroundColor: '#0a0505',
    borderWidth: 2,
    borderColor: '#ff0a0a',
    paddingVertical: 14,
    alignItems: 'center',
  },
  playButtonActive: {
    backgroundColor: '#ff0a0a',
  },
  playButtonText: {
    color: '#ff0a0a',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 4,
  },
  playButtonTextActive: {
    color: '#000000',
  },
});
