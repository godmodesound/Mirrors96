import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { AudioEngine, ScopeFrame } from './AudioEngine';
import PinealVortexProtocol from './PinealVortexProtocol';
import EmfHarmonizerMap from './EmfHarmonizerMap';
import { useLayout } from './useLayout';
import CanvasBridge, { CanvasBridgeHandle } from './CanvasBridge';
import { JI_NOTES, LISS_HTML, approxRatio, verdictFor } from './harmonyMath';
import CosmicOctave from './CosmicOctave';
import { skinStyles, SK } from './skins';

const TONE_BASE = 750;
const ROOTS = [256, 432, 528];
const PRESETS = [
  { label: 'C + E + G', notes: [0, 4, 7] }, { label: 'C + Db + D', notes: [0, 1, 2] }, { label: 'C + G', notes: [0, 7] },
  { label: 'C + F#', notes: [0, 6] }, { label: 'C + Eb + G', notes: [0, 3, 7] }, { label: 'C + E + G + B', notes: [0, 4, 7, 11] },
];
const lcm = (a: number, b: number) => { const g = (x: number, y: number): number => (y ? g(y, x % y) : x); return (a * b) / g(a, b); };
const fmt = (f: number) => (Number.isInteger(f) ? String(f) : f.toFixed(1));

type Tab = 'HARMONY' | 'PINEAL' | 'EMF';
const TABS: { id: Tab; label: string; sub: string; color: string }[] = [
  { id: 'HARMONY', label: 'HARMONY', sub: 'RATIO SCOPE', color: '#f2d27a' },
  { id: 'PINEAL', label: 'PINEAL', sub: 'VORTEX 3·6·9', color: '#c9a84a' },
  { id: 'EMF', label: 'EMF', sub: 'HARMONIZER', color: '#ffd76a' },
];

/** HARMONY LAB suite — Harmony scope + Pineal Vortex + EMF Harmonizer. Phone: tabs. Unfolded (iPhone Duo / tablet): Harmony left, PINEAL/EMF tabs right.
 *  All three stay mounted so a running protocol keeps sounding while you switch tabs. */
export default function HarmonyLab({ testID = 'harmony' }: { testID?: string }) {
  const { isWide, contentWidth } = useLayout();
  const [tab, setTab] = useState<Tab>('HARMONY');
  const side: Tab = isWide && tab === 'HARMONY' ? 'PINEAL' : tab;
  const colW = isWide ? (contentWidth - 40 - 12) / 2 : contentWidth - 40;
  const pick = (t: Tab) => { if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {}); setTab(t); };
  const tabs = isWide ? TABS.filter(t => t.id !== 'HARMONY') : TABS;
  const active = isWide ? side : tab;

  const tabBar = (
    <View style={st.tabBar} testID={`${testID}-tabs`}>
      {tabs.map(t => {
        const on = active === t.id;
        return (
          <TouchableOpacity key={t.id} testID={`${testID}-tab-${t.id.toLowerCase()}`} accessibilityRole="tab" accessibilityState={{ selected: on }} style={[st.tab, on && { borderColor: SK(t.color), backgroundColor: '#100e06' }]} onPress={() => pick(t.id)}>
            <Text style={[st.tabLabel, on && { color: SK(t.color) }]}>{t.label}</Text>
            <Text style={st.tabSub}>{t.sub}</Text>
            {on && <View style={[st.tabLine, { backgroundColor: SK(t.color) }]} />}
          </TouchableOpacity>
        );
      })}
    </View>
  );

  const harmony = <HarmonyScope testID={testID} canvasW={Math.min(colW - 30, 480)} />;
  const pineal = <PinealVortexProtocol testID="vortex" />;
  const emf = <EmfHarmonizerMap testID="emf-map" />;

  if (isWide) {
    return (
      <View testID={`${testID}-suite`} style={st.wideRow}>
        <View style={st.col}>{harmony}</View>
        <View style={st.col}>
          {tabBar}
          <View style={side === 'PINEAL' ? null : st.hidden}>{pineal}</View>
          <View style={side === 'EMF' ? null : st.hidden}>{emf}</View>
        </View>
      </View>
    );
  }
  return (
    <View testID={`${testID}-suite`}>
      {tabBar}
      <View style={tab === 'HARMONY' ? null : st.hidden}>{harmony}</View>
      <View style={tab === 'PINEAL' ? null : st.hidden}>{pineal}</View>
      <View style={tab === 'EMF' ? null : st.hidden}>{emf}</View>
    </View>
  );
}

