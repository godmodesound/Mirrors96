import React from 'react';
import { View, Text } from 'react-native';
import EmfHarmonizerMap from './EmfHarmonizerMap';
import CsfSpineFlow from './CsfSpineFlow';
import BoneMap from './BoneMap';
import { skinStyles } from './skins';

/** Home-tab anatomy + environment modules: EMF Harmonizer Map, CSF/Kundalini spine, 206 bone map. */
export default function HomeAnatomyModules() {
  return (
    <View testID="home-anatomy" style={st.wrap}>
      <Text style={st.sectionTitle}>&gt; EMF_HARMONIZER</Text>
      <EmfHarmonizerMap />
      <Text style={[st.sectionTitle, st.gap]}>&gt; CSF_FLOW // KUNDALINI</Text>
      <CsfSpineFlow />
      <Text style={[st.sectionTitle, st.gap]}>&gt; SKELETAL_MAP // 206</Text>
      <BoneMap />
    </View>
  );
}

const st = skinStyles({
  wrap: { marginTop: 24, paddingHorizontal: 20 },
  sectionTitle: { color: '#ffffff', fontSize: 11, fontWeight: '600', letterSpacing: 4, marginBottom: 12, textTransform: 'uppercase' },
  gap: { marginTop: 24 },
});
