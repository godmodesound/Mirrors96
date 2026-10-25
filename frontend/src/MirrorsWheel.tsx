import React, { useId } from 'react';
import { svgPress } from './svgPress';
import { View, Text } from 'react-native';
import { skinStyles, SK } from './skins';
import { MirrorDefs, MirrorRing, MirrorNode } from './MirrorFinish';

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
} from 'react-native-svg';

export interface CamelotKey {
  id: string;
  num: number;
  letter: 'A' | 'B';
  note: string;
  freq: number;
  color: string;
  colorDim: string;
}

// ═══ 432 Hz CHAKRA-CORRECT COLOR SPECTRUM ═══
// Colors mapped from each Camelot number's MAJOR-KEY note using the
// 7 primary chakras (C=Root/Red → B=Crown/Violet), with accurate
// semitone interpolations. Both A (minor) and B (major) at a given
// number share the same chakra hue since they are relative modes.
//
//  Num  Major  Note  → Chakra              Color
//   1    B     Bmaj  → Crown / Violet     #E040FB
//   2    F♯    F♯maj → Heart-Throat / Cyan #00BCD4
//   3    D♭    D♭maj → Sacral-Root / Red-Orange #FF5722
//   4    A♭    A♭maj → Throat-Third Eye / Blue-Indigo #3F51B5
//   5    E♭    E♭maj → Solar-Sacral / Yellow-Orange   #FFC400
//   6    B♭    B♭maj → Third Eye-Crown / Indigo-Violet #9C27B0
//   7    F     Fmaj  → Heart / Green      #4CAF50
//   8    C     Cmaj  → Root / Red         #FF1A1A
//   9    G     Gmaj  → Throat / Blue      #2196F3
//  10    D     Dmaj  → Sacral / Orange    #FF9500
//  11    A     Amaj  → Third Eye / Indigo #673AB7
//  12    E     Emaj  → Solar / Yellow     #FFEB00
const SPECTRUM: Record<number, { bright: string; dim: string }> = {
  1:  { bright: '#E040FB', dim: '#4D1655' }, // B    · Crown Violet
  2:  { bright: '#00BCD4', dim: '#004954' }, // F♯   · Cyan
  3:  { bright: '#FF5722', dim: '#5A1F0D' }, // D♭   · Red-Orange
  4:  { bright: '#3F51B5', dim: '#1A2148' }, // A♭   · Blue-Indigo
  5:  { bright: '#FFC400', dim: '#5A4600' }, // E♭   · Yellow-Orange
  6:  { bright: '#9C27B0', dim: '#3C0F45' }, // B♭   · Violet
  7:  { bright: '#4CAF50', dim: '#173D19' }, // F    · Heart Green
  8:  { bright: '#FF1A1A', dim: '#5C0808' }, // C    · Root Red
  9:  { bright: '#2196F3', dim: '#0B3960' }, // G    · Throat Blue
  10: { bright: '#FF9500', dim: '#5A3600' }, // D    · Sacral Orange
  11: { bright: '#673AB7', dim: '#25164A' }, // A    · Third Eye Indigo
  12: { bright: '#FFEB00', dim: '#5A5400' }, // E    · Solar Yellow
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

// Note names for the MIRRORS 96 WHEEL (matching the reference image exactly)
const MIRRORS_WHEEL_NOTES: Record<string, { minor: string; major: string }> = {
  '1':  { minor: 'A-Flat Minor', major: 'B Major' },
  '2':  { minor: 'E-Flat Minor', major: 'F-Sharp Major' },
  '3':  { minor: 'B-Flat Minor', major: 'D-Flat Major' },
  '4':  { minor: 'F Minor', major: 'A-Flat Major' },
  '5':  { minor: 'C Minor', major: 'E-Flat Major' },
  '6':  { minor: 'G Minor', major: 'B-Flat Major' },
  '7':  { minor: 'D Minor', major: 'F Major' },
  '8':  { minor: 'A Minor', major: 'C Major' },
  '9':  { minor: 'E Minor', major: 'G Major' },
  '10': { minor: 'B Minor', major: 'D Major' },
  '11': { minor: 'F-Sharp Minor', major: 'A Major' },
  '12': { minor: 'D-Flat Minor', major: 'E Major' },
};

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
// Stable drawing coordinates, scaled to the actual container on every device.
const MAP_W = 360;
const MAP_H = MAP_W * 1.0;
const CX = MAP_W / 2;
const CY = MAP_H / 2;

// Generate arc path for wheel segments
function describeArc(cx: number, cy: number, innerR: number, outerR: number, startAngle: number, endAngle: number): string {
  const startRad = (startAngle - 90) * Math.PI / 180;
  const endRad = (endAngle - 90) * Math.PI / 180;
  const x1 = cx + innerR * Math.cos(startRad);
  const y1 = cy + innerR * Math.sin(startRad);
  const x2 = cx + outerR * Math.cos(startRad);
  const y2 = cy + outerR * Math.sin(startRad);
  const x3 = cx + outerR * Math.cos(endRad);
  const y3 = cy + outerR * Math.sin(endRad);
  const x4 = cx + innerR * Math.cos(endRad);
  const y4 = cy + innerR * Math.sin(endRad);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${x1} ${y1} L ${x2} ${y2} A ${outerR} ${outerR} 0 ${largeArc} 1 ${x3} ${y3} L ${x4} ${y4} A ${innerR} ${innerR} 0 ${largeArc} 0 ${x1} ${y1} Z`;
}

interface Props {
  activeKey: string | null;
  onKeyPress: (key: CamelotKey) => void;
  isEmitting: boolean;
}

export function MirrorsWheel({ activeKey, onKeyPress, isEmitting }: Props) {
  const chromeId = `wheel-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const activeKeyData = CAMELOT_KEYS.find(k => k.id === activeKey);

  // ═══════════════════════════════════════════════════════════════
  // MIRRORS 96 WHEEL VIEW (Dark Infrared Design - DEFAULT)
  // ═══════════════════════════════════════════════════════════════
  const renderMirrors96Wheel = () => {
    const outerRadius = MAP_W * 0.48;
    const middleRadius = MAP_W * 0.35;
    const innerRadius = MAP_W * 0.22;
    return (
      <Svg testID="mirrors-wheel-camelot" width="100%" height="100%" viewBox={`0 0 ${MAP_W} ${MAP_H}`}>
        <MirrorDefs id={chromeId} />
        <Defs>
          <RadialGradient id="m96-bg" cx="50%" cy="50%" r="55%">
            <Stop offset="0%" stopColor={SK('#0a0000')} stopOpacity="1" />
            <Stop offset="100%" stopColor={SK('#000000')} stopOpacity="1" />
          </RadialGradient>
          <RadialGradient id="m96-center" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor={SK('#1a0808')} stopOpacity="1" />
            <Stop offset="70%" stopColor={SK('#0a0000')} stopOpacity="1" />
            <Stop offset="100%" stopColor={SK('#050000')} stopOpacity="1" />
          </RadialGradient>
          <LinearGradient id="m96-ring" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={SK('#ff0a0a')} stopOpacity="0.3" />
            <Stop offset="50%" stopColor={SK('#ffffff')} stopOpacity="0.1" />
            <Stop offset="100%" stopColor={SK('#ff0a0a')} stopOpacity="0.3" />
          </LinearGradient>
        </Defs>

        {/* Background */}
        <Rect x="0" y="0" width={MAP_W} height={MAP_H} fill="url(#m96-bg)" />

        {/* Outer decorative ring */}
        <MirrorRing id={chromeId} cx={CX} cy={CY} r={outerRadius + 2} width={7} />

        {/* Outer ring segments (B - Major keys) — 12 at 12 o'clock, 6 at 6 o'clock */}
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((num) => {
          // Chakra-aligned wheel: num=12 → midAngle 0 (top), num=6 → midAngle 180 (bottom)
          const midAngle = (num % 12) * 30;
          const startAngle = midAngle - 15;
          const endAngle = midAngle + 15;
          const keyId = `${num}B`;
          const key = CAMELOT_KEYS.find(k => k.id === keyId);
          const level = getHarmonicLevel(activeKey, keyId);
          const isActive = level === 'selected';
          const isPrimary = level === 'primary';
          const chakra = SPECTRUM[num];
          const labelR = (middleRadius + outerRadius) / 2;
          
          return (
            <G key={`outer-${num}`} testID={`mirrors-key-${keyId}`} {...svgPress(() => key && onKeyPress(key))} accessibilityLabel={`${keyId}, ${key?.note}, ${key?.freq} hertz`}>
              <Path d={describeArc(CX, CY, middleRadius, outerRadius, startAngle, endAngle)} fill={`url(#${chromeId}-panel)`} stroke={`url(#${chromeId}-chrome)`} strokeWidth={2} />
              {/* Segment background — chakra-color tinted */}
              <Path
                d={describeArc(CX, CY, middleRadius, outerRadius, startAngle, endAngle)}
                fill={isActive ? chakra.bright : chakra.dim}
                fillOpacity={isActive ? 0.5 : isPrimary ? 0.3 : 0.12}
                stroke={chakra.bright}
                strokeWidth={isActive ? 2 : 0.45}
                opacity={isActive ? 1 : isPrimary ? 0.95 : 0.85}
              />
              <Path pointerEvents="none" d={describeArc(CX, CY, outerRadius - 4, outerRadius - 2, startAngle + 1, endAngle - 1)} fill={chakra.bright} opacity={isActive ? 1 : 0.7} />
              {/* Key ID label */}
              <SvgText
                x={CX + Math.cos((midAngle - 90) * Math.PI / 180) * (labelR + 8)}
                y={CY + Math.sin((midAngle - 90) * Math.PI / 180) * (labelR + 8)}
                fill={SK('#e4eef7')}
                fontSize={12}
                fontWeight="900"
                textAnchor="middle"
                alignmentBaseline="middle"
              >
                {num}B
              </SvgText>
              {/* Note name */}
              <SvgText
                x={CX + Math.cos((midAngle - 90) * Math.PI / 180) * (labelR - 10)}
                y={CY + Math.sin((midAngle - 90) * Math.PI / 180) * (labelR - 10)}
                fill={isActive ? SK('#ffffff') : SK('#b8c7d4')}
                fontSize={7}
                fontWeight="600"
                textAnchor="middle"
                alignmentBaseline="middle"
              >
                {MIRRORS_WHEEL_NOTES[num.toString()].major.replace(' Major', '')}
              </SvgText>
              <SvgText
                x={CX + Math.cos((midAngle - 90) * Math.PI / 180) * (labelR - 18)}
                y={CY + Math.sin((midAngle - 90) * Math.PI / 180) * (labelR - 18)}
                fill={isActive ? SK('#ffffff') : SK('#99adbd')}
                fontSize={6}
                textAnchor="middle"
                alignmentBaseline="middle"
              >
                Major
              </SvgText>
              {/* Active glow */}
              {isActive && (
                <Path
                  d={describeArc(CX, CY, middleRadius, outerRadius, startAngle, endAngle)}
                  fill="none"
                  stroke={chakra.bright}
                  strokeWidth={3}
                  opacity={0.7}
                />
              )}
            </G>
          );
        })}

        {/* Inner ring segments (A - Minor keys) — chakra-aligned */}
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((num) => {
          const midAngle = (num % 12) * 30;
          const startAngle = midAngle - 15;
          const endAngle = midAngle + 15;
          const keyId = `${num}A`;
          const key = CAMELOT_KEYS.find(k => k.id === keyId);
          const level = getHarmonicLevel(activeKey, keyId);
          const isActive = level === 'selected';
          const isPrimary = level === 'primary';
          const chakra = SPECTRUM[num];
          const labelR = (innerRadius + middleRadius) / 2;
          
          return (
            <G key={`inner-${num}`} testID={`mirrors-key-${keyId}`} {...svgPress(() => key && onKeyPress(key))} accessibilityLabel={`${keyId}, ${key?.note}, ${key?.freq} hertz`}>
              <Path d={describeArc(CX, CY, innerRadius, middleRadius, startAngle, endAngle)} fill={`url(#${chromeId}-panel)`} stroke={`url(#${chromeId}-chrome)`} strokeWidth={2} />
              {/* Segment background — chakra-tinted */}
              <Path
                d={describeArc(CX, CY, innerRadius, middleRadius, startAngle, endAngle)}
                fill={isActive ? chakra.bright : chakra.dim}
                fillOpacity={isActive ? 0.5 : isPrimary ? 0.3 : 0.1}
                stroke={chakra.bright}
                strokeWidth={isActive ? 2 : 0.4}
                opacity={isActive ? 1 : isPrimary ? 0.95 : 0.7}
              />
              <Path pointerEvents="none" d={describeArc(CX, CY, middleRadius - 4, middleRadius - 2, startAngle + 1, endAngle - 1)} fill={chakra.bright} opacity={isActive ? 1 : 0.7} />
              {/* Key ID label */}
              <SvgText
                x={CX + Math.cos((midAngle - 90) * Math.PI / 180) * (labelR + 5)}
                y={CY + Math.sin((midAngle - 90) * Math.PI / 180) * (labelR + 5)}
                fill={SK('#e4eef7')}
                fontSize={10}
                fontWeight="900"
                textAnchor="middle"
                alignmentBaseline="middle"
              >
                {num}A
              </SvgText>
              {/* Note name */}
              <SvgText
                x={CX + Math.cos((midAngle - 90) * Math.PI / 180) * (labelR - 10)}
                y={CY + Math.sin((midAngle - 90) * Math.PI / 180) * (labelR - 10)}
                fill={isActive ? SK('#ffffff') : SK('#b8c7d4')}
                fontSize={6}
                textAnchor="middle"
                alignmentBaseline="middle"
              >
                {MIRRORS_WHEEL_NOTES[num.toString()].minor.replace(' Minor', '')}
              </SvgText>
              <SvgText
                x={CX + Math.cos((midAngle - 90) * Math.PI / 180) * (labelR - 17)}
                y={CY + Math.sin((midAngle - 90) * Math.PI / 180) * (labelR - 17)}
                fill={isActive ? SK('#ffffff') : SK('#99adbd')}
                fontSize={5}
                textAnchor="middle"
                alignmentBaseline="middle"
              >
                Minor
              </SvgText>
              {/* Active glow */}
              {isActive && (
                <Path
                  d={describeArc(CX, CY, innerRadius, middleRadius, startAngle, endAngle)}
                  fill="none"
                  stroke={chakra.bright}
                  strokeWidth={3}
                  opacity={0.7}
                />
              )}
            </G>
          );
        })}

        {/* Center circle with MIRRORS 96 branding */}
        <SvgCircle pointerEvents="none" cx={CX} cy={CY} r={innerRadius} fill={`url(#${chromeId}-panel)`} />
        <MirrorRing id={chromeId} cx={CX} cy={CY} r={middleRadius} width={5} />
        <MirrorRing id={chromeId} cx={CX} cy={CY} r={innerRadius} width={8} />
        <MirrorRing id={chromeId} cx={CX} cy={CY} r={innerRadius - 9} width={1.5} />
        
        {/* Center text - MIRRORS */}
        <SvgText pointerEvents="none" x={CX} y={CY - 24} fill="#dce9f2" fontSize={11} fontWeight="900" textAnchor="middle" letterSpacing={3}>
          MIRRORS
        </SvgText>
        {/* Center text - 96 */}
        <SvgText pointerEvents="none" x={CX} y={CY + 16} fill={`url(#${chromeId}-chrome)`} stroke="#b8cbd9" strokeWidth={0.3} fontSize={46} fontWeight="900" fontStyle="italic" textAnchor="middle">
          96
        </SvgText>
        {/* Center text - WHEEL */}
        <SvgText pointerEvents="none" x={CX} y={CY + 35} fill="#a6becf" fontSize={8} fontWeight="700" textAnchor="middle" letterSpacing={4}>
          ═ WHEEL ═
        </SvgText>

        {/* Radial lines from center — on new segment boundaries (offset by -15° from top) */}
        {[...Array(12)].map((_, i) => {
          const angle = (i * 30 - 15 - 90) * Math.PI / 180;
          return (
            <Line
              key={`radial-${i}`}
              pointerEvents="none"
              x1={CX + Math.cos(angle) * innerRadius}
              y1={CY + Math.sin(angle) * innerRadius}
              x2={CX + Math.cos(angle) * outerRadius}
              y2={CY + Math.sin(angle) * outerRadius}
              stroke={`url(#${chromeId}-edge)`}
              strokeWidth={1}
              opacity={0.8}
            />
          );
        })}

        {/* Corner labels */}
        <SvgText x={6} y={MAP_H - 6} fill={SK('#ff0a0a')} fontSize={5} opacity={0.3} letterSpacing={1}>96 MIRRORS</SvgText>
        <SvgText x={MAP_W - 6} y={MAP_H - 6} fill={SK('#ff0a0a')} fontSize={5} opacity={0.3} letterSpacing={1} textAnchor="end">432Hz</SvgText>
      </Svg>
    );
  };

  return (
    <View testID="mirrors-wheel" style={st.container}>
      {/* Reserved readout space keeps the selection badge off every playable key. */}
      <View style={st.toolbar} pointerEvents="none">
        {activeKeyData && (
          <View testID="mirrors-wheel-selection" style={[st.infoBadge, { borderColor: activeKeyData.color }]}>
            <Text style={[st.infoKey, { color: activeKeyData.color }]}>{activeKeyData.id}</Text>
            <Text style={st.infoNote}>{activeKeyData.note}</Text>
            <Text testID="mirrors-wheel-frequency" style={st.infoFreq}>{activeKeyData.freq} Hz</Text>
          </View>
        )}
      </View>

      <View style={st.drawing}>
        {renderMirrors96Wheel()}
      </View>

      <View style={st.legend}>
        <Text style={st.legendItem}>INNER = MINOR (A)</Text>
        <Text style={st.legendItem}>OUTER = MAJOR (B)</Text>
        <Text style={st.legendItem}>TAP TO EMIT</Text>
      </View>
    </View>
  );
}

const st = skinStyles({
  toolbar: { minHeight: 64, borderBottomWidth: 1, borderBottomColor: '#657c9040', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10 },
  drawing: { width: '100%', aspectRatio: 1 },
  container: {
    borderWidth: 1,
    borderColor: '#687d90',
    borderRadius: 0,
    overflow: 'hidden',
    backgroundColor: '#000',
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
    color: '#bdc9d5',
    fontSize: 9,
    letterSpacing: 1,
    marginTop: 2,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    flexWrap: 'wrap',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#657c9040',
  },
  legendItem: {
    color: '#a6b6c5',
    fontSize: 7,
    letterSpacing: 1.5,
  },
});
