import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, useWindowDimensions } from 'react-native';
import CanvasBridge, { CanvasBridgeHandle } from './CanvasBridge';
import { BONE_HTML, BONE_REGIONS, BONE_TOTAL, AXIAL_TOTAL, APPENDICULAR_TOTAL } from './boneHtml';
import { COLLECTIONS, ArchiveCode } from './archive/archiveData';
import { useArchiveSession, playArchiveCode, stopArchive } from './archive/archiveSession';
import { skinStyles, SK } from './skins';

type Mode = 'ALL' | 'AXIAL' | 'APPENDICULAR';
const fmtHz = (f: number) => (Number.isInteger(f) ? String(f) : f.toFixed(2).replace(/0+$/, '').replace(/\.$/, ''));

/** 206 BONE MAP — interactive front-view skeleton; tap a region for its bone count breakdown + BONE archive codes. */
export default function BoneMap({ testID = 'bones' }: { testID?: string }) {
  const { width } = useWindowDimensions();
  const W = Math.min(width - 40, 480);
  const H = Math.round(W * 1.45);
  const bridge = useRef<CanvasBridgeHandle>(null);
  const [selected, setSelected] = useState('');
  const [mode, setMode] = useState<Mode>('ALL');
  const session = useArchiveSession();
  const boneCodes = useMemo(() => COLLECTIONS.find(c => c.id === 'bone')?.codes || [], []);

  useEffect(() => { bridge.current?.call('updateBones', { selected, mode }); }, [selected, mode]);
  const onMessage = useCallback((msg: any) => { if (msg.type === 'region') setSelected(prev => (prev === msg.id ? '' : msg.id)); }, []);

  const region = BONE_REGIONS.find(r => r.id === selected);
  const regionCodes: ArchiveCode[] = region ? region.codes.map(n => boneCodes.find(c => c.name === n)).filter((c): c is ArchiveCode => !!c) : boneCodes;
  const shown = mode === 'ALL' ? BONE_TOTAL : mode === 'AXIAL' ? AXIAL_TOTAL : APPENDICULAR_TOTAL;

  return (
    <View testID={testID} style={st.wrap}>
      <View style={st.head}>
        <View style={{ flex: 1 }}>
          <Text style={st.title}>206 BONE MAP</Text>
          <Text style={st.sub}>TAP A BONE GROUP · AT BIRTH ≈ 270 → ADULT 206 (FUSION)</Text>
        </View>
        <View style={st.counter}>
          <Text style={st.counterNum}>{shown}</Text>
          <Text style={st.counterLabel}>{mode === 'ALL' ? 'BONES' : mode}</Text>
        </View>
      </View>

      <View style={st.modeRow}>
        {(['ALL', 'AXIAL', 'APPENDICULAR'] as Mode[]).map(m => (
          <TouchableOpacity key={m} testID={`${testID}-mode-${m}`} style={[st.mode, mode === m && st.modeOn]} onPress={() => setMode(m)}>
            <Text style={[st.modeText, mode === m && st.modeTextOn]}>{m === 'ALL' ? `ALL ${BONE_TOTAL}` : m === 'AXIAL' ? `AXIAL ${AXIAL_TOTAL}` : `APPENDICULAR ${APPENDICULAR_TOTAL}`}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={st.canvasFrame}>
        <CanvasBridge ref={bridge} testID={`${testID}-canvas`} html={BONE_HTML} width={W} height={H} tag="__bones" onMessage={onMessage} onReady={() => bridge.current?.call('updateBones', { selected, mode })} />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.chips}>
        {BONE_REGIONS.map(r => {
          const on = r.id === selected;
          const color = SK(r.color);
          return (
            <TouchableOpacity key={r.id} testID={`${testID}-region-${r.id}`} style={[st.chip, { borderColor: on ? color : '#3a3020' }, on && { backgroundColor: `${color}22` }]} onPress={() => setSelected(on ? '' : r.id)}>
              <Text style={[st.chipText, on && { color }]}>{r.name} · {r.count}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={[st.panel, region && { borderColor: SK(region.color) }]}>
        {region ? (
          <>
            <View style={st.panelHead}>
              <Text style={[st.panelTitle, { color: SK(region.color) }]}>{region.name}</Text>
              <Text style={st.panelCount}>{region.count} · {region.group}</Text>
            </View>
            {region.breakdown.map(line => <Text key={line} style={st.panelLine}>• {line}</Text>)}
          </>
        ) : (
          <>
            <Text style={st.panelTitle}>DIVISION OF BONES</Text>
            <Text style={st.panelLine}>• AXIAL {AXIAL_TOTAL} — Skull 22 · Auditory ossicles 6 · Hyoid 1 · Vertebral column 26 · Ribs 24 · Sternum 1</Text>
            <Text style={st.panelLine}>• APPENDICULAR {APPENDICULAR_TOTAL} — Pectoral girdle 4 · Upper limbs 60 · Pelvic girdle 2 · Lower limbs 60</Text>
            <Text style={st.panelLine}>Bones give structure, support, protect organs, enable movement and store minerals.</Text>
          </>
        )}
      </View>

      <Text style={st.codesLabel}>BONE RESONANCE · {region ? `${regionCodes.length} CODES FOR ${region.name}` : `${boneCodes.length} ARCHIVE CODES`}</Text>
      <View style={st.codes}>
        {regionCodes.map(code => {
          const on = session.active?.id === code.id;
          return (
            <TouchableOpacity key={code.id} testID={`${testID}-code-${code.id}`} style={[st.codeRow, on && st.codeRowOn]} onPress={() => (on ? stopArchive() : playArchiveCode(code))}>
              <Text style={[st.codeIcon, on && st.codeIconOn]}>{on ? '■' : '▶'}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[st.codeName, on && st.codeIconOn]} numberOfLines={1}>{code.name.toUpperCase()}</Text>
                <Text style={st.codeFreq} numberOfLines={1}>{code.frequencies.map(fmtHz).join(' · ')} Hz</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const st = skinStyles({
  wrap: { borderWidth: 1, borderColor: '#3a3020', backgroundColor: '#050402', borderRadius: 8, padding: 12 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { color: '#e9dcc0', fontSize: 15, fontWeight: '900', letterSpacing: 2 },
  sub: { color: '#8a7f68', fontSize: 8, letterSpacing: 1.2, marginTop: 3 },
  counter: { borderWidth: 1, borderColor: '#e9dcc0', paddingHorizontal: 10, paddingVertical: 4, alignItems: 'center', borderRadius: 6, minWidth: 64 },
  counterNum: { color: '#fff', fontSize: 20, fontWeight: '900' },
  counterLabel: { color: '#8a7f68', fontSize: 7, letterSpacing: 1.5 },
  modeRow: { flexDirection: 'row', gap: 6, marginTop: 10, marginBottom: 10 },
  mode: { flex: 1, borderWidth: 1, borderColor: '#3a3020', minHeight: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 6 },
  modeOn: { borderColor: '#e9dcc0', backgroundColor: '#1a1608' },
  modeText: { color: '#8a7f68', fontSize: 8, fontWeight: '800', letterSpacing: 1 },
  modeTextOn: { color: '#e9dcc0' },
  canvasFrame: { alignSelf: 'center', borderWidth: 1, borderColor: '#3a3020', borderRadius: 6, overflow: 'hidden' },
  chips: { gap: 6, paddingVertical: 10 },
  chip: { borderWidth: 1, minHeight: 36, paddingHorizontal: 10, justifyContent: 'center', borderRadius: 6, backgroundColor: '#0a0806' },
  chipText: { color: '#a89f88', fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  panel: { borderWidth: 1, borderColor: '#3a3020', padding: 10, backgroundColor: '#0a0806', borderRadius: 6 },
  panelHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  panelTitle: { color: '#e9dcc0', fontSize: 11, fontWeight: '900', letterSpacing: 1.5 },
  panelCount: { color: '#8a7f68', fontSize: 9, letterSpacing: 1, fontWeight: '800' },
  panelLine: { color: '#c8bfa8', fontSize: 9.5, lineHeight: 14, marginTop: 4 },
  codesLabel: { color: '#8a7f68', fontSize: 8, fontWeight: '800', letterSpacing: 1.5, marginTop: 12, marginBottom: 6 },
  codes: { borderWidth: 1, borderColor: '#3a3020', borderRadius: 6 },
  codeRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 10, minHeight: 48, borderBottomWidth: 1, borderBottomColor: '#1a1608' },
  codeRowOn: { backgroundColor: '#1a1608' },
  codeIcon: { color: '#8a7f68', fontSize: 12, width: 14 },
  codeIconOn: { color: '#ffe680' },
  codeName: { color: '#e9dcc0', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  codeFreq: { color: '#8a7f68', fontSize: 9, marginTop: 2 },
});
