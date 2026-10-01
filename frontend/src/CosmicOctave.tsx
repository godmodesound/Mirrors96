import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { skinStyles, SK } from './skins';

/** AMORC "Cosmic Vibrations" octave ladder (2^n vibrations/sec) + Man's Response planes + bio-resonance bands. */
const MANIFEST = (o: number) => (o <= 3 ? 'TOUCH' : o <= 14 ? 'SOUND' : o <= 35 ? 'ELECTRICITY / RADIO' : o <= 40 ? 'GAP No. 4' : o <= 47 ? 'HEAT / INFRA-RED' : o <= 50 ? 'VISIBLE LIGHT' : o <= 56 ? 'ULTRA-VIOLET' : o <= 59 ? 'X-RAY' : o <= 62 ? 'GAMMA / COSMIC RAYS' : o <= 72 ? 'PSYCHIC PROJECTIONS' : 'SOUL ESSENCE');
const PLANE = (o: number) => (o <= 3 ? 'SOLIDS' : o <= 14 ? 'SOUND' : o <= 35 ? 'ELECTRICITY' : o <= 47 ? 'HEAT' : o <= 50 ? 'LIGHT · COLOUR' : o <= 59 ? 'X-RAY' : o <= 62 ? 'ETHERIC' : o <= 66 ? 'ASTRAL' : o <= 72 ? 'MENTAL' : o <= 78 ? 'SPIRITUAL' : 'UNKNOWN');
const PLANES = ['SOLIDS', 'SOUND', 'ELECTRICITY', 'HEAT', 'LIGHT · COLOUR', 'X-RAY', 'ETHERIC', 'ASTRAL', 'MENTAL', 'SPIRITUAL', 'UNKNOWN'];
const MILESTONES: Record<number, string> = { 1: 'SECONDS PENDULUM · STARTING POINT', 5: 'SOUND BEGINS TO HUMAN EAR', 15: 'SOUND ENDS · ELECTRICAL WAVES BEGIN', 35: 'ELECTRICAL WAVES END', 45: 'LIGHT WAVES BEGIN FOR HUMAN EYE', 50: 'LIGHT WAVES END FOR HUMAN EYE', 58: 'X-RAYS BEGIN', 62: '4,611,686,018,427,387,904 — INCOMPREHENSIBLE BEYOND' };
const BANDS = [
  { name: 'DELTA', lo: 0.5, hi: 4, color: '#6ab8ff', state: 'DEEP SLEEP · REPAIR' },
  { name: 'THETA', lo: 4, hi: 8, color: '#b39ddb', state: 'MEDITATION · MEMORY' },
  { name: 'ALPHA', lo: 8, hi: 12, color: '#8bd18b', state: 'CALM FOCUS · REGENERATION' },
  { name: 'BETA', lo: 12, hi: 30, color: '#f2c14e', state: 'ACTIVE THINKING' },
  { name: 'GAMMA', lo: 30, hi: 100, color: '#ff8fb1', state: 'COGNITIVE INTEGRATION' },
];
const REGEN_HZ = 12.8;
const colorFor = (o: number) => (o <= 14 ? '#f2d27a' : o <= 35 ? '#5ad7e6' : o <= 47 ? '#ff8a65' : o <= 50 ? '#ffffff' : o <= 56 ? '#b39ddb' : o <= 59 ? '#8ea0ff' : '#e6a3f0');
const big = (o: number) => { const v = Math.pow(2, o); return v >= 1e15 ? v.toExponential(3).replace('e+', ' ×10^') : v.toLocaleString('en-US'); };

