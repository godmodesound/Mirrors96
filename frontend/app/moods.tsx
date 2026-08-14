import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MirrorsIdBanner from '../src/MirrorsIdBanner';
import DisclaimerFooter from '../src/DisclaimerFooter';
import { AudioEngine } from '../src/AudioEngine';
import { FrequencyMap } from '../src/FrequencyMap';
import ElementCube, { ResonatorEmission } from '../src/ElementCube';
import TimeTravelDial from '../src/TimeTravelDial';

const { width } = Dimensions.get('window');

interface MoodState {
  name: string;
  description: string;
  frequencies: number[];
  effect: string;
  layer?: string;
  color?: string;
}

const MOOD_STATES: MoodState[] = [
  { name: 'SERENITY', description: 'Deep calm', frequencies: [432, 528, 7.83], effect: 'Alpha wave' },
  { name: 'HYPERFOCUS', description: 'Concentration', frequencies: [40, 432, 852, 14], effect: 'Beta/Gamma' },
  { name: 'OVERDRIVE', description: 'Max energy', frequencies: [417, 639, 963, 40], effect: 'Dopamine' },
  { name: 'GENESIS', description: 'Creative flow', frequencies: [528, 741, 6, 396], effect: 'Theta' },
  { name: 'EUPHORIA', description: 'Bliss', frequencies: [528, 639, 963, 432, 285], effect: 'Serotonin' },
  { name: 'REGENERATE', description: 'Cellular renewal', frequencies: [174, 285, 396, 528, 7.83], effect: 'Deep renewal' },
  { name: 'VOID', description: 'Deep sleep', frequencies: [2, 174, 396, 4], effect: 'Delta' },
  { name: 'TITAN', description: 'Power', frequencies: [396, 417, 741, 40, 20], effect: 'Adrenaline' },
];

// 8 cortex-layer brain states based on the 6-layer cerebral cortex model
const BRAIN_STATES: MoodState[] = [
  {
    name: 'MOLECULAR',
    description: 'Layer I — Peak awareness',
    frequencies: [40, 100, 432, 963],
    effect: 'Gamma 40Hz',
    layer: 'I',
    color: '#00ff88',
  },
  {
    name: 'EXT GRANULAR',
    description: 'Layer II — Cognitive surge',
    frequencies: [30, 528, 852, 20],
    effect: 'High Beta 30Hz',
    layer: 'II',
    color: '#00cc66',
  },
  {
    name: 'EXT PYRAMIDAL',
    description: 'Layer III — Problem solving',
    frequencies: [20, 417, 741, 14],
    effect: 'Beta 20Hz',
    layer: 'III',
    color: '#009944',
  },
  {
    name: 'INT GRANULAR',
    description: 'Layer IV — Calm focus',
    frequencies: [13, 432, 528, 10],
    effect: 'SMR 13Hz',
    layer: 'IV',
    color: '#007733',
  },
  {
    name: 'INT PYRAMIDAL',
    description: 'Layer V — Creative flow',
    frequencies: [10, 396, 528, 7.83],
    effect: 'Alpha 10Hz',
    layer: 'V',
    color: '#005522',
  },
  {
    name: 'MULTIFORM',
    description: 'Layer VI — Deep meditation',
    frequencies: [6, 174, 285, 3.5],
    effect: 'Theta 6Hz',
    layer: 'VI',
    color: '#003311',
  },
  {
    name: 'WHITE MATTER',
    description: 'Deep fiber sync',
    frequencies: [2, 174, 7.83, 0.5],
    effect: 'Delta 2Hz',
    layer: 'WM',
    color: '#224422',
  },
  {
    name: 'FULL CORTEX',
    description: 'All layers integrated',
    frequencies: [40, 20, 13, 10, 6, 2, 432, 528],
    effect: 'Cross-freq coupling',
    layer: '∞',
    color: '#44ff88',
  },
];

const BRAIN_IMAGE_URI = 'https://customer-assets.emergentagent.com/job_e121e09e-99f3-472d-8697-f5a5be5cce59/artifacts/6xw8z9kh_cortexlayersgreen5.webp';

export default function MoodsScreen() {
  const [activeMood, setActiveMood] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [section, setSection] = useState<'states' | 'brain'>('states');
  // Live temporal-resonator feed: Mirror Cube emissions → Time Travel Dial
  const [emission, setEmission] = useState<ResonatorEmission | null>(null);
  const insets = useSafeAreaInsets();

  // Audio persists across pages for universal sync (harmonic layering).

  const handleMoodPress = (mood: MoodState) => {
    if (activeMood === mood.name && isPlaying) {
      AudioEngine.stopMulti(); setIsPlaying(false); setActiveMood(null);
    } else {
      AudioEngine.playMulti(mood.frequencies, 0.4); setActiveMood(mood.name); setIsPlaying(true);
    }
  };

  const currentList = section === 'brain' ? BRAIN_STATES : MOOD_STATES;
  const getActiveMood = () => currentList.find(m => m.name === activeMood);

  return (
    <View style={styles.container}>
      <View style={[styles.safeArea, { paddingTop: insets.top }]}>
        <MirrorsIdBanner />
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 90 }}>

          {/* ═══ ELEMENT CUBE — interactive 3D periodic-table cube.
               Each facet plays its Cosmic-Octave audible frequency
               (primary emission spectra transposed into 20-2000 Hz). ═══ */}
          <ElementCube onEmit={setEmission} />

          {/* ═══ TIME TRAVEL DIAL — KRYSTAR LAST-Ascension cycle 2008-3333 AD.
               Back-to-the-Future style year dial simulates a jump across the
               5 Stages of Starfire; each stage renders its Wheels-Within-Wheels
               sacred geometry and plays its resonant chord. Driven in realtime
               by the Mirror Cube's Temporal Resonator emissions. ═══ */}
          <TimeTravelDial emission={emission} />

          {/* Frequency Map Section */}
          <View style={styles.frequencyMapSection}>
            <FrequencyMap
              onFrequencySelect={(freq) => {
                console.log('Frequency selected from map:', freq);
              }}
            />
          </View>
          <View style={{ height: 20 }} />
          <DisclaimerFooter />
        </ScrollView>
      </View>
    </View>
  );
}

