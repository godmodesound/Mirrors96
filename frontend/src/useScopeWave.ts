import { useEffect, useState } from 'react';
import { AudioEngine } from './AudioEngine';

export type ScopeWave = { wave: number[]; level: number; active: boolean };
const IDLE: ScopeWave = { wave: new Array(32).fill(0), level: 0, active: false };

/** Live master-bus waveform (32 samples, −1…1) throttled for React rendering. */
export function useScopeWave(intervalMs = 100): ScopeWave {
  const [state, setState] = useState<ScopeWave>(IDLE);
  useEffect(() => {
    let last = 0;
    return AudioEngine.subscribeScope(frame => {
      const now = Date.now();
      if (now - last < intervalMs) return;
      last = now;
      const step = Math.max(1, Math.floor(frame.wave.length / 32));
      const wave = Array.from({ length: 32 }, (_, i) => ((frame.wave[i * step] ?? 128) - 128) / 128);
      const level = Math.min(1, Math.max(...wave.map(Math.abs)));
      const active = level > 0.012;
      setState(prev => (!active && !prev.active ? prev : active ? { wave, level, active } : IDLE));
    });
  }, [intervalMs]);
  return state;
}
