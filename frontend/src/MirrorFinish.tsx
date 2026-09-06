import React from 'react';
import { StyleSheet } from 'react-native';
import Svg, { Circle, Defs, G, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';

// Brand material: these neutral/cool reflections stay silver in every skin.
// Functional colors and surrounding surfaces continue to use the skin system.
const CHROME = [
  ['0%', '#05090d'], ['12%', '#738592'], ['21%', '#e9f7ff'],
  ['27%', '#ffffff'], ['32%', '#82929c'], ['39%', '#111820'],
  ['48%', '#020406'], ['52%', '#aab9c4'], ['56%', '#f9fdff'],
  ['63%', '#4b5b69'], ['75%', '#0c1219'], ['86%', '#b9d5e8'],
  ['92%', '#ffffff'], ['100%', '#273541'],
];

export function MirrorDefs({ id }: { id: string }) {
  return (
    <Defs>
      <LinearGradient id={`${id}-chrome`} x1="12%" y1="0%" x2="88%" y2="100%">
        {CHROME.map(([offset, color]) => <Stop key={offset} offset={offset} stopColor={color} />)}
      </LinearGradient>
      <LinearGradient id={`${id}-edge`} x1="100%" y1="5%" x2="0%" y2="95%">
        {CHROME.map(([offset, color]) => <Stop key={offset} offset={offset} stopColor={color} />)}
      </LinearGradient>
      <LinearGradient id={`${id}-panel`} x1="0%" y1="0%" x2="65%" y2="100%">
        <Stop offset="0%" stopColor="#53626e" />
        <Stop offset="12%" stopColor="#151d25" />
        <Stop offset="42%" stopColor="#070a0e" />
        <Stop offset="49%" stopColor="#26323d" />
        <Stop offset="51%" stopColor="#10161c" />
        <Stop offset="83%" stopColor="#030507" />
        <Stop offset="100%" stopColor="#34434f" />
      </LinearGradient>
      <RadialGradient id={`${id}-lens`} cx="30%" cy="22%" r="78%">
        <Stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
        <Stop offset="24%" stopColor="#d3edff" stopOpacity="0.35" />
        <Stop offset="48%" stopColor="#080e16" stopOpacity="0.35" />
        <Stop offset="76%" stopColor="#000000" stopOpacity="0.75" />
        <Stop offset="100%" stopColor="#b3d8f2" stopOpacity="0.6" />
      </RadialGradient>
    </Defs>
  );
}

export function MirrorRing({ id, cx, cy, r, width = 6 }: {
  id: string; cx: number; cy: number; r: number; width?: number;
}) {
  return (
    <G pointerEvents="none">
      <Circle cx={cx} cy={cy} r={r} fill="none" stroke="#020406" strokeWidth={width + 3} />
      <Circle cx={cx} cy={cy} r={r} fill="none" stroke={`url(#${id}-chrome)`} strokeWidth={width} />
      <Circle cx={cx} cy={cy} r={r + width / 2} fill="none" stroke={`url(#${id}-edge)`} strokeWidth={0.8} />
      <Circle cx={cx} cy={cy} r={r - width / 2} fill="none" stroke="#d9edfa" strokeWidth={0.5} opacity={0.6} />
    </G>
  );
}

export function MirrorNode({ id, x, y, r, color, active }: {
  id: string; x: number; y: number; r: number; color: string; active: boolean;
}) {
  return (
    <G pointerEvents="none">
      <Circle cx={x} cy={y} r={r + 4} fill={`url(#${id}-chrome)`} stroke={`url(#${id}-edge)`} strokeWidth={1} />
      <Circle cx={x} cy={y} r={r} fill="#05090d" stroke="#d8ecfa" strokeWidth={0.5} />
      <Circle cx={x} cy={y} r={r * 0.7} fill={color} opacity={active ? 1 : 0.8} />
      <Circle cx={x} cy={y} r={r * 0.7} fill={`url(#${id}-lens)`} />
      <Circle cx={x - r * 0.22} cy={y - r * 0.3} r={r * 0.13} fill="#ffffff" opacity={0.9} />
      {active && <Circle cx={x} cy={y} r={r + 6} fill="none" stroke={color} strokeWidth={1.5} />}
    </G>
  );
}

/** Decorative only; the original native button remains the entire touch target. */
export function MirrorSurface({ radius = 5 }: { radius?: number }) {
  const id = `surface-${React.useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <Svg pointerEvents="none" style={styles.surface} width="100%" height="100%" viewBox="0 0 100 44" preserveAspectRatio="none">
      <MirrorDefs id={id} />
      <Rect x={0.7} y={0.7} width={98.6} height={42.6} rx={radius} fill={`url(#${id}-panel)`} stroke={`url(#${id}-chrome)`} strokeWidth={1.4} />
      <Rect x={2} y={2} width={96} height={40} rx={radius} fill="none" stroke={`url(#${id}-edge)`} strokeWidth={0.35} />
    </Svg>
  );
}

const styles = StyleSheet.create({ surface: { position: 'absolute', top: 0, left: 0 } });