import React, { useMemo, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, Animated, Easing } from 'react-native';
import Svg, {
  Circle as SvgCircle,
  Text as SvgText,
  G,
  Defs,
  RadialGradient,
  LinearGradient,
  Stop,
  Ellipse,
  Path,
  Rect,
  Line,
  ClipPath,
  Mask,
} from 'react-native-svg';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export interface CamelotKey {
  id: string;
  num: number;
  letter: 'A' | 'B';
  note: string;
  freq: number;
  color: string;
  colorDim: string;
}

const SPECTRUM: Record<number, { bright: string; dim: string }> = {
  1:  { bright: '#FF2D87', dim: '#6B1A3D' },
  2:  { bright: '#FF1A1A', dim: '#6B1A1A' },
  3:  { bright: '#FF5722', dim: '#6B2810' },
  4:  { bright: '#FF9100', dim: '#6B4200' },
  5:  { bright: '#FFD600', dim: '#6B5A00' },
  6:  { bright: '#AEEA00', dim: '#4A6B00' },
  7:  { bright: '#00E676', dim: '#006B35' },
  8:  { bright: '#00E5FF', dim: '#006B76' },
  9:  { bright: '#2979FF', dim: '#0A2E6B' },
  10: { bright: '#651FFF', dim: '#2A0E6B' },
  11: { bright: '#AA00FF', dim: '#4A006B' },
  12: { bright: '#D500F9', dim: '#5A006B' },
};

export const CAMELOT_KEYS: CamelotKey[] = [
  { id: '1A',  num: 1,  letter: 'A', note: 'A\u266Dm',  freq: 406.7,  color: SPECTRUM[1].bright,  colorDim: SPECTRUM[1].dim },
  { id: '2A',  num: 2,  letter: 'A', note: 'E\u266Dm',  freq: 304.4,  color: SPECTRUM[2].bright,  colorDim: SPECTRUM[2].dim },
  { id: '3A',  num: 3,  letter: 'A', note: 'B\u266Dm',  freq: 456.1,  color: SPECTRUM[3].bright,  colorDim: SPECTRUM[3].dim },
  { id: '4A',  num: 4,  letter: 'A', note: 'Fm',   freq: 341.3,  color: SPECTRUM[4].bright,  colorDim: SPECTRUM[4].dim },
  { id: '5A',  num: 5,  letter: 'A', note: 'Cm',   freq: 256.0,  color: SPECTRUM[5].bright,  colorDim: SPECTRUM[5].dim },
  { id: '6A',  num: 6,  letter: 'A', note: 'Gm',   freq: 384.0,  color: SPECTRUM[6].bright,  colorDim: SPECTRUM[6].dim },
  { id: '7A',  num: 7,  letter: 'A', note: 'Dm',   freq: 288.0,  color: SPECTRUM[7].bright,  colorDim: SPECTRUM[7].dim },
  { id: '8A',  num: 8,  letter: 'A', note: 'Am',   freq: 432.0,  color: SPECTRUM[8].bright,  colorDim: SPECTRUM[8].dim },
  { id: '9A',  num: 9,  letter: 'A', note: 'Em',   freq: 324.0,  color: SPECTRUM[9].bright,  colorDim: SPECTRUM[9].dim },
  { id: '10A', num: 10, letter: 'A', note: 'Bm',   freq: 484.9,  color: SPECTRUM[10].bright, colorDim: SPECTRUM[10].dim },
  { id: '11A', num: 11, letter: 'A', note: 'F\u266Fm',  freq: 362.0,  color: SPECTRUM[11].bright, colorDim: SPECTRUM[11].dim },
  { id: '12A', num: 12, letter: 'A', note: 'D\u266Dm',  freq: 271.2,  color: SPECTRUM[12].bright, colorDim: SPECTRUM[12].dim },
  { id: '1B',  num: 1,  letter: 'B', note: 'B',    freq: 484.9,  color: SPECTRUM[1].bright,  colorDim: SPECTRUM[1].dim },
  { id: '2B',  num: 2,  letter: 'B', note: 'F\u266F',   freq: 362.0,  color: SPECTRUM[2].bright,  colorDim: SPECTRUM[2].dim },
  { id: '3B',  num: 3,  letter: 'B', note: 'D\u266D',   freq: 271.2,  color: SPECTRUM[3].bright,  colorDim: SPECTRUM[3].dim },
  { id: '4B',  num: 4,  letter: 'B', note: 'A\u266D',   freq: 406.7,  color: SPECTRUM[4].bright,  colorDim: SPECTRUM[4].dim },
  { id: '5B',  num: 5,  letter: 'B', note: 'E\u266D',   freq: 304.4,  color: SPECTRUM[5].bright,  colorDim: SPECTRUM[5].dim },
  { id: '6B',  num: 6,  letter: 'B', note: 'B\u266D',   freq: 456.1,  color: SPECTRUM[6].bright,  colorDim: SPECTRUM[6].dim },
  { id: '7B',  num: 7,  letter: 'B', note: 'F',    freq: 341.3,  color: SPECTRUM[7].bright,  colorDim: SPECTRUM[7].dim },
  { id: '8B',  num: 8,  letter: 'B', note: 'C',    freq: 512.0,  color: SPECTRUM[8].bright,  colorDim: SPECTRUM[8].dim },
  { id: '9B',  num: 9,  letter: 'B', note: 'G',    freq: 384.0,  color: SPECTRUM[9].bright,  colorDim: SPECTRUM[9].dim },
  { id: '10B', num: 10, letter: 'B', note: 'D',    freq: 288.0,  color: SPECTRUM[10].bright, colorDim: SPECTRUM[10].dim },
  { id: '11B', num: 11, letter: 'B', note: 'A',    freq: 432.0,  color: SPECTRUM[11].bright, colorDim: SPECTRUM[11].dim },
  { id: '12B', num: 12, letter: 'B', note: 'E',    freq: 324.0,  color: SPECTRUM[12].bright, colorDim: SPECTRUM[12].dim },
];

