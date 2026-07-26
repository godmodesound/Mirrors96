import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Platform,
} from 'react-native';

// ═══════════════════════════════════════════════════════════
// FREQUENCY CATALOG — access every sacred, cosmic, planetary,
// harmonic, and brainwave frequency in one place. Tap to add
// as a new Node Layer; long-press to replace Layer 1's freq.
// ═══════════════════════════════════════════════════════════

export type FreqPreset = { hz: number; name: string; note?: string };
export type FreqCategory = { category: string; color: string; blurb: string; presets: FreqPreset[] };

export const CATALOG: FreqCategory[] = [
  {
    category: 'SOLFEGGIO',
    color: '#ff0a0a',
    blurb: 'Ancient healing scale · 6+3 tones',
    presets: [
      { hz: 174, name: 'FOUNDATION', note: 'pain relief · security' },
      { hz: 285, name: 'REGENERATE', note: 'tissue · organ repair' },
      { hz: 396, name: 'UT · LIBERATION', note: 'release fear + guilt' },
      { hz: 417, name: 'RE · CHANGE', note: 'undo situations' },
      { hz: 528, name: 'MI · MIRACLE', note: 'DNA · love · repair' },
      { hz: 639, name: 'FA · CONNECT', note: 'relationships' },
      { hz: 741, name: 'SOL · AWAKEN', note: 'intuition · cleansing' },
      { hz: 852, name: 'LA · RETURN', note: 'spiritual order' },
      { hz: 963, name: 'TI · GOD FREQ', note: 'pineal activation' },
    ],
  },
  {
    category: 'SCHUMANN',
    color: '#ffd75e',
    blurb: 'Earth ionosphere resonance harmonics',
    presets: [
      { hz: 7.83, name: 'EARTH PULSE', note: 'planetary heartbeat' },
      { hz: 14.3, name: 'HARMONIC 2' },
      { hz: 20.8, name: 'HARMONIC 3' },
      { hz: 27.3, name: 'HARMONIC 4' },
      { hz: 33.8, name: 'HARMONIC 5' },
      { hz: 40, name: 'GAMMA · GNOSIS' },
    ],
  },
  {
    category: 'CHAKRA',
    color: '#8dff9d',
    blurb: '7 primary energy centers',
    presets: [
      { hz: 194.18, name: 'ROOT · MULADHARA', note: 'C · red' },
      { hz: 210.42, name: 'SACRAL · SVADHISTHANA', note: 'D · orange' },
      { hz: 126.22, name: 'SOLAR · MANIPURA', note: 'E · yellow' },
      { hz: 341.3, name: 'HEART · ANAHATA', note: 'F · green' },
      { hz: 141.27, name: 'THROAT · VISHUDDHA', note: 'G · blue' },
      { hz: 221.23, name: 'THIRD EYE · AJNA', note: 'A · indigo' },
      { hz: 172.06, name: 'CROWN · SAHASRARA', note: 'B · violet' },
    ],
  },
  {
    category: 'PLANETARY',
    color: '#5fc9ff',
    blurb: 'Cousto/Kepler orbital tones',
    presets: [
      { hz: 194.18, name: 'EARTH · ORBIT' },
      { hz: 210.42, name: 'MOON · SIDEREAL' },
      { hz: 126.22, name: 'SUN · YEAR' },
      { hz: 144.72, name: 'MARS' },
      { hz: 183.58, name: 'JUPITER' },
      { hz: 221.23, name: 'VENUS' },
      { hz: 141.27, name: 'MERCURY' },
      { hz: 147.85, name: 'SATURN' },
      { hz: 207.36, name: 'URANUS' },
      { hz: 211.44, name: 'NEPTUNE' },
      { hz: 140.25, name: 'PLUTO' },
    ],
  },
  {
    category: 'ANGELIC',
    color: '#ff9a5a',
    blurb: 'Number sequences 111 → 999',
    presets: [
      { hz: 111, name: 'CELL REGENERATION' },
      { hz: 222, name: 'HARMONY' },
      { hz: 333, name: 'ASCENSION' },
      { hz: 444, name: 'ARCHANGELS' },
      { hz: 555, name: 'TRANSFORMATION' },
      { hz: 666, name: 'MATRIX' },
      { hz: 777, name: 'DIVINE ORDER' },
      { hz: 888, name: 'ABUNDANCE' },
      { hz: 999, name: 'COMPLETION' },
    ],
  },
  {
    category: 'BRAINWAVE',
    color: '#ceb0ff',
    blurb: 'Neural entrainment bands',
    presets: [
      { hz: 2.5, name: 'DELTA · DEEP SLEEP' },
      { hz: 6, name: 'THETA · MEDITATE' },
      { hz: 10, name: 'ALPHA · CALM' },
      { hz: 15, name: 'BETA · FOCUS' },
      { hz: 40, name: 'GAMMA · INSIGHT' },
      { hz: 100, name: 'HYPER · GAMMA' },
    ],
  },
  {
    category: 'TESLA · OM',
    color: '#ffffff',
    blurb: '3·6·9 · Vedic · Divine constants',
    presets: [
      { hz: 3, name: 'THREE' },
      { hz: 6, name: 'SIX' },
      { hz: 9, name: 'NINE · KEY' },
      { hz: 369, name: '3·6·9 STACK' },
      { hz: 108, name: 'SANSKRIT · 108' },
      { hz: 136.10, name: 'OM · GAIA' },
      { hz: 432, name: 'COSMIC A · GODMODE' },
      { hz: 1618, name: 'PHI · 1.618' },
    ],
  },
];

