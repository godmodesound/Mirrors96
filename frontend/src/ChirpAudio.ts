/**
 * ChirpAudio.ts — Nextel Classic Chirp Sound Synthesis
 * 
 * Recreates the iconic Motorola iDEN two-tone chirp:
 * - Send chirp: ascending two-tone "doo-DEET" (~1800Hz → ~2400Hz)
 * - Receive chirp: descending "DEET-doo" (~2400Hz → ~1800Hz)
 * - Connect chirp: triple ascending beep
 * - Error chirp: low descending tone
 * 
 * Uses base64-encoded WAV generation for cross-platform compatibility.
 */

// Generate a WAV file as base64 from raw PCM samples
function generateWav(samples: Float32Array, sampleRate: number = 44100): string {
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const dataSize = samples.length * (bitsPerSample / 8);
  const headerSize = 44;
  const totalSize = headerSize + dataSize;

  const buffer = new ArrayBuffer(totalSize);
  const view = new DataView(buffer);

  // RIFF header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, totalSize - 8, true);
  writeString(view, 8, 'WAVE');

  // fmt chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // chunk size
  view.setUint16(20, 1, true);  // PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);

  // data chunk
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  // Write samples
  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    const val = s < 0 ? s * 0x8000 : s * 0x7FFF;
    view.setInt16(offset, val, true);
    offset += 2;
  }

  // Convert to base64
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function writeString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

// Generate a tone with envelope
function generateTone(
  freq: number,
  duration: number,
  sampleRate: number = 44100,
  volume: number = 0.7,
  fadeIn: number = 0.005,
  fadeOut: number = 0.01,
): Float32Array {
  const numSamples = Math.floor(sampleRate * duration);
  const samples = new Float32Array(numSamples);
  const fadeInSamples = Math.floor(sampleRate * fadeIn);
  const fadeOutSamples = Math.floor(sampleRate * fadeOut);

  for (let i = 0; i < numSamples; i++) {
    let envelope = volume;
    if (i < fadeInSamples) envelope *= i / fadeInSamples;
    if (i > numSamples - fadeOutSamples) envelope *= (numSamples - i) / fadeOutSamples;

    // Square-ish wave (adds harmonics for that electronic chirp character)
    const t = i / sampleRate;
    const sine = Math.sin(2 * Math.PI * freq * t);
    const harmonic = Math.sin(2 * Math.PI * freq * 2 * t) * 0.15;
    const harmonic2 = Math.sin(2 * Math.PI * freq * 3 * t) * 0.08;
    samples[i] = (sine + harmonic + harmonic2) * envelope;
  }
  return samples;
}

// Concatenate Float32Arrays
function concat(...arrays: Float32Array[]): Float32Array {
  const totalLength = arrays.reduce((sum, a) => sum + a.length, 0);
  const result = new Float32Array(totalLength);
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
}

// Silence generator
function silence(duration: number, sampleRate: number = 44100): Float32Array {
  return new Float32Array(Math.floor(sampleRate * duration));
}

/**
 * Classic Nextel Send Chirp — ascending "doo-DEET"
 * Two quick tones: ~1800Hz then ~2400Hz
 */
export function generateSendChirp(): string {
  const sr = 44100;
  const tone1 = generateTone(1800, 0.08, sr, 0.6, 0.003, 0.008);
  const gap = silence(0.025, sr);
  const tone2 = generateTone(2400, 0.10, sr, 0.7, 0.003, 0.012);
  const tail = silence(0.04, sr);
  return `data:audio/wav;base64,${generateWav(concat(tone1, gap, tone2, tail), sr)}`;
}

/**
 * Classic Nextel Receive Chirp — descending "DEET-doo"
 * Two quick tones: ~2400Hz then ~1800Hz
 */
export function generateReceiveChirp(): string {
  const sr = 44100;
  const tone1 = generateTone(2400, 0.10, sr, 0.7, 0.003, 0.008);
  const gap = silence(0.025, sr);
  const tone2 = generateTone(1800, 0.08, sr, 0.6, 0.003, 0.012);
  const tail = silence(0.04, sr);
  return `data:audio/wav;base64,${generateWav(concat(tone1, gap, tone2, tail), sr)}`;
}

/**
 * Connect Chirp — triple ascending beep
 */
export function generateConnectChirp(): string {
  const sr = 44100;
  const t1 = generateTone(1600, 0.06, sr, 0.5);
  const g = silence(0.03, sr);
  const t2 = generateTone(2000, 0.06, sr, 0.55);
  const t3 = generateTone(2600, 0.08, sr, 0.6);
  const tail = silence(0.04, sr);
  return `data:audio/wav;base64,${generateWav(concat(t1, g, t2, g, t3, tail), sr)}`;
}

/**
 * Error/Disconnect Chirp — descending low tone
 */
export function generateErrorChirp(): string {
  const sr = 44100;
  const t1 = generateTone(800, 0.12, sr, 0.5);
  const g = silence(0.04, sr);
  const t2 = generateTone(500, 0.15, sr, 0.4);
  const tail = silence(0.04, sr);
  return `data:audio/wav;base64,${generateWav(concat(t1, g, t2, tail), sr)}`;
}

/**
 * Roger beep — single confirmation tone (end of transmission)
 */
export function generateRogerBeep(): string {
  const sr = 44100;
  const tone = generateTone(2200, 0.06, sr, 0.5, 0.002, 0.015);
  const tail = silence(0.03, sr);
  return `data:audio/wav;base64,${generateWav(concat(tone, tail), sr)}`;
}

// Pre-generate all chirps for instant playback
let _sendChirp: string | null = null;
let _receiveChirp: string | null = null;
let _connectChirp: string | null = null;
let _errorChirp: string | null = null;
let _rogerBeep: string | null = null;

export function getSendChirp(): string {
  if (!_sendChirp) _sendChirp = generateSendChirp();
  return _sendChirp;
}

export function getReceiveChirp(): string {
  if (!_receiveChirp) _receiveChirp = generateReceiveChirp();
  return _receiveChirp;
}

export function getConnectChirp(): string {
  if (!_connectChirp) _connectChirp = generateConnectChirp();
  return _connectChirp;
}

export function getErrorChirp(): string {
  if (!_errorChirp) _errorChirp = generateErrorChirp();
  return _errorChirp;
}

export function getRogerBeep(): string {
  if (!_rogerBeep) _rogerBeep = generateRogerBeep();
  return _rogerBeep;
}
