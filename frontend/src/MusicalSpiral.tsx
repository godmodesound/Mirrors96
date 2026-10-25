import React, { useState, useCallback } from 'react';
import { svgPress } from './svgPress';
import { View, Text, TouchableOpacity, useWindowDimensions } from 'react-native';
import Svg, { Circle, Path, Line, G, Text as SvgText } from 'react-native-svg';
import { AudioEngine } from './AudioEngine';
import ScopeNodePanel from './ScopeNodePanel';
import { skinStyles } from './skins';


// ═══ THE MUSICAL SPIRAL OF FREQUENCY COLOR AND LIGHT — UNIVERSAL TUNING 432 Hz ═══
// Exact values of the Shen Hz "Spirit Light Arc" chart: 12 notes on a
// semicircle, each ray labelled with its Hz and degree, coloured C(pink) → B(red).
export const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;
export const NOTE_COLORS = [
  '#ff3ddc', '#d040ff', '#8a3cff', '#3c5cff', '#40d8ff', '#22e044',
  '#a8ff2e', '#ffee00', '#ffc400', '#ff8a00', '#ff4a1a', '#ff1a1a',
];
// 432 grid — one octave per row (chart bottom-right table)
export const OCTAVE_432 = [252, 270, 288, 306, 324, 342, 360, 378, 405, 432, 459, 486];
const GRID_MULT = [0.5, 1, 2, 4, 8];
// Printed degree of each ray on the arc (0° = horizontal, 90° = zenith).
const RAY_DEG = [0, 13, 26, 39, 52, 64, 77, 90, 71, 52, 33, 13, 0];

interface Ray { note: string; freq: number; deg: number; color: string; angle: number }
const RAYS: Ray[] = Array.from({ length: 13 }, (_, i) => {
  const ni = i % 12;
  const left = i <= 7;
  return {
    note: NOTES[ni],
    freq: i === 12 ? OCTAVE_432[0] * 2 : OCTAVE_432[ni],
    deg: RAY_DEG[i],
    color: NOTE_COLORS[ni],
    // position angle measured from the LEFT horizontal (0 → 180 = right)
    angle: left ? RAY_DEG[i] : 180 - RAY_DEG[i],
  };
});

// 7-chakra table (chart bottom-left)
const CHAKRA_7 = [
  { name: 'CROWN',        sanskrit: 'SAHASRARA',    freqs: [216, 432, 864],   planet: '♄', note: 'A 6th',   color: '#8f00ff' },
  { name: '3RD EYE',      sanskrit: 'AJNA',         freqs: [144, 288, 576],   planet: '♃', note: 'D Oct',   color: '#4b0082' },
  { name: 'THROAT',       sanskrit: 'VISHUDDHA',    freqs: [192, 384, 768],   planet: '♂', note: 'G 2nd',   color: '#1e90ff' },
  { name: 'HEART',        sanskrit: 'ANAHATA',      freqs: [128, 256, 512],   planet: '☉', note: 'C 5th',   color: '#22e044' },
  { name: 'SOLAR PLEXUS', sanskrit: 'MANIPURA',     freqs: [182, 364, 728],   planet: '♀', note: 'F# 7th',  color: '#ffee00' },
  { name: 'SACRAL',       sanskrit: 'SVADHISTHANA', freqs: [303, 606, 1212],  planet: '☿', note: 'Eb 3rd',  color: '#ff8a00' },
  { name: 'ROOT',         sanskrit: 'MULADHARA',    freqs: [228, 456, 912],   planet: '☽', note: 'Bb 4th',  color: '#ff1a1a' },
];

const HEALING_7 = [
  { hz: 963, text: 'knowledge, consciousness, fulfillment, spirituality', color: '#c040ff' },
  { hz: 852, text: 'intuition, lucidity, meditation, trust',              color: '#3c5cff' },
  { hz: 741, text: 'communication, expression, creativity, inspiration',  color: '#40d8ff' },
  { hz: 639, text: 'acceptance, love, compassion, sincerity',             color: '#22e044' },
  { hz: 528, text: 'strength, personality, power, determination',         color: '#ffee00' },
  { hz: 417, text: 'sensuality, sexuality, pleasure, sociality',          color: '#ff8a00' },
  { hz: 396, text: 'energy, stability, comfort, safety',                  color: '#ff1a1a' },
];

