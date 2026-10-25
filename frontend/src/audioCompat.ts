/**
 * Thin adapter over expo-audio (SDK 55+ replacement for expo-av) exposing the
 * small Sound / Recording surface the voice-memo + preview screens use.
 */
import {
  AudioModule, AudioPlayer, AudioStatus, RecordingOptions, RecordingPresets,
  createAudioPlayer, requestRecordingPermissionsAsync, setAudioModeAsync,
} from 'expo-audio';
import { Platform } from 'react-native';

/** Flatten a preset into platform-specific recorder options (mirrors expo-audio's internal helper). */
const toRecorderOptions = (o: RecordingOptions) => {
  const { ios, android, web, ...common } = o;
  return { ...common, isMeteringEnabled: o.isMeteringEnabled ?? false, ...(Platform.OS === 'ios' ? ios : Platform.OS === 'android' ? android : web) } as unknown as RecordingOptions;
};

type Status = { isLoaded: boolean; didJustFinish: boolean; isPlaying: boolean; positionMillis: number; durationMillis: number };
type ModeIn = { allowsRecordingIOS?: boolean; playsInSilentModeIOS?: boolean; staysActiveInBackground?: boolean; shouldDuckAndroid?: boolean };

class Sound {
  private sub: { remove(): void } | null = null;
  constructor(private player: AudioPlayer) {}
  setOnPlaybackStatusUpdate(cb: ((s: Status) => void) | null) {
    this.sub?.remove();
    this.sub = cb ? this.player.addListener('playbackStatusUpdate', (s: AudioStatus) => cb({
      isLoaded: s.isLoaded, didJustFinish: s.didJustFinish, isPlaying: s.playing,
      positionMillis: (s.currentTime || 0) * 1000, durationMillis: (s.duration || 0) * 1000,
    })) : null;
  }
  /** Resolves once the source has loaded; rejects after 15 s so callers can show their error state. */
  async playAsync() {
    this.player.play();
    if (this.player.isLoaded) return;
    await new Promise<void>((resolve, reject) => {
      const sub = this.player.addListener('playbackStatusUpdate', (s: AudioStatus) => { if (s.isLoaded) { clearTimeout(t); sub.remove(); resolve(); } });
      const t = setTimeout(() => { sub.remove(); reject(new Error('Audio failed to load')); }, 15000);
    });
  }
  async stopAsync() { this.player.pause(); await this.player.seekTo(0).catch(() => {}); }
  async unloadAsync() { this.sub?.remove(); this.sub = null; try { this.player.pause(); } catch {} this.player.remove(); }
  static async createAsync(source: { uri: string }, opts: { shouldPlay?: boolean; volume?: number; progressUpdateIntervalMillis?: number } = {}) {
    const player = createAudioPlayer(source, { updateInterval: opts.progressUpdateIntervalMillis ?? 250 });
    player.volume = opts.volume ?? 1;
    const sound = new Sound(player);
    if (opts.shouldPlay) player.play();
    return { sound };
  }
}

class Recording {
  // eslint-disable-next-line import/namespace
  constructor(private rec: InstanceType<typeof AudioModule.AudioRecorder>) {}
  async stopAndUnloadAsync() { await this.rec.stop(); }
  getURI() { return this.rec.uri; }
  static async createAsync(preset: RecordingOptions) {
    // eslint-disable-next-line import/namespace
    const rec = new AudioModule.AudioRecorder(toRecorderOptions(preset));
    await rec.prepareToRecordAsync();
    rec.record();
    return { recording: new Recording(rec) };
  }
}

export const Audio = {
  Sound,
  Recording,
  RecordingOptionsPresets: RecordingPresets,
  requestPermissionsAsync: requestRecordingPermissionsAsync,
  setAudioModeAsync: (m: ModeIn) => setAudioModeAsync({
    ...(m.allowsRecordingIOS !== undefined && { allowsRecording: m.allowsRecordingIOS }),
    ...(m.playsInSilentModeIOS !== undefined && { playsInSilentMode: m.playsInSilentModeIOS }),
    ...(m.staysActiveInBackground !== undefined && { shouldPlayInBackground: m.staysActiveInBackground }),
    ...(m.shouldDuckAndroid && { interruptionMode: 'duckOthers' as const }),
  }),
};
export type AudioSound = Sound;
export type AudioRecording = Recording;
