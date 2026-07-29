// ═══════════════════════════════════════════════════════════
// ORBIT GEOMETRY — Cosmic Octave mapping (Hans Cousto)
// Every frequency octave-reduces to an exact planetary
// Tone + Orbit pair. Each orbit carries its sacred geometry.
// Used by ScopeNodePanel for live auto visual feedback.
// ═══════════════════════════════════════════════════════════

export type OrbitInfo = {
  planet: string;
  symbol: string;
  color: string;
  orbitHz: number;   // Cousto reference tone of the orbit
  cents: number;     // deviation of the octave-reduced freq from the orbit tone
  geometry: string;  // sacred geometry keyed to this orbit (Geometry id)
  tone: { note: string; color: string; glow: string };
};

// Cousto cosmic-octave reference tones (Hz) + keyed sacred geometry
const ORBITS = [
  { planet: 'SUN',        symbol: '☉', color: '#FFD75E', orbitHz: 126.22, geometry: 'FLOWER' },
  { planet: 'MERCURY',    symbol: '☿', color: '#4DD0E1', orbitHz: 141.27, geometry: 'LISSAJOUS' },
  { planet: 'VENUS',      symbol: '♀', color: '#FF8FCF', orbitHz: 221.23, geometry: 'SRI' },
  { planet: 'EARTH DAY',  symbol: '⊕', color: '#5FC9FF', orbitHz: 194.18, geometry: 'MERKABA' },
  { planet: 'EARTH YEAR', symbol: '♁', color: '#43A047', orbitHz: 136.10, geometry: 'SPIRAL' },  // OM
  { planet: 'PLATONIC YR', symbol: '✶', color: '#E040FB', orbitHz: 172.06, geometry: 'JULIA' },  // precession
  { planet: 'MOON',       symbol: '☾', color: '#D8DCE8', orbitHz: 210.42, geometry: 'VESICA' },
  { planet: 'MARS',       symbol: '♂', color: '#FF3B30', orbitHz: 144.72, geometry: 'PHASE' },
  { planet: 'JUPITER',    symbol: '♃', color: '#FF9500', orbitHz: 183.58, geometry: 'METATRON' },
  { planet: 'SATURN',     symbol: '♄', color: '#E8C87D', orbitHz: 147.85, geometry: 'NGON' },
  { planet: 'URANUS',     symbol: '♅', color: '#00BCD4', orbitHz: 207.36, geometry: 'SPIRAL' },
  { planet: 'NEPTUNE',    symbol: '♆', color: '#2196F3', orbitHz: 211.44, geometry: 'JULIA' },
  { planet: 'PLUTO',      symbol: '♇', color: '#9575CD', orbitHz: 140.25, geometry: 'METATRON' },
];

// Chakra tone per chromatic-note index (0=A … 11=G#) — matches MIRRORS WHEEL
export const NOTE_TO_CHAKRA: { name: string; color: string; glow: string }[] = [
  { name: 'A',  color: '#673AB7', glow: '#9575CD' },
  { name: 'A#', color: '#9C27B0', glow: '#BA68C8' },
  { name: 'B',  color: '#E040FB', glow: '#F48FFF' },
  { name: 'C',  color: '#FF1A1A', glow: '#FF6969' },
  { name: 'C#', color: '#FF5722', glow: '#FF8A65' },
  { name: 'D',  color: '#FF9500', glow: '#FFB74D' },
  { name: 'D#', color: '#FFC400', glow: '#FFD54F' },
  { name: 'E',  color: '#FFEB00', glow: '#FFF176' },
  { name: 'F',  color: '#4CAF50', glow: '#81C784' },
  { name: 'F#', color: '#00BCD4', glow: '#4DD0E1' },
  { name: 'G',  color: '#2196F3', glow: '#64B5F6' },
  { name: 'G#', color: '#3F51B5', glow: '#7986CB' },
];

export function chakraForFreq(freq: number) {
  if (!freq || freq <= 0) return NOTE_TO_CHAKRA[0];
  const semis = 12 * Math.log2(freq / 432);
  const idx = ((Math.round(semis) % 12) + 12) % 12;
  return NOTE_TO_CHAKRA[idx];
}

// Octave-reduce a frequency into the cosmic-octave band [126.22, 252.44)
function octaveReduce(freq: number): number {
  let f = Math.max(freq, 0.0001);
  while (f < 126.22) f *= 2;
  while (f >= 252.44) f /= 2;
  return f;
}

// Map any frequency to its exact Tone + Orbit pair + sacred geometry
export function mapOrbitGeometry(freq: number): OrbitInfo {
  const f = octaveReduce(freq || 432);
  let best = ORBITS[0];
  let bestCents = Infinity;
  for (const o of ORBITS) {
    // compare in circular octave space (also test half/double to handle band edges)
    for (const ref of [o.orbitHz, o.orbitHz * 2, o.orbitHz / 2]) {
      const cents = Math.abs(1200 * Math.log2(f / ref));
      if (cents < bestCents) { bestCents = cents; best = o; }
    }
  }
  const tone = chakraForFreq(freq);
  return {
    planet: best.planet,
    symbol: best.symbol,
    color: best.color,
    orbitHz: best.orbitHz,
    cents: Math.round(bestCents),
    geometry: best.geometry,
    tone: { note: tone.name, color: tone.color, glow: tone.glow },
  };
}

// Binaural beat = smallest audible-range pairwise delta between layers
// (plus scalar pulse when engaged). 0 when no beat is present.
export function detectBeat(frequencies: number[], scalarBeatHz = 0): number {
  const diffs: number[] = [];
  for (let i = 0; i < frequencies.length; i++) {
    for (let j = i + 1; j < frequencies.length; j++) {
      const d = Math.abs(frequencies[i] - frequencies[j]);
      if (d > 0.05 && d <= 48) diffs.push(d);
    }
  }
  if (scalarBeatHz > 0) diffs.push(scalarBeatHz);
  return diffs.length ? Math.round(Math.min(...diffs) * 100) / 100 : 0;
}