// Harmonic engine
export type HarmonicLevel = 'selected' | 'primary' | 'secondary' | 'none';
export function getHarmonicLevel(selectedId: string | null, testId: string): HarmonicLevel {
  if (!selectedId) return 'none';
  if (selectedId === testId) return 'selected';
  const selNum = parseInt(selectedId.replace(/[AB]/, ''));
  const selLetter = selectedId.includes('A') ? 'A' : 'B';
  const testNum = parseInt(testId.replace(/[AB]/, ''));
  const testLetter = testId.includes('A') ? 'A' : 'B';
  const diff = Math.abs(selNum - testNum);
  const wrapped = Math.min(diff, 12 - diff);
  if (wrapped <= 1 && selLetter === testLetter) return 'primary';
  if (selNum === testNum && selLetter !== testLetter) return 'primary';
  if (wrapped <= 2) return 'secondary';
  return 'none';
}

// ═══ SPIRAL LAYOUT ═══
const MAP_W = SCREEN_WIDTH - 32;
const MAP_H = MAP_W * 1.15; // Taller to accommodate silhouette
const CX = MAP_W / 2;
const CY = MAP_H / 2;

// Stars
const NUM_STARS = 150;
const STARS = Array.from({ length: NUM_STARS }, () => ({
  x: Math.random() * MAP_W,
  y: Math.random() * MAP_H,
  r: Math.random() * 1.2 + 0.2,
  o: Math.random() * 0.5 + 0.1,
}));

// Human silhouette path - meditation pose (scaled to fit center)
const SILHOUETTE_SCALE = MAP_W * 0.0028; // Increased scale for better visibility
const SILHOUETTE_OFFSET_X = CX;
const SILHOUETTE_OFFSET_Y = CY + MAP_H * 0.01;

// Meditation silhouette SVG path (centered around origin)
const MEDITATION_PATH = `
  M 0 -45
  C -8 -45 -14 -40 -14 -32
  C -14 -24 -8 -18 0 -18
  C 8 -18 14 -24 14 -32
  C 14 -40 8 -45 0 -45
  Z
  M 0 -14
  C -6 -14 -10 -10 -10 -6
  L -14 8
  C -16 12 -20 14 -26 16
  L -42 22
  C -46 24 -48 28 -46 32
  C -44 36 -40 38 -36 36
  L -18 30
  C -14 28 -10 28 -8 30
  L -20 50
  C -22 54 -22 60 -20 64
  L -8 78
  C -6 82 -2 84 2 82
  C 6 80 8 76 6 72
  L -4 60
  L 0 52
  L 4 60
  L -6 72
  C -8 76 -6 80 -2 82
  C 2 84 6 82 8 78
  L 20 64
  C 22 60 22 54 20 50
  L 8 30
  C 10 28 14 28 18 30
  L 36 36
  C 40 38 44 36 46 32
  C 48 28 46 24 42 22
  L 26 16
  C 20 14 16 12 14 8
  L 10 -6
  C 10 -10 6 -14 0 -14
  Z
`;

