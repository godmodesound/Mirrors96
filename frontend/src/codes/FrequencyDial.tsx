import React, { useRef, useState } from 'react';
import { View, Text, PanResponder } from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';
import { skinStyles, SK } from '../skins';
import { clampFrequency, formatFrequency, spectrumPosition } from './spectrum';

export default function FrequencyDial({ frequency, onChange, testID }: {
  frequency: number; onChange: (hz: number) => void; testID: string;
}) {
  const current = useRef({ frequency, onChange });
  current.current = { frequency, onChange };
  const start = useRef(frequency);
  const [sweeping, setSweeping] = useState(false);
  const pan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) + Math.abs(g.dy) > 2,
    onPanResponderGrant: () => { start.current = current.current.frequency; setSweeping(true); },
    onPanResponderMove: (_, g) => current.current.onChange(clampFrequency(
      Number((start.current * 10 ** ((g.dx - g.dy) / 110)).toPrecision(12)))),
    onPanResponderRelease: () => setSweeping(false),
    onPanResponderTerminate: () => setSweeping(false),
  })).current;
  const angle = (-135 + spectrumPosition(frequency) * 270) * Math.PI / 180;
  const x = 38 + 23 * Math.sin(angle), y = 38 - 23 * Math.cos(angle);
  return <View testID={testID} style={s.wrap} accessibilityRole="adjustable"
    accessibilityLabel="Fine frequency dial" accessibilityValue={{ text: formatFrequency(frequency) }}
    accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
    onAccessibilityAction={e => onChange(clampFrequency(frequency * (e.nativeEvent.actionName === 'increment' ? 1.01 : 1 / 1.01)))}
    {...pan.panHandlers}>
    <Svg width={76} height={76} viewBox="0 0 76 76">
      <Circle cx={38} cy={38} r={34} stroke={SK('#9aa4b2')} strokeWidth={1.5} fill="none" />
      <Circle cx={38} cy={38} r={28} stroke={SK('#ff0a0a')} fill={SK('#0b0e12')} />
      <Line x1={38} y1={38} x2={x} y2={y} stroke={SK('#ff8080')} strokeWidth={2} />
      <Circle cx={x} cy={y} r={3} fill={SK('#ff0a0a')} />
    </Svg>
    <Text testID={`${testID}-label`} style={s.label}>{sweeping ? 'SWEEP' : 'FINE TUNE'}</Text>
  </View>;
}

const s = skinStyles({ wrap: { alignItems: 'center', width: 76 },
  label: { color: '#c8c8c8', fontSize: 9, letterSpacing: 1, marginTop: 2 } });