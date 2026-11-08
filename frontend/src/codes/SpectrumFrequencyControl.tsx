import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Keyboard } from 'react-native';
import { AudioEngine } from '../AudioEngine';
import GodmodeSlider from '../GodmodeSlider';
import { FullSpectrumMeter } from '../SpectrumMeters';
import { skinStyles, SK } from '../skins';
import FrequencyDial from './FrequencyDial';
import { FREQUENCY_UNITS, FrequencyUnit, frequencyUnit, formatFrequency, parseFrequency,
  clampFrequency, frequencyAtPosition, spectrumPosition, spectrumBand, emWavelength, translatedTone } from './spectrum';

export function SpectrumNotice({ testID }: { testID: string }) {
  return <View testID={testID} style={s.notice}>
    <Text testID={`${testID}-range`} style={s.heading}>FULL SPECTRUM // 0.01 Hz — 1 YHz</Text>
    <Text testID={`${testID}-disclaimer`} style={s.caption}>Explore through THz, light and gamma ranges. Above 20 kHz, audio is octave-translated. Your phone does not emit these electromagnetic signals. Scope shows audio, not an EM measurement.</Text>
  </View>;
}

export default function SpectrumFrequencyControl({ frequency, onChange, prefix, index }: {
  frequency: number; onChange: (hz: number) => void; prefix: string; index: number;
}) {
  const [editing, setEditing] = useState(false);
  const [input, setInput] = useState('');
  const [editUnit, setEditUnit] = useState<FrequencyUnit>(frequencyUnit(frequency));
  const [error, setError] = useState('');
  const [tuning, setTuning] = useState(AudioEngine.getTuning());
  useEffect(() => AudioEngine.subscribeTuning(setTuning), []);
  const unit = editing ? editUnit : frequencyUnit(frequency);
  const tone = translatedTone(frequency);
  const id = (name: string) => `${prefix}-${name}-${index}`;
  const beginEdit = () => {
    const chosen = frequencyUnit(frequency);
    setEditUnit(chosen); setInput(String(frequency / chosen.factor)); setError(''); setEditing(true);
  };
  const commit = () => {
    const hz = parseFrequency(input, editUnit.factor);
    if (hz === null) { setError('Enter a number from 0.01 Hz to 1 YHz.'); return; }
    onChange(hz); setError(''); setEditing(false); Keyboard.dismiss();
  };
  const selectUnit = (next: FrequencyUnit) => {
    if (editing) { setEditUnit(next); setError(''); return; }
    onChange(clampFrequency((frequency / unit.factor) * next.factor));
  };
  return <View testID={id('frequency-control')} style={s.control}>
    <View style={s.top}>
      <FrequencyDial testID={id('dial')} frequency={frequency} onChange={onChange} />
      <View style={s.valueArea}>
        <Text testID={id('selected-label')} style={s.heading}>SELECTED FREQUENCY</Text>
        <TouchableOpacity testID={id('frequency')} onPress={beginEdit} accessibilityLabel={`Edit ${formatFrequency(frequency)}`} style={s.readout} activeOpacity={0.7}>
          <Text testID={id('frequency-value')} style={s.value} adjustsFontSizeToFit numberOfLines={1}>{formatFrequency(frequency)}</Text>
          <Text testID={id('edit-hint')} style={s.hint}>TAP TO EDIT</Text>
        </TouchableOpacity>
        <Text testID={id('band')} style={s.band}>{spectrumBand(frequency)}{frequency > 20000 ? ' · REFERENCE' : ''}</Text>
      </View>
    </View>
    {editing && <View testID={id('editor')} style={s.editor}>
      <Text testID={id('input-label')} style={s.caption}>Enter value in {editUnit.label} · decimal or scientific notation</Text>
      <TextInput testID={id('frequency-input')} style={s.input} value={input} onChangeText={setInput}
        autoFocus selectTextOnFocus autoCapitalize="none" autoCorrect={false} keyboardType="numbers-and-punctuation"
        maxLength={32} returnKeyType="done" onSubmitEditing={commit} accessibilityLabel={`Frequency in ${editUnit.label}`} />
      {error ? <Text testID={id('frequency-error')} accessibilityRole="alert" style={s.error}>{error}</Text> : null}
      <View style={s.actions}>
        <TouchableOpacity testID={id('frequency-apply')} style={[s.button, s.apply]} onPress={commit}><Text style={s.buttonText}>APPLY</Text></TouchableOpacity>
        <TouchableOpacity testID={id('frequency-cancel')} style={s.button} onPress={() => { setEditing(false); setError(''); Keyboard.dismiss(); }}><Text style={s.buttonText}>CANCEL</Text></TouchableOpacity>
      </View>
    </View>}
    <View testID={id('units')} style={s.units}>
      {FREQUENCY_UNITS.map(option => <TouchableOpacity key={option.label}
        testID={id(`unit-${option.label.toLowerCase()}`)} onPress={() => selectUnit(option)} activeOpacity={0.7}
        accessibilityLabel={`Select ${option.label}`} accessibilityState={{ selected: unit.label === option.label }}
        style={[s.unit, unit.label === option.label && s.selected]}>
        <Text style={[s.unitText, unit.label === option.label && s.selectedText]}>{option.label}</Text>
      </TouchableOpacity>)}
    </View>
    <FullSpectrumMeter frequency={frequency} testID={id('spectrum-meter')} />
    <GodmodeSlider testID={id('spectrum-slider')} accessibilityLabel="Full spectrum logarithmic sweep"
      style={s.slider} minimumValue={0} maximumValue={1} value={spectrumPosition(frequency)}
      onValueChange={position => onChange(frequencyAtPosition(position))}
      minimumTrackTintColor={SK('#ff0a0a')} maximumTrackTintColor={SK('#333333')} thumbTintColor={SK('#ff8080')} />
    <Text testID={id('sweep-scale')} style={s.caption}>0.01 Hz ← LOG SWEEP → 1 YHz</Text>
    <View testID={id('output')} style={s.output}>
      <Text testID={id('output-label')} style={s.heading}>{tone.octaves ? 'AUDIO TRANSLATION' : 'AUDIO SIGNAL'}</Text>
      <Text testID={id('output-hz')} style={s.outputHz}>{(tone.hz * tuning / 432).toFixed(2)} Hz</Text>
      <Text testID={id('translation')} style={s.caption}>{tone.octaves ? `Selected ÷ 2^${tone.octaves} · ${tone.octaves} octaves down` : 'Original frequency · audibility depends on your device'}{tuning === 440 ? ' · A440 tuning × 440/432' : ''}</Text>
      <Text testID={id('stored-hz')} style={s.detail}>{String(frequency)} Hz selected</Text>
      {frequency > 20000 && <Text testID={id('wavelength')} style={s.detail}>EM wavelength reference: {emWavelength(frequency)} (vacuum)</Text>}
    </View>
  </View>;
}

