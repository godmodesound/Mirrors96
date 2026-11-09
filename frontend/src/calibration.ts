import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

/** Resonance Calibration: personal resonant carrier per body zone (BIOMAP node groups). */
export type CalZone = { id: string; name: string; note: string; base: number; beat: number; nodes: number[] };
export const CAL_ZONES: CalZone[] = [
  { id: 'root', name: 'ROOT · LEGS & FEET', note: 'C', base: 256.87, beat: 7.83, nodes: [24, 22, 23] },
  { id: 'sacral', name: 'SACRAL · PELVIS & HANDS', note: 'D', base: 288.33, beat: 6, nodes: [19, 20, 21] },
  { id: 'solar', name: 'SOLAR · GUT & ORGANS', note: 'E', base: 323.63, beat: 10, nodes: [13, 14, 15, 16, 17, 18] },
  { id: 'heart', name: 'HEART · LUNGS & SHOULDERS', note: 'F', base: 342.88, beat: 10, nodes: [9, 10, 11, 12, 7, 8] },
  { id: 'throat', name: 'THROAT · JAW', note: 'G', base: 384.87, beat: 14, nodes: [5, 6] },
  { id: 'brow', name: 'THIRD EYE · EARS', note: 'A', base: 432, beat: 6, nodes: [2, 3, 4] },
  { id: 'crown', name: 'CROWN', note: 'B', base: 484.9, beat: 40, nodes: [1] },
];
/** Sweep window: one semitone either side of the zone's 432-lattice note. */
export const sweepRange = (z: CalZone) => ({ lo: z.base * 2 ** (-1 / 12), hi: z.base * 2 ** (1 / 12) });

export type CalResult = { hz: number; beat: number; at: number };
export type Calibration = Record<string, CalResult>;
const KEY = 'resonance_calibration_v1';
let current: Calibration = {};
let loaded = false;
const listeners = new Set<(c: Calibration) => void>();
const emit = () => listeners.forEach(l => l(current));

AsyncStorage.getItem(KEY).then(raw => {
  if (raw) { try { current = JSON.parse(raw) || {}; } catch {} }
  loaded = true; emit();
}).catch(() => { loaded = true; });

export function saveCalibration(next: Calibration) {
  current = next; emit();
  AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
}
export const getCalibration = () => current;
export const zoneForNode = (nodeId: number) => CAL_ZONES.find(z => z.nodes.includes(nodeId));

export function useCalibration(): Calibration {
  const [cal, setCal] = useState<Calibration>(current);
  useEffect(() => { listeners.add(setCal); if (loaded) setCal(current); return () => { listeners.delete(setCal); }; }, []);
  return cal;
}
