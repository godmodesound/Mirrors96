import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { AudioEngine } from './AudioEngine';
import { skinStyles } from './skins';
import { ScopeWave } from './useScopeWave';
import { BinaryBorder } from './BinaryCode';

// Dedicated session-bus oscillator; clear of Lab layers (0–4), harmonics (200+) and the cymatic signal (960096).
const SESSION_TONE_ID = 960097;
const DURATIONS = [13, 33, 96];
const fmt = (hz: number) => (Number.isInteger(hz) ? String(hz) : hz.toFixed(2));

/** BODY MAP sound session: one tone, free-running or timed (13 / 33 / 96 s). */
export default function SoundSession({ hz, source, scope, testID }: { hz: number; source: string; scope: ScopeWave; testID: string }) {
  const [duration, setDuration] = useState(96);
  const [playing, setPlaying] = useState(false);
  const [left, setLeft] = useState(0); // seconds remaining in a timed session; 0 = free-running
  const playingRef = useRef(false);
  playingRef.current = playing;

  const stop = useCallback(() => { AudioEngine.stopTone(SESSION_TONE_ID); setPlaying(false); setLeft(0); }, []);
  const start = (seconds: number) => {
    AudioEngine.unlockAudio();
    AudioEngine.startTone(SESSION_TONE_ID, hz, 0.14, 'sine');
    setPlaying(true); setLeft(seconds);
  };
  useEffect(() => { if (playingRef.current) AudioEngine.updateFreq(SESSION_TONE_ID, hz); }, [hz]);
  useEffect(() => AudioEngine.subscribeStopAll(() => { setPlaying(false); setLeft(0); }), []);
  useEffect(() => () => { if (playingRef.current) AudioEngine.stopTone(SESSION_TONE_ID); }, []);
  useEffect(() => {
    if (!playing || left <= 0) return;
    const id = setTimeout(() => (left <= 1 ? stop() : setLeft(left - 1)), 1000);
    return () => clearTimeout(id);
  }, [playing, left, stop]);

  const timed = playing && left > 0;
  return <View testID={testID} style={st.wrap}>
    <BinaryBorder testID={`${testID}-binary`} values={[hz]} active={playing} />
    <Text style={st.title}>SOUND SESSION</Text>
    <View style={st.row}>
      <View>
        <Text testID={`${testID}-hz`} style={st.hz}>{fmt(hz)} Hz</Text>
        <Text testID={`${testID}-source`} style={st.sub}>{source}</Text>
      </View>
      <View style={st.divider} />
      <View style={st.bars}>
        {scope.wave.map((v, i) => <View key={i} style={[st.bar, { height: 3 + Math.min(1, Math.abs(v) * 1.6) * 38 }, scope.active && st.barOn]} />)}
      </View>
      <TouchableOpacity testID={`${testID}-play`} accessibilityRole="button" accessibilityLabel={playing ? 'Stop tone' : 'Play tone'}
        style={[st.play, playing && st.playOn]} onPress={() => (playing ? stop() : start(0))} activeOpacity={0.8}>
        <Text style={[st.playIcon, playing && st.playIconOn]}>{playing ? '■' : '▶'}</Text>
      </TouchableOpacity>
    </View>
    <View style={st.row}>
      {DURATIONS.map(sec => {
        const on = sec === duration;
        return <TouchableOpacity key={sec} testID={`${testID}-duration-${sec}`} accessibilityState={{ selected: on }}
          style={[st.dur, on && st.durOn]} onPress={() => setDuration(sec)} disabled={timed}>
          <Text style={[st.durText, on && st.durTextOn]}>{sec} s</Text>
        </TouchableOpacity>;
      })}
      <TouchableOpacity testID={`${testID}-start`} accessibilityRole="button" style={[st.start, timed && st.startOn]}
        onPress={() => (timed ? stop() : start(duration))} activeOpacity={0.8}>
        <Text testID={`${testID}-start-label`} style={[st.startText, timed && st.startTextOn]}>{timed ? `STOP · ${left}s` : 'START SESSION'}</Text>
      </TouchableOpacity>
    </View>
  </View>;
}

const st = skinStyles({
  wrap: { marginTop: 10, borderWidth: 1, borderColor: 'transparent', borderRadius: 10, padding: 12, backgroundColor: '#03140a', gap: 12 },
  title: { color: '#a9ff8a', fontSize: 11, fontWeight: '900', letterSpacing: 3 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  hz: { color: '#a9ff8a', fontSize: 24, fontWeight: '900' },
  sub: { color: '#4fa85c', fontSize: 8, fontWeight: '800', letterSpacing: 2, marginTop: 2 },
  divider: { width: 1, height: 40, backgroundColor: '#1f5a30' },
  bars: { flex: 1, height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', overflow: 'hidden' },
  bar: { width: 2, backgroundColor: '#2f7a3c', borderRadius: 1 },
  barOn: { backgroundColor: '#a9ff8a' },
  play: { width: 48, height: 48, borderRadius: 24, borderWidth: 2, borderColor: '#a9ff8a', alignItems: 'center', justifyContent: 'center' },
  playOn: { backgroundColor: '#a9ff8a' },
  playIcon: { color: '#a9ff8a', fontSize: 18 },
  playIconOn: { color: '#03140a' },
  dur: { minWidth: 50, minHeight: 44, borderWidth: 1, borderColor: '#1f5a30', borderRadius: 6, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  durOn: { borderColor: '#a9ff8a', backgroundColor: '#0a2a14' },
  durText: { color: '#4fa85c', fontSize: 12, fontWeight: '800' },
  durTextOn: { color: '#f3ffc4' },
  start: { flex: 1, minHeight: 44, borderWidth: 1.5, borderColor: '#a9ff8a', borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  startOn: { backgroundColor: '#a9ff8a' },
  startText: { color: '#a9ff8a', fontSize: 11, fontWeight: '900', letterSpacing: 2 },
  startTextOn: { color: '#03140a' },
});
