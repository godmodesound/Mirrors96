import React, { useState, useCallback } from 'react';
import { svgPress } from './svgPress';
import { View, Text, TouchableOpacity, useWindowDimensions } from 'react-native';
import Svg, { Circle, Path, Line, G, Text as SvgText } from 'react-native-svg';
import { AudioEngine } from './AudioEngine';
import { skinStyles, SK } from './skins';


// ═══ 13-KEY CHROMATIC SCALE ⟷ 13 CHAKRA BODY MAP — UNIVERSAL TUNING 432 Hz ═══
// Frequencies = THE MUSICAL SPIRAL (C 252 → C 504). Colours follow the
// chakra light-spectrum of the chart: RED = ROOT → ORANGE → YELLOW →
// GREEN (HEART) → BLUE → INDIGO → VIOLET, extended over 13 centres.
export interface ChakraNode {
  key: number;
  note: string;
  freq: number;
  name: string;
  colorName: string;
  colors: string[];
  cx: number;   // svg coords (viewBox 120 x 250)
  cy: number;
  black: boolean;
}

export const CHAKRA_13: ChakraNode[] = [
  { key: 13, note: 'C',  freq: 504, name: 'GALACTIC FEMALE', colorName: 'WHITE LIGHT',
    colors: ['#FFFFFF', '#FF3DDC'], cx: 44, cy: 7, black: false },
  { key: 12, note: 'B',  freq: 486, name: 'GALACTIC MALE',   colorName: 'MAGENTA',
    colors: ['#FF3DDC'], cx: 76, cy: 7, black: false },
  { key: 11, note: 'A#', freq: 459, name: 'CROWN',           colorName: 'VIOLET',
    colors: ['#C040FF'], cx: 60, cy: 20, black: true },
  { key: 10, note: 'A',  freq: 432, name: 'PINEAL',          colorName: 'PURPLE',
    colors: ['#8F00FF'], cx: 60, cy: 32, black: false },
  { key: 9,  note: 'G#', freq: 405, name: 'PITUITARY',       colorName: 'INDIGO',
    colors: ['#6A3AFF'], cx: 60, cy: 44, black: true },
  { key: 8,  note: 'G',  freq: 378, name: 'WELL OF DREAMS',  colorName: 'COBALT BLUE',
    colors: ['#2F6BFF'], cx: 60, cy: 57, black: false },
  { key: 7,  note: 'F#', freq: 360, name: 'THROAT',          colorName: 'BLUE',
    colors: ['#1E90FF'], cx: 60, cy: 68, black: true },
  { key: 6,  note: 'F',  freq: 342, name: 'THYMUS',          colorName: 'TURQUOISE',
    colors: ['#40E0D0'], cx: 60, cy: 84, black: false },
  { key: 5,  note: 'E',  freq: 324, name: 'HEART',           colorName: 'GREEN',
    colors: ['#22E044'], cx: 60, cy: 100, black: false },
  { key: 4,  note: 'D#', freq: 306, name: 'DIAPHRAGM',       colorName: 'YELLOW-GREEN',
    colors: ['#A8FF2E'], cx: 60, cy: 118, black: true },
  { key: 3,  note: 'D',  freq: 288, name: 'SOLAR PLEXUS',    colorName: 'YELLOW',
    colors: ['#FFEE00'], cx: 60, cy: 136, black: false },
  { key: 2,  note: 'C#', freq: 270, name: 'SACRAL',          colorName: 'ORANGE',
    colors: ['#FF8A00'], cx: 60, cy: 155, black: true },
  { key: 1,  note: 'C',  freq: 252, name: 'ROOT',            colorName: 'RED',
    colors: ['#FF1A1A'], cx: 60, cy: 172, black: false },
];

const BODY_W = 120;
const BODY_H = 250;

/** Pie-segment path so multi-colour centres show every one of their colours. */
function segPath(cx: number, cy: number, r: number, i: number, n: number) {
  const a0 = (-90 + (i * 360) / n) * (Math.PI / 180);
  const a1 = (-90 + ((i + 1) * 360) / n) * (Math.PI / 180);
  const x0 = cx + Math.cos(a0) * r, y0 = cy + Math.sin(a0) * r;
  const x1 = cx + Math.cos(a1) * r, y1 = cy + Math.sin(a1) * r;
  const large = 360 / n > 180 ? 1 : 0;
  return `M${cx} ${cy} L${x0} ${y0} A${r} ${r} 0 ${large} 1 ${x1} ${y1} Z`;
}

