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

export function pointsForFrequencies(frequencies: number[], category?: string): ExcitedPoint[] {
  const out = new Map<number, number>();
  const bump = (id: number, w: number) => out.set(id, Math.max(out.get(id) || 0, w));
  (category ? CATEGORY_POINTS[category] || [] : []).forEach((id, i) => bump(id, i < 2 ? 1 : 0.7));
  frequencies.forEach(f => bump(NOTE_POINT[chakraForFreq(f).name] || 13, 0.8));
  return [...out.entries()].map(([id, w]) => ({ id, w }));
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