// Spiral positions — outer ring (12 keys: A), inner spiral (12 keys: B)
function getSpiralPositions() {
  const outerKeys: { key: CamelotKey; x: number; y: number; r: number }[] = [];
  const innerKeys: { key: CamelotKey; x: number; y: number; r: number }[] = [];

  const outerR = MAP_W * 0.42;
  const innerR = MAP_W * 0.28;
  const coreR = MAP_W * 0.14;

  // Outer ring — the 12 A keys
  for (let i = 0; i < 12; i++) {
    const angle = (i * 30 - 90) * (Math.PI / 180);
    const key = CAMELOT_KEYS[i]; // 1A-12A
    outerKeys.push({
      key,
      x: CX + Math.cos(angle) * outerR,
      y: CY + Math.sin(angle) * outerR,
      r: 16,
    });
  }

  // Inner ring — the 12 B keys (spiraling inward with golden angle offset)
  for (let i = 0; i < 12; i++) {
    const angle = (i * 30 - 90 + 15) * (Math.PI / 180);
    const radius = innerR - (i / 12) * (innerR - coreR) * 0.35;
    const key = CAMELOT_KEYS[12 + i]; // 1B-12B
    innerKeys.push({
      key,
      x: CX + Math.cos(angle) * radius,
      y: CY + Math.sin(angle) * radius,
      r: 12,
    });
  }

  return { outerKeys, innerKeys };
}

// Chakra positions on silhouette (7 main chakras mapped to y-positions)
const CHAKRA_POINTS = [
  { name: 'Crown', y: -42, color: '#9B59B6' },
  { name: '3rd Eye', y: -30, color: '#7C4DFF' },
  { name: 'Throat', y: -10, color: '#29B6F6' },
  { name: 'Heart', y: 10, color: '#00E676' },
  { name: 'Solar', y: 28, color: '#FFD600' },
  { name: 'Sacral', y: 45, color: '#FF9100' },
  { name: 'Root', y: 62, color: '#FF1A1A' },
];

interface Props {
  activeKey: string | null;
  onKeyPress: (key: CamelotKey) => void;
  isEmitting: boolean;
}

