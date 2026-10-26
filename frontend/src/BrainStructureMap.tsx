import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { SK } from './skins';

/**
 * BRAIN STRUCTURE · CREATIVE MUSICAL KEY (A4 = 432 Hz, 12-TET)
 * Each structure carries an arbitrary note assignment on the 432 lattice —
 * not a measured brain frequency or treatment target. The structures are drawn
 * as tappable hotspots inside the Pineal Spatial Field head model; this strip
 * is the readout + quick selector that sits directly beneath that canvas.
 */
export type BrainRegion = {
  id: string; name: string; note: string; hz: number; group: 'LOBE' | 'DEEP' | 'STEM';
  color: string; beat: number; band: string; functions: string[];
};

export const BRAIN_REGIONS: BrainRegion[] = [
  { id: 'cerebrum', name: 'CEREBRUM', note: 'D5', hz: 576.65, group: 'LOBE', color: '#e38bd2', beat: 40, band: 'GAMMA', functions: ['Thinking', 'Memory', 'Learning', 'Voluntary action'] },
  { id: 'frontal', name: 'FRONTAL LOBE', note: 'C5', hz: 513.74, group: 'LOBE', color: '#b47be0', beat: 15, band: 'BETA', functions: ['Planning', 'Decision-making', 'Problem solving', 'Personality'] },
  { id: 'parietal', name: 'PARIETAL LOBE', note: 'B4', hz: 484.90, group: 'LOBE', color: '#f2d24b', beat: 14, band: 'BETA', functions: ['Touch', 'Pressure · temperature', 'Body awareness', 'Spatial orientation'] },
  { id: 'occipital', name: 'OCCIPITAL LOBE', note: 'A4', hz: 432.00, group: 'LOBE', color: '#5fb6ef', beat: 10, band: 'ALPHA', functions: ['Visual processing', 'Interprets what we see'] },
  { id: 'temporal', name: 'TEMPORAL LOBE', note: 'G4', hz: 384.87, group: 'LOBE', color: '#6fc96a', beat: 10, band: 'ALPHA', functions: ['Hearing', 'Memory', 'Language', 'Understanding'] },
  { id: 'limbic', name: 'LIMBIC SYSTEM', note: 'F4', hz: 342.88, group: 'DEEP', color: '#f08cb0', beat: 6, band: 'THETA', functions: ['Emotion', 'Motivation', 'Memory'] },
  { id: 'callosum', name: 'CORPUS CALLOSUM', note: 'E4', hz: 323.63, group: 'DEEP', color: '#f3e3c9', beat: 40, band: 'GAMMA', functions: ['Connects left + right hemispheres'] },
  { id: 'thalamus', name: 'THALAMUS', note: 'D4', hz: 288.33, group: 'DEEP', color: '#f49ac1', beat: 8, band: 'ALPHA', functions: ['Sensory relay station'] },
  { id: 'hypothalamus', name: 'HYPOTHALAMUS', note: 'C4', hz: 256.87, group: 'DEEP', color: '#f5c04a', beat: 3, band: 'DELTA', functions: ['Temperature', 'Hunger · thirst', 'Sleep', 'Homeostasis'] },
  { id: 'pituitary', name: 'PITUITARY GLAND', note: 'B3', hz: 242.45, group: 'DEEP', color: '#f7a3a3', beat: 5, band: 'THETA', functions: ['Master hormone gland'] },
  { id: 'cerebellum', name: 'CEREBELLUM', note: 'A3', hz: 216.00, group: 'STEM', color: '#f0924a', beat: 10, band: 'ALPHA', functions: ['Balance', 'Coordination', 'Fine motor control', 'Posture'] },
  { id: 'brainstem', name: 'BRAINSTEM', note: 'G3', hz: 192.43, group: 'STEM', color: '#ef6b6b', beat: 2, band: 'DELTA', functions: ['Breathing', 'Heartbeat', 'Basic life functions'] },
  { id: 'midbrain', name: 'MIDBRAIN', note: 'F3', hz: 171.44, group: 'STEM', color: '#ee7e7e', beat: 18, band: 'BETA', functions: ['Eye movement', 'Visual + auditory reflexes'] },
  { id: 'pons', name: 'PONS', note: 'E3', hz: 161.82, group: 'STEM', color: '#e86a6a', beat: 2.5, band: 'DELTA', functions: ['Bridge cerebrum ↔ cerebellum', 'Sleep + breathing rhythm'] },
  { id: 'medulla', name: 'MEDULLA OBLONGATA', note: 'D3', hz: 144.16, group: 'STEM', color: '#e05a5a', beat: 1.5, band: 'DELTA', functions: ['Breathing', 'Heartbeat', 'Swallowing · coughing'] },
  { id: 'spinal', name: 'SPINAL CORD', note: 'C3', hz: 128.43, group: 'STEM', color: '#d94f4f', beat: 7.83, band: 'SCHUMANN', functions: ['Carries nerve signals brain ↔ body'] },
];