const cardWidth = (width - 48) / 2;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  safeArea: { flex: 1 },
  scrollView: { flex: 1, paddingHorizontal: 16 },
  frequencyMapSection: { marginBottom: 16 },
  header: { paddingTop: 16, paddingBottom: 8 },
  terminalHeader: { borderWidth: 1, borderColor: '#ff0a0a', paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#0a0505' },
  terminalTitle: { color: '#ff0a0a', fontSize: 14, fontFamily: 'TerminatorRealNFI', fontWeight: '700', textAlign: 'center' },
  subtitle: { color: '#5a1a1a', fontSize: 10, marginTop: 8, fontFamily: 'TerminatorRealNFI', textAlign: 'center' },

  toggleRow: { flexDirection: 'row', gap: 8, marginTop: 16, marginBottom: 12 },
  toggleBtn: { flex: 1, borderWidth: 1, borderColor: '#2a0a0a', paddingVertical: 10, alignItems: 'center', backgroundColor: '#0a0505' },
  toggleActive: { borderColor: '#ff0a0a', backgroundColor: '#150505' },
  toggleText: { color: '#5a1a1a', fontSize: 10, fontWeight: '700', fontFamily: 'TerminatorRealNFI', letterSpacing: 1 },
  toggleTextActive: { color: '#ff0a0a' },

  brainImageWrap: { alignItems: 'center', marginBottom: 16, borderWidth: 1, borderColor: '#0a2a0a', padding: 8, backgroundColor: '#020a02' },
  brainImage: { width: width - 64, height: (width - 64) * 0.75, borderRadius: 4 },
  brainCaption: { color: '#00aa44', fontSize: 7, fontFamily: 'TerminatorRealNFI', letterSpacing: 2, marginTop: 8, textAlign: 'center' },

  activeDisplay: { marginTop: 12 },
  activeBox: { borderWidth: 2, borderColor: '#ff0a0a', padding: 16, backgroundColor: '#150505', alignItems: 'center' },
  activeBoxBrain: { borderColor: '#00ff88', backgroundColor: '#021a08' },
  activeName: { fontSize: 22, fontWeight: '700', color: '#ff0a0a', fontFamily: 'TerminatorRealNFI' },
  activeNameBrain: { color: '#00ff88' },
  activeEffect: { fontSize: 11, color: '#ff3040', marginTop: 4, fontFamily: 'TerminatorRealNFI' },
  layerTag: { fontSize: 8, color: '#00aa44', marginTop: 4, fontFamily: 'TerminatorRealNFI', letterSpacing: 2 },
  activeFreqs: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 12 },
  activeFreqText: { color: '#5a1a1a', fontSize: 10, fontFamily: 'TerminatorRealNFI' },
  transmitText: { color: '#ff0a0a', fontSize: 10, marginTop: 12, fontFamily: 'TerminatorRealNFI' },
  transmitBrain: { color: '#00ff88' },

  moodGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 16 },
  moodCard: { width: cardWidth, borderWidth: 1, borderColor: '#2a0a0a', padding: 12, backgroundColor: '#0a0505', minHeight: 100 },
  moodCardActive: { borderColor: '#ff0a0a', backgroundColor: '#150505' },
  brainCard: { borderColor: '#0a2a0a', backgroundColor: '#020a02' },
  brainCardActive: { borderColor: '#00ff88', backgroundColor: '#041a08' },
  moodName: { fontSize: 11, fontWeight: '700', color: '#ff3040', fontFamily: 'TerminatorRealNFI' },
  moodDesc: { fontSize: 9, color: '#5a1a1a', marginTop: 4, fontFamily: 'TerminatorRealNFI' },
  moodEffect: { fontSize: 8, color: '#5a1a1a', marginTop: 6, fontFamily: 'TerminatorRealNFI' },
  moodPlaying: { position: 'absolute', top: 8, right: 8, color: '#ff0a0a', fontSize: 12, fontFamily: 'TerminatorRealNFI' },
  moodPlayingBrain: { color: '#00ff88' },

  layerBadge: { position: 'absolute', top: 6, right: 6, width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  layerBadgeText: { color: '#000', fontSize: 8, fontWeight: '900' },
});
