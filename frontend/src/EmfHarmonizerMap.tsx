import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AudioEngine } from './AudioEngine';
import { skinStyles, SK } from './skins';

/** EMF HARMONIZER MAP — every-day EMF source → audible harmonic match (octave reduction). */
type Band = 'RF' | 'MID';
type Source = { id: string; hz: number; label: string; kind: string; icon: React.ComponentProps<typeof Ionicons>['name']; color: string; desc: string };

const SOURCES: Source[] = [
  { id: 'p50', hz: 50, label: '50 Hz', kind: 'POWER', icon: 'flash-outline', color: '#ffd76a', desc: 'Home and grid electricity in many countries' },
  { id: 'p60', hz: 60, label: '60 Hz', kind: 'POWER', icon: 'flash-outline', color: '#ffd76a', desc: 'Standard AC power in North America' },
  { id: 'e100k', hz: 100_000, label: '100 kHz', kind: 'ELECTRONICS', icon: 'hardware-chip-outline', color: '#ff9a5a', desc: 'Switching electronics and lower RF sources' },
  { id: 'c900', hz: 900e6, label: '900 MHz', kind: 'CELLULAR', icon: 'cellular-outline', color: '#5af0d2', desc: 'Common mobile network band' },
  { id: 'c1800', hz: 1.8e9, label: '1.8 GHz', kind: 'CELLULAR', icon: 'cellular-outline', color: '#5af0d2', desc: 'Higher mobile network band' },
  { id: 'w24', hz: 2.4e9, label: '2.4 GHz', kind: 'WI-FI', icon: 'wifi-outline', color: '#6ab8ff', desc: 'Wi-Fi, Bluetooth, and smart devices' },
  { id: 'w5', hz: 5e9, label: '5 GHz', kind: 'WI-FI', icon: 'wifi-outline', color: '#6ab8ff', desc: 'Faster Wi-Fi connections' },
  { id: 'w6', hz: 6e9, label: '6 GHz', kind: 'WI-FI', icon: 'wifi-outline', color: '#6ab8ff', desc: 'Newer Wi-Fi 6E and 7 devices' },
];

const BAND_RANGE: Record<Band, [number, number]> = { RF: [10_000, 20_000], MID: [216, 432] };
const TONE_ID = 700;
const ANCHOR_ID = 701;

/** Octave-reduce (÷2ⁿ or ×2ⁿ) into the band; sources already ≤ 20 kHz stay untouched in RF band. */
export function harmonicMatch(hz: number, band: Band): { hz: number; octaves: number } {
  if (!(hz > 0)) return { hz: 0, octaves: 0 };
  const [lo, hi] = BAND_RANGE[band];
  if (band === 'RF' && hz <= hi) return { hz, octaves: 0 };
  let f = hz, n = 0;
  while (f >= hi) { f /= 2; n++; }
  while (f < lo) { f *= 2; n--; }
  return { hz: f, octaves: n };
}

const fmtHz = (f: number) => (f >= 1e9 ? `${+(f / 1e9).toFixed(2)} GHz` : f >= 1e6 ? `${+(f / 1e6).toFixed(2)} MHz` : f >= 1000 ? `${+(f / 1000).toFixed(1)} kHz` : `${+f.toFixed(2)} Hz`);