interface Props {
  visible: boolean;
  onClose: () => void;
  onPickPreset: (preset: FreqPreset, mode: 'add' | 'replace') => void;
}

const clean = (s: string) => s.toUpperCase();

export default function FrequencyCatalog({ visible, onClose, onPickPreset }: Props) {
  const [query, setQuery] = useState('');
  const [activeCat, setActiveCat] = useState<string>('ALL');
  const [replaceMode, setReplaceMode] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toUpperCase();
    return CATALOG.map(cat => ({
      ...cat,
      presets: cat.presets.filter(p => {
        if (activeCat !== 'ALL' && cat.category !== activeCat) return false;
        if (!q) return true;
        return clean(p.name).includes(q) ||
               clean(p.note || '').includes(q) ||
               clean(cat.category).includes(q) ||
               String(p.hz).includes(q);
      }),
    })).filter(cat => cat.presets.length > 0);
  }, [query, activeCat]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>≡ FREQUENCY CATALOG</Text>
              <Text style={styles.subtitle}>ALL SACRED · COSMIC · CHAKRA · TESLA</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <Text style={styles.closeTxt}>×</Text>
            </TouchableOpacity>
          </View>

          {/* Mode toggle + search */}
          <View style={styles.controlsRow}>
            <TouchableOpacity
              style={[styles.modeChip, replaceMode && styles.modeChipActive]}
              onPress={() => setReplaceMode(v => !v)}
              activeOpacity={0.7}
            >
              <Text style={[styles.modeChipTxt, replaceMode && styles.modeChipTxtActive]}>
                {replaceMode ? '↻ REPLACE L1' : '+ ADD LAYER'}
              </Text>
            </TouchableOpacity>
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="SEARCH · HZ · NAME"
              placeholderTextColor="#4a1a1a"
              style={styles.search}
              autoCapitalize="characters"
            />
          </View>

          {/* Category chips */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catRow}>
            {['ALL', ...CATALOG.map(c => c.category)].map(c => (
              <TouchableOpacity
                key={c}
                style={[styles.catChip, activeCat === c && styles.catChipActive]}
                onPress={() => setActiveCat(c)}
                activeOpacity={0.75}
              >
                <Text style={[styles.catChipTxt, activeCat === c && styles.catChipTxtActive]}>{c}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Preset list */}
          <ScrollView style={styles.list} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
            {filtered.map(cat => (
              <View key={cat.category} style={styles.catBlock}>
                <View style={styles.catHeader}>
                  <View style={[styles.catDot, { backgroundColor: cat.color }]} />
                  <Text style={[styles.catTitle, { color: cat.color }]}>{cat.category}</Text>
                  <Text style={styles.catBlurb} numberOfLines={1}>{cat.blurb}</Text>
                </View>
                <View style={styles.presetGrid}>
                  {cat.presets.map(p => (
                    <TouchableOpacity
                      key={`${cat.category}-${p.hz}-${p.name}`}
                      onPress={() => onPickPreset(p, replaceMode ? 'replace' : 'add')}
                      onLongPress={() => onPickPreset(p, 'replace')}
                      activeOpacity={0.65}
                      style={[styles.presetCard, { borderColor: `${cat.color}55` }]}
                    >
                      <Text style={[styles.presetHz, { color: cat.color }]}>{p.hz} Hz</Text>
                      <Text style={styles.presetName} numberOfLines={1}>{p.name}</Text>
                      {p.note ? <Text style={styles.presetNote} numberOfLines={1}>{p.note}</Text> : null}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ))}
            {filtered.length === 0 && (
              <View style={styles.emptyBlock}>
                <Text style={styles.emptyTxt}>NO MATCHES</Text>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: '#050303',
    borderTopWidth: 1,
    borderColor: '#ff0a0a',
    maxHeight: '92%',
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: Platform.OS === 'ios' ? 30 : 14,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  title: { color: '#ff0a0a', fontSize: 15, fontWeight: '900', letterSpacing: 2 },
  subtitle: { color: '#6a2020', fontSize: 9, letterSpacing: 2, fontWeight: '700', marginTop: 2 },
  closeBtn: {
    width: 34, height: 34, borderRadius: 17,
    borderWidth: 1, borderColor: '#ff0a0a',
    alignItems: 'center', justifyContent: 'center',
  },
  closeTxt: { color: '#ff0a0a', fontSize: 22, fontWeight: '300', lineHeight: 24 },
  controlsRow: { flexDirection: 'row', gap: 8, marginBottom: 8, alignItems: 'center' },
  modeChip: {
    borderWidth: 1, borderColor: '#333',
    paddingHorizontal: 10, paddingVertical: 8,
    borderRadius: 8, backgroundColor: '#0a0a0a',
  },
  modeChipActive: { borderColor: '#ff0a0a', backgroundColor: '#ff0a0a' },
  modeChipTxt: { color: '#c8c8c8', fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
  modeChipTxtActive: { color: '#000' },
  search: {
    flex: 1, borderWidth: 1, borderColor: '#1a0a0a',
    backgroundColor: '#0a0505',
    color: '#ff8080', fontSize: 12,
    paddingHorizontal: 10, paddingVertical: 8,
    borderRadius: 8, letterSpacing: 1,
    fontWeight: '700',
  },
  catRow: { gap: 6, paddingVertical: 6, paddingBottom: 8 },
  catChip: {
    borderWidth: 1, borderColor: '#333',
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 20, backgroundColor: '#0a0a0a',
  },
  catChipActive: { borderColor: '#ff0a0a', backgroundColor: '#1a0505' },
  catChipTxt: { color: '#888', fontSize: 9, fontWeight: '900', letterSpacing: 1.5 },
  catChipTxtActive: { color: '#ff0a0a' },
  list: { flex: 0 },
  catBlock: { marginBottom: 14 },
  catHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  catDot: { width: 8, height: 8, borderRadius: 4 },
  catTitle: { fontSize: 11, fontWeight: '900', letterSpacing: 2 },
  catBlurb: { color: '#4a4a4a', fontSize: 9, letterSpacing: 1, flex: 1 },
  presetGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  presetCard: {
    borderWidth: 1, borderRadius: 8,
    backgroundColor: '#0a0505',
    paddingVertical: 8, paddingHorizontal: 10,
    minWidth: 108, flexGrow: 1, flexBasis: '30%',
  },
  presetHz: { fontSize: 13, fontWeight: '900', letterSpacing: 1 },
  presetName: { color: '#dcdcdc', fontSize: 9, fontWeight: '800', letterSpacing: 1, marginTop: 2 },
  presetNote: { color: '#6a6a6a', fontSize: 8, letterSpacing: 1, marginTop: 1 },
  emptyBlock: { padding: 30, alignItems: 'center' },
  emptyTxt: { color: '#6a2020', fontSize: 12, letterSpacing: 2, fontWeight: '800' },
});
