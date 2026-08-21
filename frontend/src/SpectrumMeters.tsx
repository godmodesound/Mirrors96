import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

import { skinStyles } from './skins';

// ═══════════════════════════════════════════════════════════
// FULL ELECTROMAGNETIC SPECTRUM METER (log10 scale, 10^0 → 10^21 Hz)
// Display meter for the entire spectrum — audio window is the only
// active band today; other bandwidths unlock via future plug-ins.
// ═══════════════════════════════════════════════════════════
const LOG_MAX = 21;

const EM_SEGMENTS = [
  { label: 'Hz', from: 0, to: 3, color: '#3d5a7a' },
  { label: 'kHz', from: 3, to: 6, color: '#4a6f96' },
  { label: 'MHz', from: 6, to: 9, color: '#5c86b3' },
  { label: 'GHz', from: 9, to: 12, color: '#8a5fc9' },
  { label: 'IR', from: 12, to: 14.5, color: '#c94f4f' },
  { label: 'VIS', from: 14.5, to: 15, color: '#5fc96f' },
  { label: 'UV', from: 15, to: 17, color: '#7a4fd8' },
  { label: 'X', from: 17, to: 19.5, color: '#6a6a72' },
  { label: 'γ', from: 19.5, to: 21, color: '#8d8d96' },
];

// Audible/audio window: 0 Hz – 26 kHz → log10(26000) ≈ 4.415
const AUDIO_LOG_END = Math.log10(26000);

export const FullSpectrumMeter = ({ frequency }: { frequency: number }) => {
  const logF = Math.log10(Math.max(frequency, 1));
  const markerPct = Math.min(100, (logF / LOG_MAX) * 100);
  const audioPct = (AUDIO_LOG_END / LOG_MAX) * 100;

  return (
    <View style={st.wrap}>
      <View style={st.headerRow}>
        <Text style={st.title}>FULL SPECTRUM</Text>
        <Text style={st.lockNote}>PLUG-INS SOON — HIGHER BANDWIDTHS LOCKED</Text>
      </View>
      <View style={st.bar}>
        {EM_SEGMENTS.map(seg => (
          <View
            key={seg.label}
            style={[st.segment, { flex: seg.to - seg.from, backgroundColor: seg.color }]}
          />
        ))}
        {/* Active (audio) window */}
        <View style={[st.activeWindow, { width: `${audioPct}%` }]} />
        {/* Current frequency marker */}
        <View style={[st.marker, { left: `${markerPct}%` }]} />
      </View>
      <View style={st.labelRow}>
        {EM_SEGMENTS.map(seg => (
          <Text key={seg.label} style={[st.segLabel, { flex: seg.to - seg.from }]}>
            {seg.label}
          </Text>
        ))}
      </View>
    </View>
  );
};

// ═══════════════════════════════════════════════════════════
// AUDIO METER SCALE — tick labels for the 0 Hz – 26 kHz editor
// ═══════════════════════════════════════════════════════════
export const AudioMeterScale = () => (
  <View style={st.scaleRow}>
    <Text style={st.scaleTitle}>0Hz–26kHz</Text>
    {['0', '6.5k', '13k', '19.5k', '26k'].map(t => (
      <Text key={t} style={st.tick}>{t}</Text>
    ))}
  </View>
);

const st = skinStyles({
  wrap: { marginBottom: 8 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 },
  title: { color: '#ff0a0a', fontSize: 7, fontWeight: '900', letterSpacing: 2 },
  lockNote: { color: '#3a1010', fontSize: 6, letterSpacing: 1 },
  bar: { flexDirection: 'row', height: 10, borderRadius: 3, overflow: 'hidden', position: 'relative', opacity: 0.9 },
  segment: { height: '100%' },
  activeWindow: {
    position: 'absolute', left: 0, top: 0, bottom: 0,
    borderColor: '#ff0a0a', borderWidth: 1, borderRadius: 3,
    backgroundColor: 'rgba(255,10,10,0.18)',
  },
  marker: {
    position: 'absolute', top: -2, bottom: -2, width: 2,
    backgroundColor: '#ffffff', borderRadius: 1,
  },
  labelRow: { flexDirection: 'row', marginTop: 2 },
  segLabel: { color: '#5a5a66', fontSize: 6, letterSpacing: 0.5, textAlign: 'center' },
  scaleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 1, marginBottom: 2 },
  scaleTitle: { color: '#ff0a0a', fontSize: 7, fontWeight: '900', letterSpacing: 1.5, marginRight: 6 },
  tick: { color: '#5a1a1a', fontSize: 7, letterSpacing: 0.5 },
});