export default function EmfHarmonizerMap({ testID = 'emf-map' }: { testID?: string }) {
  const [band, setBand] = useState<Band>('RF');
  const [anchor, setAnchor] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [custom, setCustom] = useState('');
  const [unit, setUnit] = useState<'Hz' | 'kHz' | 'MHz' | 'GHz'>('MHz');
  const activeRef = useRef<string | null>(null);

  const customHz = useMemo(() => {
    const v = parseFloat(custom.replace(',', '.'));
    if (!(v > 0)) return 0;
    return v * ({ Hz: 1, kHz: 1e3, MHz: 1e6, GHz: 1e9 } as const)[unit];
  }, [custom, unit]);

  const stop = () => {
    AudioEngine.stopTone(TONE_ID);
    AudioEngine.stopTone(ANCHOR_ID);
    activeRef.current = null;
    setActiveId(null);
  };
  const play = (id: string, hz: number) => {
    if (activeRef.current === id) { stop(); return; }
    const m = harmonicMatch(hz, band);
    if (!(m.hz > 0)) return;
    AudioEngine.startTone(TONE_ID, m.hz, band === 'RF' ? 0.12 : 0.22, 'sine');
    if (anchor) AudioEngine.startTone(ANCHOR_ID, 432, 0.14, 'sine'); else AudioEngine.stopTone(ANCHOR_ID);
    activeRef.current = id;
    setActiveId(id);
  };

  // Band / anchor changes retune the sounding match live
  useEffect(() => {
    if (!activeRef.current) return;
    const src = activeRef.current === 'custom' ? { hz: customHz } : SOURCES.find(s => s.id === activeRef.current);
    if (!src || !(src.hz > 0)) return;
    AudioEngine.updateFreq(TONE_ID, harmonicMatch(src.hz, band).hz);
    if (anchor) AudioEngine.startTone(ANCHOR_ID, 432, 0.14, 'sine'); else AudioEngine.stopTone(ANCHOR_ID);
  }, [band, anchor, customHz]);
  useEffect(() => () => { AudioEngine.stopTone(TONE_ID); AudioEngine.stopTone(ANCHOR_ID); }, []);

  const customMatch = harmonicMatch(customHz, band);

  return (
    <View testID={testID} style={st.wrap}>
      <View style={st.head}>
        <View style={{ flex: 1 }}>
          <Text style={st.title}>EMF HARMONIZER MAP</Text>
          <Text style={st.sub}>TAP A SOURCE → HEAR ITS HARMONIC MATCH · {anchor ? '432 Hz ANCHOR ON' : 'ANCHOR OFF'}</Text>
        </View>
        {activeId && (
          <TouchableOpacity testID={`${testID}-stop`} style={st.stopBtn} onPress={stop}><Text style={st.stopText}>■ STOP</Text></TouchableOpacity>
        )}
      </View>

      <View style={st.toggleRow}>
        {(['RF', 'MID'] as Band[]).map(b => (
          <TouchableOpacity key={b} testID={`${testID}-band-${b}`} style={[st.toggle, band === b && st.toggleOn]} onPress={() => setBand(b)}>
            <Text style={[st.toggleText, band === b && st.toggleTextOn]}>{b === 'RF' ? 'RF BAND 10–20 kHz' : 'MID BAND 216–432 Hz'}</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity testID={`${testID}-anchor`} style={[st.toggle, anchor && st.toggleOn]} onPress={() => setAnchor(a => !a)}>
          <Text style={[st.toggleText, anchor && st.toggleTextOn]}>+432</Text>
        </TouchableOpacity>
      </View>

      <View style={st.grid}>
        {SOURCES.map(s => {
          const m = harmonicMatch(s.hz, band);
          const on = activeId === s.id;
          const color = SK(s.color);
          return (
            <TouchableOpacity key={s.id} testID={`${testID}-src-${s.id}`} style={[st.card, { borderColor: on ? color : `${color}55` }, on && { backgroundColor: `${color}14` }]} onPress={() => play(s.id, s.hz)} activeOpacity={0.85}>
              <View style={[st.iconRing, { borderColor: color }]}><Ionicons name={s.icon} size={20} color={color} /></View>
              <Text style={[st.cardHz, { color }]}>{s.label}</Text>
              <Text style={st.cardKind}>{s.kind}</Text>
              <View style={[st.pill, { borderColor: `${color}88` }]}><Text style={st.pillText} numberOfLines={1}>{on ? '▶ ' : ''}MATCH: {fmtHz(m.hz)}</Text></View>
              <Text style={st.cardOct}>{m.octaves ? `÷ 2^${m.octaves} · ${m.octaves} OCTAVES` : 'DIRECT · 0 OCTAVES'}</Text>
              <Text style={st.cardDesc}>{s.desc}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={st.custom}>
        <Text style={st.customLabel}>CUSTOM SOURCE → HARMONIC MATCH</Text>
        <TextInput testID={`${testID}-custom-input`} style={st.input} value={custom} onChangeText={setCustom} keyboardType="decimal-pad" placeholder="e.g. 3.5" placeholderTextColor={SK('#5a1a1a')} />
        <View style={st.units}>
          {(['Hz', 'kHz', 'MHz', 'GHz'] as const).map(u => (
            <TouchableOpacity key={u} testID={`${testID}-unit-${u}`} style={[st.unit, unit === u && st.unitOn]} onPress={() => setUnit(u)}><Text style={[st.unitText, unit === u && st.unitTextOn]}>{u}</Text></TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity testID={`${testID}-custom-play`} disabled={!(customHz > 0)} style={[st.customPlay, !(customHz > 0) && st.customPlayOff, activeId === 'custom' && st.customPlayOn]} onPress={() => play('custom', customHz)}>
          <Text style={st.customPlayText}>
            {customHz > 0 ? `${activeId === 'custom' ? '■ STOP' : '▶ PLAY'} MATCH ${fmtHz(customMatch.hz)}${customMatch.octaves ? ` (÷2^${customMatch.octaves})` : ''}` : 'ENTER A FREQUENCY'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const st = skinStyles({
  wrap: { borderWidth: 1, borderColor: '#3a2a10', backgroundColor: '#060402', borderRadius: 8, padding: 12 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { color: '#ffd76a', fontSize: 15, fontWeight: '900', letterSpacing: 2 },
  sub: { color: '#8a7a4a', fontSize: 8, letterSpacing: 1.2, marginTop: 3 },
  stopBtn: { borderWidth: 1, borderColor: '#ffd76a', paddingHorizontal: 12, minHeight: 36, justifyContent: 'center', borderRadius: 6 },
  stopText: { color: '#ffd76a', fontSize: 9, fontWeight: '900', letterSpacing: 1.5 },
  toggleRow: { flexDirection: 'row', gap: 6, marginTop: 12 },
  toggle: { flex: 1, borderWidth: 1, borderColor: '#3a2a10', minHeight: 36, justifyContent: 'center', alignItems: 'center', borderRadius: 6, paddingHorizontal: 6 },
  toggleOn: { borderColor: '#ffd76a', backgroundColor: '#1a1305' },
  toggleText: { color: '#8a7a4a', fontSize: 8, fontWeight: '800', letterSpacing: 1, textAlign: 'center' },
  toggleTextOn: { color: '#ffd76a' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  card: { width: '48%', flexGrow: 1, borderWidth: 1.5, borderRadius: 12, padding: 10, alignItems: 'center', backgroundColor: '#0a0806', minHeight: 44 },
  iconRing: { width: 44, height: 44, borderRadius: 22, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  cardHz: { fontSize: 20, fontWeight: '900', letterSpacing: 1 },
  cardKind: { color: '#ddd', fontSize: 10, fontWeight: '700', letterSpacing: 1.5, marginBottom: 6 },
  pill: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 4, backgroundColor: '#000', maxWidth: '100%' },
  pillText: { color: '#fff', fontSize: 9, fontWeight: '800', letterSpacing: 0.8 },
  cardOct: { color: '#6a5a3a', fontSize: 7.5, letterSpacing: 1, marginTop: 5 },
  cardDesc: { color: '#a89a7a', fontSize: 9, textAlign: 'center', marginTop: 5, lineHeight: 12 },
  custom: { marginTop: 12, borderTopWidth: 1, borderTopColor: '#3a2a10', paddingTop: 10 },
  customLabel: { color: '#8a7a4a', fontSize: 8, letterSpacing: 1.5, fontWeight: '800', marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#3a2a10', color: '#ffd76a', fontSize: 14, fontWeight: '800', paddingHorizontal: 10, minHeight: 44, borderRadius: 6, backgroundColor: '#000' },
  units: { flexDirection: 'row', gap: 6, marginTop: 8 },
  unit: { flex: 1, borderWidth: 1, borderColor: '#3a2a10', minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 6 },
  unitOn: { borderColor: '#ffd76a', backgroundColor: '#1a1305' },
  unitText: { color: '#8a7a4a', fontSize: 9, fontWeight: '800' },
  unitTextOn: { color: '#ffd76a' },
  customPlay: { marginTop: 8, borderWidth: 1, borderColor: '#ffd76a', minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 6 },
  customPlayOff: { borderColor: '#3a2a10' },
  customPlayOn: { backgroundColor: '#1a1305' },
  customPlayText: { color: '#ffd76a', fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
});
