import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, useWindowDimensions } from 'react-native';
import { AudioEngine } from './AudioEngine';
import CanvasBridge, { CanvasBridgeHandle } from './CanvasBridge';
import { CHAKRA_7, SPINE_HTML } from './spineHtml';
import { skinStyles, SK } from './skins';
import { BinaryBorder } from './BinaryCode';

const TONE_ID = 720;
const CPM = [6, 8, 10, 12];

/** CSF FLOW · KUNDALINI SPINE — side-profile CNS with cerebrospinal flow, 7 chakra tones and serpent rise sequence. */
export default function CsfSpineFlow({ testID = 'spine' }: { testID?: string }) {
  const { width } = useWindowDimensions();
  const W = Math.min(width - 40, 480);
  const H = Math.round(W * 1.25);
  const bridge = useRef<CanvasBridgeHandle>(null);
  const [flow, setFlow] = useState(true);
  const [cpm, setCpm] = useState(8);
  const [active, setActive] = useState(-1);
  const [rise, setRise] = useState(0);
  const [seqRunning, setSeqRunning] = useState(false);
  const seqTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const state = useCallback(() => ({ flow, cpm, active, rise, seq: seqRunning }), [flow, cpm, active, rise, seqRunning]);
  useEffect(() => { bridge.current?.call('updateSpine', state()); }, [state]);

  const stopTone = () => { AudioEngine.stopTone(TONE_ID); setActive(-1); };
  const playChakra = useCallback((idx: number) => {
    if (idx === active && !seqRunning) { stopTone(); return; }
    AudioEngine.startTone(TONE_ID, CHAKRA_7[idx].hz, 0.25, 'sine');
    setActive(idx);
  }, [active, seqRunning]);

  const stopSequence = useCallback(() => {
    if (seqTimer.current) clearTimeout(seqTimer.current);
    seqTimer.current = null;
    setSeqRunning(false);
    AudioEngine.stopTone(TONE_ID);
    setActive(-1);
  }, []);

  const runSequence = useCallback(() => {
    if (seqRunning) { stopSequence(); setRise(0); return; }
    setSeqRunning(true);
    setRise(0);
    let i = 0;
    const step = () => {
      if (i >= 7) { seqTimer.current = null; setSeqRunning(false); AudioEngine.stopTone(TONE_ID); setActive(-1); return; }
      AudioEngine.startTone(TONE_ID, CHAKRA_7[i].hz, 0.25, 'sine');
      setActive(i);
      setRise((i + 1) / 7);
      i++;
      seqTimer.current = setTimeout(step, 2200);
    };
    step();
  }, [seqRunning, stopSequence]);

  useEffect(() => () => { if (seqTimer.current) clearTimeout(seqTimer.current); AudioEngine.stopTone(TONE_ID); }, []);

  const onMessage = useCallback((msg: any) => { if (msg.type === 'chakra') playChakra(msg.idx); }, [playChakra]);
  const sel = active >= 0 ? CHAKRA_7[active] : null;

  return (
    <View testID={testID} style={st.wrap}>
      <BinaryBorder ids={[TONE_ID]} />
      <View style={st.head}>
        <View style={{ flex: 1 }}>
          <Text style={st.title}>CSF FLOW · KUNDALINI SPINE</Text>
          <Text style={st.sub}>CENTRAL NERVOUS SYSTEM · CEREBROSPINAL FLUID · 7 CHAKRA TONES</Text>
        </View>
        <TouchableOpacity testID={`${testID}-flow`} style={[st.smallBtn, flow && st.smallBtnOn]} onPress={() => setFlow(f => !f)}>
          <Text style={[st.smallBtnText, flow && st.smallBtnTextOn]}>{flow ? '≋ FLOW ON' : '≋ FLOW OFF'}</Text>
        </TouchableOpacity>
      </View>

      <View style={st.canvasFrame}>
        <CanvasBridge ref={bridge} testID={`${testID}-canvas`} html={SPINE_HTML} width={W} height={H} tag="__spine" onMessage={onMessage} onReady={() => bridge.current?.call('updateSpine', state())} liveAudio />
      </View>

      <View style={st.row}>
        <Text style={st.rowLabel}>CSF PULSE</Text>
        {CPM.map(v => (
          <TouchableOpacity key={v} testID={`${testID}-cpm-${v}`} style={[st.chip, cpm === v && st.chipOn]} onPress={() => setCpm(v)}>
            <Text style={[st.chipText, cpm === v && st.chipTextOn]}>{v} CPM</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={st.chakraRow}>
        {CHAKRA_7.map((c, i) => {
          const on = active === i;
          const color = SK(c.color);
          return (
            <TouchableOpacity key={c.name} testID={`${testID}-chakra-${i}`} style={[st.chakraBtn, { borderColor: on ? color : `${color}66` }, on && { backgroundColor: `${color}22` }]} onPress={() => playChakra(i)}>
              <View style={[st.chakraDot, { backgroundColor: color }]} />
              <Text style={[st.chakraHz, on && { color }]}>{c.hz}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={st.readout}>
        <Text style={st.readoutMain}>{sel ? `${sel.name} · ${sel.sanskrit} · ${sel.hz} Hz · ${sel.note}` : 'TAP A CHAKRA ON THE SPINE OR BELOW TO SOUND IT'}</Text>
        <Text style={st.readoutSub}>{seqRunning ? `KUNDALINI RISING · ${Math.round(rise * 7)}/7 CENTRES` : rise >= 1 ? 'SERPENTS UNITED AT THE CROWN · SAHASRARA OPEN' : `CSF ${flow ? 'ASCENDING' : 'STILL'} · ${cpm} CYCLES / MIN · IDA ◦ PINGALA ◦ SUSHUMNA`}</Text>
      </View>

      <View style={st.actions}>
        <TouchableOpacity testID={`${testID}-rise`} style={[st.riseBtn, seqRunning && st.riseBtnOn]} onPress={runSequence}>
          <Text style={st.riseText}>{seqRunning ? '■ STOP RISE' : '☤ KUNDALINI RISE — ROOT → CROWN'}</Text>
        </TouchableOpacity>
        {(rise > 0 || active >= 0) && !seqRunning && (
          <TouchableOpacity testID={`${testID}-reset`} style={st.resetBtn} onPress={() => { stopTone(); setRise(0); }}>
            <Text style={st.resetText}>RESET</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const st = skinStyles({
  wrap: { borderWidth: 1, borderColor: 'transparent', backgroundColor: '#040208', borderRadius: 8, padding: 12 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  title: { color: '#c97bff', fontSize: 14, fontWeight: '900', letterSpacing: 2 },
  sub: { color: '#6a5a8a', fontSize: 8, letterSpacing: 1.2, marginTop: 3 },
  smallBtn: { borderWidth: 1, borderColor: '#2a1a3a', minHeight: 36, paddingHorizontal: 10, justifyContent: 'center', borderRadius: 6 },
  smallBtnOn: { borderColor: '#5ac8ff', backgroundColor: '#061420' },
  smallBtnText: { color: '#6a5a8a', fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  smallBtnTextOn: { color: '#5ac8ff' },
  canvasFrame: { alignSelf: 'center', borderWidth: 1, borderColor: '#2a1a3a', borderRadius: 6, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  rowLabel: { color: '#5ac8ff', fontSize: 8, fontWeight: '900', letterSpacing: 1.5, marginRight: 4 },
  chip: { flex: 1, borderWidth: 1, borderColor: '#2a1a3a', minHeight: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 6 },
  chipOn: { borderColor: '#5ac8ff', backgroundColor: '#061420' },
  chipText: { color: '#6a5a8a', fontSize: 9, fontWeight: '800' },
  chipTextOn: { color: '#5ac8ff' },
  chakraRow: { flexDirection: 'row', gap: 4, marginTop: 10 },
  chakraBtn: { flex: 1, borderWidth: 1.5, borderRadius: 8, minHeight: 48, alignItems: 'center', justifyContent: 'center', gap: 4, backgroundColor: '#080410' },
  chakraDot: { width: 10, height: 10, borderRadius: 5 },
  chakraHz: { color: '#aaa', fontSize: 9, fontWeight: '800' },
  readout: { marginTop: 10, borderWidth: 1, borderColor: '#2a1a3a', padding: 8, backgroundColor: '#070310' },
  readoutMain: { color: '#fff', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  readoutSub: { color: '#8a7aaa', fontSize: 8.5, letterSpacing: 1, marginTop: 4 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  riseBtn: { flex: 1, borderWidth: 1.5, borderColor: '#ffd24a', minHeight: 46, alignItems: 'center', justifyContent: 'center', borderRadius: 8, backgroundColor: '#100c02' },
  riseBtnOn: { backgroundColor: '#2a1e04' },
  riseText: { color: '#ffd24a', fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
  resetBtn: { borderWidth: 1, borderColor: '#5a4a7a', minHeight: 46, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
  resetText: { color: '#c9b8ff', fontSize: 9, fontWeight: '900', letterSpacing: 1.5 },
});
