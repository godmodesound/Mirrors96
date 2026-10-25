import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Platform, useWindowDimensions } from 'react-native';
import { WebView } from 'react-native-webview';
import { AudioEngine, ScopeFrame } from './AudioEngine';
import { COLLECTIONS, ArchiveCode } from './archive/archiveData';
import { useArchiveSession, playArchiveCode, stopArchive } from './archive/archiveSession';
import { BODY_POINTS, ExcitedPoint, pointsForCode, pointsForFrequencies, codesForPoint, signatureFor } from './bodyMapData';
import { BODY_MAP_HTML } from './bodyMapHtml';
import { skinStyles, SK, skinHtml } from './skins';

const fmtHz = (f: number) => (Number.isInteger(f) ? String(f) : f.toFixed(2).replace(/0+$/, '').replace(/\.$/, ''));

/**
 * DIAGNOSTIC BODY MAP — phosphor CRT canvas synced to the Codes Archive.
 * Any archive code playing (here or from the Archive tab) excites its mapped
 * body nodes; node intensity + waveforms follow the live AudioEngine analyser.
 */
export default function DiagnosticBodyMap({ testID = 'body-map' }: { testID?: string }) {
  const { width } = useWindowDimensions();
  const [boxW, setBoxW] = useState(0); // measured inner width → identical fit in every host (Home / BI-NAURAL / fold states)
  const W = Math.min(boxW || width - 52, 520);
  const H = Math.round(W * 1.12);
  const session = useArchiveSession();
  const [category, setCategory] = useState(COLLECTIONS[0]?.id || 'schumann');
  const [selectedPt, setSelectedPt] = useState(0);
  const [livePoints, setLivePoints] = useState<{ freqs: number[]; points: ExcitedPoint[] } | null>(null);
  const webRef = useRef<WebView>(null);
  const iframeRef = useRef<any>(null);
  const html = useMemo(() => skinHtml(BODY_MAP_HTML), []);

  const push = useCallback((fn: 'updateMap' | 'pushWave', payload: object) => {
    const json = JSON.stringify(payload);
    if (Platform.OS === 'web') {
      try { iframeRef.current?.contentWindow?.[fn]?.(json); } catch {}
    } else {
      webRef.current?.injectJavaScript(`window.${fn}(${JSON.stringify(json)}); true;`);
    }
  }, []);

  // Active code (archive session) → excited points; else live FFT peaks → chakra column nodes
  const active = session.active;
  const mapState = useMemo(() => {
    if (active) {
      const { sig, hex } = signatureFor(active.frequencies);
      return { name: active.name.toUpperCase(), code: `${active.category.slice(0, 3).toUpperCase()}-${String(active.index).padStart(3, '0')}`, freqs: active.frequencies, points: pointsForCode(active), playing: true, sig, hex };
    }
    if (livePoints) {
      const { sig, hex } = signatureFor(livePoints.freqs);
      return { name: 'LIVE SIGNAL', code: 'LIVE-FFT', freqs: livePoints.freqs, points: livePoints.points, playing: true, sig, hex };
    }
    return { name: 'STANDBY', code: '', freqs: [] as number[], points: [] as ExcitedPoint[], playing: false, sig: [] as string[], hex: [] as string[] };
  }, [active, livePoints]);

  const fullConfig = useCallback(() => ({ ...mapState, selected: selectedPt }), [mapState, selectedPt]);
  useEffect(() => { push('updateMap', fullConfig()); }, [fullConfig, push]);

  const lastPush = useRef(0);
  const lastLive = useRef(0);
  useEffect(() => AudioEngine.subscribeScope((frame: ScopeFrame) => {
    const now = Date.now();
    if (Platform.OS === 'web' || now - lastPush.current >= 40) {
      lastPush.current = now;
      push('pushWave', { __wave: true, wave: Platform.OS === 'web' ? frame.wave : frame.wave.filter((_, i) => i % 2 === 0), peak: frame.peak, rms: frame.rms, measuredHz: frame.measuredHz, peaks: (frame.peaks || []).slice(0, 4) });
    }
    if (now - lastLive.current < 450) return;
    lastLive.current = now;
    const audible = frame.peak > 1.5;
    const freqs = (frame.peaks || []).filter(p => p.hz > 1).slice(0, 4).map(p => Math.round(p.hz * 10) / 10);
    setLivePoints(prev => {
      if (!audible || !freqs.length) return prev ? null : prev;
      const key = freqs.join(',');
      if (prev && prev.freqs.join(',') === key) return prev;
      return { freqs, points: pointsForFrequencies(freqs) };
    });
  }), [push]);

  const onCanvasMessage = useCallback((raw: string) => {
    try {
      const msg = JSON.parse(raw);
      if (msg?.__bodymap && msg.type === 'pt') setSelectedPt(prev => (prev === msg.id ? 0 : msg.id));
    } catch {}
  }, []);
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const handler = (e: MessageEvent) => { if (typeof e.data === 'string' && e.data.includes('__bodymap')) onCanvasMessage(e.data); };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [onCanvasMessage]);

  const collection = COLLECTIONS.find(c => c.id === category) || COLLECTIONS[0];
  const point = BODY_POINTS.find(p => p.id === selectedPt);
  const pointCodes = useMemo(() => (selectedPt ? codesForPoint(selectedPt) : []), [selectedPt]);
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
        <Text style={st.title}>◉ DIAGNOSTIC BODY MAP</Text>
        <Text style={[st.status, mapState.playing && st.statusOn]}>{mapState.playing ? '● SCAN ACTIVE' : '○ STANDBY'}</Text>
      </View>
      <Text style={st.subtitle}>INFORMATIONAL FIELD · ARCHIVE SYNC · LIVE FFT DRIVE</Text>

      <View testID={`${testID}-canvas`} style={[st.canvas, { width: W, height: H }]}>
        {Platform.OS === 'web' ? (
          React.createElement('iframe', {
            ref: iframeRef,
            srcDoc: html,
            style: { width: '100%', height: '100%', border: 'none', backgroundColor: SK('#03140a') },
            onLoad: () => push('updateMap', fullConfig()),
          })
        ) : (
          <WebView
            ref={webRef}
            source={{ html }}
            style={st.webview}
            javaScriptEnabled
            scrollEnabled={false}
            androidLayerType="hardware"
            onLoadEnd={() => push('updateMap', fullConfig())}
            onMessage={e => onCanvasMessage(e.nativeEvent.data)}
          />
        )}
      </View>

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
          <Text style={st.readoutMeta}>SELECT A CODE BELOW OR TAP A BODY NODE. ANY CODE PLAYING FROM THE ARCHIVE SYNCS HERE.</Text>
        )}
      </View>

      {/* selected node */}
      {point && (
        <View testID={`${testID}-node-panel`} style={st.nodePanel}>
          <View style={st.readoutRow}>
            <Text style={st.nodeTitle}>PT {point.id} · {point.name}</Text>
            <Text style={st.nodeLatin}>{point.latin}</Text>
          </View>
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
  canvas: { alignSelf: 'center', borderWidth: 1, borderColor: '#1f5a30', borderRadius: 4, overflow: 'hidden', backgroundColor: '#03140a' },
  webview: { flex: 1, backgroundColor: 'transparent' },
  readout: { marginTop: 10, borderWidth: 1, borderColor: '#1f5a30', padding: 8, backgroundColor: '#03140a' },
  readoutRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  readoutName: { flex: 1, color: '#f3ffc4', fontSize: 11, fontWeight: '900', letterSpacing: 1.5 },
  readoutMeta: { color: '#4fa85c', fontSize: 9, letterSpacing: 0.8, marginTop: 4, lineHeight: 13 },
  stopBtn: { borderWidth: 1, borderColor: '#a9ff8a', paddingVertical: 8, paddingHorizontal: 12, minHeight: 34, justifyContent: 'center' },
  stopText: { color: '#a9ff8a', fontSize: 9, fontWeight: '900', letterSpacing: 1.5 },
  nodePanel: { marginTop: 8, borderWidth: 1, borderColor: '#4fa85c', padding: 8, backgroundColor: '#04170c' },
  nodeTitle: { color: '#a9ff8a', fontSize: 11, fontWeight: '900', letterSpacing: 1.5 },
  nodeLatin: { color: '#4fa85c', fontSize: 9, letterSpacing: 1.5, fontStyle: 'italic' },
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