/** Interactive 13-key ⟷ 13-chakra body diagram. Tap a key or a node to sound it. */
export default function ChakraBodyMap() {
  const [active, setActive] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);

  const sound = useCallback((node: ChakraNode) => {
    if (active === node.key && playing) {
      AudioEngine.stopMulti();
      setPlaying(false);
      setActive(null);
      return;
    }
    AudioEngine.playMulti([node.freq], 0.4);
    setActive(node.key);
    setPlaying(true);
  }, [active, playing]);

  const stopAll = useCallback(() => {
    AudioEngine.stopMulti();
    setPlaying(false);
    setActive(null);
  }, []);

  const sel = CHAKRA_13.find(c => c.key === active) || null;
  const { width: SCREEN_W } = useWindowDimensions();
  const svgW = Math.min(SCREEN_W >= 700 ? 260 : 180, SCREEN_W - 206);
  const svgH = (svgW / BODY_W) * BODY_H;

  return (
    <View style={st.wrap}>
      <View style={st.header}>
        <Text style={st.title}>◈ 13 CHAKRA BODY MAP</Text>
        <Text style={st.subtitle}>13-KEY CHROMATIC SCALE · UNIVERSAL TUNING 432 Hz · TAP A KEY OR A NODE</Text>
      </View>

      <View style={st.stage}>
        {/* ── LEFT: 13-key piano column (13 top → 1 bottom, as the chart) ── */}
        <View style={st.keyboard}>
          {CHAKRA_13.map(n => {
            const on = active === n.key;
            return (
              <TouchableOpacity
                key={n.key}
                testID={`chakra-key-${n.key}`}
                activeOpacity={0.8}
                onPress={() => sound(n)}
                style={[
                  st.key,
                  n.black ? st.keyBlack : st.keyWhite,
                  { borderColor: n.colors[0] },
                  on && { backgroundColor: n.colors[0], borderColor: '#ffffff' },
                ]}
              >
                <Text style={[st.keyTxt, { color: on ? '#000000' : n.colors[0] }]}>
                  {n.key}.{n.note}
                </Text>
                <Text numberOfLines={1} style={[st.keyHz, { color: on ? '#000000' : n.colors[0] }]}>
                  {n.freq} Hz
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── RIGHT: body + nodes ── */}
        <View style={st.bodyWrap}>
          <Svg width={svgW} height={svgH} viewBox={`0 0 ${BODY_W} ${BODY_H}`}>
            {/* silhouette */}
            <G opacity={0.5}>
              <Circle cx={60} cy={32} r={20} fill="none" stroke={SK('#ff6a6a')} strokeWidth={1.2} />
              <Path d="M55 52 L55 59 M65 52 L65 59" stroke={SK('#ff6a6a')} strokeWidth={1.1} fill="none" />
              <Path
                d="M60 59 C48 59 42 63 39 69 L34 101 L31 141 L36 186 L43 219 L47 246 M60 59 C72 59 78 63 81 69 L86 101 L89 141 L84 186 L77 219 L73 246"
                fill="none"
                stroke={SK('#ff6a6a')}
                strokeWidth={1.2}
              />
              <Path d="M39 69 L20 119 L16 157 M81 69 L100 119 L104 157" fill="none" stroke={SK('#ff6a6a')} strokeWidth={1.1} />
              <Path d="M36 170 L84 170" stroke={SK('#ff6a6a')} strokeWidth={0.8} fill="none" />
              <Line x1={60} y1={59} x2={60} y2={182} stroke={SK('#ff6a6a')} strokeWidth={0.6} strokeDasharray="3,3" />
            </G>

            {/* connector leaders from the keyboard edge to each node */}
            {CHAKRA_13.map(n => (
              <Line
                key={`l${n.key}`}
                x1={0}
                y1={n.cy}
                x2={n.cx - 8}
                y2={n.cy}
                stroke={active === n.key ? n.colors[0] : SK('#3a1414')}
                strokeWidth={active === n.key ? 1.4 : 0.8}
              />
            ))}

            {/* nodes — one pie segment per exact chakra colour */}
            {CHAKRA_13.map(n => {
              const on = active === n.key;
              const r = on ? 7.2 : 5.8;
              return (
                <G key={n.key} {...svgPress(() => sound(n))}>
                  <Circle cx={n.cx} cy={n.cy} r={12} fill="transparent" />
                  {on && <Circle cx={n.cx} cy={n.cy} r={10.5} fill={n.colors[0]} opacity={0.3} />}
                  {n.colors.length === 1 ? (
                    <Circle cx={n.cx} cy={n.cy} r={r} fill={n.colors[0]} />
                  ) : (
                    n.colors.map((c, i) => (
                      <Path key={i} d={segPath(n.cx, n.cy, r, i, n.colors.length)} fill={c} />
                    ))
                  )}
                  <Circle
                    cx={n.cx}
                    cy={n.cy}
                    r={r}
                    fill="none"
                    stroke={on ? '#ffffff' : 'rgba(255,255,255,0.55)'}
                    strokeWidth={on ? 1.4 : 0.8}
                  />
                  <SvgText x={n.cx} y={n.cy + 2.4} fontSize={5.6} fill="#000000" textAnchor="middle" fontWeight="700">
                    {n.key}
                  </SvgText>
                </G>
              );
            })}
          </Svg>
        </View>
      </View>

      {/* ── READOUT ── */}
      {sel ? (
        <View style={[st.readout, { borderColor: sel.colors[0] }]}>
          <View style={st.swatchRow}>
            {sel.colors.map((c, i) => (
              <View key={i} style={[st.swatch, { backgroundColor: c }]} />
            ))}
          </View>
          <View style={st.readoutMeta}>
            <Text style={[st.readoutName, { color: sel.colors[0] }]}>
              {sel.key}.{sel.note} · {sel.name}
            </Text>
            <Text style={st.readoutColor}>{sel.colorName}</Text>
          </View>
          <View style={st.readoutRight}>
            <Text style={[st.readoutFreq, { color: sel.colors[0] }]}>{sel.freq}</Text>
            <Text style={st.readoutHz}>Hz</Text>
          </View>
          <TouchableOpacity onPress={stopAll} style={st.stopBtn} testID="chakra-stop">
            <Text style={st.stopTxt}>■</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={st.hintBox}>
          <Text style={st.hint}>SELECT A CHAKRA KEY TO SOUND ITS BODY CENTRE</Text>
        </View>
      )}
    </View>
  );
}

const st = skinStyles({
  wrap: { borderWidth: 1, borderColor: '#2a0a0a', backgroundColor: '#050202', marginBottom: 16, padding: 10 },
  header: { marginBottom: 10 },
  title: { color: '#ff0a0a', fontSize: 13, fontFamily: 'TerminatorRealNFI', letterSpacing: 1, textAlign: 'center' },
  subtitle: { color: '#5a1a1a', fontSize: 7, fontFamily: 'TerminatorRealNFI', letterSpacing: 1, textAlign: 'center', marginTop: 4 },

  stage: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },

  keyboard: { width: 122 },
  key: {
    height: 26,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 6,
    marginBottom: 2,
    borderWidth: 1,
    minHeight: 26,
  },
  keyWhite: { backgroundColor: '#0a0505' },
  keyBlack: { backgroundColor: '#000000', marginRight: 8 },
  keyTxt: { fontSize: 10, fontWeight: '700', fontFamily: 'TerminatorRealNFI' },
  keyHz: { fontSize: 6.5, fontFamily: 'TerminatorRealNFI' },

  bodyWrap: { flex: 1, alignItems: 'center' },

  readout: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    backgroundColor: '#0a0505',
    padding: 8,
    marginTop: 10,
    gap: 8,
  },
  swatchRow: { flexDirection: 'row', gap: 2 },
  swatch: { width: 8, height: 22, borderRadius: 1 },
  readoutMeta: { flex: 1 },
  readoutName: { fontSize: 11, fontFamily: 'TerminatorRealNFI', letterSpacing: 1 },
  readoutColor: { color: '#5a1a1a', fontSize: 7, fontFamily: 'TerminatorRealNFI', marginTop: 3, letterSpacing: 1 },
  readoutRight: { alignItems: 'flex-end' },
  readoutFreq: { fontSize: 14, fontFamily: 'TerminatorRealNFI' },
  readoutHz: { color: '#5a1a1a', fontSize: 7, fontFamily: 'TerminatorRealNFI' },
  stopBtn: {
    width: 40,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#ff0a0a',
  },
  stopTxt: { color: '#ff0a0a', fontSize: 12 },

  hintBox: { marginTop: 10, borderWidth: 1, borderColor: '#2a0a0a', backgroundColor: '#0a0505', paddingVertical: 10 },
  hint: { color: '#5a1a1a', fontSize: 8, fontFamily: 'TerminatorRealNFI', letterSpacing: 1, textAlign: 'center' },
});
