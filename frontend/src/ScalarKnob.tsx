import React, { useMemo, useRef } from 'react';
import { View, Text, StyleSheet, PanResponder, TouchableWithoutFeedback } from 'react-native';
import Svg, { Circle, Line, Path, Defs, RadialGradient, Stop } from 'react-native-svg';

// ═══════════════════════════════════════════════════════════
// SCALAR KNOB — brass rotary that modulates the scalar pulse.
// Dragging around the knob sweeps the Schumann-band pulse from
// 0.10 Hz → 40 Hz (log). Tapping the center core arms/disarms
// the scalar carrier pair (Layer 1 ± pulse/2).
// ═══════════════════════════════════════════════════════════

interface Props {
  hz: number;                 // current scalar pulse Hz
  active: boolean;            // scalar armed
  onChange: (hz: number) => void;
  onToggle: () => void;
  size?: number;
}

const MIN_HZ = 0.10;
const MAX_HZ = 40.00;
// Sweep 270° → -135° (bottom-left) to +135° (bottom-right)
const ANG_MIN = -135;
const ANG_MAX = 135;

const hzToPct = (hz: number) => {
  const l = Math.log(MIN_HZ), h = Math.log(MAX_HZ);
  return Math.min(1, Math.max(0, (Math.log(Math.max(hz, MIN_HZ)) - l) / (h - l)));
};
const pctToHz = (p: number) => Math.exp(Math.log(MIN_HZ) + p * (Math.log(MAX_HZ) - Math.log(MIN_HZ)));
const pctToAng = (p: number) => ANG_MIN + p * (ANG_MAX - ANG_MIN);

const PRESETS: { hz: number; label: string }[] = [
  { hz: 0.5, label: '0.5' },
  { hz: 7.83, label: 'SCH' },  // Schumann
  { hz: 12,   label: '12' },
  { hz: 20,   label: '20' },
];

