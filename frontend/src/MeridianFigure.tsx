import React from 'react';
import { View, Image, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Svg, { Path, Circle, G } from 'react-native-svg';
import { BODY_ART, BODY_ART_RATIO } from './skins/art';
import { BODY_POINTS } from './bodyMapData';

type XY = [number, number];
/**
 * Node positions in the 853×1050 body-art crop, traced from the reference figures.
 * Viewer-left = body "L" (matches the BIOMAP canvas convention).
 */
const NODES: Record<'female' | 'male', Record<number, XY>> = {
  female: {
    1: [426, 140], 2: [426, 182], 3: [386, 196], 4: [466, 196], 5: [426, 228], 6: [427, 265],
    7: [368, 292], 8: [486, 292], 9: [426, 312], 10: [404, 352], 11: [356, 330], 12: [496, 330],
    13: [426, 395], 14: [476, 410], 15: [376, 410], 16: [384, 462], 17: [468, 462], 18: [426, 470],
    19: [426, 537], 20: [281, 538], 21: [574, 540], 22: [394, 668], 23: [456, 665], 24: [429, 871],
  },
  male: {
    1: [427, 135], 2: [427, 185], 3: [387, 198], 4: [467, 198], 5: [427, 228], 6: [427, 269],
    7: [345, 290], 8: [510, 290], 9: [427, 305], 10: [405, 350], 11: [357, 330], 12: [497, 330],
    13: [427, 390], 14: [478, 405], 15: [376, 405], 16: [384, 458], 17: [470, 458], 18: [427, 466],
    19: [428, 536], 20: [112, 292], 21: [738, 292], 22: [381, 656], 23: [472, 657], 24: [427, 856],
  },
};
/** Extra path vertices (elbows, hips, ankles, feet) — not tappable. */
const JOINTS: Record<'female' | 'male', Record<string, XY>> = {
  female: { elbowL: [330, 425], elbowR: [524, 425], hipL: [404, 560], hipR: [450, 560], ankleL: [402, 840], ankleR: [455, 838], footL: [404, 872], footR: [454, 870] },
  male: { elbowL: [235, 292], elbowR: [622, 292], hipL: [398, 560], hipR: [458, 560], ankleL: [380, 830], ankleR: [474, 830], footL: [379, 856], footR: [474, 856] },
};

/** Meridian channels: central vessel, arm and leg yin/yang lines, organ branches. */
function meridians(g: 'female' | 'male'): XY[][] {
  const n = NODES[g]; const j = JOINTS[g];
  return [
    [n[1], n[2], n[5], n[6], n[9], n[13], n[18], n[19]],                // governing / conception vessel
    [n[6], n[7], j.elbowL, n[20]], [n[6], n[8], j.elbowR, n[21]],       // arm meridians
    [n[19], j.hipL, n[22], j.ankleL, j.footL], [n[19], j.hipR, n[23], j.ankleR, j.footR], // leg meridians
    [n[2], n[3]], [n[2], n[4]],                                         // ear branches
    [n[9], n[11]], [n[9], n[12]], [n[9], n[10]],                        // lung / heart
    [n[13], n[15], n[16], n[18]], [n[13], n[14], n[17], n[18]],         // spleen-kidney / liver-kidney
  ];
}
const d = (pts: XY[]) => pts.map((p, i) => `${i ? 'L' : 'M'} ${p[0]} ${p[1]}`).join(' ');

export default function MeridianFigure({ figure, width, levels, selected, onSelect, testID }: {
  figure: 'female' | 'male'; width: number; levels: Record<number, number>; selected: number;
  onSelect: (id: number) => void; testID: string;
}) {
  const height = Math.max(0, Math.round(width * BODY_ART_RATIO));
  const sel = BODY_POINTS.find(p => p.id === selected);
  const nodes = NODES[figure];
  // The art's glow is fixed green on every art skin, so the overlay keeps the same literal colours.
  const glow = '#8cff3c';
  return <View testID={`${testID}-meridian-${figure}`} style={[s.box, { width, height }]}>
    <Image source={BODY_ART[figure]} style={{ width, height }} resizeMode="cover" />
    <Svg style={s.overlay} width={width} height={height} viewBox="0 0 853 1050">
      <G opacity={0.85}>
        {meridians(figure).map((m, i) => <Path key={`m${i}`} d={d(m)} stroke={glow} strokeWidth={i === 0 ? 3 : 2} fill="none" strokeLinecap="round" strokeLinejoin="round" opacity={i === 0 ? 0.9 : 0.65} />)}
      </G>
      {BODY_POINTS.map(p => {
        const [x, y] = nodes[p.id]; const lv = levels[p.id] || 0; const on = p.id === selected;
        return <G key={p.id}>
          <Circle cx={x} cy={y} r={on ? 26 : 14 + lv * 14} fill={glow} opacity={on ? 0.35 : 0.12 + lv * 0.35} />
          <Circle cx={x} cy={y} r={on ? 11 : 8} fill={on ? '#f3ffc4' : glow} stroke="#0a2a0a" strokeWidth={2} />
        </G>;
      })}
    </Svg>
    {BODY_POINTS.map(p => {
      const [x, y] = nodes[p.id]; const k = width / 853;
      return <TouchableOpacity key={p.id} testID={`${testID}-node-${p.id}`} accessibilityLabel={`Body node ${p.name}`}
        onPress={() => onSelect(p.id)} hitSlop={6} style={[s.hit, { left: x * k - 13, top: y * k - 13 }]} />;
    })}
    {sel && <View style={s.tag} pointerEvents="none"><Text style={s.tagText}>{sel.name} / SELECTED</Text></View>}
  </View>;
}

const s = StyleSheet.create({
  box: { alignSelf: 'center', overflow: 'hidden', backgroundColor: '#000' },
  overlay: { position: 'absolute', left: 0, top: 0 },
  hit: { position: 'absolute', width: 26, height: 26, borderRadius: 13 },
  tag: { position: 'absolute', right: 10, top: 10, borderWidth: 1, borderColor: '#8cff3c', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, backgroundColor: 'rgba(0,0,0,0.6)' },
  tagText: { color: '#c8ffb8', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
});
