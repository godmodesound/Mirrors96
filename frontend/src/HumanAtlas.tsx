import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, useWindowDimensions } from 'react-native';
import CanvasBridge, { CanvasBridgeHandle } from './CanvasBridge';
import { ATLAS_HTML } from './atlasHtml';
import { STRUCTURES, SYSTEMS, AtlasSystem, BONE_TOTAL, AXIAL_TOTAL, APPENDICULAR_TOTAL } from './atlasData';
import { COLLECTIONS, ArchiveCode, categoryName } from './archive/archiveData';
import { useArchiveSession, playArchiveCode, stopArchive } from './archive/archiveSession';
import { skinStyles, SK } from './skins';

type Mode = 'ALL' | 'AXIAL' | 'APPENDICULAR';
type Layers = Record<AtlasSystem, boolean>;
const ALL_ON: Layers = { SKELETON: true, CARDIOVASCULAR: true, NERVOUS: true, ORGANS: true };
const fmtHz = (f: number) => (Number.isInteger(f) ? String(f) : f.toFixed(2).replace(/0+$/, '').replace(/\.$/, ''));

/** HUMAN ATLAS — Humanome-style layered body (skeleton · cardio · nervous · organs); tap any structure → what it does + archive codes. */
export default function HumanAtlas({ testID = 'atlas' }: { testID?: string }) {
  const { width } = useWindowDimensions();
  const W = Math.min(width - 40, 480);
  const H = Math.round(W * 1.5);
  const bridge = useRef<CanvasBridgeHandle>(null);
  const [selected, setSelected] = useState('');
  const [layers, setLayers] = useState<Layers>(ALL_ON);
  const [mode, setMode] = useState<Mode>('ALL');
  const [sysTab, setSysTab] = useState<AtlasSystem>('SKELETON');
  const session = useArchiveSession();

  const state = useCallback(() => ({ selected, layers, mode }), [selected, layers, mode]);
  useEffect(() => { bridge.current?.call('updateAtlas', state()); }, [state]);
  const onMessage = useCallback((msg: any) => { if (msg.type === 'structure') setSelected(prev => (prev === msg.id ? '' : msg.id)); }, []);

  const sel = STRUCTURES.find(s => s.id === selected);
  const codes: ArchiveCode[] = useMemo(() => {
    if (!sel) return [];
    const out: ArchiveCode[] = [];
    sel.cats.forEach(cat => COLLECTIONS.find(c => c.id === cat)?.codes.forEach(code => out.push(code)));
    return out.slice(0, 24);
  }, [sel]);
  const visibleCount = Object.values(layers).filter(Boolean).length;
  const boneShown = mode === 'ALL' ? BONE_TOTAL : mode === 'AXIAL' ? AXIAL_TOTAL : APPENDICULAR_TOTAL;

  return (
    <View testID={testID} style={st.wrap}>
      <View style={st.head}>
        <View style={{ flex: 1 }}>
          <Text style={st.title}>HUMAN ATLAS</Text>
          <Text style={st.sub}>LAYERED BODY · TAP ANY STRUCTURE · {STRUCTURES.length} PARTS · {BONE_TOTAL} BONES</Text>
        </View>
        <View style={st.counter}>
          <Text style={st.counterNum}>{layers.SKELETON ? boneShown : visibleCount}</Text>
          <Text style={st.counterLabel}>{layers.SKELETON ? (mode === 'ALL' ? 'BONES' : mode) : 'LAYERS'}</Text>
        </View>
      </View>

      {/* system layers */}
      <View style={st.layerRow}>
        <TouchableOpacity testID={`${testID}-layers-all`} style={st.layerAll} onPress={() => setLayers(ALL_ON)}><Text style={st.layerAllText}>ALL</Text></TouchableOpacity>
        <TouchableOpacity testID={`${testID}-layers-none`} style={st.layerAll} onPress={() => setLayers({ SKELETON: false, CARDIOVASCULAR: false, NERVOUS: false, ORGANS: false })}><Text style={st.layerAllText}>NONE</Text></TouchableOpacity>
        {SYSTEMS.map(s => {
          const on = layers[s.id];
          const color = SK(s.color);
          return (
            <TouchableOpacity key={s.id} testID={`${testID}-layer-${s.id}`} style={[st.layer, { borderColor: on ? color : '#2a3340' }, on && { backgroundColor: `${color}1a` }]} onPress={() => setLayers(l => ({ ...l, [s.id]: !l[s.id] }))}>
              <View style={[st.layerDot, { backgroundColor: on ? color : SK('#2a3340') }]} />
              <Text style={[st.layerText, on && { color }]}>{s.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={st.canvasFrame}>
        <CanvasBridge ref={bridge} testID={`${testID}-canvas`} html={ATLAS_HTML} width={W} height={H} tag="__atlas" onMessage={onMessage} onReady={() => bridge.current?.call('updateAtlas', state())} liveAudio />
      </View>

      {layers.SKELETON && (
        <View style={st.modeRow}>
          {(['ALL', 'AXIAL', 'APPENDICULAR'] as Mode[]).map(m => (
            <TouchableOpacity key={m} testID={`${testID}-mode-${m}`} style={[st.mode, mode === m && st.modeOn]} onPress={() => setMode(m)}>
              <Text style={[st.modeText, mode === m && st.modeTextOn]}>{m === 'ALL' ? `ALL ${BONE_TOTAL}` : m === 'AXIAL' ? `AXIAL ${AXIAL_TOTAL}` : `APPENDICULAR ${APPENDICULAR_TOTAL}`}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* structure browser */}
      <View style={st.tabs}>
        {SYSTEMS.map(s => (
          <TouchableOpacity key={s.id} testID={`${testID}-tab-${s.id}`} style={[st.tab, sysTab === s.id && { borderBottomColor: SK(s.color) }]} onPress={() => setSysTab(s.id)}>
            <Text style={[st.tabText, sysTab === s.id && { color: SK(s.color) }]}>{s.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.chips}>
        {STRUCTURES.filter(s => s.system === sysTab).map(s => {
          const on = s.id === selected;
          const color = SK(s.color);
          return (
            <TouchableOpacity key={s.id} testID={`${testID}-part-${s.id}`} style={[st.chip, { borderColor: on ? color : '#2a3340' }, on && { backgroundColor: `${color}22` }]} onPress={() => setSelected(on ? '' : s.id)}>
              <Text style={[st.chipText, on && { color }]}>{s.name}{s.count ? ` · ${s.count}` : ''}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View testID={`${testID}-panel`} style={[st.panel, sel && { borderColor: SK(sel.color) }]}>
        {sel ? (
          <>
            <View style={st.panelHead}>
              <Text style={[st.panelTitle, { color: SK(sel.color) }]}>{sel.name}</Text>
              <Text style={st.panelMeta}>{sel.count ? `${sel.count} BONES · ${sel.group}` : sel.system}</Text>
            </View>
            <Text style={st.panelDesc}>{sel.desc}</Text>
            {sel.breakdown?.map(line => <Text key={line} style={st.panelLine}>• {line}</Text>)}
            <Text style={st.codesLabel}>RESONANCE CODES · {sel.cats.map(c => categoryName(c)).join(' / ')} · {codes.length}</Text>
            <ScrollView style={st.codes} nestedScrollEnabled showsVerticalScrollIndicator={false}>
              {codes.map(code => {
                const on = session.active?.id === code.id;
                return (
                  <TouchableOpacity key={code.id} testID={`${testID}-code-${code.id}`} style={[st.codeRow, on && st.codeRowOn]} onPress={() => (on ? stopArchive() : playArchiveCode(code))}>
                    <Text style={[st.codeIcon, on && { color: SK(sel.color) }]}>{on ? '■' : '▶'}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={[st.codeName, on && { color: SK(sel.color) }]} numberOfLines={1}>{code.name.toUpperCase()}</Text>
                      <Text style={st.codeFreq} numberOfLines={1}>{code.frequencies.map(fmtHz).join(' · ')} Hz</Text>
                    </View>
                    <Text style={st.codeCat}>{code.category.slice(0, 4).toUpperCase()}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </>
        ) : (
          <>
            <Text style={st.panelTitle}>SELECT A STRUCTURE</Text>
            <Text style={st.panelDesc}>Toggle the skeleton, cardiovascular, nervous and organ layers, then tap any part on the body (or a chip above) to read what it is and does — and sound the archive codes tuned to it.</Text>
            <Text style={st.panelLine}>• AXIAL {AXIAL_TOTAL} — Skull 22 · Ossicles 6 · Hyoid 1 · Spine 26 · Ribs 24 · Sternum 1</Text>
            <Text style={st.panelLine}>• APPENDICULAR {APPENDICULAR_TOTAL} — Shoulder girdle 4 · Arms 60 · Pelvis 2 · Legs 60</Text>
          </>
        )}
      </View>
    </View>
  );
}

const st = skinStyles({
  wrap: { borderWidth: 1, borderColor: '#2a3340', backgroundColor: '#0d1117', borderRadius: 8, padding: 12 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { color: '#e9dcc0', fontSize: 15, fontWeight: '900', letterSpacing: 2 },
  sub: { color: '#7a8798', fontSize: 8, letterSpacing: 1.2, marginTop: 3 },
  counter: { borderWidth: 1, borderColor: '#e9dcc0', paddingHorizontal: 10, paddingVertical: 4, alignItems: 'center', borderRadius: 6, minWidth: 64 },
  counterNum: { color: '#fff', fontSize: 20, fontWeight: '900' },
  counterLabel: { color: '#7a8798', fontSize: 7, letterSpacing: 1.5 },
  layerRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10, marginBottom: 10 },
  layerAll: { borderWidth: 1, borderColor: '#2a3340', minHeight: 36, paddingHorizontal: 10, justifyContent: 'center', borderRadius: 6 },
  layerAllText: { color: '#a9b4c2', fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  layer: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, minHeight: 36, paddingHorizontal: 10, borderRadius: 6 },
  layerDot: { width: 8, height: 8, borderRadius: 4 },
  layerText: { color: '#7a8798', fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  canvasFrame: { alignSelf: 'center', borderWidth: 1, borderColor: '#2a3340', borderRadius: 6, overflow: 'hidden' },
  modeRow: { flexDirection: 'row', gap: 6, marginTop: 10 },
  mode: { flex: 1, borderWidth: 1, borderColor: '#2a3340', minHeight: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 6 },
  modeOn: { borderColor: '#e9dcc0', backgroundColor: '#1a1f27' },
  modeText: { color: '#7a8798', fontSize: 8, fontWeight: '800', letterSpacing: 1 },
  modeTextOn: { color: '#e9dcc0' },
  tabs: { flexDirection: 'row', marginTop: 12, borderBottomWidth: 1, borderBottomColor: '#2a3340' },
  tab: { flex: 1, minHeight: 40, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabText: { color: '#7a8798', fontSize: 9, fontWeight: '900', letterSpacing: 1.2 },
  chips: { gap: 6, paddingVertical: 10 },
  chip: { borderWidth: 1, minHeight: 36, paddingHorizontal: 10, justifyContent: 'center', borderRadius: 6, backgroundColor: '#11161d' },
  chipText: { color: '#a9b4c2', fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  panel: { borderWidth: 1, borderColor: '#2a3340', padding: 10, backgroundColor: '#11161d', borderRadius: 6 },
  panelHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  panelTitle: { color: '#e9dcc0', fontSize: 12, fontWeight: '900', letterSpacing: 1.5 },
  panelMeta: { color: '#7a8798', fontSize: 8.5, letterSpacing: 1, fontWeight: '800' },
  panelDesc: { color: '#d6dde6', fontSize: 10, lineHeight: 15, marginTop: 6 },
  panelLine: { color: '#a9b4c2', fontSize: 9.5, lineHeight: 14, marginTop: 4 },
  codesLabel: { color: '#7a8798', fontSize: 8, fontWeight: '800', letterSpacing: 1.5, marginTop: 10, marginBottom: 6 },
  codes: { maxHeight: 220, borderWidth: 1, borderColor: '#2a3340', borderRadius: 6 },
  codeRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 10, minHeight: 48, borderBottomWidth: 1, borderBottomColor: '#1a1f27' },
  codeRowOn: { backgroundColor: '#1a1f27' },
  codeIcon: { color: '#7a8798', fontSize: 12, width: 14 },
  codeName: { color: '#e9dcc0', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  codeFreq: { color: '#7a8798', fontSize: 9, marginTop: 2 },
  codeCat: { color: '#4a5566', fontSize: 8, letterSpacing: 1 },
});