export default function CosmicOctave({ freqs, testID = 'cosmic' }: { freqs: number[]; testID?: string }) {
  const [open, setOpen] = useState(false);
  const [pick, setPick] = useState<number | null>(null);
  const info = useMemo(() => {
    const f = freqs.filter(x => x > 0);
    if (!f.length) return null;
    const octs = f.map(x => Math.floor(Math.log2(x)) + 1); // octave 1 = 2 vps
    const base = Math.min(...f);
    const beats = f.flatMap((a, i) => f.slice(i + 1).map(b => Math.abs(b - a))).filter(b => b > 0.3 && b <= 100);
    const bands = BANDS.filter(b => beats.some(x => x >= b.lo && x < b.hi));
    const regenDelta = beats.length ? Math.min(...beats.map(b => Math.abs(b - REGEN_HZ))) : null;
    return { octs, base, beats, bands, regenDelta, plane: PLANE(octs[0]) };
  }, [freqs]);
  const ladder = useMemo(() => Array.from({ length: 63 }, (_, i) => i + 1), []);
  const current = info ? info.octs[0] : 0;
  const shown = pick ?? current;

  return (
    <View testID={testID} style={st.wrap}>
      <View style={st.head}>
        <Text style={st.title}>COSMIC VIBRATIONS · OCTAVE {current || '—'}</Text>
        <TouchableOpacity testID={`${testID}-toggle`} style={st.toggle} onPress={() => setOpen(o => !o)}><Text style={st.toggleText}>{open ? 'HIDE LADDER' : 'OCTAVE LADDER'}</Text></TouchableOpacity>
      </View>
      {info ? (
        <Text style={st.line}>{freqs.map(f => `${Number.isInteger(f) ? f : f.toFixed(1)} Hz → OCT ${Math.floor(Math.log2(f)) + 1}`).join(' · ')} · {MANIFEST(current)} · {info.plane} PLANE</Text>
      ) : <Text style={st.line}>SELECT OR PLAY TONES TO PLACE THEM ON THE 2ⁿ LADDER</Text>}

      {/* Man's response planes */}
      <View style={st.planes}>
        {PLANES.map(p => {
          const on = info?.plane === p;
          return <View key={p} style={[st.plane, on && st.planeOn]}><Text style={[st.planeText, on && st.planeTextOn]} numberOfLines={1}>{p}</Text></View>;
        })}
      </View>
      <Text style={st.caption}>MAN&apos;S RESPONSE TO VIBRATIONS · 16–32,768 SOUND · 1,000 MILLION ELECTRICITY · 500 BILLION LIGHT · 2 TRILLION X-RAY</Text>

      {/* bio-resonance */}
      <View style={st.bands}>
        {BANDS.map(b => {
          const on = info?.bands.some(x => x.name === b.name);
          const color = SK(b.color);
          return (
            <View key={b.name} style={[st.band, { borderColor: on ? color : '#1a1a24' }, on && { backgroundColor: `${color}1a` }]}>
              <Text style={[st.bandName, { color }]}>{b.name}</Text>
              <Text style={st.bandHz}>{b.lo}–{b.hi} Hz</Text>
              {on && <Text style={[st.bandState, { color }]}>{b.state}</Text>}
            </View>
          );
        })}
      </View>
      <Text style={st.caption}>
        BIO-RESONANCE · {info?.beats.length ? `BEAT ${info.beats.map(b => b.toFixed(1)).join(' / ')} Hz` : 'NO BEAT < 100 Hz'} · REGENERATION {REGEN_HZ} Hz {info?.regenDelta != null ? (info.regenDelta < 1.5 ? '● IN OPTIMAL RANGE' : `○ ${info.regenDelta.toFixed(1)} Hz OFF`) : '○'}
      </Text>

      {open && (
        <ScrollView style={st.ladder} nestedScrollEnabled showsVerticalScrollIndicator={false}>
          {ladder.map(o => {
            const on = o === shown;
            const held = info?.octs.includes(o);
            const color = SK(colorFor(o));
            return (
              <TouchableOpacity key={o} testID={`${testID}-oct-${o}`} style={[st.row, (on || held) && { backgroundColor: `${color}14` }]} onPress={() => setPick(p => (p === o ? null : o))}>
                <Text style={[st.rowOct, { color }]}>{String(o).padStart(2, '0')}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[st.rowVps, held && { color }]} numberOfLines={1}>{big(o)} vps</Text>
                  <Text style={st.rowMan} numberOfLines={1}>{MANIFEST(o)}{MILESTONES[o] ? ` — ${MILESTONES[o]}` : ''}</Text>
                </View>
                {held && <Text style={[st.rowTag, { color }]}>●</Text>}
              </TouchableOpacity>
            );
          })}
          <Text style={st.footnote}>THE VIBRATIONS IN THESE OCTAVES INCREASE TO AN INCOMPREHENSIBLE NUMBER PER SECOND. PSYCHIC PROJECTIONS AND SOUL ESSENCE OCCUR IN OCTAVES CONSIDERABLY BEYOND ANY KNOWN MATERIAL MANIFESTATION. — AMORC</Text>
        </ScrollView>
      )}
      {open && pick != null && (
        <Text style={st.pickLine}>OCTAVE {pick} · {big(pick)} VIBRATIONS / SEC · {MANIFEST(pick)} · {PLANE(pick)} PLANE · {pick <= 14 ? 'AUDIBLE TO HUMAN EAR' : pick >= 45 && pick <= 50 ? 'VISIBLE TO HUMAN EYE' : 'BEYOND HUMAN SENSES'}</Text>
      )}
    </View>
  );
}

