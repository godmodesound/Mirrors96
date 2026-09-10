import React, { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import ScopeNodePanel from './ScopeNodePanel';
import { AudioEngine } from './AudioEngine';
import { skinStyles } from './skins';

export default function LandingScope({ testID }: { testID: string }) {
  const [signal, setSignal] = useState({ frequency: 432, active: false });
  const lastUpdate = useRef(0);
  useEffect(() => AudioEngine.subscribeScope(frame => {
    const now = Date.now();
    if (now - lastUpdate.current < 350) return;
    lastUpdate.current = now;
    const active = frame.peak > 1.5;
    const frequency = active && frame.measuredHz && frame.measuredHz > 1 ? Math.round(frame.measuredHz * 10) / 10 : 432;
    setSignal(previous => previous.active === active && previous.frequency === frequency ? previous : { frequency, active });
  }), []);
  return <View style={styles.inset}><ScopeNodePanel testID={testID} frequencies={[signal.frequency]} playing={signal.active} compact /></View>;
}
const styles = skinStyles({ inset: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 10 } });