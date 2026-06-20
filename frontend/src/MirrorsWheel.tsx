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
  Path,
  Rect,
  Line,
  Ellipse,
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
  { id: '1A',  num: 1,  letter: 'A', note: 'A♭m',  freq: 406.7,  color: SPECTRUM[1].bright,  colorDim: SPECTRUM[1].dim },
  { id: '2A',  num: 2,  letter: 'A', note: 'E♭m',  freq: 304.4,  color: SPECTRUM[2].bright,  colorDim: SPECTRUM[2].dim },
  { id: '3A',  num: 3,  letter: 'A', note: 'B♭m',  freq: 456.1,  color: SPECTRUM[3].bright,  colorDim: SPECTRUM[3].dim },
  { id: '4A',  num: 4,  letter: 'A', note: 'Fm',   freq: 341.3,  color: SPECTRUM[4].bright,  colorDim: SPECTRUM[4].dim },
  { id: '5A',  num: 5,  letter: 'A', note: 'Cm',   freq: 256.0,  color: SPECTRUM[5].bright,  colorDim: SPECTRUM[5].dim },
  { id: '6A',  num: 6,  letter: 'A', note: 'Gm',   freq: 384.0,  color: SPECTRUM[6].bright,  colorDim: SPECTRUM[6].dim },
  { id: '7A',  num: 7,  letter: 'A', note: 'Dm',   freq: 288.0,  color: SPECTRUM[7].bright,  colorDim: SPECTRUM[7].dim },
  { id: '8A',  num: 8,  letter: 'A', note: 'Am',   freq: 432.0,  color: SPECTRUM[8].bright,  colorDim: SPECTRUM[8].dim },
  { id: '9A',  num: 9,  letter: 'A', note: 'Em',   freq: 324.0,  color: SPECTRUM[9].bright,  colorDim: SPECTRUM[9].dim },
  { id: '10A', num: 10, letter: 'A', note: 'Bm',   freq: 484.9,  color: SPECTRUM[10].bright, colorDim: SPECTRUM[10].dim },
  { id: '11A', num: 11, letter: 'A', note: 'F♯m',  freq: 362.0,  color: SPECTRUM[11].bright, colorDim: SPECTRUM[11].dim },
  { id: '12A', num: 12, letter: 'A', note: 'D♭m',  freq: 271.2,  color: SPECTRUM[12].bright, colorDim: SPECTRUM[12].dim },
  { id: '1B',  num: 1,  letter: 'B', note: 'B',    freq: 484.9,  color: SPECTRUM[1].bright,  colorDim: SPECTRUM[1].dim },
  { id: '2B',  num: 2,  letter: 'B', note: 'F♯',   freq: 362.0,  color: SPECTRUM[2].bright,  colorDim: SPECTRUM[2].dim },
  { id: '3B',  num: 3,  letter: 'B', note: 'D♭',   freq: 271.2,  color: SPECTRUM[3].bright,  colorDim: SPECTRUM[3].dim },
  { id: '4B',  num: 4,  letter: 'B', note: 'A♭',   freq: 406.7,  color: SPECTRUM[4].bright,  colorDim: SPECTRUM[4].dim },
  { id: '5B',  num: 5,  letter: 'B', note: 'E♭',   freq: 304.4,  color: SPECTRUM[5].bright,  colorDim: SPECTRUM[5].dim },
  { id: '6B',  num: 6,  letter: 'B', note: 'B♭',   freq: 456.1,  color: SPECTRUM[6].bright,  colorDim: SPECTRUM[6].dim },
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

// ═══ LAYOUT ═══
const MAP_W = SCREEN_WIDTH - 32;
const MAP_H = MAP_W * 1.0;
const CX = MAP_W / 2;
const CY = MAP_H / 2;

