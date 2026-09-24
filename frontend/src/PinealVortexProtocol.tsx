import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { AudioEngine } from './AudioEngine';
import { skinStyles, SK } from './skins';

/** 9-Phase Vortex Protocol — every frequency digital-roots to 3, 6 or 9; continuous 7.83 Hz Schumann sub-layer. */
export const PHASES = [
  { n: 1, hz: 174, trinity: 'FOUNDATION', effect: 'Pain dissolution · body grounding' },
  { n: 2, hz: 285, trinity: 'FOUNDATION', effect: 'Cellular regeneration · tissue restoration' },
  { n: 3, hz: 396, trinity: 'FOUNDATION', effect: 'Fear liberation · root chakra activation' },
  { n: 4, hz: 417, trinity: 'HEART & TRUTH', effect: 'Transformation · sacral chakra cleanse' },
  { n: 5, hz: 528, trinity: 'HEART & TRUTH', effect: 'The Miracle Tone ★ · DNA coherence · love activation' },
  { n: 6, hz: 639, trinity: 'ASCENSION', effect: 'Heart unity · relationship harmony' },
  { n: 7, hz: 741, trinity: 'ASCENSION', effect: 'Intuition awakening · throat chakra' },
  { n: 8, hz: 852, trinity: 'ASCENSION', effect: 'Third eye awakening · spiritual order' },
  { n: 9, hz: 963, trinity: 'ASCENSION', effect: 'PINEAL IGNITION ★★ · source connection · Christ consciousness' },
];
export const digitalRoot = (n: number) => 1 + ((Math.round(n) - 1) % 9);
const SCHUMANN = 7.83;
const PHASE_ID = 731;
const BASE_ID = 730;
const DURATIONS = [{ label: '6 MIN', s: 360 }, { label: '3 MIN', s: 180 }, { label: '1 MIN', s: 60 }, { label: '30 S', s: 30 }];
const TRINITIES = ['FOUNDATION', 'HEART & TRUTH', 'ASCENSION'];
const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

