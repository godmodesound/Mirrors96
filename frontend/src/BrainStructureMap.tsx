import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import Svg, { Ellipse, Path, Circle, Line, G, Text as SvgText } from 'react-native-svg';
import { svgPress } from './svgPress';
import { SK } from './skins';

/**
 * BRAIN STRUCTURE · CREATIVE MUSICAL KEY (A4 = 432 Hz, 12-TET)
 * Each structure carries an arbitrary note assignment on the 432 lattice —
 * not a measured brain frequency or treatment target. Tapping a structure
 * tunes the Bi-Naural carrier to its note and suggests an entrainment beat.
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

// side-view brain, drawing space 300 × 220
const VW = 300, VH = 220;
const LOBE_SHAPES: { id: string; d: string; lx: number; ly: number }[] = [
  { id: 'frontal', d: 'M60 118 C55 70 95 38 150 40 C150 70 135 100 110 118 Z', lx: 98, ly: 80 },
  { id: 'parietal', d: 'M150 40 C200 38 235 60 240 95 C215 92 180 100 160 112 C150 95 150 70 150 40 Z', lx: 192, ly: 72 },
  { id: 'occipital', d: 'M240 95 C250 120 240 142 222 150 C205 140 185 128 160 112 C180 100 215 92 240 95 Z', lx: 214, ly: 118 },
  { id: 'temporal', d: 'M60 118 C70 150 110 165 160 160 C185 155 205 150 222 150 C205 140 185 128 160 112 C135 128 110 118 60 118 Z', lx: 130, ly: 142 },
  { id: 'cerebellum', d: 'M190 160 C215 158 245 168 248 185 C240 205 205 208 188 192 C186 180 186 170 190 160 Z', lx: 218, ly: 185 },
  { id: 'brainstem', d: 'M160 160 C172 162 180 170 182 178 L178 215 L158 215 L152 180 C152 170 155 162 160 160 Z', lx: 167, ly: 196 },
];
const DEEP_DOTS: { id: string; x: number; y: number }[] = [
  { id: 'limbic', x: 150, y: 106 }, { id: 'callosum', x: 150, y: 90 }, { id: 'thalamus', x: 160, y: 122 },
  { id: 'hypothalamus', x: 150, y: 138 }, { id: 'pituitary', x: 144, y: 152 }, { id: 'midbrain', x: 166, y: 166 },
  { id: 'pons', x: 168, y: 184 }, { id: 'medulla', x: 168, y: 200 }, { id: 'spinal', x: 168, y: 214 }, { id: 'cerebrum', x: 150, y: 56 },
];

export default function BrainStructureMap({ carrierHz, onSelect, testID = 'brain-structure' }: Props) {
  const active = useMemo(() => regionForCarrier(carrierHz), [carrierHz]);
  const byId = (id: string) => BRAIN_REGIONS.find(r => r.id === id)!;

  return (
    <View testID={testID} style={st.wrap}>
      <View style={st.head}>
        <Text style={st.title}>◈ BRAIN STRUCTURE · CREATIVE MUSICAL KEY</Text>
        <Text style={st.sub}>A4 = 432 Hz · 12-TONE EQUAL TEMPERAMENT · TAP A STRUCTURE TO TUNE THE CARRIER</Text>
      </View>

      <View style={st.svgBox}>
        <Svg width="100%" height={VH} viewBox={`0 0 ${VW} ${VH}`}>
          {LOBE_SHAPES.map(s => {
            const r = byId(s.id); const on = active?.id === r.id;
            return (
              <G key={s.id} {...svgPress(() => onSelect(r))} testID={`${testID}-lobe-${s.id}`}>
                <Path d={s.d} fill={r.color} fillOpacity={on ? 0.85 : 0.32} stroke={on ? '#ffffff' : r.color} strokeWidth={on ? 1.6 : 0.8} />
                <SvgText x={s.lx} y={s.ly} fill={on ? '#000' : r.color} fontSize={on ? 8 : 7} fontWeight="bold" textAnchor="middle" fontFamily="Courier New">{r.note}</SvgText>
              </G>
            );
          })}
          {/* gyri texture */}
          {[0, 1, 2, 3].map(i => (
            <Path key={i} d={`M${80 + i * 38} ${60 + i * 6} q10 -12 20 0 t20 0`} stroke="rgba(255,255,255,0.18)" strokeWidth={0.8} fill="none" />
          ))}
          {DEEP_DOTS.map(d => {
            const r = byId(d.id); const on = active?.id === r.id;
            return (
              <G key={d.id} {...svgPress(() => onSelect(r))} testID={`${testID}-deep-${d.id}`}>
                <Circle cx={d.x} cy={d.y} r={on ? 7 : 5.5} fill={r.color} fillOpacity={on ? 1 : 0.75} stroke={on ? '#ffffff' : 'rgba(0,0,0,0.6)'} strokeWidth={on ? 1.6 : 0.8} />
                {on && <Circle cx={d.x} cy={d.y} r={11} fill="none" stroke="#ffffff" strokeWidth={0.8} strokeOpacity={0.8} />}
              </G>
            );
          })}
          <Line x1={168} y1={214} x2={168} y2={220} stroke="#d94f4f" strokeWidth={4} />
        </Svg>
      </View>

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
  wrap: { marginHorizontal: 16, marginTop: 16, borderWidth: 1, borderColor: SK('#ff0a0a') + '55', backgroundColor: '#050505', padding: 12 },
  head: { marginBottom: 8 },
  title: { color: SK('#ff0a0a'), fontSize: 11, fontWeight: '900', letterSpacing: 2 },
  sub: { color: '#777', fontSize: 8, letterSpacing: 1, marginTop: 4, lineHeight: 12 },
  svgBox: { width: '100%', backgroundColor: '#000', borderWidth: 1, borderColor: '#1a1a1a' },
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