export const regionForCarrier = (hz: number) => BRAIN_REGIONS.find(r => Math.abs(r.hz - hz) < 0.5) || null;

type Props = {
  carrierHz: number;
  onSelect: (region: BrainRegion) => void;
  testID?: string;
};

export default function BrainStructureStrip({ carrierHz, onSelect, testID = 'brain-structure' }: Props) {
  const active = useMemo(() => regionForCarrier(carrierHz), [carrierHz]);

  return (
    <View testID={testID} style={st.wrap}>
      <Text style={st.sub}>BRAIN STRUCTURE · CREATIVE MUSICAL KEY · A4 = 432 Hz · 12-TET — TAP A STRUCTURE ON THE HEAD OR BELOW</Text>

      {/* selected structure readout */}
      <View testID={`${testID}-readout`} style={[st.readout, active && { borderColor: active.color }]}>
        {active ? (
          <>
            <View style={st.readoutRow}>
              <View style={[st.dot, { backgroundColor: active.color }]} />
              <Text style={st.readoutName}>{active.name}</Text>
              <Text style={[st.readoutNote, { color: active.color }]}>{active.note} · {active.hz.toFixed(2)} Hz</Text>
            </View>
            <Text style={st.readoutFn}>{active.functions.join(' · ')}</Text>
            <Text style={st.readoutBeat}>SUGGESTED BEAT {active.beat} Hz · {active.band}</Text>
          </>
        ) : (
          <Text style={st.readoutIdle}>CARRIER {carrierHz.toFixed(0)} Hz · NO STRUCTURE ON THIS NOTE — TAP A LOBE, NUCLEUS OR STEM SEGMENT</Text>
        )}
      </View>

      {/* structure list */}
      {(['LOBE', 'DEEP', 'STEM'] as const).map(group => (
        <View key={group} style={st.group}>
          <Text style={st.groupTitle}>{group === 'LOBE' ? 'CORTEX · LOBES' : group === 'DEEP' ? 'DEEP STRUCTURES' : 'CEREBELLUM · BRAINSTEM · CORD'}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.chips}>
            {BRAIN_REGIONS.filter(r => r.group === group).map(r => {
              const on = active?.id === r.id;
              return (
                <TouchableOpacity key={r.id} testID={`${testID}-chip-${r.id}`} style={[st.chip, on && { borderColor: r.color, backgroundColor: r.color + '22' }]} onPress={() => onSelect(r)}>
                  <View style={[st.chipDot, { backgroundColor: r.color }]} />
                  <View>
                    <Text style={[st.chipName, on && { color: '#fff' }]}>{r.name}</Text>
                    <Text style={[st.chipHz, { color: r.color }]}>{r.note} · {r.hz.toFixed(2)} Hz</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      ))}

      <Text style={st.note}>ARBITRARY NOTE ASSIGNMENTS — NOT MEASURED BRAIN FREQUENCIES OR TREATMENT TARGETS. FREQUENCIES ROUNDED TO 0.01 Hz.</Text>
    </View>
  );
}

const st = StyleSheet.create({
  wrap: { marginHorizontal: 16, marginTop: 8, borderWidth: 1, borderTopWidth: 0, borderColor: SK('#ff0a0a') + '55', backgroundColor: '#050505', padding: 12 },
  sub: { color: '#777', fontSize: 8, letterSpacing: 1, lineHeight: 12 },
  readout: { marginTop: 10, borderWidth: 1, borderColor: '#222', padding: 10, backgroundColor: '#0a0a0a' },
  readoutRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  readoutName: { flex: 1, color: '#fff', fontSize: 11, fontWeight: '900', letterSpacing: 1.5 },
  readoutNote: { fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  readoutFn: { color: '#aaa', fontSize: 9, letterSpacing: 0.8, marginTop: 6, lineHeight: 13 },
  readoutBeat: { color: SK('#ff0a0a'), fontSize: 8, fontWeight: '800', letterSpacing: 1.5, marginTop: 6 },
  readoutIdle: { color: '#777', fontSize: 9, letterSpacing: 1, lineHeight: 13 },
  group: { marginTop: 10 },
  groupTitle: { color: '#888', fontSize: 8, fontWeight: '800', letterSpacing: 1.5, marginBottom: 6 },
  chips: { gap: 6, paddingRight: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: '#222', backgroundColor: '#0a0a0a', paddingHorizontal: 10, paddingVertical: 8, minHeight: 44 },
  chipDot: { width: 6, height: 6, borderRadius: 3 },
  chipName: { color: '#bbb', fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  chipHz: { fontSize: 8, letterSpacing: 0.8, marginTop: 2 },
  note: { color: '#555', fontSize: 7, letterSpacing: 1, marginTop: 10, lineHeight: 11 },
});