const ALCHEMY_7 = [
  { sym: '△', name: 'CALCINATION',  pol: 'FEMININE',  color: '#ff1a1a' },
  { sym: '▽', name: 'DISSOLUTION',  pol: 'FEMININE',  color: '#ff8a00' },
  { sym: '◬', name: 'SEPARATION',   pol: 'FEMININE',  color: '#ffee00' },
  { sym: '⧩', name: 'CONJUNCTION',  pol: 'MASCULINE', color: '#22e044' },
  { sym: '✧', name: 'FERMENTATION', pol: 'MASCULINE', color: '#40d8ff' },
  { sym: '⚚', name: 'DISTILLATION', pol: 'MASCULINE', color: '#3c5cff' },
  { sym: '◈', name: 'COAGULATION',  pol: 'ONENESS',   color: '#c040ff' },
];

// ── SVG geometry ──
const VB_W = 400;
const VB_H = 300;
const HUB_X = 200;
const HUB_Y = 206;
const R_OUT = 178;   // main arc
const R_IN = 66;     // 2nd-octave spiral (lower-right, as the chart)

const pt = (angleDeg: number, r: number, cx = HUB_X, cy = HUB_Y) => {
  const a = (angleDeg * Math.PI) / 180;
  // angle from LEFT horizontal, sweeping over the top
  return { x: cx - Math.cos(a) * r, y: cy - Math.sin(a) * r };
};

