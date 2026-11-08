import React from 'react';
import { View, Text } from 'react-native';
import { skinStyles, SK } from './skins';
import { FREQUENCY_UNITS, LOG_MIN, LOG_MAX, spectrumPosition } from './codes/spectrum';

export function FullSpectrumMeter({ frequency, testID }: { frequency: number; testID?: string }) {
  const generatedId = React.useId();
  const id = testID || `spectrum-${generatedId}`;
  const position = spectrumPosition(frequency);
  return <View testID={id} style={s.wrap}>
    <Text testID={`${id}-title`} style={s.title}>SELECTED SPECTRUM POSITION</Text>
    <View testID={`${id}-bar`} style={s.bar}>
      {FREQUENCY_UNITS.slice(0, -1).map((unit, index) => <View key={unit.label}
        style={[s.segment, { flex: index === 0 ? 5 : 3, backgroundColor: SK(index % 2 ? '#5d2020' : '#361818') }]} />)}
      <View testID={`${id}-marker`} style={[s.marker, { left: `${position * 100}%` }]} />
    </View>
    <View style={s.labels}>
      <Text style={s.label}>{`10^${LOG_MIN} Hz`}</Text>
      <Text style={s.label}>THz = 10¹² Hz</Text>
      <Text style={s.label}>{`10^${LOG_MAX} Hz`}</Text>
    </View>
  </View>;
}

const s = skinStyles({ wrap: { gap: 6 }, title: { fontSize: 9, color: '#c8a0a0', letterSpacing: 1 },
  bar: { height: 12, flexDirection: 'row', overflow: 'hidden', position: 'relative' },
  segment: { height: '100%', borderRightWidth: 1, borderColor: '#ff6060' },
  marker: { position: 'absolute', top: 0, bottom: 0, width: 3, backgroundColor: '#ffffff', transform: [{ translateX: -1.5 }] },
  labels: { flexDirection: 'row', justifyContent: 'space-between' }, label: { color: '#c8a0a0', fontSize: 9 },
});