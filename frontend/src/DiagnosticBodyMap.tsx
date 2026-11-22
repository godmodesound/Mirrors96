import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, useWindowDimensions } from 'react-native';
import { AudioEngine, ScopeFrame, ActiveFreq } from './AudioEngine';
import { COLLECTIONS, ArchiveCode } from './archive/archiveData';
import { useArchiveSession, playArchiveCode, stopArchive } from './archive/archiveSession';
import { BODY_POINTS, ExcitedPoint, pointsForCode, pointsForFrequencies, codesForPoint, signatureFor } from './bodyMapData';
import { skinStyles } from './skins';
import { CAL_ZONES, useCalibration, zoneForNode } from './calibration';
import PortalFigure from './PortalFigure';
import SoundSession from './SoundSession';
import { useScopeWave } from './useScopeWave';
import { FieldState, LIGHT_BODIES, MOOD_AXES, ACTIVATION_SECONDS, initialFieldState, stepField, moodLabel } from './biofield';

const TICK_MS = 500;

const fmtHz = (f: number) => (Number.isInteger(f) ? String(f) : f.toFixed(2).replace(/0+$/, '').replace(/\.$/, ''));

const SOURCE_LABEL: Record<ActiveFreq['source'], string> = { tone: 'GENERATOR', multi: 'CODES', binaural: 'BI-NAURAL', beat: 'BEAT', soundscape: 'SOUNDSCAPE', camelot: 'MIRRORS WHEEL' };

/** Engine registry → map state: exact Hz per source, intensity from relative gain. */
function engineMapState(list: ActiveFreq[]) {
  const freqs = list.map(f => Math.round(f.hz * 100) / 100);
  const maxGain = Math.max(0.05, ...list.map(f => f.gain ?? 0.3));
  const weights = list.map(f => 0.6 + 0.4 * ((f.gain ?? 0.3) / maxGain));
  const sources = [...new Set(list.map(f => f.source === 'beat' ? 'binaural' : f.source))] as ActiveFreq['source'][];
  const { sig, hex } = signatureFor(freqs);
  return { name: sources.map(s => SOURCE_LABEL[s]).join(' + '), code: `LIVE-${sources[0].slice(0, 3).toUpperCase()}`, freqs, points: pointsForFrequencies(freqs, undefined, weights), playing: true, sig, hex };
}

/**
 * DIAGNOSTIC BODY MAP — portal figure synced to the Codes Archive.
 * Priority: archive code playing → its mapped regions; else whatever the
 * AudioEngine is sounding right now (generator layers, Mirrors Wheel, bi-naural,
 * soundscapes) → regions resolved per exact Hz; else live FFT peaks (media).
 * Node intensity + waveforms follow the live analyser in realtime.
 */
