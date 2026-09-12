import React, { useEffect, useState } from 'react';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';
import Slider from '@react-native-community/slider';
import { Ionicons } from '@expo/vector-icons';
import { skinStyles, SK } from '../skins';
import { cycleCymaticLevel, MAX_SIGNAL_HZ, MIN_SIGNAL_HZ, setCymaticHz, toggleCymaticSignal, useCymaticSignal } from './cymaticSignal';

export function CymaticSignalControl({ prefix }: { prefix: string }) {
  const signal = useCymaticSignal();
  const [draft, setDraft] = useState(String(signal.hz));
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { if (!editing) setDraft(String(signal.hz)); }, [signal.hz, editing]);
  const commit = () => {
    const hz = Number(draft.replace(',', '.'));
    if (!Number.isFinite(hz) || hz < MIN_SIGNAL_HZ || hz > MAX_SIGNAL_HZ) {
      setError('Enter 20–2000 Hz.'); setDraft(String(signal.hz));
    } else { setError(''); setCymaticHz(hz); }
    setEditing(false);
  };
  return <View testID={`${prefix}-signal-control`} style={styles.wrap}>
    <View style={styles.top}>
      <Text style={styles.label}>Hz</Text>
      <TextInput testID={`${prefix}-signal-hz-input`} accessibilityLabel="Signal frequency in hertz" value={draft} onFocus={() => setEditing(true)} onChangeText={setDraft} onEndEditing={commit} onSubmitEditing={commit} selectTextOnFocus keyboardType="decimal-pad" returnKeyType="done" style={styles.input} />
      <TouchableOpacity testID={`${prefix}-signal-level`} accessibilityLabel={`Signal level ${Math.round(signal.gain * 100)} percent; tap to change`} onPress={cycleCymaticLevel} style={styles.level}><Text style={styles.levelLabel}>LEVEL</Text><Text style={styles.levelValue}>{Math.round(signal.gain * 100)}%</Text></TouchableOpacity>
      <TouchableOpacity testID={`${prefix}-signal-toggle`} accessibilityRole="button" accessibilityLabel={signal.playing ? 'Stop frequency signal' : 'Start frequency signal'} accessibilityState={{ selected: signal.playing }} onPress={toggleCymaticSignal} style={[styles.play, signal.playing && styles.playing]}><Ionicons name={signal.playing ? 'stop' : 'play'} size={17} color={signal.playing ? SK('#000000') : SK('#c8e8e5')} /></TouchableOpacity>
    </View>
    <Slider testID={`${prefix}-signal-hz-slider`} accessibilityLabel="Frequency signal Hz slider" accessibilityValue={{ min: MIN_SIGNAL_HZ, max: MAX_SIGNAL_HZ, now: signal.hz, text: `${signal.hz} hertz` }} style={styles.slider} minimumValue={0} maximumValue={1000} step={1} value={Math.log(signal.hz / MIN_SIGNAL_HZ) / Math.log(MAX_SIGNAL_HZ / MIN_SIGNAL_HZ) * 1000} onValueChange={value => { setError(''); setCymaticHz(MIN_SIGNAL_HZ * Math.pow(MAX_SIGNAL_HZ / MIN_SIGNAL_HZ, value / 1000)); }} minimumTrackTintColor={SK('#82cfc7')} maximumTrackTintColor={SK('#2e3641')} thumbTintColor={SK('#e9f4f4')} />
    <View style={styles.range}><Text style={styles.micro}>20 Hz</Text><Text testID={`${prefix}-signal-state`} style={styles.micro}>{signal.playing ? 'SESSION SIGNAL ON' : 'PRESS PLAY TO SEND SIGNAL'}</Text><Text style={styles.micro}>2 kHz</Text></View>
    {error ? <Text testID={`${prefix}-signal-error`} accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
  </View>;
}
const styles = skinStyles({
  wrap: { marginTop: 10, borderWidth: 1, borderColor: '#303946', backgroundColor: '#0b0f18', borderRadius: 13, paddingHorizontal: 11, paddingTop: 6, paddingBottom: 9 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  label: { color: '#9cabb8', fontSize: 12, width: 21 },
  input: { color: '#edf5f6', fontSize: 17, fontWeight: '600', flex: 1, minHeight: 44, minWidth: 0 },
  level: { minHeight: 44, minWidth: 50, alignItems: 'center', justifyContent: 'center' },
  levelLabel: { color: '#8c9dab', fontSize: 8, letterSpacing: 1 },
  levelValue: { color: '#c2d0da', fontSize: 12, marginTop: 3 },
  play: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#558d8b', borderRadius: 8 },
  playing: { backgroundColor: '#82cfc7', borderColor: '#82cfc7' },
  slider: { width: '100%', height: 44 },
  range: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  micro: { color: '#9badbb', fontSize: 8, letterSpacing: 0.4 },
  error: { color: '#ff9a9a', fontSize: 12, marginTop: 8 },
});