/** Harmony scope — pick notes (just intonation over a root) or listen LIVE; Lissajous figure + HARMONY/DISSONANCE verdict. */
function HarmonyScope({ testID, canvasW }: { testID: string; canvasW: number }) {
  const W = canvasW;
  const bridge = useRef<CanvasBridgeHandle>(null);
  const [root, setRoot] = useState(432);
  const [sel, setSel] = useState<number[]>([0, 4, 7]);
  const [playing, setPlaying] = useState(false);
  const [live, setLive] = useState(false);
  const [liveFreqs, setLiveFreqs] = useState<number[]>([]);
  const lastLive = useRef(0);

  const freqs = useMemo(() => (live ? liveFreqs : sel.map(i => root * JI_NOTES[i].n / JI_NOTES[i].d)), [live, liveFreqs, sel, root]);
  const verdict = useMemo(() => verdictFor(freqs), [freqs]);
  const dense = useMemo(() => {
    if (freqs.length < 2) return 4;
    const base = Math.min(...freqs);
    let cyc = 1, irrational = false;
    freqs.forEach(f => { if (f === base) return; const r = approxRatio(base, f); if (Math.abs(r.cents) > 8) irrational = true; cyc = lcm(cyc, r.d); });
    return irrational ? 64 : Math.min(64, Math.max(4, cyc * 2));
  }, [freqs]);
  const names = live ? liveFreqs.map(f => `${fmt(f)}Hz`) : sel.map(i => JI_NOTES[i].note);

  useEffect(() => { bridge.current?.call('updateLiss', { freqs, color: verdict.color, label: verdict.label, dense }); }, [freqs, verdict, dense]);

  // LIVE: judge whatever is sounding anywhere in the app (FFT peaks)
  useEffect(() => {
    if (!live) return;
    return AudioEngine.subscribeScope((frame: ScopeFrame) => {
      const now = Date.now();
      if (now - lastLive.current < 400) return;
      lastLive.current = now;
      const peaks = (frame.peaks || []).filter(p => p.hz > 20 && p.mag > 0.08).slice(0, 4).map(p => Math.round(p.hz * 10) / 10).sort((a, b) => a - b);
      setLiveFreqs(prev => (prev.join(',') === peaks.join(',') ? prev : frame.peak > 1.5 ? peaks : []));
    });
  }, [live]);

  const stop = useCallback(() => { for (let i = 0; i < 4; i++) AudioEngine.stopTone(TONE_BASE + i); setPlaying(false); }, []);
  const play = useCallback(() => {
    if (playing) { stop(); return; }
    freqs.slice(0, 4).forEach((f, i) => AudioEngine.startTone(TONE_BASE + i, f, 0.16, 'sine'));
    setPlaying(true);
  }, [playing, freqs, stop]);
  useEffect(() => { if (playing) { for (let i = 0; i < 4; i++) { if (freqs[i]) AudioEngine.startTone(TONE_BASE + i, freqs[i], 0.16, 'sine'); else AudioEngine.stopTone(TONE_BASE + i); } } }, [freqs, playing]);
  useEffect(() => stop, [stop]);

  const toggleNote = (i: number) => {
    setLive(false);
    setSel(s => (s.includes(i) ? s.filter(x => x !== i) : s.length >= 4 ? [...s.slice(1), i] : [...s, i]));
  };

  return (
    <View testID={testID} style={st.wrap}>
      <View style={st.head}>
        <View style={{ flex: 1 }}>
          <Text style={st.title}>HARMONY LAB</Text>
          <Text style={st.sub}>LISSAJOUS RATIO SCOPE · JUST INTONATION · TENNEY HEIGHT</Text>
        </View>
        <TouchableOpacity testID={`${testID}-live`} style={[st.liveBtn, live && st.liveBtnOn]} onPress={() => setLive(l => !l)}>
          <Text style={[st.liveText, live && st.liveTextOn]}>{live ? '● LIVE' : '○ LIVE'}</Text>
        </TouchableOpacity>
      </View>

      <Text style={st.chordLine}>{names.length ? names.join(' + ') : live ? 'LISTENING — PLAY ANYTHING IN THE APP' : 'SELECT NOTES'}</Text>
      <Text testID={`${testID}-verdict`} style={[st.verdict, { color: SK(verdict.color) }]}>{freqs.length >= 2 ? verdict.label : live ? '—' : 'SINGLE TONE'}</Text>
      <View style={st.scoreBar}><View style={[st.scoreFill, { width: `${verdict.score}%`, backgroundColor: SK(verdict.color) }]} /></View>
      <Text style={st.scoreText}>CONSONANCE {verdict.score}% · {freqs.map(fmt).join(' · ')} Hz</Text>

      <View style={st.canvasFrame}>
        <CanvasBridge ref={bridge} testID={`${testID}-canvas`} html={LISS_HTML} width={W} height={W} tag="__liss" onMessage={() => {}} onReady={() => bridge.current?.call('updateLiss', { freqs, color: verdict.color, label: verdict.label, dense })} liveAudio />
      </View>

      {verdict.pairs.length > 0 && (
        <View style={st.pairs}>
          {verdict.pairs.map(p => (
            <View key={`${p.a}-${p.b}`} style={st.pairRow}>
              <Text style={st.pairName}>{fmt(p.a)} : {fmt(p.b)}</Text>
              <Text style={[st.pairRatio, { color: SK(verdict.color) }]}>{p.n}:{p.d}</Text>
              <Text style={st.pairMeta}>{p.beat < 25 && p.beat > 0.5 ? `BEATING ${p.beat.toFixed(1)} Hz` : `HEIGHT ${p.height.toFixed(1)}`}</Text>
            </View>
          ))}
        </View>
      )}

      {/* note lattice */}
      <CosmicOctave freqs={freqs} testID={`${testID}-cosmic`} />
      <View style={st.rootRow}>
        <Text style={st.rowLabel}>ROOT</Text>
        {ROOTS.map(r => (
          <TouchableOpacity key={r} testID={`${testID}-root-${r}`} style={[st.chip, root === r && st.chipOn]} onPress={() => setRoot(r)}><Text style={[st.chipText, root === r && st.chipTextOn]}>{r} Hz</Text></TouchableOpacity>
        ))}
      </View>
      <View style={st.grid}>
        {JI_NOTES.map((n, i) => {
          const on = !live && sel.includes(i);
          const color = SK(n.color);
          return (
            <TouchableOpacity key={n.note + i} testID={`${testID}-note-${i}`} style={[st.note, { borderColor: on ? color : '#2a2a3a' }, on && { backgroundColor: `${color}22` }]} onPress={() => toggleNote(i)}>
              <Text style={[st.noteName, { color }]}>{n.note}</Text>
              <Text style={st.noteRatio}>{n.n}:{n.d}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.presets}>
        {PRESETS.map(p => (
          <TouchableOpacity key={p.label} testID={`${testID}-preset-${p.notes.join('-')}`} style={st.preset} onPress={() => { setLive(false); setSel(p.notes); }}>
            <Text style={st.presetText}>{p.label}</Text>
            <Text style={[st.presetVerdict, { color: SK(verdictFor(p.notes.map(i => root * JI_NOTES[i].n / JI_NOTES[i].d)).color) }]}>{verdictFor(p.notes.map(i => root * JI_NOTES[i].n / JI_NOTES[i].d)).label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <TouchableOpacity testID={`${testID}-play`} disabled={!freqs.length} style={[st.playBtn, playing && st.playBtnOn, !freqs.length && st.playOff]} onPress={play}>
        <Text style={st.playText}>{playing ? '■ STOP CHORD' : `▶ SOUND ${names.join(' + ') || 'CHORD'}`}</Text>
      </TouchableOpacity>
    </View>
  );
}

const st = skinStyles({
  tabBar: { flexDirection: 'row', gap: 6, marginBottom: 10 },
  tab: { flex: 1, minHeight: 52, borderWidth: 1, borderColor: '#2a2a3a', borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: '#050508', overflow: 'hidden' },
  tabLabel: { color: '#7a7a8a', fontSize: 11, fontWeight: '900', letterSpacing: 2.5 },
  tabSub: { color: '#5a5a6a', fontSize: 7.5, letterSpacing: 1.2, marginTop: 3 },
  tabLine: { position: 'absolute', bottom: 0, left: 12, right: 12, height: 2, borderRadius: 1 },
  hidden: { display: 'none' },
  wideRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  col: { flex: 1, minWidth: 0 },
  wrap: { borderWidth: 1, borderColor: '#2a2a3a', backgroundColor: '#050508', borderRadius: 10, padding: 14 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { color: '#fff', fontSize: 15, fontWeight: '900', letterSpacing: 2 },
  sub: { color: '#7a7a8a', fontSize: 8, letterSpacing: 1.2, marginTop: 3 },
  liveBtn: { borderWidth: 1, borderColor: '#2a2a3a', minHeight: 36, paddingHorizontal: 12, justifyContent: 'center', borderRadius: 6 },
  liveBtnOn: { borderColor: '#ff5a6a', backgroundColor: '#1a0608' },
  liveText: { color: '#7a7a8a', fontSize: 9, fontWeight: '900', letterSpacing: 1.5 },
  liveTextOn: { color: '#ff5a6a' },
  chordLine: { color: '#9a9aaa', fontSize: 11, letterSpacing: 3, textAlign: 'center', marginTop: 14 },
  verdict: { fontSize: 30, fontWeight: '900', letterSpacing: 2, textAlign: 'center', marginTop: 2 },
  scoreBar: { height: 4, backgroundColor: '#1a1a24', borderRadius: 2, marginTop: 8, overflow: 'hidden' },
  scoreFill: { height: 4 },
  scoreText: { color: '#7a7a8a', fontSize: 8.5, letterSpacing: 1.2, textAlign: 'center', marginTop: 4, marginBottom: 10 },
  canvasFrame: { alignSelf: 'center', borderWidth: 1, borderColor: '#2a2a3a', borderRadius: 8, overflow: 'hidden' },
  pairs: { marginTop: 10, borderWidth: 1, borderColor: '#2a2a3a', borderRadius: 6, backgroundColor: '#0a0a10' },
  pairRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 10, minHeight: 32, borderBottomWidth: 1, borderBottomColor: '#14141c' },
  pairName: { color: '#c8c8d8', fontSize: 9.5, fontWeight: '700', letterSpacing: 0.5 },
  pairRatio: { fontSize: 12, fontWeight: '900', letterSpacing: 1 },
  pairMeta: { color: '#7a7a8a', fontSize: 8.5, letterSpacing: 1 },
  rootRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 },
  rowLabel: { color: '#7a7a8a', fontSize: 8, fontWeight: '900', letterSpacing: 1.5, marginRight: 2 },
  chip: { flex: 1, borderWidth: 1, borderColor: '#2a2a3a', minHeight: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 6 },
  chipOn: { borderColor: '#f2d27a', backgroundColor: '#161506' },
  chipText: { color: '#7a7a8a', fontSize: 9, fontWeight: '800' },
  chipTextOn: { color: '#f2d27a' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 10 },
  note: { width: '13.5%', flexGrow: 1, borderWidth: 1, borderRadius: 6, minHeight: 46, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0a0a10' },
  noteName: { fontSize: 12, fontWeight: '900' },
  noteRatio: { color: '#7a7a8a', fontSize: 8, marginTop: 2 },
  presets: { gap: 6, paddingVertical: 10 },
  preset: { borderWidth: 1, borderColor: '#2a2a3a', borderRadius: 6, paddingHorizontal: 10, minHeight: 44, justifyContent: 'center', backgroundColor: '#0a0a10' },
  presetText: { color: '#c8c8d8', fontSize: 10, fontWeight: '800', letterSpacing: 1.5 },
  presetVerdict: { fontSize: 7.5, fontWeight: '900', letterSpacing: 1.2, marginTop: 2 },
  playBtn: { borderWidth: 1.5, borderColor: '#f2d27a', minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 8, backgroundColor: '#161506' },
  playBtnOn: { backgroundColor: '#2a2408' },
  playOff: { borderColor: '#2a2a3a' },
  playText: { color: '#f2d27a', fontSize: 10.5, fontWeight: '900', letterSpacing: 1.5 },
});
