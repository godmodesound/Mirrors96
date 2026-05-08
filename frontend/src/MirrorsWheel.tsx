import React, { useMemo, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions, Animated, TouchableOpacity, GestureResponderEvent, Platform } from 'react-native';
import Svg, {
  Path,
  Circle as SvgCircle,
  Text as SvgText,
  G,
  Defs,
  LinearGradient,
  RadialGradient,
  Stop,
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

// ═══════════════════════════════════════════════════════════
//  HARMONIC COMPATIBILITY ENGINE
// ═══════════════════════════════════════════════════════════
export type HarmonicLevel = 'selected' | 'primary' | 'secondary' | 'none';

export function getHarmonicLevel(selectedId: string | null, testId: string): HarmonicLevel {
  if (!selectedId) return 'none';
  if (selectedId === testId) return 'selected';
  const selNum = parseInt(selectedId.replace(/[AB]/, ''));
  const selLetter = selectedId.includes('A') ? 'A' : 'B';
  const testNum = parseInt(testId.replace(/[AB]/, ''));
  const testLetter = testId.includes('A') ? 'A' : 'B';
  const numDiff = Math.abs(selNum - testNum);
  const isAdjacent = numDiff === 1 || numDiff === 11;
  if (isAdjacent && selLetter === testLetter) return 'primary';
  if (selNum === testNum && selLetter !== testLetter) return 'primary';
  if (isAdjacent && selLetter !== testLetter) return 'secondary';
  return 'none';
}

function getHarmonicRelation(selectedId: string, testId: string): string {
  const selNum = parseInt(selectedId.replace(/[AB]/, ''));
  const selLetter = selectedId.includes('A') ? 'A' : 'B';
  const testNum = parseInt(testId.replace(/[AB]/, ''));
  const testLetter = testId.includes('A') ? 'A' : 'B';
  const numDiff = Math.abs(selNum - testNum);
  const isAdjacent = numDiff === 1 || numDiff === 11;
  if (isAdjacent && selLetter === testLetter) {
    return testNum > selNum || (selNum === 12 && testNum === 1) ? '+1 Energy' : '-1 Energy';
  }
  if (selNum === testNum && selLetter !== testLetter) return 'A↔B Mood';
  if (isAdjacent && selLetter !== testLetter) return 'Bridge';
  return '';
}

// ═══════════════════════════════════════════════════════════
//  MIRRORS WHEEL COMPONENT
// ═══════════════════════════════════════════════════════════
interface MirrorsWheelProps {
  activeKey: string | null;
  onKeyPress: (key: CamelotKey) => void;
  isEmitting?: boolean;
}

export const MirrorsWheel: React.FC<MirrorsWheelProps> = ({ activeKey, onKeyPress, isEmitting = false }) => {
  const wheelSize = Math.min(SCREEN_WIDTH - 32, 340);
  const cx = wheelSize / 2;
  const cy = wheelSize / 2;

  const outerR = wheelSize / 2 - 4;
  const midR = outerR * 0.64;
  const innerR = outerR * 0.32;
  const centerR = innerR - 2;

  const aKeys = CAMELOT_KEYS.slice(0, 12);
  const bKeys = CAMELOT_KEYS.slice(12, 24);

  // Pulse animation
  const pulseAnim = useRef(new Animated.Value(0.7)).current;
  useEffect(() => {
    if (activeKey) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: false }),
          Animated.timing(pulseAnim, { toValue: 0.7, duration: 800, useNativeDriver: false }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      pulseAnim.setValue(0.7);
    }
  }, [activeKey]);

  const harmonicMap = useMemo(() => {
    const map: Record<string, HarmonicLevel> = {};
    CAMELOT_KEYS.forEach(k => { map[k.id] = getHarmonicLevel(activeKey, k.id); });
    return map;
  }, [activeKey]);

  const harmonicDetails = useMemo(() => {
    if (!activeKey) return [];
    return CAMELOT_KEYS
      .filter(k => harmonicMap[k.id] === 'primary' || harmonicMap[k.id] === 'secondary')
      .map(k => ({
        id: k.id, note: k.note, freq: k.freq, color: k.color,
        level: harmonicMap[k.id],
        relation: getHarmonicRelation(activeKey, k.id),
      }));
  }, [activeKey, harmonicMap]);

  // SVG geometry helpers
  const polarToCart = (r: number, deg: number) => {
    const rad = ((deg - 90) * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  };

  const arcSegment = (startAngle: number, endAngle: number, r1: number, r2: number) => {
    const s1 = polarToCart(r1, startAngle);
    const e1 = polarToCart(r1, endAngle);
    const s2 = polarToCart(r2, endAngle);
    const e2 = polarToCart(r2, startAngle);
    const largeArc = endAngle - startAngle > 180 ? 1 : 0;
    return `M ${s1.x} ${s1.y} A ${r1} ${r1} 0 ${largeArc} 1 ${e1.x} ${e1.y} L ${s2.x} ${s2.y} A ${r2} ${r2} 0 ${largeArc} 0 ${e2.x} ${e2.y} Z`;
  };

  const segAngle = 30;
  const gap = 0.8;

  // ═══════════════════════════════════════════════════════════
  //  COORDINATE-BASED TAP DETECTION (Reliable on native iOS)
  //  Instead of SVG onPress, we detect which segment was tapped
  //  based on the (x, y) position relative to the wheel center.
  // ═══════════════════════════════════════════════════════════
  const svgContainerRef = useRef<View>(null);

  const handleWheelTap = (event: GestureResponderEvent) => {
    const { locationX, locationY } = event.nativeEvent;

    // Calculate distance from center and angle
    const dx = locationX - cx;
    const dy = locationY - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Check which ring was tapped
    if (dist < innerR || dist > outerR) return; // Outside wheel or in center

    // Calculate angle in degrees (0 = top, clockwise)
    let angle = Math.atan2(dx, -dy) * (180 / Math.PI);
    if (angle < 0) angle += 360;

    // Determine segment index (0-11)
    const segIndex = Math.floor(angle / segAngle);

    // Determine which ring
    let tappedKey: CamelotKey | undefined;
    if (dist >= midR && dist <= outerR) {
      // Outer ring — Major (B)
      tappedKey = bKeys[segIndex];
    } else if (dist >= innerR && dist < midR) {
      // Inner ring — Minor (A)
      tappedKey = aKeys[segIndex];
    }

    if (tappedKey) {
      console.log('[MirrorsWheel] Tapped:', tappedKey.id, tappedKey.note, tappedKey.freq, 'Hz');
      onKeyPress(tappedKey);
    }
  };

  const getSegmentStyle = (key: CamelotKey, level: HarmonicLevel) => {
    switch (level) {
      case 'selected':
        return {
          fill: key.color, fillOpacity: 0.95,
          stroke: '#ffffff', strokeWidth: 2.5, strokeOpacity: 0.9,
          textColor: '#ffffff', textOpacity: 1, noteColor: '#ffffff', glowOpacity: 0.6,
        };
      case 'primary':
        return {
          fill: key.color, fillOpacity: 0.55,
          stroke: key.color, strokeWidth: 1.8, strokeOpacity: 0.8,
          textColor: '#ffffff', textOpacity: 1, noteColor: key.color, glowOpacity: 0.3,
        };
      case 'secondary':
        return {
          fill: key.color, fillOpacity: 0.25,
          stroke: key.color, strokeWidth: 1, strokeOpacity: 0.5,
          textColor: key.color, textOpacity: 0.8, noteColor: key.color + 'AA', glowOpacity: 0.1,
        };
      default:
        return {
          fill: activeKey ? '#1a1c2a' : key.colorDim, fillOpacity: activeKey ? 0.6 : 0.35,
          stroke: activeKey ? '#2a2c3a' : '#3a3c4a', strokeWidth: 0.5, strokeOpacity: activeKey ? 0.4 : 0.6,
          textColor: activeKey ? '#555568' : '#9a9ab0', textOpacity: activeKey ? 0.5 : 0.85,
          noteColor: activeKey ? '#444458' : '#7a7a90', glowOpacity: 0,
        };
    }
  };

  const renderSegment = (key: CamelotKey, index: number, r1: number, r2: number, isOuter: boolean) => {
    const start = index * segAngle + gap / 2;
    const end = (index + 1) * segAngle - gap / 2;
    const mid = index * segAngle + segAngle / 2;
    const level = harmonicMap[key.id];
    const style = getSegmentStyle(key, level);

    const labelR = (r1 + r2) / 2;
    const labelPos = polarToCart(labelR, mid);
    const noteR = isOuter ? labelR + (r1 - r2) * 0.22 : labelR - (r1 - r2) * 0.22;
    const notePos = polarToCart(noteR, mid);

    const sheenR1 = r1 - (r1 - r2) * 0.05;
    const sheenR2 = r1 - (r1 - r2) * 0.3;

    const segPath = arcSegment(start, end, r1, r2);

    return (
      <G key={key.id}>
        {/* Base metallic layer */}
        <Path d={segPath} fill="#181a28" stroke="#0a0b14" strokeWidth={0.5} />
        {/* Color layer */}
        <Path d={segPath} fill={style.fill} opacity={style.fillOpacity}
          stroke={style.stroke} strokeWidth={style.strokeWidth} strokeOpacity={style.strokeOpacity} />
        {/* Metallic specular highlight */}
        <Path d={arcSegment(start + 1, end - 1, sheenR1, sheenR2)}
          fill="url(#metallicSheen)" opacity={level === 'selected' ? 0.5 : (level === 'none' ? 0.12 : 0.25)} />
        {/* Glow edge for selected/primary */}
        {style.glowOpacity > 0 && (
          <Path d={arcSegment(start, end, r1 + 1, r1 - 2)} fill={key.color} opacity={style.glowOpacity} />
        )}
        {/* Camelot ID label */}
        <SvgText x={labelPos.x} y={labelPos.y + (isOuter ? -2 : 1)}
          fill={style.textColor} opacity={style.textOpacity}
          fontSize={isOuter ? 11 : 9.5} fontWeight="bold" textAnchor="middle">
          {key.id}
        </SvgText>
        {/* Musical note subtitle */}
        <SvgText x={notePos.x} y={notePos.y + (isOuter ? 2 : 1)}
          fill={style.noteColor} opacity={style.textOpacity * 0.8}
          fontSize={isOuter ? 7.5 : 6.5} textAnchor="middle">
          {key.note}
        </SvgText>
      </G>
    );
  };

  const selectedKey = activeKey ? CAMELOT_KEYS.find(k => k.id === activeKey) : null;

  return (
    <View style={wheelStyles.wrapper}>
      {/* Animated pulse border when emitting */}
      {activeKey && selectedKey && (
        <Animated.View style={[
          wheelStyles.pulseRing,
          {
            width: wheelSize + 16, height: wheelSize + 16,
            borderRadius: (wheelSize + 16) / 2,
            borderColor: selectedKey.color,
            opacity: pulseAnim,
          }
        ]} />
      )}

      {/* SVG Wheel wrapped in a touchable View for reliable tap detection */}
      <View
        ref={svgContainerRef}
        onStartShouldSetResponder={() => true}
        onResponderRelease={handleWheelTap}
        style={{ width: wheelSize, height: wheelSize }}
      >
        <Svg width={wheelSize} height={wheelSize}>
          <Defs>
            <LinearGradient id="metallicSheen" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#ffffff" stopOpacity="0.8" />
              <Stop offset="0.3" stopColor="#c0c0d0" stopOpacity="0.3" />
              <Stop offset="0.7" stopColor="#808090" stopOpacity="0.05" />
              <Stop offset="1" stopColor="#000000" stopOpacity="0" />
            </LinearGradient>
            <RadialGradient id="mirrorCenter" cx="50%" cy="40%" rx="50%" ry="50%">
              <Stop offset="0" stopColor="#4a4a60" stopOpacity="1" />
              <Stop offset="0.3" stopColor="#2a2a3a" stopOpacity="1" />
              <Stop offset="0.6" stopColor="#1a1a28" stopOpacity="1" />
              <Stop offset="1" stopColor="#0a0a14" stopOpacity="1" />
            </RadialGradient>
            <RadialGradient id="mirrorHighlight" cx="45%" cy="35%" rx="40%" ry="40%">
              <Stop offset="0" stopColor="#ffffff" stopOpacity="0.25" />
              <Stop offset="0.5" stopColor="#ffffff" stopOpacity="0.05" />
              <Stop offset="1" stopColor="#ffffff" stopOpacity="0" />
            </RadialGradient>
            <RadialGradient id="wheelBase" cx="50%" cy="50%" rx="50%" ry="50%">
              <Stop offset="0" stopColor="#1e2030" stopOpacity="1" />
              <Stop offset="0.7" stopColor="#14162a" stopOpacity="1" />
              <Stop offset="1" stopColor="#0a0c1a" stopOpacity="1" />
            </RadialGradient>
            <LinearGradient id="chromeLine" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor="#555570" stopOpacity="0.8" />
              <Stop offset="0.5" stopColor="#8888a0" stopOpacity="1" />
              <Stop offset="1" stopColor="#555570" stopOpacity="0.8" />
            </LinearGradient>
          </Defs>

          {/* Background disk */}
          <SvgCircle cx={cx} cy={cy} r={outerR + 2} fill="url(#wheelBase)" />
          <SvgCircle cx={cx} cy={cy} r={outerR + 1} fill="none" stroke="#3a3c50" strokeWidth={1.5} />

          {/* Outer ring segments (B — Major Keys) */}
          {bKeys.map((key, i) => renderSegment(key, i, outerR, midR, true))}
          <SvgCircle cx={cx} cy={cy} r={midR} fill="none" stroke="url(#chromeLine)" strokeWidth={1.5} />

          {/* Inner ring segments (A — Minor Keys) */}
          {aKeys.map((key, i) => renderSegment(key, i, midR, innerR, false))}
          <SvgCircle cx={cx} cy={cy} r={innerR} fill="none" stroke="url(#chromeLine)" strokeWidth={1.5} />

          {/* Center mirror circle */}
          <SvgCircle cx={cx} cy={cy} r={centerR} fill="url(#mirrorCenter)" />
          <SvgCircle cx={cx} cy={cy} r={centerR} fill="url(#mirrorHighlight)" />
          <SvgCircle cx={cx} cy={cy} r={centerR} fill="none" stroke="#5a5a70" strokeWidth={1} />
          <Ellipse cx={cx - 4} cy={cy - 6} rx={6} ry={3} fill="#ffffff" opacity={0.15} />

          {/* Center text — shows frequency when playing */}
          {selectedKey ? (
            <>
              <SvgText x={cx} y={cy - 10} fill={selectedKey.color} fontSize={12} fontWeight="bold" textAnchor="middle">
                {selectedKey.freq.toFixed(1)}
              </SvgText>
              <SvgText x={cx} y={cy + 4} fill={selectedKey.color} fontSize={8} textAnchor="middle" opacity={0.8}>
                Hz
              </SvgText>
              <SvgText x={cx} y={cy + 16} fill="#6a6a80" fontSize={6} textAnchor="middle" opacity={0.6}>
                EMITTING
              </SvgText>
            </>
          ) : (
            <>
              <SvgText x={cx} y={cy - 5} fill="#9a9ab8" fontSize={10} fontWeight="bold" textAnchor="middle" opacity={0.9}>
                MIRRORS
              </SvgText>
              <SvgText x={cx} y={cy + 8} fill="#6a6a80" fontSize={8} textAnchor="middle" opacity={0.7}>
                WHEEL
              </SvgText>
            </>
          )}

          <SvgCircle cx={cx} cy={cy} r={outerR + 1.5} fill="none" stroke="#50506a" strokeWidth={0.5} opacity={0.6} />
        </Svg>
      </View>

      {/* Now-Playing Info Bar */}
      {selectedKey && (
        <View style={[wheelStyles.nowPlaying, { borderColor: selectedKey.color + '40' }]}>
          <View style={wheelStyles.nowPlayingTop}>
            <View style={[wheelStyles.emitDot, { backgroundColor: selectedKey.color }]} />
            <Text style={[wheelStyles.nowPlayingKey, { color: selectedKey.color }]}>{activeKey}</Text>
            <Text style={wheelStyles.nowPlayingSep}>·</Text>
            <Text style={[wheelStyles.nowPlayingNote, { color: selectedKey.color }]}>{selectedKey.note}</Text>
            <Text style={wheelStyles.nowPlayingSep}>·</Text>
            <Text style={[wheelStyles.nowPlayingFreq, { color: selectedKey.color }]}>{selectedKey.freq.toFixed(1)} Hz</Text>
            <Text style={[wheelStyles.emitLabel, { color: selectedKey.color }]}>EMITTING</Text>
          </View>
        </View>
      )}

      {/* Harmonic Matches Panel */}
      {activeKey && harmonicDetails.length > 0 && (
        <View style={wheelStyles.harmonicPanel}>
          <Text style={wheelStyles.harmonicTitle}>HARMONIC MATCHES</Text>
          <View style={wheelStyles.harmonicGrid}>
            {harmonicDetails.map(h => (
              <TouchableOpacity
                key={h.id}
                style={[wheelStyles.harmonicChip, {
                  borderColor: h.color + (h.level === 'primary' ? '80' : '40'),
                  backgroundColor: h.color + (h.level === 'primary' ? '15' : '08'),
                }]}
                onPress={() => {
                  const k = CAMELOT_KEYS.find(ck => ck.id === h.id);
                  if (k) onKeyPress(k);
                }}
                activeOpacity={0.7}
              >
                <View style={wheelStyles.chipRow}>
                  <View style={[wheelStyles.chipDot, { backgroundColor: h.color }]} />
                  <Text style={[wheelStyles.chipId, { color: h.color }]}>{h.id}</Text>
                  <Text style={[wheelStyles.chipNote, { color: h.color + 'CC' }]}>{h.note}</Text>
                </View>
                <Text style={[wheelStyles.chipFreq, { color: h.color + '99' }]}>{h.freq.toFixed(1)} Hz</Text>
                <View style={[wheelStyles.chipRelation, { backgroundColor: h.color + '20' }]}>
                  <Text style={[wheelStyles.chipRelationText, { color: h.color }]}>{h.relation}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* Mixing rules reference */}
          <View style={wheelStyles.rulesBox}>
            <Text style={wheelStyles.rulesTitle}>CAMELOT MIXING RULES</Text>
            <View style={wheelStyles.ruleRow}>
              <View style={[wheelStyles.ruleDot, { backgroundColor: '#00E5FF' }]} />
              <Text style={wheelStyles.ruleText}>±1 Same Letter = Energy shift (up or down)</Text>
            </View>
            <View style={wheelStyles.ruleRow}>
              <View style={[wheelStyles.ruleDot, { backgroundColor: '#FF9100' }]} />
              <Text style={wheelStyles.ruleText}>Same Number A↔B = Major/Minor mood shift</Text>
            </View>
            <View style={wheelStyles.ruleRow}>
              <View style={[wheelStyles.ruleDot, { backgroundColor: '#651FFF', opacity: 0.5 }]} />
              <Text style={wheelStyles.ruleText}>±1 Different Letter = Energy bridge</Text>
            </View>
          </View>
        </View>
      )}

      {/* Ring labels (when nothing selected) */}
      {!activeKey && (
        <View style={wheelStyles.ringLabels}>
          <Text style={wheelStyles.ringLabel}>Outer = Major (B)</Text>
          <Text style={wheelStyles.ringLabelSep}>·</Text>
          <Text style={wheelStyles.ringLabel}>Inner = Minor (A)</Text>
          <Text style={wheelStyles.ringLabelSep}>·</Text>
          <Text style={wheelStyles.ringLabel}>Tap to emit</Text>
        </View>
      )}
    </View>
  );
};

const wheelStyles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  pulseRing: {
    position: 'absolute',
    top: 0,
    borderWidth: 2,
    alignSelf: 'center',
    pointerEvents: 'none' as any,
  },
  nowPlaying: {
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    backgroundColor: '#0c0d18',
    borderRadius: 8,
    width: '92%',
  },
  nowPlayingTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  emitDot: { width: 8, height: 8, borderRadius: 4 },
  nowPlayingKey: { fontSize: 14, fontWeight: '800' },
  nowPlayingSep: { color: '#4a4a60', fontSize: 12 },
  nowPlayingNote: { fontSize: 12, fontWeight: '600' },
  nowPlayingFreq: { fontSize: 12, fontWeight: '700' },
  emitLabel: { fontSize: 8, fontWeight: '700', opacity: 0.6, marginLeft: 4 },
  harmonicPanel: {
    marginTop: 10,
    width: '92%',
    backgroundColor: '#0c0d18',
    borderWidth: 1,
    borderColor: '#2a2c3a',
    borderRadius: 8,
    padding: 12,
  },
  harmonicTitle: {
    color: '#7a7a98',
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: 2,
  },
  harmonicGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'center',
  },
  harmonicChip: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: 'center',
    minWidth: 80,
  },
  chipRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  chipDot: { width: 6, height: 6, borderRadius: 3 },
  chipId: { fontSize: 12, fontWeight: '800' },
  chipNote: { fontSize: 9, fontWeight: '600' },
  chipFreq: { fontSize: 8, marginTop: 2 },
  chipRelation: { marginTop: 3, paddingHorizontal: 6, paddingVertical: 1, borderRadius: 3 },
  chipRelationText: { fontSize: 7, fontWeight: '700' },
  rulesBox: { marginTop: 10, borderTopWidth: 1, borderTopColor: '#1a1c2a', paddingTop: 8 },
  rulesTitle: { color: '#5a5a70', fontSize: 8, fontWeight: '700', marginBottom: 4, letterSpacing: 1 },
  ruleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 },
  ruleDot: { width: 6, height: 6, borderRadius: 3 },
  ruleText: { color: '#5a5a70', fontSize: 8 },
  ringLabels: { flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 6 },
  ringLabel: { color: '#4a4a60', fontSize: 8, fontWeight: '600' },
  ringLabelSep: { color: '#3a3a50', fontSize: 8 },
});

export default MirrorsWheel;
