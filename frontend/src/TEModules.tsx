import React, { useRef, useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, PanResponder, Animated } from 'react-native';
import { AudioEngine } from './AudioEngine';

import { skinStyles, SK } from './skins';

// ═══════════════════════════════════════════════════════════
// GM-96 SCALAR RESONATOR — Teenage Engineering-style panel.
// Merged into CODES LAB. Frequency Sweep has been removed;
// touch-sweep now lives on the Analog Dial inside each layer.
// ═══════════════════════════════════════════════════════════

const SCALAR_A = 91;
const SCALAR_B = 92;

const fmtHz = (v: number) => (v >= 1000 ? `${(v / 1000).toFixed(v >= 10000 ? 1 : 2)}k` : v.toFixed(v < 100 ? 1 : 0));

// ─── TE Knob ───
function Knob({
  label, value, min, max, onChange, log = false, unit = 'Hz', accent = '#ff0a0a',
}: {
  label: string; value: number; min: number; max: number;
  onChange: (v: number) => void; log?: boolean; unit?: string; accent?: string;
}) {
  const valueRef = useRef(value);
  valueRef.current = value;
  const startRef = useRef(value);

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => { startRef.current = valueRef.current; },
      onPanResponderMove: (_, g) => {
        const drag = (g.dx - g.dy) / 160; // right/up = increase
        let nv: number;
        if (log) {
          const lmin = Math.log(min), lmax = Math.log(max);
          const cur = Math.log(Math.max(startRef.current, min));
          nv = Math.exp(Math.min(lmax, Math.max(lmin, cur + drag * (lmax - lmin) * 0.5)));
        } else {
          nv = startRef.current + drag * (max - min) * 0.5;
        }
        nv = Math.min(max, Math.max(min, nv));
        onChange(Math.round(nv * 10) / 10);
      },
    })
  ).current;

  const ratio = log
    ? (Math.log(Math.max(value, min)) - Math.log(min)) / (Math.log(max) - Math.log(min))
    : (value - min) / (max - min);
  const angle = -135 + ratio * 270;

  return (
    <View style={st.knobBlock}>
      <View style={st.knobOuter} {...pan.panHandlers}>
        <View style={[st.knob, { transform: [{ rotate: `${angle}deg` }] }]}>
          <View style={[st.knobPointer, { backgroundColor: accent }]} />
        </View>
        <View style={[st.knobDot, { backgroundColor: accent }]} />
      </View>
      <Text style={st.knobValue}>{fmtHz(value)}<Text style={st.knobUnit}> {unit}</Text></Text>
      <Text style={st.knobLabel}>{label}</Text>
    </View>
  );
}

// ─── TE Key ───
const TEKey = ({ label, active, onPress, color = '#ff0a0a', wide = false }: {
  label: string; active?: boolean; onPress: () => void; color?: string; wide?: boolean;
}) => (
  <TouchableOpacity
    style={[st.key, wide && st.keyWide, active && { backgroundColor: color, borderColor: color }]}
    onPress={onPress}
    activeOpacity={0.8}
  >
    <Text style={[st.keyText, active && { color: SK('#000') }]}>{label}</Text>
  </TouchableOpacity>
);