export default function MusicalSpiral() {
  const [active, setActive] = useState<number | null>(null);
  const [label, setLabel] = useState<string>('');
  const [activeColor, setActiveColor] = useState<string>('#ff0a0a');

  const toggle = useCallback((freq: number, name: string, color: string) => {
    if (active === freq) {
      AudioEngine.stopMulti();
      setActive(null);
      setLabel('');
      return;
    }
    AudioEngine.playMulti([freq], 0.4);
    setActive(freq);
    setLabel(name);
    setActiveColor(color);
  }, [active]);

  const stop = useCallback(() => {
    AudioEngine.stopMulti();
    setActive(null);
    setLabel('');
  }, []);

  const { width: winW } = useWindowDimensions();
  const svgW = Math.min(winW, 430) - 44;
  const svgH = (svgW / VB_W) * VB_H;

  return (
    <View style={st.wrap}>
      {/* ── TITLE ── */}
      <Text style={st.title}>THE MUSICAL SPIRAL</Text>
      <Text style={st.titleSub}>OF FREQUENCY COLOR AND LIGHT</Text>
      <Text style={st.tuning}>UNIVERSAL TUNING · 432 Hz · TAP A RAY TO SOUND IT</Text>

      {/* ── SPIRAL ARC ── */}
      <Svg width={svgW} height={svgH} viewBox={`0 0 ${VB_W} ${VB_H}`}>
        {/* outer arc */}
        <Path
          d={`M${HUB_X - R_OUT} ${HUB_Y} A${R_OUT} ${R_OUT} 0 0 1 ${HUB_X + R_OUT} ${HUB_Y}`}
          fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth={1}
        />
        {/* rays */}
        {RAYS.map((r, i) => {
          const p = pt(r.angle, R_OUT);
          const on = active === r.freq;
          const mid = pt(r.angle, R_OUT * 0.56);
          const lbl = pt(r.angle, R_OUT + 16);
          // rotate Hz label along the ray (readable left→right)
          const rot = r.angle <= 90 ? -r.angle : 180 - r.angle;
          return (
            <G key={i} {...svgPress(() => toggle(r.freq, `${r.note} · ${r.deg}°`, r.color))}>
              <Line x1={HUB_X} y1={HUB_Y} x2={p.x} y2={p.y}
                stroke={r.color} strokeWidth={on ? 3 : 1.4} opacity={on ? 1 : 0.85} />
              {on && <Line x1={HUB_X} y1={HUB_Y} x2={p.x} y2={p.y} stroke={r.color} strokeWidth={9} opacity={0.25} />}
              <SvgText
                x={mid.x} y={mid.y - 3}
                fontSize={7} fill={r.color} textAnchor="middle" fontWeight="600"
                transform={`rotate(${rot} ${mid.x} ${mid.y})`}
              >
                {`${r.freq} Hz / ${r.deg}° Degrees`}
              </SvgText>
              <Circle cx={p.x} cy={p.y} r={on ? 4 : 2.4} fill={r.color} />
              <SvgText
                x={lbl.x} y={lbl.y + 7}
                fontSize={on ? 24 : 20} fill={r.color} textAnchor="middle" fontWeight="900"
              >
                {r.note}
              </SvgText>
              {/* wide tap target on the letter */}
              <Circle cx={lbl.x} cy={lbl.y} r={16} fill="transparent" />
            </G>
          );
        })}

        {/* 2nd-octave spiral — lower-right, rays from the same hub (chart inset) */}
        {RAYS.map((r, i) => {
          const f2 = r.freq * 2;
          const on = active === f2;
          // mirror down & right: angle measured from RIGHT horizontal sweeping downward
          const a = (r.angle * Math.PI) / 180;
          const p = { x: HUB_X + Math.cos(a) * R_IN, y: HUB_Y + Math.sin(a) * R_IN };
          const l = { x: HUB_X + Math.cos(a) * (R_IN + 9), y: HUB_Y + Math.sin(a) * (R_IN + 9) };
          return (
            <G key={`o2-${i}`} {...svgPress(() => toggle(f2, `${r.note} · 2ND OCTAVE`, r.color))}>
              <Line x1={HUB_X} y1={HUB_Y} x2={p.x} y2={p.y} stroke={r.color} strokeWidth={on ? 2.2 : 0.9} opacity={on ? 1 : 0.8} />
              <SvgText x={l.x} y={l.y + 2.5} fontSize={on ? 9 : 7} fill={r.color} textAnchor="middle" fontWeight="800">
                {r.note}
              </SvgText>
              <Circle cx={l.x} cy={l.y} r={8} fill="transparent" />
            </G>
          );
        })}
        <Path
          d={`M${HUB_X + R_IN} ${HUB_Y} A${R_IN} ${R_IN} 0 0 1 ${HUB_X - R_IN} ${HUB_Y}`}
          fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth={0.7}
        />
        {/* 3rd-octave hint (spiral continues inward) */}
        <Circle cx={HUB_X} cy={HUB_Y} r={22} fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth={0.6} />
        <SvgText x={HUB_X} y={HUB_Y + 40} fontSize={5.5} fill="rgba(255,255,255,0.5)" textAnchor="middle">
          {'1008 → 1944 Hz · 2016 → 3888 Hz ∞'}
        </SvgText>
        <Circle cx={HUB_X} cy={HUB_Y} r={3} fill="#ffffff" />
        <SvgText x={HUB_X} y={HUB_Y + 18} fontSize={6.5} fill="rgba(255,255,255,0.6)" textAnchor="middle">
          {`${OCTAVE_432[0] * 2} Hz / 0° Degrees`}
        </SvgText>
      </Svg>

      {/* ── READOUT ── */}
      {active ? (
        <View style={[st.readout, { borderColor: activeColor }]}>
          <Text style={[st.readoutName, { color: activeColor }]}>{label}</Text>
          <Text style={[st.readoutFreq, { color: activeColor }]}>{active} Hz</Text>
          <TouchableOpacity onPress={stop} style={[st.stopBtn, { borderColor: activeColor }]} testID="spiral-stop">
            <Text style={[st.stopTxt, { color: activeColor }]}>■</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={st.hintBox}>
          <Text style={st.hint}>TAP ANY NOTE · CHAKRA · HEALING Hz · GRID CELL TO SOUND IT</Text>
        </View>
      )}

      {/* ── SCOPE — cymatic view of whatever is sounding ── */}
      <View style={st.scope}>
        <ScopeNodePanel frequencies={[active || 432]} playing={!!active} />
      </View>

      {/* ── 7 CHAKRA TABLE ── */}
      <View style={st.tableHead}>
        <Text style={[st.th, { flex: 1.25 }]}>CHAKRA{'\n'}<Text style={st.thSub}>SANSKRIT NAME</Text></Text>
        <Text style={[st.th, { flex: 1.9 }]}>FREQUENCIES{'\n'}<Text style={st.thSub}>IN HERTZ</Text></Text>
        <Text style={[st.th, { flex: 0.8 }]}>ZODIAC{'\n'}<Text style={st.thSub}>MUSICAL NOTE</Text></Text>
      </View>
      {CHAKRA_7.map(c => (
        <View key={c.name} style={[st.tr, { borderColor: c.color }]}>
          <View style={{ flex: 1.25 }}>
            <Text style={[st.tdName, { color: c.color }]}>{c.name}</Text>
            <Text style={st.tdSanskrit}>{c.sanskrit}</Text>
          </View>
          <View style={[st.freqRow, { flex: 1.9 }]}>
            {c.freqs.map(f => {
              const on = active === f;
              return (
                <TouchableOpacity
                  key={f}
                  testID={`chakra7-${c.name}-${f}`}
                  onPress={() => toggle(f, `${c.name} · ${c.sanskrit}`, c.color)}
                  style={[st.freqChip, { borderColor: c.color }, on && { backgroundColor: c.color }]}
                >
                  <Text style={[st.freqChipTxt, { color: on ? '#000' : c.color }]}>{f}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <View style={{ flex: 0.8, alignItems: 'center' }}>
            <Text style={[st.planet, { color: c.color }]}>{c.planet}</Text>
            <Text style={[st.noteTxt, { color: c.color }]}>{c.note}</Text>
          </View>
        </View>
      ))}

      {/* ── 7 HEALING FREQUENCIES ── */}
      <Text style={st.section}>
        <Text style={{ color: '#40d8ff' }}>7 HEALING</Text> FREQUENCIES
      </Text>
      {HEALING_7.map(h => {
        const on = active === h.hz;
        return (
          <TouchableOpacity
            key={h.hz}
            testID={`heal-${h.hz}`}
            onPress={() => toggle(h.hz, 'HEALING FREQUENCY', h.color)}
            style={st.healRow}
            activeOpacity={0.75}
          >
            <View style={[st.playBtn, { borderColor: h.color }, on && { backgroundColor: h.color }]}>
              <Text style={[st.playTxt, { color: on ? '#000' : h.color }]}>{on ? '❙❙' : '▷'}</Text>
            </View>
            <Text style={[st.healHz, { color: h.color }]}>{h.hz} <Text style={st.healUnit}>Hz</Text></Text>
            <Text style={st.healText} numberOfLines={2}>{h.text}</Text>
          </TouchableOpacity>
        );
      })}

      {/* ── 432 FREQUENCY GRID ── */}
      <Text style={st.section}>432 FREQUENCY GRID</Text>
      <View style={st.grid}>
        {GRID_MULT.map(m => (
          <View key={m} style={st.gridRow}>
            {OCTAVE_432.map((f, ni) => {
              const v = f * m;
              const on = active === v;
              return (
                <TouchableOpacity
                  key={ni}
                  testID={`grid-${v}`}
                  onPress={() => toggle(v, `${NOTES[ni]} · OCTAVE ×${m}`, NOTE_COLORS[ni])}
                  style={[st.cell, on && { backgroundColor: NOTE_COLORS[ni] }]}
                >
                  <Text style={[st.cellTxt, { color: on ? '#000' : NOTE_COLORS[ni] }]}>
                    {Number.isInteger(v) ? v : v.toFixed(2)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
        <View style={st.gridRow}>
          {NOTES.map((n, ni) => (
            <View key={n} style={st.cell}>
              <Text style={[st.cellNote, { color: NOTE_COLORS[ni] }]}>{n}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* ── 7 ALCHEMICAL STAGES ── */}
      <View style={st.alchemyRow}>
        {ALCHEMY_7.map(a => (
          <View key={a.name} style={st.alchemy}>
            <Text style={[st.alchemySym, { color: a.color }]}>{a.sym}</Text>
            <Text style={[st.alchemyName, { color: a.color }]}>{a.name}</Text>
            <Text style={st.alchemyPol}>{a.pol}</Text>
          </View>
        ))}
      </View>
      <Text style={st.credit}>IMAGE REF: SHEN HZ · SPIRIT LIGHT ARC · 369 GRATITUDE</Text>
    </View>
  );
}

const st = skinStyles({
  wrap: { borderWidth: 1, borderColor: '#2a0a0a', backgroundColor: '#050202', marginBottom: 16, padding: 10 },
  title: { color: '#ff0a0a', fontSize: 15, fontFamily: 'TerminatorRealNFI', letterSpacing: 2, textAlign: 'center' },
  titleSub: { color: '#ffffff', fontSize: 9, fontFamily: 'TerminatorRealNFI', letterSpacing: 2, textAlign: 'center', marginTop: 3 },
  tuning: { color: '#5a1a1a', fontSize: 7, fontFamily: 'TerminatorRealNFI', letterSpacing: 1, textAlign: 'center', marginTop: 4, marginBottom: 6 },

  readout: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, backgroundColor: '#0a0505', padding: 8, gap: 8 },
  readoutName: { flex: 1, fontSize: 10, fontFamily: 'TerminatorRealNFI', letterSpacing: 1 },
  readoutFreq: { fontSize: 14, fontFamily: 'TerminatorRealNFI' },
  stopBtn: { width: 40, height: 32, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  stopTxt: { fontSize: 12 },
  hintBox: { borderWidth: 1, borderColor: '#2a0a0a', backgroundColor: '#0a0505', paddingVertical: 10 },
  hint: { color: '#5a1a1a', fontSize: 7.5, fontFamily: 'TerminatorRealNFI', letterSpacing: 1, textAlign: 'center' },

  scope: { marginTop: 10 },

  tableHead: { flexDirection: 'row', marginTop: 14, paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: '#2a0a0a' },
  th: { color: '#ffffff', fontSize: 8, fontFamily: 'TerminatorRealNFI', letterSpacing: 1, textAlign: 'center' },
  thSub: { color: '#5a1a1a', fontSize: 6 },
  tr: { flexDirection: 'row', alignItems: 'center', borderLeftWidth: 3, backgroundColor: '#0a0505', marginTop: 4, paddingVertical: 6, paddingHorizontal: 6, minHeight: 44 },
  tdName: { fontSize: 9, fontFamily: 'TerminatorRealNFI', letterSpacing: 1 },
  tdSanskrit: { color: '#7a7a7a', fontSize: 6, fontFamily: 'TerminatorRealNFI', letterSpacing: 1, marginTop: 2 },
  freqRow: { flexDirection: 'row', justifyContent: 'center', gap: 4 },
  freqChip: { borderWidth: 1, paddingHorizontal: 4, paddingVertical: 5, minWidth: 34, alignItems: 'center' },
  freqChipTxt: { fontSize: 8, fontFamily: 'TerminatorRealNFI' },
  planet: { fontSize: 14 },
  noteTxt: { fontSize: 7, fontFamily: 'TerminatorRealNFI', marginTop: 1 },

  section: { color: '#ffffff', fontSize: 12, fontFamily: 'TerminatorRealNFI', letterSpacing: 2, marginTop: 16, marginBottom: 6 },
  healRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 5, minHeight: 44 },
  playBtn: { width: 30, height: 30, borderRadius: 15, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  playTxt: { fontSize: 11 },
  healHz: { width: 78, fontSize: 15, fontFamily: 'TerminatorRealNFI' },
  healUnit: { fontSize: 8 },
  healText: { flex: 1, color: '#c8c8c8', fontSize: 8, fontFamily: 'TerminatorRealNFI', lineHeight: 11 },

  grid: { borderWidth: 1, borderColor: '#2a0a0a', padding: 3 },
  gridRow: { flexDirection: 'row' },
  cell: { flex: 1, minHeight: 22, alignItems: 'center', justifyContent: 'center', margin: 0.5, backgroundColor: '#0a0505' },
  cellTxt: { fontSize: 5.6, fontFamily: 'TerminatorRealNFI' },
  cellNote: { fontSize: 8, fontFamily: 'TerminatorRealNFI', fontWeight: '800' },

  alchemyRow: { flexDirection: 'row', marginTop: 12, borderTopWidth: 1, borderTopColor: '#2a0a0a', paddingTop: 8 },
  alchemy: { flex: 1, alignItems: 'center' },
  alchemySym: { fontSize: 16 },
  alchemyName: { fontSize: 3.6, fontFamily: 'TerminatorRealNFI', marginTop: 3, textAlign: 'center' },
  alchemyPol: { color: '#5a1a1a', fontSize: 3.6, fontFamily: 'TerminatorRealNFI', marginTop: 1, textAlign: 'center' },
  credit: { color: '#3a1414', fontSize: 6, fontFamily: 'TerminatorRealNFI', letterSpacing: 1, textAlign: 'center', marginTop: 10 },
});