// Generate infinity/butterfly attractor paths
function generateAttractorPaths(cx: number, cy: number, scale: number) {
  const paths: string[] = [];
  
  // Create multiple layers of the infinity/butterfly shape
  for (let layer = 0; layer < 12; layer++) {
    const layerScale = scale * (0.5 + layer * 0.08);
    const offset = layer * 2;
    let path = '';
    
    // Generate parametric butterfly curve
    for (let t = 0; t <= 360; t += 2) {
      const rad = (t + offset) * (Math.PI / 180);
      
      // Butterfly/infinity curve parametric equations
      const r = Math.exp(Math.cos(rad)) - 2 * Math.cos(4 * rad) + Math.pow(Math.sin(rad / 12), 5);
      const x = cx + Math.sin(rad) * r * layerScale * 0.6;
      const y = cy - Math.cos(rad) * r * layerScale * 0.45;
      
      if (t === 0) {
        path = `M ${x.toFixed(1)} ${y.toFixed(1)}`;
      } else {
        path += ` L ${x.toFixed(1)} ${y.toFixed(1)}`;
      }
    }
    path += ' Z';
    paths.push(path);
  }
  
  return paths;
}

// Generate spiral lobes for the four corners
function generateLobeSpiral(cx: number, cy: number, startAngle: number, radius: number, turns: number = 2) {
  let path = '';
  const steps = 60;
  
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const angle = startAngle + t * Math.PI * turns;
    const r = radius * (1 - t * 0.7);
    const x = cx + Math.cos(angle) * r;
    const y = cy + Math.sin(angle) * r;
    
    if (i === 0) {
      path = `M ${x.toFixed(1)} ${y.toFixed(1)}`;
    } else {
      path += ` L ${x.toFixed(1)} ${y.toFixed(1)}`;
    }
  }
  
  return path;
}

// Generate the figure-8 infinity core
function generateInfinityCore(cx: number, cy: number, width: number, height: number) {
  // Lemniscate of Bernoulli (infinity symbol)
  let path = '';
  for (let t = 0; t <= 360; t += 3) {
    const rad = t * (Math.PI / 180);
    const denom = 1 + Math.sin(rad) * Math.sin(rad);
    const x = cx + (width * Math.cos(rad)) / denom;
    const y = cy + (height * Math.sin(rad) * Math.cos(rad)) / denom;
    
    if (t === 0) {
      path = `M ${x.toFixed(1)} ${y.toFixed(1)}`;
    } else {
      path += ` L ${x.toFixed(1)} ${y.toFixed(1)}`;
    }
  }
  path += ' Z';
  return path;
}

// Positions for keys around the attractor
function getKeyPositions() {
  const outerKeys: { key: CamelotKey; x: number; y: number; r: number }[] = [];
  const innerKeys: { key: CamelotKey; x: number; y: number; r: number }[] = [];

  const outerR = MAP_W * 0.44;
  const innerR = MAP_W * 0.28;

  // Outer ring — the 12 A keys
  for (let i = 0; i < 12; i++) {
    const angle = (i * 30 - 90) * (Math.PI / 180);
    const key = CAMELOT_KEYS[i];
    outerKeys.push({
      key,
      x: CX + Math.cos(angle) * outerR,
      y: CY + Math.sin(angle) * outerR,
      r: 14,
    });
  }

  // Inner ring — the 12 B keys
  for (let i = 0; i < 12; i++) {
    const angle = (i * 30 - 90 + 15) * (Math.PI / 180);
    const key = CAMELOT_KEYS[12 + i];
    innerKeys.push({
      key,
      x: CX + Math.cos(angle) * innerR,
      y: CY + Math.sin(angle) * innerR,
      r: 11,
    });
  }

  return { outerKeys, innerKeys };
}

interface Props {
  activeKey: string | null;
  onKeyPress: (key: CamelotKey) => void;
  isEmitting: boolean;
}