const st = skinStyles({
  wrap: { marginTop: 10, borderWidth: 1, borderColor: '#2a2a3a', borderRadius: 6, padding: 10, backgroundColor: '#0a0a10' },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  title: { color: '#e8dcc0', fontSize: 10, fontWeight: '900', letterSpacing: 1.5, flex: 1 },
  toggle: { borderWidth: 1, borderColor: '#2a2a3a', minHeight: 32, paddingHorizontal: 10, justifyContent: 'center', borderRadius: 6 },
  toggleText: { color: '#c8c8d8', fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  line: { color: '#9a9aaa', fontSize: 8.5, letterSpacing: 0.8, marginTop: 6, lineHeight: 12 },
  planes: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8, gap: 3 },
  plane: { minWidth: '18%', flexGrow: 1, minHeight: 26, borderWidth: 1, borderColor: '#1a1a24', alignItems: 'center', justifyContent: 'center', borderRadius: 3, paddingHorizontal: 3 },
  planeOn: { borderColor: '#f2d27a', backgroundColor: '#161506' },
  planeText: { color: '#5a5a6a', fontSize: 7, fontWeight: '800', letterSpacing: 0.5 },
  planeTextOn: { color: '#f2d27a' },
  caption: { color: '#5a5a6a', fontSize: 7.5, letterSpacing: 0.8, marginTop: 4, lineHeight: 11 },
  bands: { flexDirection: 'row', gap: 4, marginTop: 8 },
  band: { flex: 1, borderWidth: 1, borderRadius: 5, paddingVertical: 5, alignItems: 'center', minHeight: 44, justifyContent: 'center' },
  bandName: { fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  bandHz: { color: '#7a7a8a', fontSize: 7, marginTop: 2 },
  bandState: { fontSize: 6, fontWeight: '800', marginTop: 2, textAlign: 'center' },
  ladder: { maxHeight: 240, marginTop: 8, borderWidth: 1, borderColor: '#1a1a24', borderRadius: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 40, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: '#14141c' },
  rowOct: { fontSize: 11, fontWeight: '900', width: 22 },
  rowVps: { color: '#c8c8d8', fontSize: 9.5, fontWeight: '700' },
  rowMan: { color: '#6a6a7a', fontSize: 7.5, letterSpacing: 0.6, marginTop: 1 },
  rowTag: { fontSize: 10 },
  footnote: { color: '#5a5a6a', fontSize: 7.5, fontStyle: 'italic', lineHeight: 11, padding: 8 },
  pickLine: { color: '#e8dcc0', fontSize: 8.5, letterSpacing: 0.8, marginTop: 8, lineHeight: 12 },
});
