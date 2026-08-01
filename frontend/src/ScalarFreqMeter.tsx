import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import Svg, { Line, Circle, Path } from 'react-native-svg';
import { AudioEngine } from './AudioEngine';

// ═══════════════════════════════════════════════════════════
// SCALAR FREQ METER — Nixie-era laboratory tuning instrument.
// Glowing Nixie tube digits (tap to type exact), ±0.01 steps
// shifting the ENTIRE spectrum, and a live galvanometer needle
// fed by the oscilloscope/CymaScope FFT: deflection = cents
// deviation of the MEASURED tone vs the meter target, with an
// in-tune lock lamp. Bakelite panel · brass fittings.
// ═══════════════════════════════════════════════════════════

interface Props {
  value: number;
  layerCount: number;
  onShift: (delta: number) => void;
  onSet: (value: number) => void;
  isPlaying: boolean;
  onPlay: () => void;
}

const STEPS = [-1, -0.1, -0.01, 0.01, 0.1, 1];

// Galvanometer geometry
const GW = 300, GH = 88, PX = 150, PY = 84, RAD = 70;
const centsToAngle = (c: number) => (c / 50) * 55; // ±50¢ → ±55°
const pt = (deg: number, r: number) => {
  const a = ((deg - 90) * Math.PI) / 180;
  return { x: PX + Math.cos(a) * r, y: PY + Math.sin(a) * r };
};