export default function ScalarKnob({ hz, active, onChange, onToggle, size = 118 }: Props) {
  const S = size, C = S / 2, R = C - 8;
  const hzRef = useRef(hz);
  hzRef.current = hz;

  // Pan responder: any drag anywhere in the knob edits the pct
  const pan = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: () => {},
    onPanResponderMove: (_e, g) => {
      // Combine vertical drag (fine) + angle around center (coarse)
      const dx = g.moveX - g.x0;
      const dy = g.moveY - g.y0;
      const dp = (-dy / 220) + (dx / 900);
      const next = Math.min(1, Math.max(0, hzToPct(hzRef.current) + dp * 0.6));
      onChange(Math.round(pctToHz(next) * 100) / 100);
    },
  }), [onChange]);

  const pct = hzToPct(hz);
  const ang = pctToAng(pct);

  // Needle tip
  const rad = ((ang - 90) * Math.PI) / 180;
  const nx = C + Math.cos(rad) * (R - 14);
  const ny = C + Math.sin(rad) * (R - 14);

  // Arc path for the active sweep (270° track)
  const arcPath = (a0: number, a1: number, r: number) => {
    const p0 = (a0 - 90) * Math.PI / 180, p1 = (a1 - 90) * Math.PI / 180;
    const x0 = C + Math.cos(p0) * r, y0 = C + Math.sin(p0) * r;
    const x1 = C + Math.cos(p1) * r, y1 = C + Math.sin(p1) * r;
    const large = Math.abs(a1 - a0) > 180 ? 1 : 0;
    return `M ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1}`;
  };

  return (
    <View style={st.wrap}>
      <View style={st.headerRow}>
        <Text style={st.title}>◈ SCALAR</Text>
        <Text style={[st.armLbl, active && st.armLblOn]}>{active ? 'ARMED' : 'IDLE'}</Text>
      </View>

      <View style={st.knobWrap} {...pan.panHandlers}>
        <Svg width={S} height={S}>
          <Defs>
            <RadialGradient id="brass" cx="50%" cy="35%" r="65%">
              <Stop offset="0%" stopColor="#4a3a24" />
              <Stop offset="60%" stopColor="#2a1e10" />
              <Stop offset="100%" stopColor="#0d0805" />
            </RadialGradient>
            <RadialGradient id="core" cx="50%" cy="45%" r="55%">
              <Stop offset="0%" stopColor={active ? '#ff9d45' : '#3a2a1a'} />
              <Stop offset="70%" stopColor={active ? '#a24610' : '#1a120a'} />
              <Stop offset="100%" stopColor="#0d0805" />
            </RadialGradient>
          </Defs>

          {/* Full track */}
          <Path d={arcPath(ANG_MIN, ANG_MAX, R)} stroke="#3a2e1c" strokeWidth={3} fill="none" strokeLinecap="round" />
          {/* Filled sweep */}
          <Path d={arcPath(ANG_MIN, ang, R)} stroke={active ? '#ff9d45' : '#c9a86a'} strokeWidth={3} fill="none" strokeLinecap="round" opacity={0.95} />
          {/* Tick marks */}
          {[0, 0.25, 0.5, 0.75, 1].map(t => {
            const a = pctToAng(t);
            const p0 = (a - 90) * Math.PI / 180;
            const x0 = C + Math.cos(p0) * (R + 2);
            const y0 = C + Math.sin(p0) * (R + 2);
            const x1 = C + Math.cos(p0) * (R + 7);
            const y1 = C + Math.sin(p0) * (R + 7);
            return <Line key={t} x1={x0} y1={y0} x2={x1} y2={y1} stroke="#8a744c" strokeWidth={1} />;
          })}
          {/* Knob body */}
          <Circle cx={C} cy={C} r={R - 6} fill="url(#brass)" stroke="#5a4028" strokeWidth={1.4} />
          {/* Fluted edge */}
          {Array.from({ length: 24 }).map((_, i) => {
            const a = (i / 24) * Math.PI * 2;
            const rIn = R - 8, rOut = R - 6;
            const x0 = C + Math.cos(a) * rIn, y0 = C + Math.sin(a) * rIn;
            const x1 = C + Math.cos(a) * rOut, y1 = C + Math.sin(a) * rOut;
            return <Line key={i} x1={x0} y1={y0} x2={x1} y2={y1} stroke="#4a3820" strokeWidth={0.8} />;
          })}
          {/* Core */}
          <Circle cx={C} cy={C} r={R - 22} fill="url(#core)" stroke="#5a3a20" strokeWidth={1} />
          {/* Needle */}
          <Line x1={C} y1={C} x2={nx} y2={ny} stroke={active ? '#ffd08a' : '#c9a86a'} strokeWidth={2.4} strokeLinecap="round" />
          <Circle cx={nx} cy={ny} r={2.6} fill={active ? '#ffe8b8' : '#c9a86a'} />
          <Circle cx={C} cy={C} r={3.5} fill="#0d0805" stroke="#5a3a20" strokeWidth={1} />
        </Svg>

        {/* Center tap zone toggles armed state */}
        <TouchableWithoutFeedback onPress={onToggle}>
          <View style={[st.centerTap, { top: C - 18, left: C - 18 }]} />
        </TouchableWithoutFeedback>
      </View>

      <Text style={[st.readout, active && st.readoutOn]}>
        {hz.toFixed(2)} Hz
      </Text>
      <Text style={st.sub}>PULSE · 0.10–40.00 Hz</Text>

      <View style={st.presetRow}>
        {PRESETS.map(p => {
          const on = Math.abs(p.hz - hz) < 0.05;
          return (
            <TouchableWithoutFeedback key={p.label} onPress={() => onChange(p.hz)}>
              <View style={[st.presetChip, on && st.presetChipOn]}>
                <Text style={[st.presetTxt, on && st.presetTxtOn]}>{p.label}</Text>
              </View>
            </TouchableWithoutFeedback>
          );
        })}
      </View>

      <Text style={st.hint}>DRAG · TAP CORE TO {active ? 'DISARM' : 'ARM'}</Text>
    </View>
  );
}

const st = StyleSheet.create({
  wrap: {
    backgroundColor: '#0d0805',
    borderWidth: 1,
    borderColor: '#3a2e1c',
    borderRadius: 6,
    padding: 10,
    alignItems: 'center',
    minWidth: 148,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: 6 },
  title: { color: '#e8dcc0', fontSize: 8, fontWeight: '900', letterSpacing: 1.4 },
  armLbl: { color: '#6a5a40', fontSize: 7, fontWeight: '900', letterSpacing: 1.4 },
  armLblOn: {
    color: '#ff9d45',
    textShadowColor: '#ff6a00', textShadowRadius: 6, textShadowOffset: { width: 0, height: 0 },
  },
  knobWrap: { position: 'relative' },
  centerTap: {
    position: 'absolute',
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'transparent',
  },
  readout: {
    color: '#c9a86a',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginTop: 4,
  },
  readoutOn: {
    color: '#ff9d45',
    textShadowColor: '#ff6a00', textShadowRadius: 8, textShadowOffset: { width: 0, height: 0 },
  },
  sub: { color: '#6a5a40', fontSize: 6, fontWeight: '800', letterSpacing: 1.2, marginTop: 1 },
  presetRow: { flexDirection: 'row', gap: 4, marginTop: 6 },
  presetChip: {
    paddingHorizontal: 6, paddingVertical: 3,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: '#3a2e1c',
    backgroundColor: '#1a140c',
  },
  presetChipOn: { borderColor: '#ff9d45', backgroundColor: '#2a1608' },
  presetTxt: { color: '#8a744c', fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  presetTxtOn: { color: '#ff9d45' },
  hint: { color: '#5a4a30', fontSize: 6, fontWeight: '800', letterSpacing: 1.2, marginTop: 5 },
});
