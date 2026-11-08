import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { skinStyles } from '../skins';
import ScaleOfExistence from './ScaleOfExistence';
import RobyBodyMap from './RobyBodyMap';

type Tab = 'scale' | 'body';
/** Full Spectrum Atlas: tunes one target node via the Scale of Existence or the Roby body chart. */
export default function SpectrumAtlas({ frequencies, onTune, prefix }: {
  frequencies: number[]; onTune: (index: number, hz: number) => void; prefix: string;
}) {
  const [tab, setTab] = useState<Tab>('scale');
  const [target, setTarget] = useState(0);
  const index = Math.min(target, frequencies.length - 1);
  const id = `${prefix}-atlas`;
  const tune = (hz: number) => onTune(index, hz);
  return <View testID={id} style={s.box}>
    <Text style={s.title}>◈ FULL SPECTRUM ATLAS</Text>
    <View style={s.row}>
      {(['scale', 'body'] as Tab[]).map(t => <TouchableOpacity key={t} testID={`${id}-tab-${t}`} onPress={() => setTab(t)}
        accessibilityState={{ selected: tab === t }} style={[s.tab, tab === t && s.tabOn]}>
        <Text style={[s.tabText, tab === t && s.tabTextOn]}>{t === 'scale' ? 'SCALE OF EXISTENCE' : 'BELIEF BODY MAP'}</Text>
      </TouchableOpacity>)}
    </View>
    {frequencies.length > 1 && <View style={s.row}>
      <Text style={s.label}>TUNES</Text>
      {frequencies.map((_, i) => <TouchableOpacity key={i} testID={`${id}-target-${i + 1}`} onPress={() => setTarget(i)}
        style={[s.node, index === i && s.tabOn]}><Text style={[s.tabText, index === i && s.tabTextOn]}>NODE {i + 1}</Text></TouchableOpacity>)}
    </View>}
    {tab === 'scale'
      ? <ScaleOfExistence frequency={frequencies[index]} onTune={tune} prefix={id} />
      : <RobyBodyMap frequency={frequencies[index]} onTune={tune} prefix={id} />}
  </View>;
}

const s = skinStyles({
  box: { borderWidth: 1, borderColor: '#482323', padding: 12, marginBottom: 12, backgroundColor: '#050202' },
  title: { color: '#ff0a0a', fontSize: 13, fontWeight: '900', letterSpacing: 2, marginBottom: 8 },
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginBottom: 10 },
  tab: { flex: 1, minHeight: 44, borderWidth: 1, borderColor: '#593030', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  node: { minHeight: 44, minWidth: 64, borderWidth: 1, borderColor: '#593030', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  tabOn: { borderColor: '#ff0a0a', backgroundColor: '#ff0a0a' },
  tabText: { color: '#ffffff', fontSize: 10, fontWeight: '800', textAlign: 'center' }, tabTextOn: { color: '#000000' },
  label: { color: '#bdaaaa', fontSize: 10, fontWeight: '800' },
});