export default function ScalarFreqMeter({ value, layerCount, onShift, onSet, isPlaying, onPlay }: Props) {
  const [editing, setEditing] = useState(false);
  const [input, setInput] = useState('');
  const [needle, setNeedle] = useState({ cents: -50, active: false });
  const repeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const delayRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const valueRef = useRef(value);
  valueRef.current = value;

  // Live tuning feedback from the master-bus FFT (same source as scope/CymaScope)
  useEffect(() => {
    const unsub = AudioEngine.subscribeScope((f) => {
      const active = f.peak > 4 && (f.measuredHz || 0) > 5;
      let cents = -50;
      if (active) {
        cents = Math.max(-50, Math.min(50, 1200 * Math.log2((f.measuredHz || 1) / Math.max(valueRef.current, 0.01))));
      }
      setNeedle(prev => (Math.abs(prev.cents - cents) > 0.4 || prev.active !== active) ? { cents, active } : prev);
    });
    return unsub;
  }, []);

  const commit = () => {
    const parsed = parseFloat(input.replace(',', '.'));
    if (!isNaN(parsed)) onSet(Math.round(parsed * 100) / 100);
    setEditing(false);
    setInput('');
  };

  const startRepeat = (delta: number) => {
    onShift(delta);
    delayRef.current = setTimeout(() => {
      repeatRef.current = setInterval(() => onShift(delta), 80);
    }, 380);
  };
  const stopRepeat = () => {
    if (delayRef.current) { clearTimeout(delayRef.current); delayRef.current = null; }
    if (repeatRef.current) { clearInterval(repeatRef.current); repeatRef.current = null; }
  };

  // Spectrum position (log 1Hz → 26kHz)
  const pct = Math.min(1, Math.max(0, Math.log(Math.max(value, 1)) / Math.log(26000)));
  const band = value < 60 ? 'SUB' : value < 250 ? 'LOW' : value < 2000 ? 'MID' : value < 6000 ? 'HIGH' : 'ULTRA';

  const inTune = needle.active && Math.abs(needle.cents) < 3;
  const ang = centsToAngle(needle.active ? needle.cents : -50);
  const tip = pt(ang, RAD - 6);
  const chars = value.toFixed(2).split('');

  return (
    <View style={st.wrap}>
      {/* brass corner screws */}
      <View style={[st.screw, { top: 6, left: 6 }]} /><View style={[st.screw, { top: 6, right: 6 }]} />
      <View style={[st.screw, { bottom: 6, left: 6 }]} /><View style={[st.screw, { bottom: 6, right: 6 }]} />

      <View style={st.headerRow}>
        <Text style={st.title}>◈ SCALAR FREQ METER</Text>
        <Text style={st.tag}>SFM-432 NIXIE · {layerCount}× SPECTRUM</Text>
      </View>

      {/* NIXIE TUBE READOUT — tap to type exact */}
      {editing ? (
        <TextInput
          style={st.input}
          value={input}
          onChangeText={setInput}
          keyboardType="decimal-pad"
          autoFocus
          selectTextOnFocus
          maxLength={8}
          onBlur={commit}
          onSubmitEditing={commit}
          returnKeyType="done"
        />
      ) : (
        <TouchableOpacity style={st.tubeRow} onPress={() => { setEditing(true); setInput(value.toFixed(2)); }} activeOpacity={0.8}>
          {chars.map((ch, i) => (
            <View key={i} style={[st.tube, ch === '.' && st.tubeDot]}>
              <Text style={[st.tubeDigit, ch === '.' && st.tubeDigitDot]}>{ch}</Text>
            </View>
          ))}
          <Text style={st.tubeHz}>Hz</Text>
        </TouchableOpacity>
      )}
      {!editing && <Text style={st.hint}>TAP TUBES TO ENTER EXACT · SHIFTS ALL NODES</Text>}

      {/* GALVANOMETER — live cents deviation from scope FFT */}
      <View style={st.gaugeWrap}>
        <Svg width="100%" height={GH} viewBox={`0 0 ${GW} ${GH}`}>
          {/* arc */}
          <Path
            d={`M ${pt(-55, RAD).x} ${pt(-55, RAD).y} A ${RAD} ${RAD} 0 0 1 ${pt(55, RAD).x} ${pt(55, RAD).y}`}
            stroke="#c9a86a" strokeWidth={1.2} fill="none" opacity={0.7}
          />
          {/* ticks every 10 cents */}
          {[-50, -40, -30, -20, -10, 0, 10, 20, 30, 40, 50].map(c => {
            const a = centsToAngle(c);
            const o = pt(a, RAD); const n = pt(a, RAD - (c === 0 ? 10 : 6));
            return <Line key={c} x1={o.x} y1={o.y} x2={n.x} y2={n.y} stroke={c === 0 ? '#ff9d45' : '#c9a86a'} strokeWidth={c === 0 ? 1.8 : 1} opacity={c === 0 ? 0.95 : 0.6} />;
          })}
          {/* in-tune green zone */}
          <Path
            d={`M ${pt(-3.3, RAD - 2).x} ${pt(-3.3, RAD - 2).y} A ${RAD - 2} ${RAD - 2} 0 0 1 ${pt(3.3, RAD - 2).x} ${pt(3.3, RAD - 2).y}`}
            stroke={inTune ? '#7dd87d' : '#3a4a3a'} strokeWidth={3} fill="none" opacity={inTune ? 0.95 : 0.5}
          />
          {/* needle */}
          <Line x1={PX} y1={PY} x2={tip.x} y2={tip.y} stroke={needle.active ? '#ff9d45' : '#6a5a40'} strokeWidth={2} />
          <Circle cx={PX} cy={PY} r={4.5} fill="#1a140c" stroke="#c9a86a" strokeWidth={1.2} />
        </Svg>
        <View style={st.gaugeLabels}>
          <Text style={st.gaugeLbl}>−50¢</Text>
          <View style={[st.lockLamp, inTune && st.lockLampOn]} />
          <Text style={st.gaugeLbl}>+50¢</Text>
        </View>
        <Text style={st.gaugeStatus}>
          {needle.active
            ? (inTune ? '● LOCKED — MEASURED MATCHES METER' : `MEASURED ${needle.cents > 0 ? '+' : ''}${needle.cents.toFixed(1)}¢ OFF TARGET`)
            : 'NO SIGNAL — EXECUTE TO FEED THE NEEDLE'}
        </Text>
      </View>

      {/* EXECUTE / HALT — bakelite rocker wired to the master bus */}
      <TouchableOpacity
        style={[st.execBtn, isPlaying && st.execBtnOn]}
        onPress={onPlay}
        activeOpacity={0.75}
      >
        <View style={[st.execLamp, isPlaying && st.execLampOn]} />
        <Text style={[st.execTxt, isPlaying && st.execTxtOn]}>
          {isPlaying ? '■ HALT SPECTRUM' : '▶ EXECUTE SPECTRUM'}
        </Text>
        <View style={[st.execLamp, isPlaying && st.execLampOn]} />
      </TouchableOpacity>

      {/* STEP KEYS */}
      <View style={st.stepRow}>
        {STEPS.map(s => (
          <TouchableOpacity
            key={s}
            style={[st.stepBtn, s > 0 && st.stepUp]}
            onPressIn={() => startRepeat(s)}
            onPressOut={stopRepeat}
            activeOpacity={0.6}
          >
            <Text style={[st.stepTxt, s > 0 && st.stepTxtUp]}>
              {s > 0 ? '+' : '−'}{Math.abs(s).toFixed(Math.abs(s) < 0.1 ? 2 : (Math.abs(s) < 1 ? 1 : 0))}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* SPECTRUM POSITION */}
      <View style={st.specWrap}>
        <View style={st.specTrack}>
          <View style={[st.specFill, { width: `${pct * 100}%` }]} />
          <View style={[st.specMarker, { left: `${pct * 100}%` }]} />
        </View>
        <View style={st.specBands}>
          {['SUB', 'LOW', 'MID', 'HIGH', 'ULTRA'].map(b => (
            <Text key={b} style={[st.specBand, band === b && st.specBandActive]}>{b}</Text>
          ))}
        </View>
        <Text style={st.specPos}>SPECTRUM POSITION {(pct * 100).toFixed(2)}% · {band} BAND · 1Hz—26kHz LOG</Text>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  wrap: {
    backgroundColor: '#14100a',
    borderWidth: 1,
    borderColor: '#3a2e1c',
    borderTopWidth: 0,
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 6,
    padding: 14,
    marginTop: -16, // fused beneath the SCOPE//NODE panel
    marginBottom: 12,
  },
  screw: {
    position: 'absolute',
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: '#8a744c',
    borderWidth: 1, borderColor: '#3a2e1c',
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  title: { color: '#e8dcc0', fontSize: 9, fontWeight: '900', letterSpacing: 1.5 },
  tag: { color: '#8a744c', fontSize: 7, fontWeight: '800', letterSpacing: 1.2 },
  // Nixie tubes
  tubeRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-end', gap: 3 },
  tube: {
    minWidth: 30,
    paddingVertical: 6,
    paddingHorizontal: 4,
    alignItems: 'center',
    backgroundColor: '#0d0805',
    borderWidth: 1,
    borderColor: '#3a2415',
    borderRadius: 6,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  tubeDot: { minWidth: 14, paddingHorizontal: 2 },
  tubeDigit: {
    color: '#ff9d45',
    fontSize: 27,
    fontWeight: '300',
    textShadowColor: '#ff6a00',
    textShadowRadius: 10,
    textShadowOffset: { width: 0, height: 0 },
  },
  tubeDigitDot: { fontSize: 24 },
  tubeHz: { color: '#8a744c', fontSize: 10, fontWeight: '800', marginLeft: 4, marginBottom: 6 },
  hint: { color: '#6a5a40', fontSize: 6, letterSpacing: 1.5, textAlign: 'center', marginTop: 5 },
  input: {
    color: '#ff9d45',
    fontSize: 27,
    fontWeight: '300',
    letterSpacing: 3,
    borderBottomWidth: 1.5,
    borderBottomColor: '#ff9d45',
    paddingVertical: 2,
    alignSelf: 'center',
    minWidth: 150,
    textAlign: 'center',
  },
  // Galvanometer
  gaugeWrap: {
    marginTop: 10,
    backgroundColor: '#0d0a06',
    borderWidth: 1,
    borderColor: '#2e2417',
    borderRadius: 6,
    paddingTop: 6,
    paddingBottom: 6,
  },
  gaugeLabels: {
    position: 'absolute',
    top: 8, left: 12, right: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  gaugeLbl: { color: '#8a744c', fontSize: 7, fontWeight: '800' },
  lockLamp: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: '#1c2a1c',
    borderWidth: 1, borderColor: '#3a4a3a',
  },
  lockLampOn: {
    backgroundColor: '#7dd87d',
    borderColor: '#b8ffb8',
    shadowColor: '#7dd87d', shadowOpacity: 0.9, shadowRadius: 6, shadowOffset: { width: 0, height: 0 },
  },
  gaugeStatus: { color: '#8a744c', fontSize: 6.5, fontWeight: '800', letterSpacing: 1, textAlign: 'center', marginTop: 2 },
  // Execute rocker
  execBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 10,
    minHeight: 46,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#5a3a1c',
    backgroundColor: '#1a0f06',
    paddingHorizontal: 12,
  },
  execBtnOn: {
    borderColor: '#ff9d45',
    backgroundColor: '#2a1608',
    shadowColor: '#ff6a00', shadowOpacity: 0.9, shadowRadius: 10, shadowOffset: { width: 0, height: 0 },
  },
  execLamp: {
    width: 9, height: 9, borderRadius: 4.5,
    backgroundColor: '#2a1a0c',
    borderWidth: 1, borderColor: '#5a3a1c',
  },
  execLampOn: {
    backgroundColor: '#ff9d45',
    borderColor: '#ffd08a',
    shadowColor: '#ff6a00', shadowOpacity: 1, shadowRadius: 6, shadowOffset: { width: 0, height: 0 },
  },
  execTxt: {
    color: '#8a744c',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 2.2,
    textShadowColor: 'transparent',
    textShadowRadius: 0,
    textShadowOffset: { width: 0, height: 0 },
  },
  execTxtOn: {
    color: '#ff9d45',
    textShadowColor: '#ff6a00',
    textShadowRadius: 8,
  },
  // Steps
  stepRow: { flexDirection: 'row', gap: 5, marginTop: 10 },
  stepBtn: {
    flex: 1,
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#3a2e1c',
    borderRadius: 5,
    backgroundColor: '#1a140c',
  },
  stepUp: { borderColor: '#6a4a28' },
  stepTxt: { fontSize: 10, fontWeight: '900', letterSpacing: 0.5, color: '#c9a86a' },
  stepTxtUp: { color: '#ff9d45' },
  // Spectrum position
  specWrap: { marginTop: 10 },
  specTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#0d0a06',
    borderWidth: 1,
    borderColor: '#2e2417',
  },
  specFill: {
    position: 'absolute',
    left: 0, top: 0, bottom: 0,
    backgroundColor: '#31220f',
    borderRadius: 3,
  },
  specMarker: {
    position: 'absolute',
    top: -3,
    width: 2, height: 10,
    marginLeft: -1,
    backgroundColor: '#ff9d45',
    shadowColor: '#ff6a00', shadowOpacity: 0.9, shadowRadius: 4, shadowOffset: { width: 0, height: 0 },
  },
  specBands: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4, paddingHorizontal: 2 },
  specBand: { color: '#6a5a40', fontSize: 6, fontWeight: '900', letterSpacing: 1 },
  specBandActive: { color: '#ff9d45' },
  specPos: { color: '#6a5a40', fontSize: 6, letterSpacing: 1.2, textAlign: 'center', marginTop: 4, fontWeight: '800' },
});
