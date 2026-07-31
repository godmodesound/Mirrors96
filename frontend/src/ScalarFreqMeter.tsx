import React, { useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';

// ═══════════════════════════════════════════════════════════
// SCALAR FREQUENCY METER — T-800 precision master control.
// Types an exact value or nudges the ENTIRE spectrum (every
// node layer together) in 0.01 Hz increments. Hold a step
// chip to auto-repeat and micro-sweep the whole lab live.
// ═══════════════════════════════════════════════════════════

interface Props {
  value: number;                    // current base (NODE 1) frequency
  layerCount: number;
  onShift: (delta: number) => void; // shift every layer by delta Hz
  onSet: (value: number) => void;   // set base to value, others follow by same delta
}

const STEPS = [-1, -0.1, -0.01, 0.01, 0.1, 1];

export default function ScalarFreqMeter({ value, layerCount, onShift, onSet }: Props) {
  const [editing, setEditing] = useState(false);
  const [input, setInput] = useState('');
  const repeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const delayRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  return (
    <View style={st.wrap}>
      <View style={st.headerRow}>
        <Text style={st.title}>◈ SCALAR FREQ METER</Text>
        <Text style={st.tag}>{layerCount}× SPECTRUM · ±0.01 Hz</Text>
      </View>
      <View style={st.readoutRow}>
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
          <TouchableOpacity onPress={() => { setEditing(true); setInput(value.toFixed(2)); }} activeOpacity={0.7}>
            <Text style={st.readout}>{value.toFixed(2)} <Text style={st.readoutHz}>Hz</Text></Text>
            <Text style={st.hint}>TAP TO ENTER EXACT · SHIFTS ALL NODES</Text>
          </TouchableOpacity>
        )}
      </View>
      <View style={st.stepRow}>
        {STEPS.map(s => (
          <TouchableOpacity
            key={s}
            style={[st.stepBtn, s > 0 ? st.stepUp : st.stepDown]}
            onPressIn={() => startRepeat(s)}
            onPressOut={stopRepeat}
            activeOpacity={0.6}
          >
            <Text style={[st.stepTxt, s > 0 ? st.stepTxtUp : st.stepTxtDown]}>
              {s > 0 ? '+' : '−'}{Math.abs(s).toFixed(Math.abs(s) < 0.1 ? 2 : (Math.abs(s) < 1 ? 1 : 0))}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  wrap: {
    backgroundColor: '#070a0e',
    borderWidth: 1,
    borderColor: '#232b36',
    borderLeftWidth: 2,
    borderLeftColor: '#ff0a0a',
    borderRadius: 4,
    padding: 10,
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  title: { color: '#c9d2dd', fontSize: 9, fontWeight: '900', letterSpacing: 1.5 },
  tag: { color: '#7d8794', fontSize: 7, fontWeight: '800', letterSpacing: 1.2 },
  readoutRow: {
    alignItems: 'center',
    paddingVertical: 4,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1c232d',
  },
  readout: { color: '#d7dee8', fontSize: 26, fontWeight: '200', letterSpacing: 2, textAlign: 'center' },
  readoutHz: { fontSize: 12, color: '#7d8794', fontWeight: '700' },
  hint: { color: '#5a646f', fontSize: 6, letterSpacing: 1.5, textAlign: 'center', marginTop: 2 },
  input: {
    color: '#ff0a0a',
    fontSize: 26,
    fontWeight: '300',
    letterSpacing: 2,
    borderBottomWidth: 1.5,
    borderBottomColor: '#ff0a0a',
    paddingVertical: 0,
    minWidth: 140,
    textAlign: 'center',
  },
  stepRow: { flexDirection: 'row', gap: 5 },
  stepBtn: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 4,
    backgroundColor: '#0b0e12',
  },
  stepDown: { borderColor: '#2a3340' },
  stepUp: { borderColor: '#5a2020' },
  stepTxt: { fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
  stepTxtDown: { color: '#8a94a2' },
  stepTxtUp: { color: '#ff6060' },
});
