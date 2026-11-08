// Selected frequencies are mathematical references, never RF/optical hardware output.
export const MIN_FREQUENCY = 0.01;
export const MAX_FREQUENCY = 1e24;
export const MAX_DIRECT_AUDIO = 20000;
export const LOG_MIN = -2;
export const LOG_MAX = 24;
export const FREQUENCY_UNITS = [
  { label: 'Hz', factor: 1 }, { label: 'kHz', factor: 1e3 },
  { label: 'MHz', factor: 1e6 }, { label: 'GHz', factor: 1e9 },
  { label: 'THz', factor: 1e12 }, { label: 'PHz', factor: 1e15 },
  { label: 'EHz', factor: 1e18 }, { label: 'ZHz', factor: 1e21 },
  { label: 'YHz', factor: 1e24 },
] as const;
export type FrequencyUnit = typeof FREQUENCY_UNITS[number];

export function clampFrequency(frequency: number): number {
  if (!Number.isFinite(frequency)) return 432;
  return Math.max(MIN_FREQUENCY, Math.min(MAX_FREQUENCY, frequency));
}

export function frequencyUnit(frequency: number): FrequencyUnit {
  return [...FREQUENCY_UNITS].reverse().find(unit => frequency >= unit.factor) || FREQUENCY_UNITS[0];
}

export function formatFrequency(frequency: number): string {
  const unit = frequencyUnit(frequency);
  return `${Number((frequency / unit.factor).toPrecision(8))} ${unit.label}`;
}

export function spectrumPosition(frequency: number): number {
  return (Math.log10(clampFrequency(frequency)) - LOG_MIN) / (LOG_MAX - LOG_MIN);
}

export function frequencyAtPosition(position: number): number {
  const log = LOG_MIN + Math.max(0, Math.min(1, position)) * (LOG_MAX - LOG_MIN);
  return clampFrequency(Number((10 ** log).toPrecision(12)));
}

export function parseFrequency(text: string, factor: number): number | null {
  const value = text.trim().replace(',', '.');
  // Strict parsing: no partial acceptance of '12abc', Infinity, empty or negative values.
  if (!/^(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(value)) return null;
  const hz = Number(value) * factor;
  return Number.isFinite(hz) && hz >= MIN_FREQUENCY && hz <= MAX_FREQUENCY ? hz : null;
}

export function translatedTone(frequency: number): { hz: number; octaves: number } {
  const source = clampFrequency(frequency);
  if (source <= MAX_DIRECT_AUDIO) return { hz: source, octaves: 0 };
  // Preserve octave relationships; >20kHz is downshifted into (256, 512] Hz.
  const octaves = Math.ceil(Math.log2(source / 512));
  return { hz: source / (2 ** octaves), octaves };
}

export const audioFrequency = (frequency: number): number => translatedTone(frequency).hz;

export function linkedFrequencies(frequencies: number[], index: number, target: number): number[] {
  const safe = frequencies.map(clampFrequency);
  if (index < 0 || index >= safe.length) return safe;
  const ratio = Math.max(MIN_FREQUENCY / Math.min(...safe),
    Math.min(MAX_FREQUENCY / Math.max(...safe), clampFrequency(target) / safe[index]));
  return safe.map(f => clampFrequency(f * ratio));
}

// Approximate, conventional EM bands; THz straddles microwave and infrared.
// Audio is mechanical, NOT an electromagnetic spectral band.
export function spectrumBand(frequency: number): string {
  if (frequency < 20) return 'SUB-AUDIO';
  if (frequency <= MAX_DIRECT_AUDIO) return 'AUDIO';
  if (frequency < 3e8) return 'RADIO';
  if (frequency < 3e11) return 'MICROWAVE';
  if (frequency < 3e12) return 'TERAHERTZ / FAR IR';
  if (frequency < 4e14) return 'INFRARED';
  if (frequency < 7.9e14) return 'VISIBLE LIGHT';
  if (frequency < 3e16) return 'ULTRAVIOLET';
  if (frequency < 3e19) return 'X-RAY';
  return 'GAMMA';
}

export function emWavelength(frequency: number): string {
  const metres = 299792458 / clampFrequency(frequency);
  const units = [{ label: 'm', factor: 1 }, { label: 'mm', factor: 1e-3 },
    { label: 'µm', factor: 1e-6 }, { label: 'nm', factor: 1e-9 },
    { label: 'pm', factor: 1e-12 }, { label: 'fm', factor: 1e-15 }];
  const unit = units.find(item => metres >= item.factor) || units[units.length - 1];
  return `${Number((metres / unit.factor).toPrecision(5))} ${unit.label}`;
}