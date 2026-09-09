import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { Audio } from 'expo-av';
import { Album, Track } from '../AlbumData';
import { trackKey } from './SoundTrack';

export function useSoundPlayback() {
  const soundRef = useRef<Audio.Sound | null>(null);
  const request = useRef(0);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const stop = useCallback(async () => {
    ++request.current;
    const old = soundRef.current; soundRef.current = null;
    setActiveKey(null); setLoading(false); setProgress(0); setElapsed(0); setError(null);
    if (old) { try { await old.unloadAsync(); } catch {} }
  }, []);
  useEffect(() => () => { ++request.current; const sound = soundRef.current; soundRef.current = null; if (sound) void sound.unloadAsync().catch(() => {}); }, []);

  const play = async (track: Track, album: Album) => {
    if (activeKey === trackKey(album, track)) { await stop(); return; }
    const token = ++request.current;
    const old = soundRef.current; soundRef.current = null;
    setActiveKey(trackKey(album, track)); setLoading(true); setProgress(0); setElapsed(0); setError(null);
    try {
      if (old) await old.unloadAsync();
      if (token !== request.current) return;
      if (Platform.OS !== 'web') await Audio.setAudioModeAsync({ playsInSilentModeIOS: true, staysActiveInBackground: false });
      const { sound } = await Audio.Sound.createAsync({ uri: track.previewUrl }, { shouldPlay: false, volume: 1, progressUpdateIntervalMillis: 200 });
      if (token !== request.current) { await sound.unloadAsync(); return; }
      soundRef.current = sound;
      sound.setOnPlaybackStatusUpdate(status => {
        if (token !== request.current || !status.isLoaded) return;
        if (status.didJustFinish) { void stop(); return; }
        setElapsed(status.positionMillis / 1000);
        setProgress(status.durationMillis ? status.positionMillis / status.durationMillis : 0);
      });
      await sound.playAsync();
      if (token === request.current) setLoading(false);
    } catch {
      if (token !== request.current) return;
      await stop(); setError('This recording could not load. Tap the track to retry.');
    }
  };
  return { activeKey, loading, progress, elapsed, error, play, stop };
}