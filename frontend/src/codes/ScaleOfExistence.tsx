import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import GodmodeSlider from '../GodmodeSlider';
import { skinStyles, SK } from '../skins';
import { formatFrequency, spectrumBand } from './spectrum';
import { SCALE_LEVELS, scalePosition, frequencyAtScale, levelIndex, levelCenter, levelLock } from './atlasData';

export default function ScaleOfExistence({ frequency, onTune, prefix }: { frequency: number; onTune: (hz: number) => void; prefix: string }) {
  const active = levelIndex(frequency);
  const lock = levelLock(frequency);
  const level = SCALE_LEVELS[active];
  const last = SCALE_LEVELS.length - 1;
  return <View testID={`${prefix}-scale`}>
    <View testID={`${prefix}-scale-readout`} style={s.readout}>
      <Text style={s.kicker}>SCALE OF EXISTENCE · LEVEL {active + 1}/{SCALE_LEVELS.length}</Text>
      <Text testID={`${prefix}-scale-active`} style={s.active} numberOfLines={1} adjustsFontSizeToFit>{level.name}</Text>
      <Text style={s.caption}>{level.detail} · size {level.size}</Text>
      <Text style={s.caption}>{formatFrequency(frequency)} · {spectrumBand(frequency)}</Text>
      <View style={s.lockRow}>
        <Text testID={`${prefix}-scale-lock`} style={s.lockText}>RESONANCE LOCK {lock}%</Text>
        <View style={s.lockTrack}><View style={[s.lockFill, { width: `${lock}%` }]} /></View>
      </View>
    </View>
    <GodmodeSlider testID={`${prefix}-scale-dial`} accessibilityLabel="Scale of existence tuning dial"
      style={s.slider} minimumValue={0} maximumValue={SCALE_LEVELS.length} value={scalePosition(frequency)}
      onValueChange={p => onTune(frequencyAtScale(p))}
      minimumTrackTintColor={SK('#ff0a0a')} maximumTrackTintColor={SK('#333333')} thumbTintColor={SK('#ff8080')} />
    <Text style={s.caption}>MULTIVERSE ← VAST · LOW Hz ··· TINY · HIGH Hz → STRINGS</Text>
    <View testID={`${prefix}-scale-ladder`} style={s.ladder}>
      {SCALE_LEVELS.map((item, i) => {
        const on = i === active;
        return <TouchableOpacity key={item.name} testID={`${prefix}-scale-level-${i}`} onPress={() => onTune(levelCenter(i))}
          accessibilityLabel={`Tune to ${item.name}`} accessibilityState={{ selected: on }} activeOpacity={0.7}
          style={[s.row, { width: `${100 - (i / last) * 45}%` }, on && s.rowOn, Math.abs(i - active) === 1 && s.rowNear]}>
          <Text style={[s.rowName, on && s.rowNameOn]} numberOfLines={1}>{String(i + 1).padStart(2, '0')} {item.name}</Text>
          <Text style={[s.rowHz, on && s.rowNameOn]} numberOfLines={1}>{formatFrequency(levelCenter(i))}</Text>
        </TouchableOpacity>;
      })}
    </View>
  </View>;
}

const s = skinStyles({
  readout: { borderWidth: 1, borderColor: '#ff0a0a', padding: 12, gap: 2, backgroundColor: '#0d0303' },
  kicker: { color: '#ff6060', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  active: { color: '#ffffff', fontSize: 22, fontWeight: '900', letterSpacing: 1 },
  caption: { color: '#bdaaaa', fontSize: 11, lineHeight: 17 },
  lockRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  lockText: { color: '#ff8080', fontSize: 10, fontWeight: '800', width: 130 },
  lockTrack: { flex: 1, height: 6, backgroundColor: '#2a1212' }, lockFill: { height: 6, backgroundColor: '#ff0a0a' },
  slider: { height: 44, marginHorizontal: 8, marginTop: 8 },
  ladder: { alignItems: 'center', gap: 3, marginTop: 10 },
  row: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6, paddingHorizontal: 10, borderWidth: 1, borderColor: '#3a2020', backgroundColor: '#0a0505' },
  rowNear: { borderColor: '#593030' }, rowOn: { borderColor: '#ff0a0a', backgroundColor: '#ff0a0a' },
  rowName: { flexShrink: 1, color: '#e0d0d0', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  rowHz: { color: '#9a8888', fontSize: 9 }, rowNameOn: { color: '#000000' },
});
