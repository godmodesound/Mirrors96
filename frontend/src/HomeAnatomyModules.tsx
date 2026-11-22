import React from 'react';
import { View, Text } from 'react-native';
import CsfSpineFlow from './CsfSpineFlow';
import DiagnosticBodyMap from './DiagnosticBodyMap';
import TimeMatrix from './TimeMatrix';
import { skinStyles } from './skins';
import { BinaryBorder, BinaryRule } from './BinaryCode';

/** Home-tab anatomy + environment modules. */
export default function HomeAnatomyModules() {
  return (
    <View testID="home-anatomy" style={st.wrap}>
      <Text style={st.sectionTitle}>&gt; CSF_FLOW // KUNDALINI</Text>
      <BinaryRule ids={[720]} />
      <CsfSpineFlow />
      <Text style={[st.sectionTitle, st.gap]}>&gt; BIOMAP</Text>
      <BinaryRule />
      <DiagnosticBodyMap testID="home-body-map" />
      <Text style={[st.sectionTitle, st.gap]}>&gt; TIME_MATRIX // 15D</Text>
      <BinaryRule ids={[740]} />
      <TimeMatrix />
    </View>
  );
}

const st = skinStyles({
  wrap: { marginTop: 24, paddingHorizontal: 20 },
  sectionTitle: { color: '#ffffff', fontSize: 11, fontWeight: '600', letterSpacing: 4, marginBottom: 12, textTransform: 'uppercase' },
  gap: { marginTop: 24 },
});
