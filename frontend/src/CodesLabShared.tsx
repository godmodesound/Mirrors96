import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AudioEngine } from './AudioEngine';
import CymaticScope from './CymaticScope';
import LabMenuBar, { LabMenu } from './LabMenuBar';
import CodesLayerCard, { ToneLayer } from './codes/CodesLayerCard';
import { SpectrumNotice } from './codes/SpectrumFrequencyControl';
import SpectrumAtlas from './codes/SpectrumAtlas';
import { audioFrequency, clampFrequency, linkedFrequencies } from './codes/spectrum';
import { skinStyles, SK } from './skins';

const STORAGE_KEY = 'codes_lab_state';
const initialLayers = (): ToneLayer[] => [{ id: 1, frequency: 432, gain: 0.5, isPlaying: false }];
interface CodesLabProps {
  onFrequencyChange?: (layers: ToneLayer[]) => void;
  onLoadedNameChange?: (name: string | null) => void;
  compact?: boolean; showScope?: boolean; testID?: string;
}

function restoreLayers(value: unknown): ToneLayer[] {
  if (!Array.isArray(value)) return initialLayers();
  const valid = value.filter(l => Number.isFinite(l?.frequency) && l.frequency > 0).slice(0, 5);
  return valid.length ? valid.map((l, index) => ({ id: index + 1, frequency: clampFrequency(l.frequency),
    gain: Number.isFinite(l.gain) ? Math.max(0, Math.min(1, l.gain)) : 0.5, isPlaying: false })) : initialLayers();
}

export default function CodesLabShared({ onFrequencyChange, onLoadedNameChange, compact = false, showScope = true, testID }: CodesLabProps) {
  const generatedId = React.useId().replace(/[^a-zA-Z0-9]/g, '');
  const labId = testID || `shared-lab-${generatedId}`;
  const [menu, setMenu] = useState<LabMenu>(null);
  const [layers, setLayers] = useState<ToneLayer[]>(initialLayers);
  const [isPlaying, setIsPlaying] = useState(false);
  const [layersLinked, setLayersLinked] = useState(false);
  const [loadedArchiveName, setLoadedArchiveName] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const latest = useRef({ layers, isPlaying, layersLinked });
  latest.current = { layers, isPlaying, layersLinked };
  const callbacks = useRef({ onFrequencyChange, onLoadedNameChange });
  callbacks.current = { onFrequencyChange, onLoadedNameChange };

  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(STORAGE_KEY).then(raw => {
      if (!mounted || !raw) return;
      const parsed = JSON.parse(raw);
      setLayers(restoreLayers(parsed.layers));
      setLoadedArchiveName(typeof parsed.loadedName === 'string' ? parsed.loadedName : null);
      setLayersLinked(Boolean(parsed.linked));
    }).catch(() => {}).finally(() => { if (mounted) setReady(true); });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!ready) return; // Never overwrite saved THz values before hydration finishes.
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({
      layers: layers.map(l => ({ ...l, isPlaying: false })), loadedName: loadedArchiveName, linked: layersLinked,
    })).catch(() => {});
    callbacks.current.onFrequencyChange?.(layers);
  }, [layers, loadedArchiveName, layersLinked, ready]);
  useEffect(() => { callbacks.current.onLoadedNameChange?.(loadedArchiveName); }, [loadedArchiveName]);

  const playLayers = (next: ToneLayer[]) => {
    AudioEngine.playMulti(next.map(l => l.frequency), next.map(l => l.gain));
  };
  const replaceLayers = (next: ToneLayer[]) => {
    latest.current.layers = next;
    setLayers(next);
    if (latest.current.isPlaying) playLayers(next);
  };
  const updateFrequency = (id: number, frequency: number) => {
    const current = latest.current.layers;
    const positions = linkedFrequencies(current.map(l => l.frequency), current.findIndex(l => l.id === id), frequency);
    replaceLayers(current.map((l, index) => ({ ...l,
      frequency: latest.current.layersLinked ? positions[index] : l.id === id ? clampFrequency(frequency) : l.frequency,
    })));
  };
  const handlePlay = () => {
    const nextPlaying = !latest.current.isPlaying;
    if (nextPlaying) playLayers(latest.current.layers); else AudioEngine.stopMulti();
    latest.current.isPlaying = nextPlaying;
    setIsPlaying(nextPlaying);
    setLayers(previous => previous.map(l => ({ ...l, isPlaying: nextPlaying })));
  };
  const reset = () => {
    AudioEngine.stopMulti(); latest.current.isPlaying = false;
    setIsPlaying(false); setLayers(initialLayers()); setLoadedArchiveName(null); setLayersLinked(false);
  };
  const addLayer = () => {
    if (latest.current.layers.length >= 5) return;
    const id = Math.max(...latest.current.layers.map(l => l.id)) + 1;
    replaceLayers([...latest.current.layers, { id, frequency: 432, gain: 0.5, isPlaying: latest.current.isPlaying }]);
  };

  return <View testID={labId} style={s.container}>
    {showScope && <CymaticScope frequencies={layers.map(l => audioFrequency(l.frequency))} playing={isPlaying} />}
    <Text testID={`${labId}-title`} style={s.title}>&gt; CODES_LAB</Text>
    {loadedArchiveName && <View testID={`${labId}-loaded-banner`} style={s.loaded}>
      <Text testID={`${labId}-loaded-name`} style={s.loadedText}>LOADED: {loadedArchiveName}</Text>
      <TouchableOpacity testID={`${labId}-loaded-play`} style={s.chip} onPress={handlePlay}><Text style={s.chipText}>{isPlaying ? 'STOP' : 'PLAY'}</Text></TouchableOpacity>
      <TouchableOpacity testID={`${labId}-clear-loaded`} style={s.chip} onPress={reset}><Text style={s.chipText}>CLEAR</Text></TouchableOpacity>
    </View>}
    <LabMenuBar prefix={labId} selected={menu} onSelect={setMenu} modesLabel="MODES & RESET" />
    <SpectrumNotice testID={`${labId}-spectrum-notice`} />
    {!ready && <ActivityIndicator testID={`${labId}-loading`} color={SK('#ff0a0a')} />}
    {ready && menu === 'modes' && <View testID={`${labId}-modes-panel`} style={s.modes}>
      <Text testID={`${labId}-node-count`} style={s.caption}>NODES {layers.length}</Text>
      <TouchableOpacity testID={`${labId}-link-layers`} style={[s.chip, layersLinked && s.activeChip]} onPress={() => setLayersLinked(v => !v)}><Text style={s.chipText}>{layersLinked ? 'LINKED' : 'LINK ALL'}</Text></TouchableOpacity>
      <TouchableOpacity testID={`${labId}-reset`} style={s.chip} onPress={reset}><Text style={s.chipText}>RESET</Text></TouchableOpacity>
    </View>}
    {ready && menu === 'signals' && <View testID={`${labId}-signals-panel`}>
      <SpectrumAtlas prefix={labId} frequencies={layers.map(l => l.frequency)}
        onTune={(i, hz) => { const layer = latest.current.layers[i]; if (layer) updateFrequency(layer.id, hz); }} />
      {layersLinked && <Text testID={`${labId}-linked-boundary-note`} style={s.caption}>Linked ratios are preserved; nodes stop together at spectrum limits.</Text>}
      {layers.map((layer, index) => <CodesLayerCard key={layer.id} layer={layer} index={index} count={layers.length}
        prefix={labId} linked={layersLinked} compact={compact} onFrequency={f => updateFrequency(layer.id, f)}
        onGain={gain => replaceLayers(latest.current.layers.map(l => l.id === layer.id ? { ...l, gain } : l))}
        onRemove={() => { if (latest.current.layers.length > 1) replaceLayers(latest.current.layers.filter(l => l.id !== layer.id)); }} />)}
      {layers.length < 5 && <TouchableOpacity testID={`${labId}-add-layer`} style={s.add} onPress={addLayer}><Text style={s.caption}>[+] ADD_LAYER</Text></TouchableOpacity>}
    </View>}
    <TouchableOpacity testID={`${labId}-execute`} disabled={!ready} style={[s.play, isPlaying && s.playing]} onPress={handlePlay}>
      <Text style={[s.playText, isPlaying && s.playingText]}>{isPlaying ? '[ ■ STOP ]' : '[ ▶ EXECUTE ]'}</Text>
    </TouchableOpacity>
  </View>;
}

