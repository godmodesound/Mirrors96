import { useSyncExternalStore } from 'react';
import { AudioEngine } from '../AudioEngine';

// Dedicated session-bus oscillator; never overwrites Lab's 0–4 or harmonic 200+ IDs.
export const CYMATIC_SIGNAL_ID = 960096;
export const MIN_SIGNAL_HZ = 20;
export const MAX_SIGNAL_HZ = 2000;
let state = { hz: 432, gain: 0.14, playing: false };
const listeners = new Set<() => void>();
const emit = (next: Partial<typeof state>) => { state = { ...state, ...next }; listeners.forEach(listener => listener()); };
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };

AudioEngine.subscribeStopAll(() => { if (state.playing) emit({ playing: false }); });
export const useCymaticSignal = () => useSyncExternalStore(subscribe, () => state, () => state);
export function setCymaticHz(hz: number) {
  if (!Number.isFinite(hz)) return;
  const next = Math.round(Math.max(MIN_SIGNAL_HZ, Math.min(MAX_SIGNAL_HZ, hz)) * 10) / 10;
  if (state.hz === next) return;
  if (state.playing) AudioEngine.updateFreq(CYMATIC_SIGNAL_ID, next);
  emit({ hz: next });
}
export function toggleCymaticSignal() {
  if (state.playing) AudioEngine.stopTone(CYMATIC_SIGNAL_ID);
  else { AudioEngine.unlockAudio(); AudioEngine.startTone(CYMATIC_SIGNAL_ID, state.hz, state.gain, 'SIN'); }
  emit({ playing: !state.playing });
}
export function cycleCymaticLevel() {
  const levels = [0.08, 0.14, 0.22];
  const gain = levels[(levels.indexOf(state.gain) + 1) % levels.length];
  if (state.playing) AudioEngine.updateGain(CYMATIC_SIGNAL_ID, gain);
  emit({ gain });
}