export default function PinealVortexProtocol({ testID = 'vortex' }: { testID?: string }) {
  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState(-1);
  const [dur, setDur] = useState(DURATIONS[0].s);
  const [left, setLeft] = useState(0);
  const [baseline, setBaseline] = useState(true);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const endAt = useRef(0);
  const phaseRef = useRef(-1);

  const stopAll = useCallback(() => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    AudioEngine.stopTone(PHASE_ID);
    AudioEngine.stopTone(BASE_ID);
    setRunning(false);
    setPhase(-1);
    phaseRef.current = -1;
    setLeft(0);
  }, []);

  const startPhase = useCallback((i: number) => {
    phaseRef.current = i;
    setPhase(i);
    AudioEngine.startTone(PHASE_ID, PHASES[i].hz, 0.22, 'sine');
    if (baseline) AudioEngine.startTone(BASE_ID, SCHUMANN, 0.18, 'sine');
    endAt.current = Date.now() + dur * 1000;
    setLeft(dur);
  }, [baseline, dur]);

  const start = useCallback((from = 0) => {
    if (timer.current) clearInterval(timer.current);
    setRunning(true);
    startPhase(from);
    timer.current = setInterval(() => {
      const remain = Math.max(0, Math.ceil((endAt.current - Date.now()) / 1000));
      setLeft(remain);
      if (remain <= 0) {
        const next = phaseRef.current + 1;
        if (next >= PHASES.length) stopAll(); else startPhase(next);
      }
    }, 250);
  }, [startPhase, stopAll]);

  useEffect(() => {
    if (!running) return;
    if (baseline) AudioEngine.startTone(BASE_ID, SCHUMANN, 0.18, 'sine'); else AudioEngine.stopTone(BASE_ID);
  }, [baseline, running]);
  useEffect(() => stopAll, [stopAll]);

  const cur = phase >= 0 ? PHASES[phase] : null;
  const total = dur * 9;
  const elapsed = phase >= 0 ? phase * dur + (dur - left) : 0;
  const nextWindow = (() => {
    const now = new Date();
    const h = now.getHours();
    const target = h < 3 ? 3 : h < 6 ? 6 : h < 9 ? 9 : 27;
    const d = new Date(now); d.setHours(target % 24, 0, 0, 0); if (target === 27) d.setDate(d.getDate() + 1);
    const mins = Math.round((d.getTime() - now.getTime()) / 60000);
    return `${target % 24 === 0 ? 3 : target % 24} AM in ${Math.floor(mins / 60)}h ${mins % 60}m`;
  })();

  return (
    <View testID={testID} style={st.wrap}>
      <Text style={st.title}>YOUR PINEAL CAN ACTIVATE ITSELF</Text>
      <Text style={st.subtitle}>9-PHASE VORTEX PROTOCOL · 3 · 6 · 9</Text>
      <Text style={st.quote}>“Tesla said 3, 6, and 9 are the key to the universe. Every frequency in this protocol reduces to 3, 6, or 9.”</Text>

      <View style={st.statusBox}>
        {cur ? (
          <>
            <View style={st.statusRow}>
              <Text style={st.statusPhase}>PHASE {cur.n} — {cur.hz} Hz</Text>
              <Text style={st.statusCode}>CODE {digitalRoot(cur.hz)}</Text>
            </View>
            <Text style={st.statusEffect}>{cur.effect}</Text>
            <View style={st.bar}><View style={[st.barFill, { width: `${((dur - left) / dur) * 100}%` }]} /></View>
            <View style={st.statusRow}>
              <Text style={st.statusMeta}>{fmt(left)} LEFT · {cur.trinity}</Text>
              <Text style={st.statusMeta}>{fmt(elapsed)} / {fmt(total)}</Text>
            </View>
          </>
        ) : (
          <Text style={st.statusIdle}>{DURATIONS.find(d => d.s === dur)?.label} × 9 PHASES = {fmt(total)} · PATTERN 3→6→9→3→6→9→3→6→9 · NEXT TESLA WINDOW {nextWindow}</Text>
        )}
      </View>

      {TRINITIES.map((tr, ti) => (
        <View key={tr} style={st.trinity}>
          <Text style={st.trinityLabel}>TRINITY {ti + 1}: {tr}</Text>
          {PHASES.filter(p => p.trinity === tr).map(p => {
            const i = p.n - 1;
            const on = phase === i;
            const done = phase > i;
            return (
              <TouchableOpacity key={p.n} testID={`${testID}-phase-${p.n}`} style={[st.phase, on && st.phaseOn, done && st.phaseDone]} onPress={() => (on && running ? stopAll() : start(i))} activeOpacity={0.8}>
                <View style={[st.dot, on && st.dotOn, done && st.dotDone]} />
                <Text style={[st.phaseText, on && st.phaseTextOn]}>Phase {p.n} — {p.hz} Hz</Text>
                <Text style={st.phaseEffect} numberOfLines={1}>{p.effect}</Text>
                <Text style={[st.code, on && st.phaseTextOn]}>{digitalRoot(p.hz)}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ))}

      <View style={st.row}>
        <Text style={st.rowLabel}>PHASE</Text>
        {DURATIONS.map(d => (
          <TouchableOpacity key={d.s} testID={`${testID}-dur-${d.s}`} style={[st.chip, dur === d.s && st.chipOn]} onPress={() => setDur(d.s)}>
            <Text style={[st.chipText, dur === d.s && st.chipTextOn]}>{d.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <TouchableOpacity testID={`${testID}-baseline`} style={[st.baseline, baseline && st.baselineOn]} onPress={() => setBaseline(b => !b)}>
        <Text style={[st.baselineText, baseline && st.chipTextOn]}>FOUNDATION SUB-LAYER · 7.83 Hz SCHUMANN {baseline ? 'ON' : 'OFF'} · DIGITAL ROOT 9</Text>
      </TouchableOpacity>
      <TouchableOpacity testID={`${testID}-start`} style={[st.startBtn, running && st.startBtnOn]} onPress={() => (running ? stopAll() : start(0))}>
        <Text style={st.startText}>{running ? '■ STOP PROTOCOL' : '▶ BEGIN VORTEX ACTIVATION STACK'}</Text>
      </TouchableOpacity>
      <Text style={st.foot}>SACRED TESLA WINDOWS 3 AM / 6 AM / 9 AM · {fmt(total)} TOTAL · 9 PHASES</Text>
    </View>
  );
}

const st = skinStyles({
  wrap: { borderWidth: 1, borderColor: '#5a4a1a', backgroundColor: '#070a14', borderRadius: 10, padding: 14 },
  title: { color: '#f2d27a', fontSize: 15, fontWeight: '900', letterSpacing: 1.5, textAlign: 'center' },
  subtitle: { color: '#c9a84a', fontSize: 9, letterSpacing: 2.5, textAlign: 'center', marginTop: 4 },
  quote: { color: '#9a8a5a', fontSize: 9.5, fontStyle: 'italic', textAlign: 'center', marginTop: 8, lineHeight: 14 },
  statusBox: { marginTop: 12, borderWidth: 1, borderColor: '#5a4a1a', padding: 10, borderRadius: 8, backgroundColor: '#0b0f1c', minHeight: 56, justifyContent: 'center' },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusPhase: { color: '#f2d27a', fontSize: 12, fontWeight: '900', letterSpacing: 1.5 },
  statusCode: { color: '#fff', fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
  statusEffect: { color: '#d8c8a0', fontSize: 9.5, marginTop: 4 },
  bar: { height: 4, backgroundColor: '#1a1f2e', borderRadius: 2, marginVertical: 8, overflow: 'hidden' },
  barFill: { height: 4, backgroundColor: '#f2d27a' },
  statusMeta: { color: '#9a8a5a', fontSize: 8.5, letterSpacing: 1 },
  statusIdle: { color: '#9a8a5a', fontSize: 8.5, letterSpacing: 1, lineHeight: 13, textAlign: 'center' },
  trinity: { marginTop: 10 },
  trinityLabel: { color: '#c9a84a', fontSize: 9, fontWeight: '900', letterSpacing: 1.5, marginBottom: 4 },
  phase: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44, paddingHorizontal: 8, borderWidth: 1, borderColor: '#1a1f2e', borderRadius: 6, marginBottom: 4 },
  phaseOn: { borderColor: '#f2d27a', backgroundColor: '#161506' },
  phaseDone: { opacity: 0.6 },
  dot: { width: 10, height: 10, borderRadius: 5, borderWidth: 1.5, borderColor: '#c9a84a' },
  dotOn: { backgroundColor: '#f2d27a' },
  dotDone: { backgroundColor: '#5a4a1a' },
  phaseText: { color: '#e8dcc0', fontSize: 10, fontWeight: '800', width: 118 },
  phaseTextOn: { color: '#f2d27a' },
  phaseEffect: { flex: 1, color: '#8a7f68', fontSize: 8.5 },
  code: { color: '#c9a84a', fontSize: 11, fontWeight: '900', width: 14, textAlign: 'right' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  rowLabel: { color: '#c9a84a', fontSize: 8, fontWeight: '900', letterSpacing: 1.5, marginRight: 2 },
  chip: { flex: 1, borderWidth: 1, borderColor: '#2a2a3a', minHeight: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 6 },
  chipOn: { borderColor: '#f2d27a', backgroundColor: '#161506' },
  chipText: { color: '#8a7f68', fontSize: 9, fontWeight: '800' },
  chipTextOn: { color: '#f2d27a' },
  baseline: { marginTop: 8, borderWidth: 1, borderColor: '#2a2a3a', minHeight: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 6, paddingHorizontal: 8 },
  baselineOn: { borderColor: '#c9a84a', backgroundColor: '#0f0e08' },
  baselineText: { color: '#8a7f68', fontSize: 8.5, fontWeight: '800', letterSpacing: 1, textAlign: 'center' },
  startBtn: { marginTop: 10, borderWidth: 1.5, borderColor: '#f2d27a', minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 8, backgroundColor: '#161506' },
  startBtnOn: { backgroundColor: '#2a2408' },
  startText: { color: '#f2d27a', fontSize: 10.5, fontWeight: '900', letterSpacing: 1.5 },
  foot: { color: '#6a5f48', fontSize: 8, letterSpacing: 1.2, textAlign: 'center', marginTop: 10 },
});