export async function loadFrequencyToLab(frequencies: number[], name: string) {
  const layers = restoreLayers(frequencies.map(frequency => ({ frequency, gain: 0.5 })));
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ layers, loadedName: name, linked: false }));
}

const s = skinStyles({
  container: { backgroundColor: '#050202', borderWidth: 1, borderColor: '#1a0808', marginHorizontal: 16, marginVertical: 8, padding: 12 },
  title: { color: '#ff0a0a', fontSize: 14, fontWeight: '900', letterSpacing: 2, marginBottom: 12 },
  loaded: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginBottom: 12 },
  loadedText: { flex: 1, color: '#ff8080', fontSize: 11 },
  modes: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 12 },
  chip: { minHeight: 44, paddingHorizontal: 12, borderWidth: 1, borderColor: '#593030', alignItems: 'center', justifyContent: 'center' },
  chipText: { color: '#ffffff', fontSize: 10, fontWeight: '800' }, activeChip: { borderColor: '#ff0a0a' },
  caption: { color: '#bdaaaa', fontSize: 11, lineHeight: 17 },
  add: { alignItems: 'center', justifyContent: 'center', minHeight: 44, borderWidth: 1, borderStyle: 'dashed', borderColor: '#593030', marginBottom: 12 },
  play: { borderWidth: 2, borderColor: '#ff0a0a', paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  playing: { backgroundColor: '#ff0a0a' }, playText: { color: '#ff0a0a', fontSize: 14, fontWeight: '900', letterSpacing: 3 }, playingText: { color: '#000000' },
});