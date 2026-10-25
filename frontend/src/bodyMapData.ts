import { ARCHIVE_CODES, ArchiveCode } from './archive/archiveData';
import { chakraForFreq } from './OrbitGeometry';

/** 24 diagnostic node points — dx (± of body centre) and y, both in units of body height. */
export type BodyPoint = { id: number; name: string; latin: string; dx: number; y: number };

export const BODY_POINTS: BodyPoint[] = [
  { id: 1, name: 'CROWN', latin: 'VERTEX', dx: 0, y: 0.006 },
  { id: 2, name: 'PINEAL / EYE', latin: 'OCULUS', dx: 0, y: 0.062 },
  { id: 3, name: 'EAR L', latin: 'AURIS SIN.', dx: -0.062, y: 0.068 },
  { id: 4, name: 'EAR R', latin: 'AURIS DEX.', dx: 0.062, y: 0.068 },
  { id: 5, name: 'JAW / DENTAL', latin: 'DENTIS', dx: 0, y: 0.108 },
  { id: 6, name: 'THROAT / THYROID', latin: 'GLANDULA', dx: 0, y: 0.15 },
  { id: 7, name: 'SHOULDER L', latin: 'HUMERUS SIN.', dx: -0.13, y: 0.19 },
  { id: 8, name: 'SHOULDER R', latin: 'HUMERUS DEX.', dx: 0.13, y: 0.19 },
  { id: 9, name: 'THYMUS', latin: 'IMMUNITAS', dx: 0, y: 0.225 },
  { id: 10, name: 'HEART', latin: 'CORDIS', dx: -0.04, y: 0.275 },
  { id: 11, name: 'LUNG L', latin: 'PULMO SIN.', dx: -0.08, y: 0.245 },
  { id: 12, name: 'LUNG R', latin: 'PULMO DEX.', dx: 0.08, y: 0.245 },
  { id: 13, name: 'SOLAR PLEXUS', latin: 'DIGESTIO', dx: 0, y: 0.335 },
  { id: 14, name: 'LIVER', latin: 'HEPAR', dx: 0.065, y: 0.365 },
  { id: 15, name: 'SPLEEN', latin: 'SPLEN', dx: -0.07, y: 0.375 },
  { id: 16, name: 'KIDNEY L', latin: 'REN SIN.', dx: -0.055, y: 0.415 },
  { id: 17, name: 'KIDNEY R', latin: 'REN DEX.', dx: 0.055, y: 0.415 },
  { id: 18, name: 'NAVEL / GUT', latin: 'INTESTINUM', dx: 0, y: 0.46 },
  { id: 19, name: 'PELVIS', latin: 'GENESIS', dx: 0, y: 0.56 },
  { id: 20, name: 'HAND L', latin: 'MANUS SIN.', dx: -0.212, y: 0.565 },
  { id: 21, name: 'HAND R', latin: 'MANUS DEX.', dx: 0.212, y: 0.565 },
  { id: 22, name: 'KNEE L', latin: 'GENU SIN.', dx: -0.065, y: 0.75 },
  { id: 23, name: 'KNEE R', latin: 'GENU DEX.', dx: 0.065, y: 0.75 },
  { id: 24, name: 'FEET / GROUND', latin: 'TERRA', dx: 0, y: 0.972 },
];

/** Archive category → node points it excites (first entries carry full weight). */
const CATEGORY_POINTS: Record<string, number[]> = {
  schumann: [24, 22, 23, 19],
  brainwave: [1, 2],
  mental: [1, 2, 6],
  nervous: [2, 6, 13, 18, 1],
  solfeggio: [1, 2, 6, 10, 13, 18, 19],
  blood: [10, 9, 20, 21],
  bone: [7, 8, 22, 23, 20, 21],
  cancer: [9, 15, 18],
  cardiovascular: [10, 9, 20, 21],
  dental: [5],
  detox: [14, 16, 17, 15],
  digestive: [13, 18, 14],
  ear: [3, 4],
  eye: [2],
  glands: [2, 6, 9, 16, 17],
  body: [10, 13, 18],
  immune: [9, 15, 6],
  kidney: [16, 17],
  pain: [7, 8, 22, 23, 13],
  reproductive: [19],
  respiratory: [11, 12, 6],
  skin: [7, 8, 20, 21, 22, 23],
};

/** Chakra note (432 lattice) → body node along the central column. */
const NOTE_POINT: Record<string, number> = {
  C: 19, 'C#': 18, D: 18, 'D#': 13, E: 13, F: 10, 'F#': 6, G: 6, 'G#': 2, A: 2, 'A#': 1, B: 1,
};

export type ExcitedPoint = { id: number; w: number };

