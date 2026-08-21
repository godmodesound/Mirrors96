import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, Dimensions } from 'react-native';
import Svg, { Circle, Path, Line, G, Text as SvgText } from 'react-native-svg';
import { AudioEngine } from './AudioEngine';
import { skinStyles, SK } from './skins';

const { width: SCREEN_W } = Dimensions.get('window');

// ═══ 13-KEY CHROMATIC SCALE ⟷ 13 CHAKRA BODY MAP (A=432 tuning) ═══
// Key numbers, notes and Hz match the CODES_LAB 13-chakra piano.
export interface ChakraNode {
  key: number;
  note: string;
  freq: number;
  name: string;
  colorName: string;
  color: string;
  color2: string;
  cx: number;   // svg coords (viewBox 120 x 250)
  cy: number;
  black: boolean;
}

export const CHAKRA_13: ChakraNode[] = [
  { key: 13, note: 'C',  freq: 512,   name: 'GALACTIC FEMALE', colorName: 'ALL FEMALE COLORS',  color: '#FFC0E8', color2: '#FFFFFF', cx: 44, cy: 7,   black: false },
  { key: 12, note: 'B',  freq: 486,   name: 'GALACTIC MALE',   colorName: 'ALL MALE COLORS',    color: '#BFD9FF', color2: '#FFFFFF', cx: 76, cy: 7,   black: false },
  { key: 11, note: 'A#', freq: 456,   name: 'CROWN',           colorName: 'GOLD · SILVER',      color: '#FFD700', color2: '#C0C0C0', cx: 60, cy: 20,  black: true  },
  { key: 10, note: 'A',  freq: 432,   name: 'PINEAL',          colorName: 'VIOLET · WHITE',     color: '#C9A0FF', color2: '#FFFFFF', cx: 60, cy: 32,  black: false },
  { key: 9,  note: 'G#', freq: 406.4, name: 'PITUITARY',       colorName: 'LIGHT BLUE · TURQUOISE', color: '#40E0D0', color2: '#9FE8FF', cx: 60, cy: 44, black: true },
  { key: 8,  note: 'G',  freq: 384,   name: 'WELL OF DREAMS',  colorName: 'PINK',               color: '#FF69B4', color2: '#FFB6D5', cx: 60, cy: 57,  black: false },
  { key: 7,  note: 'F#', freq: 362,   name: 'THROAT',          colorName: 'COBALT BLUE',        color: '#0047AB', color2: '#3D7BE0', cx: 60, cy: 68,  black: true  },
  { key: 6,  note: 'F',  freq: 341.3, name: 'THYMUS',          colorName: 'VIOLET · GOLD',      color: '#8E44AD', color2: '#FFD700', cx: 60, cy: 84,  black: false },
  { key: 5,  note: 'E',  freq: 324,   name: 'HEART',           colorName: 'MAGENTA · INDIGO',   color: '#D81B8A', color2: '#3F51B5', cx: 60, cy: 100, black: false },
  { key: 4,  note: 'D#', freq: 304.4, name: 'DIAPHRAGM',       colorName: 'LIGHT YELLOW',       color: '#F5F07A', color2: '#FFFFC2', cx: 60, cy: 118, black: true  },
  { key: 3,  note: 'D',  freq: 288,   name: 'SOLAR PLEXUS',    colorName: 'GREEN',              color: '#37D14A', color2: '#9BF0A6', cx: 60, cy: 136, black: false },
  { key: 2,  note: 'C#', freq: 271.2, name: 'SACRAL',          colorName: 'PEACH',              color: '#FFB380', color2: '#FFD9BE', cx: 60, cy: 155, black: true  },
  { key: 1,  note: 'C',  freq: 256,   name: 'ROOT',            colorName: 'ORANGE',             color: '#FF7A00', color2: '#FFA94D', cx: 60, cy: 172, black: false },
];

const BODY_W = 120;
const BODY_H = 250;

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
  const svgW = Math.min(190, SCREEN_W - 190);
  const svgH = (svgW / BODY_W) * BODY_H;

  return (
    <View style={st.wrap}>
      <View style={st.header}>
        <Text style={st.title}>◈ 13 CHAKRA BODY MAP</Text>
        <Text style={st.subtitle}>13-KEY CHROMATIC SCALE · A=432 · TAP A KEY OR A NODE</Text>
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
                  on && st.keyOn,
                ]}
              >
                <Text style={[n.black ? st.keyTxtBlack : st.keyTxtWhite, on && st.keyTxtOn]}>
                  {n.key}.{n.note}
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
                stroke={active === n.key ? n.color : SK('#3a1414')}
                strokeWidth={active === n.key ? 1.4 : 0.8}
              />
            ))}

            {/* nodes */}
            {CHAKRA_13.map(n => {
              const on = active === n.key;
              return (
                <G key={n.key} onPress={() => sound(n)}>
                  <Circle cx={n.cx} cy={n.cy} r={12} fill="transparent" />
                  {on && <Circle cx={n.cx} cy={n.cy} r={10.5} fill={n.color} opacity={0.3} />}
                  <Circle
                    cx={n.cx}
                    cy={n.cy}
                    r={on ? 7 : 5.6}
                    fill={n.color}
                    stroke={n.color2}
                    strokeWidth={on ? 1.8 : 1}
                  />
                  <SvgText
                    x={n.cx}
                    y={n.cy + 2.4}
                    fontSize={5.6}
                    fill="#000000"
                    textAnchor="middle"
                    fontWeight="700"
                  >
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
        <View style={[st.readout, { borderColor: sel.color }]}>
          <View style={[st.swatch, { backgroundColor: sel.color, borderColor: sel.color2 }]} />
          <View style={st.readoutMeta}>
            <Text style={[st.readoutName, { color: sel.color }]}>
              {sel.key}.{sel.note} · {sel.name}
            </Text>
            <Text style={st.readoutColor}>{sel.colorName}</Text>
          </View>
          <View style={st.readoutRight}>
            <Text style={[st.readoutFreq, { color: sel.color }]}>{sel.freq.toFixed(1)}</Text>
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

  keyboard: { width: 104 },
  key: {
    height: 26,
    justifyContent: 'center',
    paddingHorizontal: 6,
    marginBottom: 2,
    borderWidth: 1,
    minHeight: 26,
  },
  keyWhite: { backgroundColor: '#e9e9e9', borderColor: '#8a8a8a' },
  keyBlack: { backgroundColor: '#0a0a0a', borderColor: '#3a3a3a', marginRight: 16 },
  keyOn: { borderColor: '#ff0a0a', borderWidth: 2 },
  keyTxtWhite: { color: '#111111', fontSize: 10, fontWeight: '700', fontFamily: 'TerminatorRealNFI' },
  keyTxtBlack: { color: '#f2f2f2', fontSize: 10, fontWeight: '700', fontFamily: 'TerminatorRealNFI' },
  keyTxtOn: { color: '#ff0a0a' },

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
  swatch: { width: 22, height: 22, borderRadius: 11, borderWidth: 1 },
  readoutMeta: { flex: 1 },
  readoutName: { fontSize: 11, fontFamily: 'TerminatorRealNFI', letterSpacing: 1 },
  readoutColor: { color: '#5a1a1a', fontSize: 7, fontFamily: 'TerminatorRealNFI', marginTop: 3, letterSpacing: 1 },
  readoutRight: { alignItems: 'flex-end' },
  readoutFreq: { fontSize: 14, fontFamily: 'TerminatorRealNFI' },
  readoutHz: { color: '#5a1a1a', fontSize: 7, fontFamily: 'TerminatorRealNFI' },
  stopBtn: {
    width: 44,
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