const s = skinStyles({
  control: { minWidth: 0 }, top: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  valueArea: { flex: 1, minWidth: 0 }, readout: { minHeight: 48, justifyContent: 'center', paddingVertical: 6 },
  value: { color: '#ffffff', fontSize: 27, fontWeight: '300' }, hint: { color: '#b2a0a0', fontSize: 9, letterSpacing: 1 },
  heading: { color: '#ff6060', fontSize: 10, fontWeight: '800', letterSpacing: 1, lineHeight: 16 },
  band: { color: '#d2b5b5', fontSize: 10, lineHeight: 16 },
  units: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 16, marginBottom: 16 },
  unit: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#593030', paddingHorizontal: 10, backgroundColor: '#0a0505' },
  selected: { borderColor: '#ff0a0a', backgroundColor: '#ff0a0a' }, unitText: { color: '#c8c8c8', fontSize: 12, fontWeight: '700' },
  selectedText: { color: '#000000' }, slider: { height: 44, marginHorizontal: 8 },
  caption: { color: '#bdaaaa', fontSize: 11, lineHeight: 17 }, detail: { color: '#bdaaaa', fontSize: 10, lineHeight: 16 },
  output: { marginTop: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#482323', gap: 4 },
  outputHz: { color: '#ffffff', fontSize: 20, fontWeight: '500' },
  notice: { padding: 12, marginVertical: 12, borderWidth: 1, borderColor: '#482323', gap: 6, backgroundColor: '#0a0505' },
  editor: { paddingVertical: 12, gap: 8 }, input: { minWidth: 0, minHeight: 48, color: '#ffffff', fontSize: 22, borderWidth: 1, borderColor: '#ff0a0a', padding: 8 },
  error: { color: '#ff8080', fontSize: 12 }, actions: { flexDirection: 'row', gap: 8 },
  button: { minHeight: 44, flex: 1, borderWidth: 1, borderColor: '#593030', alignItems: 'center', justifyContent: 'center' },
  apply: { borderColor: '#ff0a0a' }, buttonText: { color: '#ffffff', fontSize: 12, fontWeight: '700' },
});