/**
 * Physiological band → node regions for frequencies with no archive category.
 * Brainwave bands (δ θ α β γ) land on the cranial nodes; Schumann on the ground
 * line; the audible 432-lattice falls onto the chakra column (see NOTE_POINT);
 * the upper spectrum excites the auditory + cranial nodes.
 */
const BAND_POINTS: { lo: number; hi: number; ids: number[] }[] = [
  { lo: 0.1, hi: 4, ids: [1, 2] },                 // delta — crown / pineal
  { lo: 4, hi: 8, ids: [2, 1, 10] },               // theta — pineal, crown, heart
  { lo: 8, hi: 13, ids: [2, 1, 10, 13] },          // alpha
  { lo: 13, hi: 30, ids: [1, 2, 6] },              // beta — crown, pineal, throat
  { lo: 30, hi: 100, ids: [1, 2, 6, 13] },         // gamma / low
  { lo: 100, hi: 180, ids: [19, 18, 16, 17, 24] }, // pelvic / renal resonance
  { lo: 1000, hi: 4000, ids: [3, 4, 6] },          // speech band — ears, throat
  { lo: 4000, hi: 30000, ids: [3, 4, 1] },         // upper spectrum — ears, crown
];
const SCHUMANN = [7.83, 14.3, 20.8, 27.3, 33.8];

/** Archive codes containing a frequency within ±0.6% (or ±0.25 Hz) of `hz`, with closeness 0..1. */
function archiveMatches(hz: number): { code: ArchiveCode; close: number }[] {
  const tol = Math.max(0.25, hz * 0.006);
  const out: { code: ArchiveCode; close: number }[] = [];
  for (const code of ARCHIVE_CODES) {
    let best = Infinity;
    for (const f of code.frequencies) { const d = Math.abs(f - hz); if (d < best) best = d; }
    if (best <= tol) out.push({ code, close: 1 - best / tol });
  }
  return out.sort((a, b) => b.close - a.close).slice(0, 6);
}

/**
 * Nodes excited by a set of sounding frequencies. `weights` (0..1, per frequency)
 * scale intensity so louder / more energetic tones light their nodes harder.
 * With an archive `category`, the category's regions are excited first (legacy
 * archive path); otherwise each frequency is resolved three ways —
 * matching archive codes → their body regions, physiological band → region,
 * and 432-lattice note → chakra column node.
 */
export function pointsForFrequencies(frequencies: number[], category?: string, weights?: number[]): ExcitedPoint[] {
  const out = new Map<number, number>();
  const bump = (id: number, w: number) => out.set(id, Math.max(out.get(id) || 0, Math.min(1, w)));
  (category ? CATEGORY_POINTS[category] || [] : []).forEach((id, i) => bump(id, i < 2 ? 1 : 0.7));
  frequencies.forEach((f, idx) => {
    if (!f || f <= 0) return;
    const amp = weights?.[idx] ?? 1;
    if (category) { bump(NOTE_POINT[chakraForFreq(f).name] || 13, 0.8 * amp); return; }
    archiveMatches(f).forEach(({ code, close }) =>
      (CATEGORY_POINTS[code.category] || []).forEach((id, i) => bump(id, (i < 2 ? 0.95 : 0.6) * close * amp)));
    if (SCHUMANN.some(s => Math.abs(s - f) < 0.3)) [24, 22, 23, 2].forEach((id, i) => bump(id, (i < 1 ? 1 : 0.7) * amp));
    const band = BAND_POINTS.find(b => f >= b.lo && f < b.hi);
    band?.ids.forEach((id, i) => bump(id, (i < 2 ? 0.85 : 0.55) * amp));
    if (f >= 20) bump(NOTE_POINT[chakraForFreq(f).name] || 13, 0.8 * amp);
  });
  return [...out.entries()].map(([id, w]) => ({ id, w: Math.round(w * 100) / 100 }));
}

export const pointsForCode = (code: ArchiveCode) => pointsForFrequencies(code.frequencies, code.category);

const pointIndex = new Map<number, ArchiveCode[]>();
export function codesForPoint(id: number): ArchiveCode[] {
  if (!pointIndex.size) {
    ARCHIVE_CODES.forEach(code => pointsForCode(code).forEach(p => {
      const list = pointIndex.get(p.id) || [];
      list.push(code);
      pointIndex.set(p.id, list);
    }));
  }
  return pointIndex.get(id) || [];
}

/** Deterministic "numerical signature" + "stored hex" rows derived from the frequencies. */
export function signatureFor(frequencies: number[]) {
  let seed = Math.floor(frequencies.reduce((a, f) => a + f * 100, 7)) >>> 0;
  const next = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed; };
  const sig = Array.from({ length: 12 }, () => String(next() % 100).padStart(2, '0'));
  const hex = Array.from({ length: 20 }, () => (next() % 256).toString(16).toUpperCase().padStart(2, '0'));
  return { sig, hex };
}
