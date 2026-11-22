import React from 'react';
import { View, Image, TouchableOpacity, StyleSheet } from 'react-native';
import Svg, { Path, Circle, G, Ellipse, Rect, Polyline, Line, Text as SvgText } from 'react-native-svg';
import { BODY_PORTAL_ART, BODY_ART_W, BODY_ART_H } from './skins/art';
import { BODY_POINTS } from './bodyMapData';
import { ScopeWave } from './useScopeWave';

type XY = [number, number];
/** Node positions in the 853×1060 portal artwork. Viewer-left = body "L". */
const NODES: Record<number, XY> = {
  1: [427, 135], 2: [427, 185], 3: [387, 198], 4: [467, 198], 5: [427, 228], 6: [427, 269],
  7: [345, 290], 8: [510, 290], 9: [427, 305], 10: [405, 350], 11: [357, 330], 12: [497, 330],
  13: [427, 390], 14: [478, 405], 15: [376, 405], 16: [384, 458], 17: [470, 458], 18: [427, 466],
  19: [428, 536], 20: [112, 292], 21: [738, 292], 22: [381, 656], 23: [472, 657], 24: [427, 856],
};
const J: Record<string, XY> = { elbowL: [235, 292], elbowR: [622, 292], hipL: [398, 560], hipR: [458, 560], ankleL: [380, 830], ankleR: [474, 830], footL: [379, 856], footR: [474, 856] };
const n = NODES;
/** Meridian channels: central vessel, arm and leg lines, organ branches. */
const MERIDIANS: XY[][] = [
  [n[1], n[2], n[5], n[6], n[9], n[13], n[18], n[19]],
  [n[6], n[7], J.elbowL, n[20]], [n[6], n[8], J.elbowR, n[21]],
  [n[19], J.hipL, n[22], J.ankleL, J.footL], [n[19], J.hipR, n[23], J.ankleR, J.footR],
  [n[2], n[3]], [n[2], n[4]],
  [n[9], n[11]], [n[9], n[12]], [n[9], n[10]],
  [n[13], n[15], n[16], n[18]], [n[13], n[14], n[17], n[18]],
];
const d = (pts: XY[]) => pts.map((p, i) => `${i ? 'L' : 'M'} ${p[0]} ${p[1]}`).join(' ');
/** Halo rings painted in the artwork — re-lit by the live signal. */
const RINGS = [{ cy: 203, rx: 196, ry: 33 }, { cy: 438, rx: 180, ry: 13 }, { cy: 762, rx: 196, ry: 30 }];
// The artwork's glow is a fixed green, so the overlay keeps matching literal colours on every skin.
const GLOW = '#8cff3c';
const PALE = '#f3ffc4';

export default function PortalFigure({ width, levels, selected, onSelect, scope, testID }: {
  width: number; levels: Record<number, number>; selected: number;
  onSelect: (id: number) => void; scope: ScopeWave; testID: string;
}) {
  const height = Math.max(0, Math.round(width * BODY_ART_H / BODY_ART_W));
  const k = width / BODY_ART_W;
  const sel = BODY_POINTS.find(p => p.id === selected);
  const wavePts = scope.wave.map((v, i) => `${110 + i * (124 / 31)},${528 - v * 24}`).join(' ');
  return <View testID={`${testID}-portal`} style={[s.box, { width, height }]}>
    <Image source={BODY_PORTAL_ART} style={{ width, height }} resizeMode="cover" />
    <Svg style={s.overlay} width={width} height={height} viewBox={`0 0 ${BODY_ART_W} ${BODY_ART_H}`}>
      {RINGS.map(r => <Ellipse key={r.cy} cx={427} cy={r.cy} rx={r.rx} ry={r.ry} stroke={PALE} strokeWidth={5 + scope.level * 8} fill="none" opacity={scope.active ? 0.25 + scope.level * 0.65 : 0} />)}
      <G opacity={0.5}>
        {MERIDIANS.map((m, i) => <Path key={`m${i}`} d={d(m)} stroke={GLOW} strokeWidth={i === 0 ? 3 : 2} fill="none" strokeLinecap="round" strokeLinejoin="round" opacity={i === 0 ? 0.9 : 0.6} />)}
      </G>
      {BODY_POINTS.map(p => {
        const [x, y] = NODES[p.id]; const lv = levels[p.id] || 0; const on = p.id === selected;
        return <G key={p.id}>
          <Circle cx={x} cy={y} r={on ? 28 : 13 + lv * 16} fill={GLOW} opacity={on ? 0.38 : 0.1 + lv * 0.4} />
          {on && <Circle cx={x} cy={y} r={38} stroke={GLOW} strokeWidth={2} fill="none" opacity={0.7} />}
          <Circle cx={x} cy={y} r={on ? 11 : 7} fill={on ? PALE : GLOW} stroke="#0a2a0a" strokeWidth={2} />
        </G>;
      })}
      {/* live AUDIO INPUT monitor */}
      <Rect x={98} y={463} width={148} height={97} rx={8} fill="rgba(0,0,0,0.55)" stroke={GLOW} strokeWidth={1.5} opacity={0.9} />
      <SvgText x={110} y={485} fill={PALE} fontSize={15} fontWeight="bold" letterSpacing={1.5}>AUDIO INPUT</SvgText>
      <Rect x={106} y={496} width={132} height={56} rx={6} fill="rgba(140,255,60,0.08)" stroke={GLOW} strokeWidth={1} />
      <Polyline points={wavePts} stroke={GLOW} strokeWidth={3} fill="none" strokeLinejoin="round" opacity={scope.active ? 1 : 0.45} />
      {sel && <G>
        <Line x1={NODES[sel.id][0]} y1={NODES[sel.id][1]} x2={548} y2={366} stroke={GLOW} strokeWidth={1.5} opacity={0.8} />
        <Rect x={548} y={336} width={228} height={60} rx={10} fill="rgba(0,0,0,0.6)" stroke={GLOW} strokeWidth={1.5} />
        <SvgText x={662} y={361} fill={PALE} fontSize={19} fontWeight="bold" letterSpacing={1} textAnchor="middle">{sel.name}</SvgText>
        <SvgText x={662} y={385} fill={GLOW} fontSize={16} fontWeight="bold" letterSpacing={2} textAnchor="middle">SELECTED</SvgText>
      </G>}
    </Svg>
    {BODY_POINTS.map(p => {
      const [x, y] = NODES[p.id];
      return <TouchableOpacity key={p.id} testID={`${testID}-node-${p.id}`} accessibilityLabel={`Body node ${p.name}`}
        onPress={() => onSelect(p.id)} hitSlop={6} style={[s.hit, { left: x * k - 13, top: y * k - 13 }]} />;
    })}
  </View>;
}

const s = StyleSheet.create({
  box: { alignSelf: 'center', overflow: 'hidden', backgroundColor: '#000', borderRadius: 4 },
  overlay: { position: 'absolute', left: 0, top: 0 },
  hit: { position: 'absolute', width: 26, height: 26, borderRadius: 13 },
});
