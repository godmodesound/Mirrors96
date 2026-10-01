import React from 'react';
import { View, Text } from 'react-native';
import EmfHarmonizerMap from './EmfHarmonizerMap';
import CsfSpineFlow from './CsfSpineFlow';
import HumanAtlas from './HumanAtlas';
import PinealVortexProtocol from './PinealVortexProtocol';
import TimeMatrix from './TimeMatrix';
import HarmonyLab from './HarmonyLab';
import { skinStyles } from './skins';

/** Home-tab anatomy + environment modules. */
export default function HomeAnatomyModules() {
  return (
    <View testID="home-anatomy" style={st.wrap}>
      <Text style={st.sectionTitle}>&gt; HARMONY_LAB // LISSAJOUS</Text>
      <HarmonyLab />
      <Text style={[st.sectionTitle, st.gap]}>&gt; EMF_HARMONIZER</Text>
      <EmfHarmonizerMap />
      <Text style={[st.sectionTitle, st.gap]}>&gt; CSF_FLOW // KUNDALINI</Text>
      <CsfSpineFlow />
      <Text style={[st.sectionTitle, st.gap]}>&gt; HUMAN_ATLAS // 206</Text>
      <HumanAtlas />
      <Text style={[st.sectionTitle, st.gap]}>&gt; PINEAL_VORTEX // 3·6·9</Text>
      <PinealVortexProtocol />
      <Text style={[st.sectionTitle, st.gap]}>&gt; TIME_MATRIX // 15D</Text>
      <TimeMatrix />
    </View>
  );
}

const st = skinStyles({
  wrap: { marginTop: 24, paddingHorizontal: 20 },
  sectionTitle: { color: '#ffffff', fontSize: 11, fontWeight: '600', letterSpacing: 4, marginBottom: 12, textTransform: 'uppercase' },
  gap: { marginTop: 24 },
});