export function MirrorsWheel({ activeKey, onKeyPress, isEmitting }: Props) {
  const { outerKeys, innerKeys } = useMemo(() => getSpiralPositions(), []);
  const allPositions = useMemo(() => [...outerKeys, ...innerKeys], [outerKeys, innerKeys]);

  // Animations
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const breatheAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Slow rotation for outer elements
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 90000,
        easing: Easing.linear,
        useNativeDriver: false,
      })
    ).start();

    // Pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 2000, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
        Animated.timing(pulseAnim, { toValue: 0, duration: 2000, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
      ])
    ).start();

    // Breathe animation for silhouette glow
    Animated.loop(
      Animated.sequence([
        Animated.timing(breatheAnim, { toValue: 1, duration: 4000, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
        Animated.timing(breatheAnim, { toValue: 0, duration: 4000, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
      ])
    ).start();
  }, []);

  // Find active position and get active color
  const activePos = allPositions.find(p => p.key.id === activeKey);
  const activeColor = activePos?.key.color || '#ff0a0a';

  // Determine which chakra to highlight based on frequency
  const getActiveChakra = () => {
    if (!activePos) return null;
    const freq = activePos.key.freq;
    if (freq >= 480) return 0; // Crown
    if (freq >= 420) return 1; // 3rd Eye
    if (freq >= 370) return 2; // Throat
    if (freq >= 310) return 3; // Heart
    if (freq >= 280) return 4; // Solar
    if (freq >= 260) return 5; // Sacral
    return 6; // Root
  };

  const activeChakraIdx = getActiveChakra();

  return (
    <View style={st.container}>
      <Svg width={MAP_W} height={MAP_H} viewBox={`0 0 ${MAP_W} ${MAP_H}`}>
        <Defs>
          {/* Deep space background */}
          <RadialGradient id="space-bg" cx="50%" cy="50%" r="70%">
            <Stop offset="0%" stopColor="#0a001a" stopOpacity="1" />
            <Stop offset="35%" stopColor="#050010" stopOpacity="1" />
            <Stop offset="100%" stopColor="#000000" stopOpacity="1" />
          </RadialGradient>

          {/* Mirror reflection gradient */}
          <LinearGradient id="mirror-grad" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor="#ffffff" stopOpacity={isEmitting ? '0.08' : '0.03'} />
            <Stop offset="50%" stopColor="#ffffff" stopOpacity="0" />
            <Stop offset="100%" stopColor={activeColor} stopOpacity={isEmitting ? '0.05' : '0.01'} />
          </LinearGradient>

          {/* Silhouette glow */}
          <RadialGradient id="silhouette-glow" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor={activeColor} stopOpacity={isEmitting ? '0.4' : '0.1'} />
            <Stop offset="60%" stopColor={activeColor} stopOpacity={isEmitting ? '0.1' : '0.02'} />
            <Stop offset="100%" stopColor={activeColor} stopOpacity="0" />
          </RadialGradient>

          {/* Central vortex */}
          <RadialGradient id="vortex" cx="50%" cy="50%" r="35%">
            <Stop offset="0%" stopColor="#ffffff" stopOpacity={isEmitting ? '0.12' : '0.04'} />
            <Stop offset="40%" stopColor={activeColor} stopOpacity={isEmitting ? '0.08' : '0.02'} />
            <Stop offset="100%" stopColor="#000000" stopOpacity="0" />
          </RadialGradient>

          {/* Aura gradient */}
          <RadialGradient id="aura-glow" cx="50%" cy="45%" r="40%">
            <Stop offset="0%" stopColor={activeColor} stopOpacity={isEmitting ? '0.25' : '0.05'} />
            <Stop offset="50%" stopColor={activeColor} stopOpacity={isEmitting ? '0.08' : '0.01'} />
            <Stop offset="100%" stopColor={activeColor} stopOpacity="0" />
          </RadialGradient>

          {/* Nebula red */}
          <RadialGradient id="neb-red" cx="25%" cy="65%" r="45%">
            <Stop offset="0%" stopColor="#ff0a0a" stopOpacity="0.08" />
            <Stop offset="60%" stopColor="#ff0a0a" stopOpacity="0.02" />
            <Stop offset="100%" stopColor="#ff0a0a" stopOpacity="0" />
          </RadialGradient>

          {/* Nebula blue */}
          <RadialGradient id="neb-blue" cx="75%" cy="30%" r="40%">
            <Stop offset="0%" stopColor="#2979FF" stopOpacity="0.06" />
            <Stop offset="60%" stopColor="#2979FF" stopOpacity="0.015" />
            <Stop offset="100%" stopColor="#2979FF" stopOpacity="0" />
          </RadialGradient>

          {/* Node glows */}
          {allPositions.map((p, i) => (
            <RadialGradient key={`ng-${i}`} id={`ng-${i}`} cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor={p.key.color} stopOpacity={activeKey === p.key.id ? '1' : '0.5'} />
              <Stop offset="40%" stopColor={p.key.color} stopOpacity={activeKey === p.key.id ? '0.35' : '0.08'} />
              <Stop offset="100%" stopColor={p.key.color} stopOpacity="0" />
            </RadialGradient>
          ))}

          {/* Chakra glows */}
          {CHAKRA_POINTS.map((chakra, i) => (
            <RadialGradient key={`chakra-${i}`} id={`chakra-${i}`} cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor={chakra.color} stopOpacity={activeChakraIdx === i ? '1' : '0.3'} />
              <Stop offset="50%" stopColor={chakra.color} stopOpacity={activeChakraIdx === i ? '0.4' : '0.1'} />
              <Stop offset="100%" stopColor={chakra.color} stopOpacity="0" />
            </RadialGradient>
          ))}
        </Defs>

        {/* Background layers */}
        <Rect x="0" y="0" width={MAP_W} height={MAP_H} fill="url(#space-bg)" />
        <Rect x="0" y="0" width={MAP_W} height={MAP_H} fill="url(#neb-red)" />
        <Rect x="0" y="0" width={MAP_W} height={MAP_H} fill="url(#neb-blue)" />

        {/* Starfield */}
        {STARS.map((s, i) => (
          <SvgCircle key={`s-${i}`} cx={s.x} cy={s.y} r={s.r} fill="#ffffff" opacity={s.o} />
        ))}

        {/* ═══ MIRROR FRAME ═══ */}
        <Ellipse
          cx={CX}
          cy={CY}
          rx={MAP_W * 0.32}
          ry={MAP_H * 0.28}
          fill="none"
          stroke="#ffffff"
          strokeWidth={0.5}
          opacity={0.08}
        />
        <Ellipse
          cx={CX}
          cy={CY}
          rx={MAP_W * 0.30}
          ry={MAP_H * 0.26}
          fill="url(#mirror-grad)"
          stroke={activeColor}
          strokeWidth={isEmitting ? 1 : 0.3}
          opacity={isEmitting ? 0.6 : 0.2}
        />

        {/* Central aura glow */}
        <Ellipse
          cx={CX}
          cy={CY - MAP_H * 0.02}
          rx={MAP_W * 0.22}
          ry={MAP_H * 0.20}
          fill="url(#aura-glow)"
        />

        {/* ═══ HUMAN SILHOUETTE (MEDITATION POSE) ═══ */}
        <G transform={`translate(${SILHOUETTE_OFFSET_X}, ${SILHOUETTE_OFFSET_Y}) scale(${SILHOUETTE_SCALE})`}>
          {/* Large outer glow for visibility */}
          <Path
            d={MEDITATION_PATH}
            fill="none"
            stroke={activeColor}
            strokeWidth={isEmitting ? 12 : 6}
            opacity={isEmitting ? 0.4 : 0.15}
          />
          
          {/* Secondary glow layer */}
          <Path
            d={MEDITATION_PATH}
            fill="none"
            stroke="#ffffff"
            strokeWidth={isEmitting ? 4 : 2}
            opacity={isEmitting ? 0.2 : 0.06}
          />
          
          {/* Main silhouette body */}
          <Path
            d={MEDITATION_PATH}
            fill={isEmitting ? '#0a0515' : '#050208'}
            stroke={activeColor}
            strokeWidth={isEmitting ? 2 : 1}
            opacity={1}
          />

          {/* Inner highlight */}
          <Path
            d={MEDITATION_PATH}
            fill="url(#silhouette-glow)"
            stroke="none"
          />

          {/* ═══ CHAKRA POINTS ON SILHOUETTE ═══ */}
          {CHAKRA_POINTS.map((chakra, i) => {
            const isActive = activeChakraIdx === i;
            return (
              <G key={`chakra-point-${i}`}>
                {/* Chakra glow - larger for visibility */}
                <SvgCircle
                  cx={0}
                  cy={chakra.y}
                  r={isActive ? 24 : 14}
                  fill={`url(#chakra-${i})`}
                />
                {/* Chakra core - more prominent */}
                <SvgCircle
                  cx={0}
                  cy={chakra.y}
                  r={isActive ? 8 : 5}
                  fill={chakra.color}
                  opacity={isActive ? 1 : 0.7}
                />
                {/* Hot center */}
                <SvgCircle
                  cx={0}
                  cy={chakra.y}
                  r={isActive ? 3 : 2}
                  fill="#ffffff"
                  opacity={isActive ? 1 : 0.5}
                />
              </G>
            );
          })}
        </G>

        {/* ═══ MIRRORED REFLECTION (subtle, below) ═══ */}
        <G transform={`translate(${SILHOUETTE_OFFSET_X}, ${CY + MAP_H * 0.32}) scale(${SILHOUETTE_SCALE * 0.6}, ${-SILHOUETTE_SCALE * 0.4})`} opacity={0.08}>
          <Path
            d={MEDITATION_PATH}
            fill={activeColor}
            stroke="none"
          />
        </G>

        {/* Concentric energy rings around silhouette */}
        {[0.26, 0.22, 0.18].map((r, i) => (
          <Ellipse
            key={`energy-ring-${i}`}
            cx={CX}
            cy={CY}
            rx={MAP_W * r}
            ry={MAP_H * (r * 0.85)}
            fill="none"
            stroke={isEmitting ? activeColor : '#ffffff'}
            strokeWidth={0.4}
            opacity={isEmitting ? 0.15 - i * 0.03 : 0.04 - i * 0.01}
            strokeDasharray={i % 2 === 0 ? `${4 + i * 2},${8 + i * 3}` : '0'}
          />
        ))}

        {/* Spiral arm traces (outer decorative) */}
        {[0, 60, 120, 180, 240, 300].map((baseAngle, armIdx) => {
          const points: string[] = [];
          for (let t = 0; t <= 30; t++) {
            const angle = (baseAngle + t * 12) * (Math.PI / 180);
            const radius = MAP_W * 0.46 * (1 - t / 40);
            const x = CX + Math.cos(angle) * radius;
            const y = CY + Math.sin(angle) * radius * 0.9;
            points.push(`${t === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`);
          }
          return (
            <Path
              key={`arm-${armIdx}`}
              d={points.join(' ')}
              fill="none"
              stroke={activeColor}
              strokeWidth={0.4}
              opacity={isEmitting ? 0.12 : 0.03}
            />
          );
        })}

        {/* Connection lines from active node to silhouette center */}
        {activeKey && activePos && (
          <Line
            x1={activePos.x}
            y1={activePos.y}
            x2={CX}
            y2={CY}
            stroke={activeColor}
            strokeWidth={1}
            opacity={0.3}
            strokeDasharray="4,4"
          />
        )}

        {/* Connection lines between harmonic nodes */}
        {activeKey && allPositions.map((p, i) => {
          const level = getHarmonicLevel(activeKey, p.key.id);
          if (level === 'none' || level === 'selected') return null;
          return (
            <Line
              key={`conn-${i}`}
              x1={activePos?.x ?? CX}
              y1={activePos?.y ?? CY}
              x2={p.x}
              y2={p.y}
              stroke={p.key.color}
              strokeWidth={level === 'primary' ? 1 : 0.4}
              opacity={level === 'primary' ? 0.4 : 0.12}
            />
          );
        })}

        {/* ═══ OUTER RING — 12 A Keys ═══ */}
        {outerKeys.map((p, i) => {
          const level = getHarmonicLevel(activeKey, p.key.id);
          const isActive = level === 'selected';
          const isPrimary = level === 'primary';
          const nodeR = isActive ? 20 : p.r;

          return (
            <G key={`o-${i}`} onPress={() => onKeyPress(p.key)}>
              {/* Glow halo */}
              <SvgCircle
                cx={p.x} cy={p.y}
                r={isActive ? nodeR * 2.8 : isPrimary ? nodeR * 2 : nodeR * 1.6}
                fill={`url(#ng-${i})`}
                opacity={isActive ? 1 : isPrimary ? 0.6 : 0.25}
              />

              {/* Corona ring */}
              {(isActive || isPrimary) && (
                <SvgCircle
                  cx={p.x} cy={p.y}
                  r={nodeR * 1.5}
                  fill="none"
                  stroke={p.key.color}
                  strokeWidth={isActive ? 0.8 : 0.4}
                  opacity={isActive ? 0.5 : 0.25}
                />
              )}

              {/* Node body */}
              <SvgCircle
                cx={p.x} cy={p.y} r={nodeR}
                fill="#040008"
                stroke={p.key.color}
                strokeWidth={isActive ? 2 : isPrimary ? 1.2 : 0.8}
                opacity={1}
              />

              {/* Inner fill */}
              <SvgCircle
                cx={p.x} cy={p.y}
                r={nodeR * 0.5}
                fill={p.key.color}
                opacity={isActive ? 1 : isPrimary ? 0.7 : 0.4}
              />

              {/* Hot pixel */}
              <SvgCircle
                cx={p.x} cy={p.y}
                r={isActive ? 3 : 1.2}
                fill="#ffffff"
                opacity={isActive ? 1 : 0.25}
              />

              {/* Key label */}
              <SvgText
                x={p.x} y={p.y - nodeR - 5}
                fill={isActive ? '#ffffff' : p.key.color}
                fontSize={isActive ? 7 : 6}
                fontWeight="800"
                textAnchor="middle"
                opacity={isActive ? 1 : 0.75}
              >
                {p.key.id}
              </SvgText>

              {/* Note name inside */}
              <SvgText
                x={p.x} y={p.y + 2.5}
                fill="#ffffff"
                fontSize={isActive ? 7 : 5.5}
                fontWeight="800"
                textAnchor="middle"
                opacity={isActive ? 1 : 0.65}
              >
                {p.key.note}
              </SvgText>
            </G>
          );
        })}

        {/* ═══ INNER RING — 12 B Keys (spiral) ═══ */}
        {innerKeys.map((p, idx) => {
          const i = idx + 12;
          const level = getHarmonicLevel(activeKey, p.key.id);
          const isActive = level === 'selected';
          const isPrimary = level === 'primary';
          const nodeR = isActive ? 16 : p.r;

          return (
            <G key={`i-${idx}`} onPress={() => onKeyPress(p.key)}>
              {/* Glow */}
              <SvgCircle
                cx={p.x} cy={p.y}
                r={isActive ? nodeR * 2.5 : nodeR * 1.6}
                fill={`url(#ng-${i})`}
                opacity={isActive ? 1 : isPrimary ? 0.5 : 0.2}
              />

              {/* Node body */}
              <SvgCircle
                cx={p.x} cy={p.y} r={nodeR}
                fill="#040008"
                stroke={p.key.color}
                strokeWidth={isActive ? 1.8 : isPrimary ? 1 : 0.6}
                opacity={1}
              />

              {/* Inner fill */}
              <SvgCircle
                cx={p.x} cy={p.y}
                r={nodeR * 0.45}
                fill={p.key.color}
                opacity={isActive ? 1 : 0.35}
              />

              {/* Hot pixel */}
              <SvgCircle
                cx={p.x} cy={p.y}
                r={isActive ? 2.5 : 1}
                fill="#ffffff"
                opacity={isActive ? 1 : 0.2}
              />

              {/* Label */}
              <SvgText
                x={p.x} y={p.y - nodeR - 4}
                fill={isActive ? '#ffffff' : p.key.color}
                fontSize={isActive ? 6 : 5}
                fontWeight="800"
                textAnchor="middle"
                opacity={isActive ? 1 : 0.65}
              >
                {p.key.id}
              </SvgText>

              {/* Note */}
              <SvgText
                x={p.x} y={p.y + 2}
                fill="#ffffff"
                fontSize={isActive ? 6 : 4.5}
                fontWeight="800"
                textAnchor="middle"
                opacity={isActive ? 1 : 0.55}
              >
                {p.key.note}
              </SvgText>
            </G>
          );
        })}

        {/* Corner markers */}
        <SvgText x={6} y={MAP_H - 6} fill="#ffffff" fontSize={5} opacity={0.06} letterSpacing={1}>
          BRAIN MIRROR
        </SvgText>
        <SvgText x={MAP_W - 6} y={MAP_H - 6} fill="#ffffff" fontSize={5} opacity={0.06} letterSpacing={1} textAnchor="end">
          24 KEYS · 7 CHAKRAS
        </SvgText>
      </Svg>

      {/* Active key info overlay */}
      {activeKey && activePos && (
        <View style={st.infoOverlay}>
          <View style={[st.infoBadge, { borderColor: activePos.key.color }]}>
            <Text style={[st.infoKey, { color: activePos.key.color }]}>{activePos.key.id}</Text>
            <Text style={st.infoNote}>{activePos.key.note}</Text>
            <Text style={st.infoFreq}>{activePos.key.freq} Hz</Text>
            {activeChakraIdx !== null && (
              <Text style={[st.infoChakra, { color: CHAKRA_POINTS[activeChakraIdx].color }]}>
                {CHAKRA_POINTS[activeChakraIdx].name}
              </Text>
            )}
          </View>
        </View>
      )}

      {/* Legend */}
      <View style={st.legend}>
        <Text style={st.legendItem}>{'\u25CB'} OUTER = MINOR (A)</Text>
        <Text style={st.legendItem}>{'\u25CF'} INNER = MAJOR (B)</Text>
        <Text style={st.legendItem}>TAP TO EMIT</Text>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderColor: '#ff0a0a18',
    borderRadius: 0,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  infoOverlay: {
    position: 'absolute',
    top: 10,
    left: 10,
  },
  infoBadge: {
    backgroundColor: '#000000dd',
    borderWidth: 1,
    borderRadius: 0,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  infoKey: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2,
  },
  infoNote: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1,
    marginTop: 2,
  },
  infoFreq: {
    color: '#ffffff66',
    fontSize: 9,
    letterSpacing: 1,
    marginTop: 2,
  },
  infoChakra: {
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginTop: 4,
    textTransform: 'uppercase',
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#ffffff08',
  },
  legendItem: {
    color: '#ffffff33',
    fontSize: 7,
    letterSpacing: 1.5,
  },
});