// ═══════════════ SCALAR RESONATOR ═══════════════
function ScalarResonator() {
  const [carrier, setCarrier] = useState(432);
  const [pulse, setPulse] = useState(7.8); // Schumann default
  const [intensity, setIntensity] = useState(0.5);
  const [engaged, setEngaged] = useState(false);
  const led = useRef(new Animated.Value(0)).current;
  const ledLoop = useRef<Animated.CompositeAnimation | null>(null);

  const apply = useCallback((c: number, p: number, g: number) => {
    AudioEngine.updateFreq(SCALAR_A, Math.max(1, c - p / 2));
    AudioEngine.updateFreq(SCALAR_B, c + p / 2);
    AudioEngine.updateGain(SCALAR_A, g * 0.5);
    AudioEngine.updateGain(SCALAR_B, g * 0.5);
  }, []);

  const disengage = useCallback(() => {
    AudioEngine.stopTone(SCALAR_A);
    AudioEngine.stopTone(SCALAR_B);
    ledLoop.current?.stop();
    led.setValue(0);
    setEngaged(false);
  }, [led]);

  const engage = () => {
    AudioEngine.startTone(SCALAR_A, Math.max(1, carrier - pulse / 2), intensity * 0.5);
    AudioEngine.startTone(SCALAR_B, carrier + pulse / 2, intensity * 0.5);
    setEngaged(true);
  };

  // LED pulses at the scalar pulse rate
  useEffect(() => {
    ledLoop.current?.stop();
    if (engaged) {
      const half = Math.max(40, 500 / Math.max(pulse, 0.1));
      ledLoop.current = Animated.loop(
        Animated.sequence([
          Animated.timing(led, { toValue: 1, duration: half, useNativeDriver: false }),
          Animated.timing(led, { toValue: 0, duration: half, useNativeDriver: false }),
        ])
      );
      ledLoop.current.start();
    }
  }, [engaged, pulse, led]);

  useEffect(() => { if (engaged) apply(carrier, pulse, intensity); }, [carrier, pulse, intensity, engaged, apply]);
  useEffect(() => () => { disengage(); }, [disengage]);

  return (
    <View style={st.panel}>
      <View style={st.scalarHeaderRow}>
        <Text style={st.scalarLabel}>SCALAR</Text>
        <Text style={st.scalarState}>
          {engaged ? `◈ ${carrier.toFixed(1)}Hz ± ${(pulse / 2).toFixed(2)} · ${pulse.toFixed(1)} FIELD` : '— COLLAPSED —'}
        </Text>
        <Animated.View
          style={[st.led, {
            backgroundColor: led.interpolate({ inputRange: [0, 1], outputRange: [SK('#2a0a0a'), SK('#ff0a0a')] }),
          }]}
        />
      </View>

      <View style={st.knobRow}>
        <Knob label="CARRIER" value={carrier} min={20} max={2000} onChange={setCarrier} log />
        <Knob label="PULSE" value={pulse} min={0.1} max={40} onChange={setPulse} accent={SK('#ffd75e')} />
        <Knob label="FIELD" value={intensity} min={0} max={1} onChange={setIntensity} unit="" accent={SK('#5fc9ff')} />
      </View>

      <View style={st.keyRow}>
        <TEKey label="7.83" active={Math.abs(pulse - 7.8) < 0.15} onPress={() => setPulse(7.8)} color={SK('#ffd75e')} />
        <TEKey label="432" active={Math.abs(carrier - 432) < 0.5} onPress={() => setCarrier(432)} color={SK('#5fc9ff')} />
        <TEKey label={engaged ? '■ COLLAPSE' : '◈ ENGAGE'} active={engaged} onPress={engaged ? disengage : engage} wide />
      </View>
    </View>
  );
}

export { ScalarResonator };
export default function TEModules() {
  return (
    <View>
      <ScalarResonator />
    </View>
  );
}

// ═══════════════ TE STYLES ═══════════════
const st = skinStyles({
  // Flush into CODES LAB flow — no separate box/border
  panel: {
    backgroundColor: 'transparent',
    paddingHorizontal: 4,
    paddingTop: 4,
    paddingBottom: 12,
    marginBottom: 4,
  },
  scalarHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  scalarLabel: { color: '#ff0a0a', fontSize: 10, fontWeight: '900', letterSpacing: 2 },
  scalarState: {
    flex: 1,
    color: '#8a8a8a',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1,
    textAlign: 'center',
  },
  panelHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  panelTitle: { color: '#c8c8c8', fontSize: 10, fontWeight: '900', letterSpacing: 2 },
  dotRow: { flexDirection: 'row', gap: 5 },
  legendDot: { width: 7, height: 7, borderRadius: 3.5 },
  led: { width: 10, height: 10, borderRadius: 5, borderWidth: 1, borderColor: '#3a3a3a' },
  lcd: {
    backgroundColor: '#050505',
    borderWidth: 1,
    borderColor: '#222',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  lcdText: { color: '#ff0a0a', fontSize: 12, fontWeight: '700', letterSpacing: 1.5, textAlign: 'center' },
  lcdBar: { height: 3, backgroundColor: '#1a1a1a', borderRadius: 2, marginTop: 7, overflow: 'hidden' },
  lcdBarFill: { height: '100%', backgroundColor: '#ff0a0a', borderRadius: 2 },
  knobRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 10 },
  knobBlock: { alignItems: 'center', width: 90 },
  knobOuter: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#0d0d0d',
    borderWidth: 1.5, borderColor: '#2a2a2a',
    alignItems: 'center', justifyContent: 'center',
  },
  knob: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#1a1a1a', alignItems: 'center' },
  knobPointer: { width: 3, height: 12, borderRadius: 2, marginTop: 3 },
  knobDot: { position: 'absolute', bottom: 5, width: 4, height: 4, borderRadius: 2, opacity: 0.7 },
  knobValue: { color: '#fff', fontSize: 11, fontWeight: '800', marginTop: 5, letterSpacing: 0.5 },
  knobUnit: { color: '#666', fontSize: 8, fontWeight: '600' },
  knobLabel: { color: '#6a6a6a', fontSize: 8, letterSpacing: 2, marginTop: 2, fontWeight: '700' },
  keyRow: { flexDirection: 'row', gap: 8 },
  key: {
    flex: 1,
    backgroundColor: '#0d0d0d',
    borderWidth: 1,
    borderColor: '#2a2a2a',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  keyWide: { flex: 2 },
  keyText: { color: '#c8c8c8', fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
});