export function MirrorsWheel({ activeKey, onKeyPress, isEmitting }: Props) {
  const { outerKeys, innerKeys } = useMemo(() => getKeyPositions(), []);
  const allPositions = useMemo(() => [...outerKeys, ...innerKeys], [outerKeys, innerKeys]);

  // Generate attractor paths
  const attractorPaths = useMemo(() => generateAttractorPaths(CX, CY, MAP_W * 0.5), []);
  
  // Generate four corner spirals (lobes)
  const lobeSpirals = useMemo(() => {
    const lobeRadius = MAP_W * 0.22;
    const lobeOffset = MAP_W * 0.25;
    return [
      // Top-left lobe
      generateLobeSpiral(CX - lobeOffset, CY - lobeOffset * 0.6, Math.PI, lobeRadius, 2.5),
      // Top-right lobe
      generateLobeSpiral(CX + lobeOffset, CY - lobeOffset * 0.6, 0, lobeRadius, 2.5),
      // Bottom-left lobe
      generateLobeSpiral(CX - lobeOffset, CY + lobeOffset * 0.6, Math.PI, lobeRadius, 2.5),
      // Bottom-right lobe
      generateLobeSpiral(CX + lobeOffset, CY + lobeOffset * 0.6, 0, lobeRadius, 2.5),
    ];
  }, []);

  // Infinity core paths
  const infinityPaths = useMemo(() => {
    const paths = [];
    for (let i = 0; i < 8; i++) {
      paths.push(generateInfinityCore(CX, CY, MAP_W * (0.35 + i * 0.02), MAP_H * (0.2 + i * 0.015)));
    }
    return paths;
  }, []);

  // Animations
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 60000,
        easing: Easing.linear,
        useNativeDriver: false,
      })
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 2000, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
        Animated.timing(pulseAnim, { toValue: 0, duration: 2000, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
      ])
    ).start();
  }, []);

  // Find active position
  const activePos = allPositions.find(p => p.key.id === activeKey);
  const activeColor = activePos?.key.color || '#ff0a0a';

  return (
    <View style={st.container}>
      <Svg width={MAP_W} height={MAP_H} viewBox={`0 0 ${MAP_W} ${MAP_H}`}>
        <Defs>
          {/* Deep black background */}
          <RadialGradient id="bg-grad" cx="50%" cy="50%" r="70%">
            <Stop offset="0%" stopColor="#0a0000" stopOpacity="1" />
            <Stop offset="100%" stopColor="#000000" stopOpacity="1" />
          </RadialGradient>

          {/* Center white glow */}
          <RadialGradient id="center-glow" cx="50%" cy="50%" r="20%">
            <Stop offset="0%" stopColor="#ffffff" stopOpacity={isEmitting ? '1' : '0.8'} />
            <Stop offset="30%" stopColor="#ff6060" stopOpacity={isEmitting ? '0.6' : '0.3'} />
            <Stop offset="60%" stopColor="#ff0a0a" stopOpacity={isEmitting ? '0.3' : '0.1'} />
            <Stop offset="100%" stopColor="#ff0a0a" stopOpacity="0" />
          </RadialGradient>

          {/* Attractor glow */}
          <RadialGradient id="attractor-glow" cx="50%" cy="50%" r="60%">
            <Stop offset="0%" stopColor="#ff0a0a" stopOpacity="0" />
            <Stop offset="40%" stopColor="#ff0a0a" stopOpacity={isEmitting ? '0.15' : '0.05'} />
            <Stop offset="100%" stopColor="#ff0000" stopOpacity="0" />
          </RadialGradient>

          {/* Horizontal light beam */}
          <LinearGradient id="h-beam" x1="0%" y1="50%" x2="100%" y2="50%">
            <Stop offset="0%" stopColor="#ff0a0a" stopOpacity="0" />
            <Stop offset="40%" stopColor="#ffffff" stopOpacity={isEmitting ? '0.4' : '0.2'} />
            <Stop offset="50%" stopColor="#ffffff" stopOpacity={isEmitting ? '0.8' : '0.4'} />
            <Stop offset="60%" stopColor="#ffffff" stopOpacity={isEmitting ? '0.4' : '0.2'} />
            <Stop offset="100%" stopColor="#ff0a0a" stopOpacity="0" />
          </LinearGradient>

          {/* Vertical light beam */}
          <LinearGradient id="v-beam" x1="50%" y1="0%" x2="50%" y2="100%">
            <Stop offset="0%" stopColor="#ff0a0a" stopOpacity="0" />
            <Stop offset="40%" stopColor="#ffffff" stopOpacity={isEmitting ? '0.3' : '0.15'} />
            <Stop offset="50%" stopColor="#ffffff" stopOpacity={isEmitting ? '0.6' : '0.3'} />
            <Stop offset="60%" stopColor="#ffffff" stopOpacity={isEmitting ? '0.3' : '0.15'} />
            <Stop offset="100%" stopColor="#ff0a0a" stopOpacity="0" />
          </LinearGradient>

          {/* Node glows */}
          {allPositions.map((p, i) => (
            <RadialGradient key={`ng-${i}`} id={`ng-${i}`} cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor={p.key.color} stopOpacity={activeKey === p.key.id ? '1' : '0.6'} />
              <Stop offset="50%" stopColor={p.key.color} stopOpacity={activeKey === p.key.id ? '0.4' : '0.15'} />
              <Stop offset="100%" stopColor={p.key.color} stopOpacity="0" />
            </RadialGradient>
          ))}
        </Defs>

        {/* Background */}
        <Rect x="0" y="0" width={MAP_W} height={MAP_H} fill="url(#bg-grad)" />

        {/* ═══ INFINITY ATTRACTOR BACKGROUND ═══ */}
        
        {/* Outer glow layer */}
        <Ellipse
          cx={CX}
          cy={CY}
          rx={MAP_W * 0.48}
          ry={MAP_H * 0.35}
          fill="url(#attractor-glow)"
        />

        {/* Butterfly/Attractor curves - multiple layers for depth */}
        {attractorPaths.map((path, i) => (
          <Path
            key={`attractor-${i}`}
            d={path}
            fill="none"
            stroke="#ff0a0a"
            strokeWidth={i < 3 ? 0.3 : 0.5 + (i - 3) * 0.1}
            opacity={0.08 + i * 0.03}
          />
        ))}

        {/* Infinity core shapes */}
        {infinityPaths.map((path, i) => (
          <Path
            key={`infinity-${i}`}
            d={path}
            fill="none"
            stroke="#ff0a0a"
            strokeWidth={0.8 + i * 0.15}
            opacity={isEmitting ? 0.25 + i * 0.05 : 0.1 + i * 0.03}
          />
        ))}

        {/* Four spiral lobes */}
        {lobeSpirals.map((path, i) => (
          <G key={`lobe-group-${i}`}>
            {/* Outer glow */}
            <Path
              d={path}
              fill="none"
              stroke="#ff0a0a"
              strokeWidth={4}
              opacity={isEmitting ? 0.15 : 0.05}
              strokeLinecap="round"
            />
            {/* Mid layer */}
            <Path
              d={path}
              fill="none"
              stroke="#ff2020"
              strokeWidth={2}
              opacity={isEmitting ? 0.3 : 0.12}
              strokeLinecap="round"
            />
            {/* Core */}
            <Path
              d={path}
              fill="none"
              stroke="#ff4040"
              strokeWidth={1}
              opacity={isEmitting ? 0.5 : 0.2}
              strokeLinecap="round"
            />
          </G>
        ))}

        {/* Additional spiral details in each lobe */}
        {[0, 1, 2, 3].map((lobeIdx) => {
          const lobeOffset = MAP_W * 0.25;
          const centers = [
            { x: CX - lobeOffset, y: CY - lobeOffset * 0.6 },
            { x: CX + lobeOffset, y: CY - lobeOffset * 0.6 },
            { x: CX - lobeOffset, y: CY + lobeOffset * 0.6 },
            { x: CX + lobeOffset, y: CY + lobeOffset * 0.6 },
          ];
          const c = centers[lobeIdx];
          
          // Concentric circles in each lobe
          return [0.15, 0.1, 0.06].map((r, ri) => (
            <SvgCircle
              key={`lobe-circle-${lobeIdx}-${ri}`}
              cx={c.x}
              cy={c.y}
              r={MAP_W * r}
              fill="none"
              stroke="#ff0a0a"
              strokeWidth={0.5}
              opacity={isEmitting ? 0.2 - ri * 0.05 : 0.08 - ri * 0.02}
            />
          ));
        })}

        {/* Cross light beams through center */}
        <Rect
          x={0}
          y={CY - 2}
          width={MAP_W}
          height={4}
          fill="url(#h-beam)"
        />
        <Rect
          x={CX - 2}
          y={0}
          width={4}
          height={MAP_H}
          fill="url(#v-beam)"
        />

        {/* Center starburst */}
        {[0, 45, 90, 135].map((angle) => (
          <Line
            key={`ray-${angle}`}
            x1={CX - Math.cos(angle * Math.PI / 180) * MAP_W * 0.5}
            y1={CY - Math.sin(angle * Math.PI / 180) * MAP_H * 0.4}
            x2={CX + Math.cos(angle * Math.PI / 180) * MAP_W * 0.5}
            y2={CY + Math.sin(angle * Math.PI / 180) * MAP_H * 0.4}
            stroke="#ff0a0a"
            strokeWidth={0.5}
            opacity={isEmitting ? 0.15 : 0.05}
          />
        ))}

        {/* Central white glow point */}
        <SvgCircle
          cx={CX}
          cy={CY}
          r={MAP_W * 0.12}
          fill="url(#center-glow)"
        />

        {/* Hot center point */}
        <SvgCircle
          cx={CX}
          cy={CY}
          r={isEmitting ? 8 : 5}
          fill="#ffffff"
          opacity={isEmitting ? 1 : 0.9}
        />
        <SvgCircle
          cx={CX}
          cy={CY}
          r={isEmitting ? 4 : 2}
          fill="#ffffff"
        />

        {/* Connection lines from active node to center */}
        {activeKey && activePos && (
          <Line
            x1={activePos.x}
            y1={activePos.y}
            x2={CX}
            y2={CY}
            stroke={activeColor}
            strokeWidth={1.5}
            opacity={0.5}
            strokeDasharray="4,4"
          />
        )}

        {/* Harmonic connections */}
        {activeKey && allPositions.map((p, i) => {
          const level = getHarmonicLevel(activeKey, p.key.id);
          if (level === 'none' || level === 'selected') return null;
          return (
            <Line
              key={`harm-${i}`}
              x1={activePos?.x ?? CX}
              y1={activePos?.y ?? CY}
              x2={p.x}
              y2={p.y}
              stroke={p.key.color}
              strokeWidth={level === 'primary' ? 1.2 : 0.5}
              opacity={level === 'primary' ? 0.5 : 0.2}
            />
          );
        })}

        {/* ═══ OUTER RING — 12 A Keys ═══ */}
        {outerKeys.map((p, i) => {
          const level = getHarmonicLevel(activeKey, p.key.id);
          const isActive = level === 'selected';
          const isPrimary = level === 'primary';
          const nodeR = isActive ? 18 : p.r;

          return (
            <G key={`o-${i}`} onPress={() => onKeyPress(p.key)}>
              {/* Glow halo */}
              <SvgCircle
                cx={p.x} cy={p.y}
                r={isActive ? nodeR * 2.5 : isPrimary ? nodeR * 1.8 : nodeR * 1.5}
                fill={`url(#ng-${i})`}
                opacity={isActive ? 1 : isPrimary ? 0.7 : 0.3}
              />

              {/* Node body */}
              <SvgCircle
                cx={p.x} cy={p.y} r={nodeR}
                fill="#050000"
                stroke={p.key.color}
                strokeWidth={isActive ? 2 : isPrimary ? 1.2 : 0.8}
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
                r={isActive ? 3 : 1.5}
                fill="#ffffff"
                opacity={isActive ? 1 : 0.4}
              />

              {/* Key label */}
              <SvgText
                x={p.x} y={p.y - nodeR - 4}
                fill={isActive ? '#ffffff' : p.key.color}
                fontSize={isActive ? 7 : 6}
                fontWeight="800"
                textAnchor="middle"
                opacity={isActive ? 1 : 0.8}
              >
                {p.key.id}
              </SvgText>

              {/* Note name */}
              <SvgText
                x={p.x} y={p.y + 3}
                fill="#ffffff"
                fontSize={isActive ? 7 : 5}
                fontWeight="800"
                textAnchor="middle"
                opacity={isActive ? 1 : 0.7}
              >
                {p.key.note}
              </SvgText>
            </G>
          );
        })}

        {/* ═══ INNER RING — 12 B Keys ═══ */}
        {innerKeys.map((p, idx) => {
          const i = idx + 12;
          const level = getHarmonicLevel(activeKey, p.key.id);
          const isActive = level === 'selected';
          const isPrimary = level === 'primary';
          const nodeR = isActive ? 15 : p.r;

          return (
            <G key={`i-${idx}`} onPress={() => onKeyPress(p.key)}>
              {/* Glow */}
              <SvgCircle
                cx={p.x} cy={p.y}
                r={isActive ? nodeR * 2.2 : nodeR * 1.4}
                fill={`url(#ng-${i})`}
                opacity={isActive ? 1 : isPrimary ? 0.6 : 0.25}
              />

              {/* Node body */}
              <SvgCircle
                cx={p.x} cy={p.y} r={nodeR}
                fill="#050000"
                stroke={p.key.color}
                strokeWidth={isActive ? 1.8 : isPrimary ? 1 : 0.6}
              />

              {/* Inner fill */}
              <SvgCircle
                cx={p.x} cy={p.y}
                r={nodeR * 0.45}
                fill={p.key.color}
                opacity={isActive ? 1 : 0.4}
              />

              {/* Hot pixel */}
              <SvgCircle
                cx={p.x} cy={p.y}
                r={isActive ? 2 : 1}
                fill="#ffffff"
                opacity={isActive ? 1 : 0.3}
              />

              {/* Label */}
              <SvgText
                x={p.x} y={p.y - nodeR - 3}
                fill={isActive ? '#ffffff' : p.key.color}
                fontSize={isActive ? 6 : 5}
                fontWeight="800"
                textAnchor="middle"
                opacity={isActive ? 1 : 0.7}
              >
                {p.key.id}
              </SvgText>

              {/* Note */}
              <SvgText
                x={p.x} y={p.y + 2.5}
                fill="#ffffff"
                fontSize={isActive ? 6 : 4.5}
                fontWeight="800"
                textAnchor="middle"
                opacity={isActive ? 1 : 0.6}
              >
                {p.key.note}
              </SvgText>
            </G>
          );
        })}

        {/* Corner markers */}
        <SvgText x={6} y={MAP_H - 6} fill="#ff0a0a" fontSize={5} opacity={0.15} letterSpacing={1}>
          96 MIRRORS
        </SvgText>
        <SvgText x={MAP_W - 6} y={MAP_H - 6} fill="#ff0a0a" fontSize={5} opacity={0.15} letterSpacing={1} textAnchor="end">
          432Hz TUNED
        </SvgText>
      </Svg>

      {/* Active key info overlay */}
      {activeKey && activePos && (
        <View style={st.infoOverlay}>
          <View style={[st.infoBadge, { borderColor: activePos.key.color }]}>
            <Text style={[st.infoKey, { color: activePos.key.color }]}>{activePos.key.id}</Text>
            <Text style={st.infoNote}>{activePos.key.note}</Text>
            <Text style={st.infoFreq}>{activePos.key.freq} Hz</Text>
          </View>
        </View>
      )}

      {/* Legend */}
      <View style={st.legend}>
        <Text style={st.legendItem}>◯ OUTER = MINOR (A)</Text>
        <Text style={st.legendItem}>● INNER = MAJOR (B)</Text>
        <Text style={st.legendItem}>TAP TO EMIT</Text>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderColor: '#ff0a0a20',
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
    backgroundColor: '#000000ee',
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
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#ff0a0a10',
  },
  legendItem: {
    color: '#ff0a0a40',
    fontSize: 7,
    letterSpacing: 1.5,
  },
});
