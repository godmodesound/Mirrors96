import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import Svg, { Circle, Line, Text as SvgText, G } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AudioEngine } from './AudioEngine';
import GodmodeSlider from './GodmodeSlider';

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

// Analog Dial Component
const AnalogDial = ({ frequency }: { frequency: number }) => {
  const size = 70;
  const center = size / 2;
  const radius = 28;
  
  // Map frequency (1-2000) to angle (-135 to 135 degrees)
  const minAngle = -135;
  const maxAngle = 135;
  const angle = minAngle + ((frequency - 1) / 1999) * (maxAngle - minAngle);
  const radians = (angle * Math.PI) / 180;
  
  const needleLength = radius - 6;
  const needleX = center + needleLength * Math.sin(radians);
  const needleY = center - needleLength * Math.cos(radians);

  return (
    <View style={dialStyles.dialContainer}>
      <Svg width={size} height={size}>
        {/* Outer ring */}
        <Circle cx={center} cy={center} r={radius} fill="none" stroke="#1a0808" strokeWidth={2} />
        {/* Inner dark circle */}
        <Circle cx={center} cy={center} r={radius - 4} fill="#050303" />
        {/* Tick marks */}
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
              stroke="#3a1010"
              strokeWidth={1}
            />
          );
        })}
        {/* Needle */}
        <Line
          x1={center}
          y1={center}
          x2={needleX}
          y2={needleY}
          stroke="#ff0a0a"
          strokeWidth={2}
          strokeLinecap="round"
        />
        {/* Center dot */}
        <Circle cx={center} cy={center} r={3} fill="#ff0a0a" />
      </Svg>
      <Text style={dialStyles.dialLabel}>ANALOG</Text>
    </View>
  );
};

const dialStyles = StyleSheet.create({
  dialContainer: { alignItems: 'center' },
  dialLabel: { color: '#3a1010', fontSize: 7, marginTop: 2, letterSpacing: 2 },
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

  const updateLayerFrequency = (id: number, freq: number) => {
    setLayers(prev => prev.map(l => l.id === id ? { ...l, frequency: Math.round(freq * 10) / 10 } : l));
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
    if (freq < 40) return 0;
    if (freq < 200) return 1;
    if (freq < 800) return 2;
    if (freq < 1400) return 3;
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
          <TouchableOpacity onPress={clearLoaded}>
            <Text style={styles.loadedClear}>✕</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Layer Cards */}
      {layers.map((layer, index) => (
        <View key={layer.id} style={styles.layerCard}>
          <View style={styles.layerTopRow}>
            <AnalogDial frequency={layer.frequency} />
            <View style={styles.layerControls}>
              <View style={styles.layerLabelRow}>
                <Text style={styles.layerTitle}>Layer {index + 1}</Text>
                {layers.length > 1 && (
                  <TouchableOpacity onPress={() => removeLayer(layer.id)} style={styles.removeBtn}>
                    <Text style={styles.removeBtnText}>X</Text>
                  </TouchableOpacity>
                )}
              </View>
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
            <Text style={styles.digitalHz}>{layer.frequency.toFixed(1)} Hz</Text>
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
  layerCard: {
    backgroundColor: '#0a0505',
    borderWidth: 1,
    borderColor: '#1a0808',
    padding: 10,
    marginBottom: 8,
  },
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
    color: '#ff0a0a',
    fontSize: 28,
    fontWeight: '300',
    letterSpacing: 1,
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
