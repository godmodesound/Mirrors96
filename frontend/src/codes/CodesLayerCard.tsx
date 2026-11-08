import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import GodmodeSlider from '../GodmodeSlider';
import { skinStyles, SK } from '../skins';
import SpectrumFrequencyControl from './SpectrumFrequencyControl';
import { formatFrequency, spectrumPosition, translatedTone } from './spectrum';

export type WaveKey = 'SINE' | 'TRI' | 'SAW' | 'SQR' | 'PLS' | 'ORG' | 'BEL';
export const WAVE_ENGINE: Record<WaveKey, string> = { SINE: 'sine', TRI: 'triangle', SAW: 'sawtooth', SQR: 'square', PLS: 'pulse', ORG: 'organ', BEL: 'bell' };
export type ToneLayer = { id: number; frequency: number; gain: number; isPlaying: boolean; wave?: WaveKey };
interface Props {
  layer: ToneLayer; index: number; count: number; prefix: string; linked: boolean;
  compact?: boolean; onFrequency: (hz: number) => void; onGain: (gain: number) => void;
  onRemove: () => void; onWave?: (wave: WaveKey) => void;
}

export default function CodesLayerCard({ layer, index, count, prefix, linked, compact, onFrequency, onGain, onRemove, onWave }: Props) {
  const number = index + 1;
  const id = (name: string) => `${prefix}-${name}-${number}`;
  return <View testID={id('layer')} style={[s.card, linked && s.linked]}>
    <View style={s.header}>
      <View style={s.titleArea}>
        <Text testID={id('node-title')} style={s.title}>NODE {number}{linked ? ' // LINKED' : ''}</Text>
        <Text testID={id('node-frequency')} style={s.meta}>ORB · {formatFrequency(layer.frequency)}</Text>
      </View>
      {count > 1 && <TouchableOpacity testID={id('remove-layer')} style={s.remove} onPress={onRemove} accessibilityLabel={`Remove layer ${number}`}>
        <Ionicons name="close" size={18} color={SK('#ff8080')} />
      </TouchableOpacity>}
    </View>
    <Text testID={id('coordinates')} style={s.coordinates}>X {Math.round(spectrumPosition(layer.frequency) * 100)} · Y {Math.round(layer.gain * 100)} · Z {number}/{count}</Text>
    <SpectrumFrequencyControl frequency={layer.frequency} onChange={onFrequency} prefix={prefix} index={number} />
    {!compact && <View style={s.gainRow}>
      <Text testID={id('gain-value')} style={s.meta}>GAIN {Math.round(layer.gain * 100)}%</Text>
      <GodmodeSlider testID={id('gain-slider')} accessibilityLabel={`Layer ${number} gain`} style={s.gainSlider}
        minimumValue={0} maximumValue={1} value={layer.gain} onValueChange={onGain}
        minimumTrackTintColor={SK('#ff0a0a')} maximumTrackTintColor={SK('#333333')} thumbTintColor={SK('#ff8080')} />
    </View>}
    {onWave && <View style={s.waves}>{(Object.keys(WAVE_ENGINE) as WaveKey[]).map(wave =>
      <TouchableOpacity key={wave} testID={`${prefix}-wave-${number}-${wave.toLowerCase()}`}
        onPress={() => onWave(wave)} accessibilityState={{ selected: (layer.wave || 'SINE') === wave }}
        style={[s.wave, (layer.wave || 'SINE') === wave && s.activeWave]}>
        <Text style={s.waveText}>{wave}</Text>
      </TouchableOpacity>)}</View>}
    {layer.isPlaying && <Text testID={id('playing-status')} style={s.status}>{translatedTone(layer.frequency).octaves ? 'PLAYING TRANSLATED AUDIO' : 'PLAYING AUDIO SIGNAL'}</Text>}
  </View>;
}

const s = skinStyles({
  card: { backgroundColor: '#0a0505', borderWidth: 1, borderColor: '#3a2020', padding: 12, marginBottom: 12, minWidth: 0 },
  linked: { borderColor: '#ff0a0a' }, header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  titleArea: { flex: 1, minWidth: 0 }, title: { color: '#ff6060', fontSize: 12, fontWeight: '800', letterSpacing: 1 },
  meta: { color: '#bdaaaa', fontSize: 11, lineHeight: 17 }, remove: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  coordinates: { color: '#bdaaaa', fontSize: 10, letterSpacing: 1, marginTop: 6, marginBottom: 16 },
  gainRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 12 }, gainSlider: { flex: 1, height: 44, marginHorizontal: 8 },
  waves: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 },
  wave: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#593030' },
  activeWave: { borderColor: '#ff0a0a', backgroundColor: '#391010' }, waveText: { color: '#ffffff', fontSize: 10, fontWeight: '700' },
  status: { color: '#ff8080', fontSize: 10, lineHeight: 16, marginTop: 12, textAlign: 'center', letterSpacing: 1 },
});