export default function DiagnosticBodyMap({ testID = 'body-map' }: { testID?: string }) {
  const { width } = useWindowDimensions();
  const [boxW, setBoxW] = useState(0); // measured inner width → identical fit in every host (Home / BI-NAURAL / fold states)
  const W = Math.max(0, Math.min(boxW || width - 52, 520));
  const scope = useScopeWave();
  const session = useArchiveSession();
  const [category, setCategory] = useState(COLLECTIONS[0]?.id || 'schumann');
  const [selectedPt, setSelectedPt] = useState(0);
  const [livePoints, setLivePoints] = useState<{ freqs: number[]; points: ExcitedPoint[] } | null>(null);
  const [engineFreqs, setEngineFreqs] = useState<ActiveFreq[]>([]);

  // Exact sounding frequencies from the engine registry (deduped by value so slider drags don't thrash)
  useEffect(() => AudioEngine.subscribeActiveFreqs(list => {
    setEngineFreqs(prev => {
      const key = (l: ActiveFreq[]) => l.map(f => `${f.source}:${f.hz.toFixed(2)}:${(f.gain ?? 0).toFixed(2)}`).join('|');
      return key(prev) === key(list) ? prev : list;
    });
  }), []);

  // Active code (archive session) → excited points; else engine registry → exact regions; else live FFT peaks
  const active = session.active;
  const mapState = useMemo(() => {
    if (active) {
      const { sig, hex } = signatureFor(active.frequencies);
      return { name: active.name.toUpperCase(), code: `${active.category.slice(0, 3).toUpperCase()}-${String(active.index).padStart(3, '0')}`, freqs: active.frequencies, points: pointsForCode(active), playing: true, sig, hex };
    }
    if (engineFreqs.length) return engineMapState(engineFreqs);
    if (livePoints) {
      const { sig, hex } = signatureFor(livePoints.freqs);
      return { name: 'LIVE SIGNAL', code: 'LIVE-FFT', freqs: livePoints.freqs, points: livePoints.points, playing: true, sig, hex };
    }
    return { name: 'STANDBY', code: '', freqs: [] as number[], points: [] as ExcitedPoint[], playing: false, sig: [] as string[], hex: [] as string[] };
  }, [active, engineFreqs, livePoints]);

  // ── biofield / mood integration: nodes warm & cool around their resting baseline, mood + light bodies integrate exposure ──
  const [field, setField] = useState<FieldState>(initialFieldState);
  const mapRef = useRef(mapState);
  mapRef.current = mapState;
  useEffect(() => {
    let last = Date.now();
    const id = setInterval(() => {
      const now = Date.now(); const dt = Math.min(2, (now - last) / 1000); last = now;
      setField(f => stepField(f, mapRef.current.freqs, mapRef.current.points, dt, now));
    }, TICK_MS);
    return () => clearInterval(id);
  }, []);
  const mood = useMemo(() => moodLabel(field.mood), [field.mood]);
  const smoothedPoints = useMemo(() => field.nodes.map(n => ({ id: n.id, rest: n.rest, level: Math.round(n.level * 1000) / 1000, w: Math.max(0, Math.round(((n.level - n.rest) / (1 - n.rest)) * 100) / 100) })), [field.nodes]);
  const settling = !mapState.playing && smoothedPoints.some(p => p.w > 0.01);
  const recentNod = field.bodies.find(b => b.achieved && Date.now() - b.achievedAt < 6000);

  const lastLive = useRef(0);
  useEffect(() => AudioEngine.subscribeScope((frame: ScopeFrame) => {
    const now = Date.now();
    if (now - lastLive.current < 450) return;
    lastLive.current = now;
    const audible = frame.peak > 1.5;
    const top = (frame.peaks || []).filter(p => p.hz > 1).slice(0, 4);
    const freqs = top.map(p => Math.round(p.hz * 10) / 10);
    const maxMag = Math.max(1e-6, ...top.map(p => p.mag || 0));
    setLivePoints(prev => {
      if (!audible || !freqs.length) return prev ? null : prev;
      const key = freqs.join(',');
      if (prev && prev.freqs.join(',') === key) return prev;
      return { freqs, points: pointsForFrequencies(freqs, undefined, top.map(p => 0.5 + 0.5 * ((p.mag || 0) / maxMag))) };
    });
  }), []);

  const collection = COLLECTIONS.find(c => c.id === category) || COLLECTIONS[0];
  const point = BODY_POINTS.find(p => p.id === selectedPt);
  const pointCodes = useMemo(() => (selectedPt ? codesForPoint(selectedPt) : []), [selectedPt]);
  const calibration = useCalibration();
  const nodeZone = selectedPt ? zoneForNode(selectedPt) : undefined;
  const nodeCal = nodeZone && calibration[nodeZone.id] ? { zone: nodeZone, hz: calibration[nodeZone.id].hz } : null;
  const calCount = Object.keys(calibration).length;
  const excitedNames = mapState.points.map(p => BODY_POINTS.find(b => b.id === p.id)?.name).filter(Boolean);

  const renderCode = (code: ArchiveCode) => {
    const on = active?.id === code.id;
    return (
      <TouchableOpacity key={code.id} testID={`${testID}-code-${code.id}`} style={[st.codeRow, on && st.codeRowOn]} onPress={() => playArchiveCode(code)} activeOpacity={0.8}>
        <Text style={[st.codeIcon, on && st.codeIconOn]}>{on ? '■' : '▶'}</Text>
        <View style={st.codeInfo}>
          <Text style={[st.codeName, on && st.codeNameOn]} numberOfLines={1}>{code.name.toUpperCase()}</Text>
          <Text style={st.codeFreq} numberOfLines={1}>{code.frequencies.map(fmtHz).join(' · ')} Hz</Text>
        </View>
        <Text style={st.codeCat}>{code.category.slice(0, 4).toUpperCase()}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View testID={testID} style={st.wrap} onLayout={e => setBoxW(Math.floor(e.nativeEvent.layout.width - 22))}>
      <View style={st.titleRow}>
        <Text style={st.title}>◉ BIOMAP</Text>
        <View testID={`${testID}-audio-reactive`} style={[st.pill, scope.active && st.pillOn]}>
          <Text style={[st.status, scope.active && st.statusOn]}>{scope.active ? '●' : '○'} AUDIO REACTIVE</Text>
        </View>
      </View>
      <Text style={st.subtitle}>INFORMATIONAL FIELD · ARCHIVE SYNC · LIVE FFT DRIVE</Text>
      {calCount > 0 && <Text testID={`${testID}-calibrated`} style={st.nodeCal}>◎ CALIBRATED {calCount}/{CAL_ZONES.length} ZONES · TAP A NODE FOR YOUR TONE</Text>}

      <PortalFigure testID={testID} width={W} selected={selectedPt} scope={scope}
        levels={Object.fromEntries(smoothedPoints.map(p => [p.id, p.w]))}
        onSelect={id => setSelectedPt(prev => (prev === id ? 0 : id))} />

      <View style={st.viewRow}>
        <View testID={`${testID}-view-front`} style={[st.viewBtn, st.viewBtnOn]}><Text style={st.viewTextOn}>FRONT</Text></View>
        <View testID={`${testID}-view-back`} accessibilityState={{ disabled: true }} style={st.viewBtn}><Text style={st.viewText}>BACK · SOON</Text></View>
      </View>
      <Text style={st.tapHint}>Tap a region to map sound</Text>

      <SoundSession testID={`${testID}-session`} scope={scope} hz={nodeCal ? nodeCal.hz : 432}
        source={nodeCal ? `YOUR ${nodeCal.zone.name}` : 'TONE'} />

      {/* readout */}
      <View style={st.readout}>
        {mapState.playing ? (
          <>
            <View style={st.readoutRow}>
              <Text style={st.readoutName} numberOfLines={1}>{mapState.name}</Text>
              {active && (
                <TouchableOpacity testID={`${testID}-stop`} style={st.stopBtn} onPress={stopArchive}>
                  <Text style={st.stopText}>■ STOP</Text>
                </TouchableOpacity>
              )}
            </View>
            <Text style={st.readoutMeta} numberOfLines={2}>
              {mapState.freqs.map(fmtHz).join(' · ')} Hz → {excitedNames.length} NODE{excitedNames.length === 1 ? '' : 'S'}: {excitedNames.join(', ')}
            </Text>
          </>
        ) : (
          <Text style={st.readoutMeta}>{settling ? 'SIGNAL OFF · NODES RETURNING TO RESTING BASELINE' : 'SELECT A CODE BELOW OR TAP A BODY NODE. ANY FREQUENCY SOUNDING IN THE APP — GENERATOR, MIRRORS WHEEL, BI-NAURAL, ARCHIVE — MAPS HERE IN REALTIME.'}</Text>
        )}

        {/* mood — resting baseline vs. effect of the selected frequencies */}
        <View testID={`${testID}-mood`} style={st.moodRow}>
          <Text style={st.moodLabel}>MOOD</Text>
          <Text style={[st.moodPhrase, mood.axis && st.moodPhraseOn]} numberOfLines={1}>{mood.phrase}</Text>
          {mapState.playing && <Text style={st.moodTime}>{Math.floor(field.session)}s</Text>}
        </View>
        <View style={st.axes}>
          {MOOD_AXES.map(k => {
            const v = field.mood[k];
            return (
              <View key={k} style={st.axis}>
                <View style={st.axisTrack}>
                  <View style={st.axisZero} />
                  <View style={[st.axisFill, v >= 0 ? { left: '50%', width: `${Math.abs(v) * 50}%` } : { right: '50%', width: `${Math.abs(v) * 50}%` }, Math.abs(v) > 0.04 && st.axisFillOn]} />
                </View>
                <Text style={[st.axisName, Math.abs(v) > 0.04 && st.axisNameOn]}>{k}</Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* biofield — 9 Egyptian light bodies along the Djed column; quiet nods as they activate */}
      <View testID={`${testID}-biofield`} style={st.bioRow}>
        <Text style={st.bioLabel}>BIOFIELD</Text>
        <View style={st.bioChips}>
          {LIGHT_BODIES.map(b => {
            const s = field.bodies.find(x => x.id === b.id)!;
            const prog = Math.min(1, s.exposure / ACTIVATION_SECONDS);
            return (
              <View key={b.id} testID={`${testID}-body-${b.id}`} style={[st.bioChip, s.active && st.bioChipActive, s.achieved && st.bioChipOn]}>
                <Text style={[st.bioChipText, s.active && st.bioChipTextActive, s.achieved && st.bioChipTextOn]}>{b.name}</Text>
                <View style={st.bioBar}><View style={[st.bioBarFill, { width: `${(s.achieved ? 1 : prog) * 100}%` }, s.achieved && st.bioBarFillOn]} /></View>
              </View>
            );
          })}
        </View>
        {recentNod && (
          <Text testID={`${testID}-nod`} style={st.nod} numberOfLines={1}>
            ✦ {LIGHT_BODIES.find(b => b.id === recentNod.id)!.name} · {LIGHT_BODIES.find(b => b.id === recentNod.id)!.title} · ACTIVE
          </Text>
        )}
      </View>

      {/* selected node */}
      {point && (
        <View testID={`${testID}-node-panel`} style={st.nodePanel}>
          <View style={st.readoutRow}>
            <Text style={st.nodeTitle}>PT {point.id} · {point.name}</Text>
            <Text style={st.nodeLatin}>{point.latin}</Text>
          </View>
          {nodeCal && <Text testID={`${testID}-node-calibration`} style={st.nodeCal}>◎ YOUR RESONANCE · {nodeCal.zone.name} · {nodeCal.hz.toFixed(2)} Hz</Text>}
          <Text style={st.nodeHint}>{pointCodes.length} ARCHIVE CODE{pointCodes.length === 1 ? '' : 'S'} EXCITE THIS NODE</Text>
          <ScrollView style={st.nodeList} nestedScrollEnabled showsVerticalScrollIndicator={false}>
            {pointCodes.slice(0, 40).map(renderCode)}
          </ScrollView>
        </View>
      )}

      {/* archive sync */}
      <Text style={st.sectionLabel}>CODES ARCHIVE · {collection.codes.length} IN {collection.name}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.chips}>
        {COLLECTIONS.map(c => {
          const on = c.id === category;
          return (
            <TouchableOpacity key={c.id} testID={`${testID}-cat-${c.id}`} style={[st.chip, on && st.chipOn]} onPress={() => setCategory(c.id)}>
              <Text style={[st.chipText, on && st.chipTextOn]}>{c.icon} {c.name}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      <ScrollView style={st.codeList} nestedScrollEnabled showsVerticalScrollIndicator={false}>
        {collection.codes.map(renderCode)}
      </ScrollView>
    </View>
  );
}

const st = skinStyles({
  wrap: { marginBottom: 24, borderWidth: 1, borderColor: '#1f5a30', backgroundColor: '#020d07', borderRadius: 6, padding: 10 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { color: '#a9ff8a', fontSize: 12, fontWeight: '900', letterSpacing: 2 },
  status: { color: '#4fa85c', fontSize: 9, fontWeight: '800', letterSpacing: 1.5 },
  statusOn: { color: '#f3ffc4' },
  subtitle: { color: '#3f8a4c', fontSize: 8, letterSpacing: 1.5, marginTop: 3, marginBottom: 10 },
  pill: { borderWidth: 1, borderColor: '#1f5a30', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  pillOn: { borderColor: '#a9ff8a' },
  viewRow: { flexDirection: 'row', alignSelf: 'center', marginTop: 10, borderWidth: 1, borderColor: '#4fa85c', borderRadius: 16, overflow: 'hidden' },
  viewBtn: { minWidth: 110, paddingVertical: 8, alignItems: 'center' },
  viewBtnOn: { backgroundColor: '#a9ff8a' },
  viewTextOn: { color: '#03140a', fontSize: 10, fontWeight: '900', letterSpacing: 2 },
  viewText: { color: '#2f7a3c', fontSize: 10, fontWeight: '800', letterSpacing: 2 },
  tapHint: { color: '#c8ffb8', fontSize: 10, fontStyle: 'italic', letterSpacing: 1.5, textAlign: 'center', marginTop: 8 },
  readout: { marginTop: 10, borderWidth: 1, borderColor: '#1f5a30', padding: 8, backgroundColor: '#03140a' },
  readoutRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  readoutName: { flex: 1, color: '#f3ffc4', fontSize: 11, fontWeight: '900', letterSpacing: 1.5 },
  readoutMeta: { color: '#4fa85c', fontSize: 9, letterSpacing: 0.8, marginTop: 4, lineHeight: 13 },
  stopBtn: { borderWidth: 1, borderColor: '#a9ff8a', paddingVertical: 8, paddingHorizontal: 12, minHeight: 34, justifyContent: 'center' },
  stopText: { color: '#a9ff8a', fontSize: 9, fontWeight: '900', letterSpacing: 1.5 },
  moodRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#0f2e18' },
  moodLabel: { color: '#4fa85c', fontSize: 8, fontWeight: '800', letterSpacing: 1.5 },
  moodPhrase: { flex: 1, color: '#4fa85c', fontSize: 10, fontWeight: '900', letterSpacing: 1.2 },
  moodPhraseOn: { color: '#f3ffc4' },
  moodTime: { color: '#2f7a3c', fontSize: 8, letterSpacing: 1 },
  axes: { flexDirection: 'row', gap: 6, marginTop: 6 },
  axis: { flex: 1, alignItems: 'center', gap: 3 },
  axisTrack: { width: '100%', height: 4, backgroundColor: '#0a2a14', position: 'relative', overflow: 'hidden' },
  axisZero: { position: 'absolute', left: '50%', top: 0, bottom: 0, width: 1, backgroundColor: '#1f5a30' },
  axisFill: { position: 'absolute', top: 0, bottom: 0, backgroundColor: '#2f7a3c' },
  axisFillOn: { backgroundColor: '#f3ffc4' },
  axisName: { color: '#2f7a3c', fontSize: 7, letterSpacing: 1 },
  axisNameOn: { color: '#a9ff8a' },
  bioRow: { marginTop: 8, borderWidth: 1, borderColor: '#1f5a30', padding: 8, backgroundColor: '#03140a' },
  bioLabel: { color: '#4fa85c', fontSize: 8, fontWeight: '800', letterSpacing: 1.5, marginBottom: 6 },
  bioChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  bioChip: { borderWidth: 1, borderColor: '#0f2e18', paddingHorizontal: 6, paddingTop: 4, paddingBottom: 3, minWidth: 54, backgroundColor: '#020d07' },
  bioChipActive: { borderColor: '#4fa85c' },
  bioChipOn: { borderColor: '#f3ffc4', backgroundColor: '#0a2a14' },
  bioChipText: { color: '#2f7a3c', fontSize: 8, fontWeight: '800', letterSpacing: 1.2, textAlign: 'center' },
  bioChipTextActive: { color: '#a9ff8a' },
  bioChipTextOn: { color: '#f3ffc4' },
  bioBar: { height: 2, backgroundColor: '#0a2a14', marginTop: 3 },
  bioBarFill: { height: 2, backgroundColor: '#4fa85c' },
  bioBarFillOn: { backgroundColor: '#f3ffc4' },
  nod: { color: '#f3ffc4', fontSize: 9, fontWeight: '900', letterSpacing: 1.2, marginTop: 8 },
  nodePanel: { marginTop: 8, borderWidth: 1, borderColor: '#4fa85c', padding: 8, backgroundColor: '#04170c' },
  nodeTitle: { color: '#a9ff8a', fontSize: 11, fontWeight: '900', letterSpacing: 1.5 },
  nodeLatin: { color: '#4fa85c', fontSize: 9, letterSpacing: 1.5, fontStyle: 'italic' },
  nodeCal: { color: '#f3ffc4', fontSize: 9, fontWeight: '900', letterSpacing: 1, marginTop: 4, marginBottom: 6 },
  nodeHint: { color: '#4fa85c', fontSize: 8, letterSpacing: 1.2, marginTop: 4, marginBottom: 6 },
  nodeList: { maxHeight: 200 },
  sectionLabel: { color: '#4fa85c', fontSize: 9, fontWeight: '800', letterSpacing: 1.5, marginTop: 14, marginBottom: 8 },
  chips: { gap: 6, paddingBottom: 8 },
  chip: { borderWidth: 1, borderColor: '#1f5a30', paddingHorizontal: 10, minHeight: 34, justifyContent: 'center', backgroundColor: '#03140a' },
  chipOn: { borderColor: '#a9ff8a', backgroundColor: '#0a2a14' },
  chipText: { color: '#4fa85c', fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  chipTextOn: { color: '#a9ff8a' },
  codeList: { maxHeight: 260, borderWidth: 1, borderColor: '#1f5a30' },
  codeRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 10, minHeight: 48, borderBottomWidth: 1, borderBottomColor: '#0f2e18' },
  codeRowOn: { backgroundColor: '#0a2a14' },
  codeIcon: { color: '#4fa85c', fontSize: 12, width: 14 },
  codeIconOn: { color: '#f3ffc4' },
  codeInfo: { flex: 1 },
  codeName: { color: '#c8ffb8', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  codeNameOn: { color: '#f3ffc4' },
  codeFreq: { color: '#4fa85c', fontSize: 9, marginTop: 2 },
  codeCat: { color: '#2f7a3c', fontSize: 8, letterSpacing: 1 },
});
