import { useSyncExternalStore } from 'react';
import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { AudioEngine } from '../AudioEngine';
import { loadFrequencyToLab } from '../CodesLabShared';
import { ArchiveCode } from './archiveData';

type Session = { active: ArchiveCode | null; preview: boolean; startedAt: number; loaded: ArchiveCode | null; revision: number };
let session: Session = { active: null, preview: false, startedAt: 0, loaded: null, revision: 0 };
const listeners = new Set<() => void>();
const emit = (change: Partial<Session>) => { session = { ...session, ...change }; listeners.forEach(listener => listener()); };
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
export const useArchiveSession = () => useSyncExternalStore(subscribe, () => session, () => session);
export const archiveTick = () => { if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {}); };

export function stopArchive() {
  AudioEngine.stopMulti();
  emit({ active: null, preview: false, startedAt: 0 });
}

export async function stageArchiveCode(entry: ArchiveCode) {
  await loadFrequencyToLab(entry.frequencies, entry.name);
  emit({ loaded: entry, revision: session.revision + 1 });
}

export function playArchiveCode(entry: ArchiveCode, preview = false) {
  archiveTick();
  if (!preview && session.active?.id === entry.id) { stopArchive(); return; }
  AudioEngine.stopMulti();
  AudioEngine.playMulti(entry.frequencies, 0.3);
  emit({ active: entry, preview, startedAt: Date.now() });
  if (!preview) void stageArchiveCode(entry);
}

export function endArchivePreview(id: string) {
  if (session.preview && session.active?.id === id) stopArchive();
}