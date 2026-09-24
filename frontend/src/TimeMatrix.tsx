import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, useWindowDimensions } from 'react-native';
import { AudioEngine } from './AudioEngine';
import CanvasBridge, { CanvasBridgeHandle } from './CanvasBridge';
import { DIMENSIONS, DENSITY_UNIVERSES, PRIMAL_FIELDS, MATRIX_HTML } from './matrixHtml';
import { skinStyles, SK } from './skins';

const TONE_ID = 740;

/** 15-DIMENSIONAL TIME MATRIX — tap a ring (D1–D15) to sound its tone and read its mind / density universe; ASCEND plays D1→D15. */
export default function TimeMatrix({ testID = 'matrix' }: { testID?: string }) {
  const { width } = useWindowDimensions();
  const W = Math.min(width - 40, 480);
  const H = Math.round(W * 1.0);
  const bridge = useRef<CanvasBridgeHandle>(null);
  const [active, setActive] = useState(0);
  const [lit, setLit] = useState(0);
  const [ascending, setAscending] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { bridge.current?.call('updateMatrix', { active, lit }); }, [active, lit]);

  const stop = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    AudioEngine.stopTone(TONE_ID);
    setAscending(false);
    setActive(0);
  }, []);

  const sound = useCallback((d: number) => {
    if (d === active && !ascending) { stop(); return; }
    if (d < 1) { stop(); return; }
    AudioEngine.startTone(TONE_ID, DIMENSIONS[d - 1].hz, 0.22, 'sine');
    setActive(d);
  }, [active, ascending, stop]);

  const ascend = useCallback(() => {
    if (ascending) { stop(); setLit(0); return; }
    setAscending(true);
    setLit(0);
    let d = 1;
    const step = () => {
      if (d > 15) { timer.current = null; setAscending(false); AudioEngine.stopTone(TONE_ID); setActive(0); return; }
      AudioEngine.startTone(TONE_ID, DIMENSIONS[d - 1].hz, 0.22, 'sine');
      setActive(d); setLit(d); d++;
      timer.current = setTimeout(step, 1600);
    };
    step();
  }, [ascending, stop]);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); AudioEngine.stopTone(TONE_ID); }, []);

  const onMessage = useCallback((msg: any) => { if (msg.type === 'dim') sound(msg.d); }, [sound]);
  const dim = active ? DIMENSIONS[active - 1] : null;
  const du = dim ? DENSITY_UNIVERSES[dim.du - 1] : null;

  return (
    <View testID={testID} style={st.wrap}>
      <Text style={st.title}>15-DIMENSIONAL TIME MATRIX</Text>
      <Text style={st.subtitle}>GOD&apos;S HOLOGRAM-OF-MATTER · INNER GOD | INNER CHRIST | LAW OF ONE</Text>
      <Text style={st.mantra}>ONE SPIRIT · ONE GOD · ONE SELF · ONE LOVE · ONE HEART · ONE LIGHT</Text>

      <View style={st.canvasFrame}>
        <CanvasBridge ref={bridge} testID={`${testID}-canvas`} html={MATRIX_HTML} width={W} height={H} tag="__matrix" onMessage={onMessage} onReady={() => bridge.current?.call('updateMatrix', { active, lit })} liveAudio />
      </View>

      <View style={[st.panel, dim && { borderColor: SK(dim.color === '#ffffff' ? '#e0e0e0' : dim.color) }]}>
        {dim && du ? (
          <>
            <View style={st.panelRow}>
              <Text style={[st.panelD, { color: SK(dim.color === '#0d1b6e' ? '#5c6bc0' : dim.color) }]}>D{dim.d} · {dim.mind}</Text>
              <Text style={st.panelHz}>{dim.hz} Hz</Text>
            </View>
            <Text style={st.panelLine}>DU-{du.n} {du.name} — {du.matter}</Text>
            <Text style={st.panelLine}>{dim.beings} · {dim.field}</Text>
          </>
        ) : (
          <>
            <Text style={st.panelD}>PARTICLE UNIVERSE · PARTICUM · BASE MAGNETIC · VIBRATION</Text>
            <Text style={st.panelLine}>Tap a ring to sound its dimension. 5 Density Universes × 3 dimensions: {DENSITY_UNIVERSES.map(d => `DU-${d.n} ${d.name}`).join(' · ')}</Text>
            <Text style={st.panelLine}>Outer fields: {PRIMAL_FIELDS.map(f => `${f.level} (${f.name})`).join(' · ')}</Text>
          </>
        )}
      </View>

      <View style={st.grid}>
        {DIMENSIONS.map(d => {
          const on = active === d.d;
          const color = SK(d.color === '#0d1b6e' ? '#5c6bc0' : d.color);
          return (
            <TouchableOpacity key={d.d} testID={`${testID}-d-${d.d}`} style={[st.dBtn, { borderColor: on ? color : '#2a2a3a' }, on && { backgroundColor: `${color}22` }, lit >= d.d && !on && { borderColor: `${color}88` }]} onPress={() => sound(d.d)}>
              <View style={[st.dDot, { backgroundColor: color }]} />
              <Text style={[st.dText, on && { color }]}>D{d.d}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={st.actions}>
        <TouchableOpacity testID={`${testID}-ascend`} style={[st.ascendBtn, ascending && st.ascendBtnOn]} onPress={ascend}>
          <Text style={st.ascendText}>{ascending ? '■ STOP ASCENSION' : '▲ ASCEND D1 → D15'}</Text>
        </TouchableOpacity>
        {(lit > 0 || active > 0) && !ascending && (
          <TouchableOpacity testID={`${testID}-reset`} style={st.resetBtn} onPress={() => { stop(); setLit(0); }}><Text style={st.resetText}>RESET</Text></TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const st = skinStyles({
  wrap: { borderWidth: 1, borderColor: '#3a2a5a', backgroundColor: '#050308', borderRadius: 10, padding: 14 },
  title: { color: '#fff', fontSize: 15, fontWeight: '900', letterSpacing: 1.5, textAlign: 'center' },
  subtitle: { color: '#9c6bff', fontSize: 9, letterSpacing: 1.5, textAlign: 'center', marginTop: 4, fontWeight: '800' },
  mantra: { color: '#7a7a8a', fontSize: 8, letterSpacing: 1.2, textAlign: 'center', marginTop: 4, marginBottom: 10 },
  canvasFrame: { alignSelf: 'center', borderWidth: 1, borderColor: '#3a2a5a', borderRadius: 6, overflow: 'hidden' },
  panel: { marginTop: 10, borderWidth: 1, borderColor: '#3a2a5a', padding: 10, borderRadius: 6, backgroundColor: '#0a0710' },
  panelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  panelD: { color: '#e0d8ff', fontSize: 11, fontWeight: '900', letterSpacing: 1.2 },
  panelHz: { color: '#fff', fontSize: 11, fontWeight: '900' },
  panelLine: { color: '#a89fc0', fontSize: 9.5, lineHeight: 14, marginTop: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 10 },
  dBtn: { width: '18.4%', flexGrow: 1, borderWidth: 1, borderRadius: 6, minHeight: 40, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 5, backgroundColor: '#0a0710' },
  dDot: { width: 8, height: 8, borderRadius: 4 },
  dText: { color: '#a89fc0', fontSize: 9, fontWeight: '900' },
  actions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  ascendBtn: { flex: 1, borderWidth: 1.5, borderColor: '#9c6bff', minHeight: 46, alignItems: 'center', justifyContent: 'center', borderRadius: 8, backgroundColor: '#110a20' },
  ascendBtnOn: { backgroundColor: '#1f1238' },
  ascendText: { color: '#c9b3ff', fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
  resetBtn: { borderWidth: 1, borderColor: '#5a4a7a', minHeight: 46, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
  resetText: { color: '#c9b3ff', fontSize: 9, fontWeight: '900', letterSpacing: 1.5 },
});
