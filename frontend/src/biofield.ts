import { ExcitedPoint, BODY_POINTS } from './bodyMapData';
import { chakraForFreq } from './OrbitGeometry';

/**
 * BIOFIELD + MOOD MODEL for the Diagnostic Body Map.
 *
 * Every node rests at a baseline value; while frequencies sound, their mapped
 * nodes warm towards the excitation (τ≈6 s) and cool back to rest after stop
 * (τ≈18 s). Mood axes integrate the same frequencies on a slower timescale so
 * the readout reflects what the selected frequencies are *doing* to the user,
 * not just what is playing. The 9 Egyptian light bodies (Djed Pillar — SAHU →
 * KHAT) accumulate exposure and quietly "activate" once a band has been held.
 */

export const MOOD_AXES = ['CALM', 'FOCUS', 'ENERGY', 'GROUND', 'OPEN'] as const;
export type MoodAxis = (typeof MOOD_AXES)[number];
export type MoodVector = Record<MoodAxis, number>; // −1..1, 0 = resting state

export type LightBody = {
  id: string; num: number; name: string; title: string; deity: string;
  /** vertical position along the Djed column, in body-height units (matches BODY_POINTS.y) */
  y: number;
  nodes: number[];
  /** does this frequency feed the body? */
  match: (hz: number) => boolean;
};

const near = (hz: number, target: number, tol = 0.6) => Math.abs(hz - target) <= Math.max(tol, target * 0.006);
const inBand = (hz: number, lo: number, hi: number) => hz >= lo && hz < hi;
/** Audible 432-lattice tones climb the Djed by note: C (root) → KHAT … B (crown) → SAHU. */
const NOTE_BODY: Record<string, string> = { C: 'khat', 'C#': 'ren', D: 'ka', 'D#': 'ab', E: 'ab', F: 'ba', 'F#': 'shew', G: 'sekhem', 'G#': 'akh', A: 'akh', 'A#': 'sahu', B: 'sahu' };
const noteBody = (hz: number) => (hz >= 260 ? NOTE_BODY[chakraForFreq(hz).name] : undefined);
const feeds = (id: string, hz: number, direct: boolean) => direct || noteBody(hz) === id;

export const LIGHT_BODIES: LightBody[] = [
  { id: 'sahu', num: 1, name: 'SAHU', title: 'SOUL SPIRIT', deity: 'ATEN', y: 0.0, nodes: [1],
    match: hz => feeds('sahu', hz, near(hz, 963) || near(hz, 1111) || hz >= 1500 || inBand(hz, 0.1, 1.5)) },
  { id: 'akh', num: 2, name: 'AKH', title: 'UNIVERSAL LIGHT BODY', deity: 'AMUN · PTAH', y: 0.062, nodes: [2, 1],
    match: hz => feeds('akh', hz, near(hz, 852) || near(hz, 936) || inBand(hz, 1.5, 4)) },
  { id: 'sekhem', num: 3, name: 'SEKHEM', title: 'LIFE FORCE BODY', deity: 'RA · MAAT', y: 0.11, nodes: [2, 3, 4, 5],
    match: hz => feeds('sekhem', hz, near(hz, 741) || inBand(hz, 30, 100)) },
  { id: 'shew', num: 4, name: 'SHEW', title: 'SHADOW · EMOTIONAL BODY', deity: 'NUT · GEB', y: 0.16, nodes: [6, 7, 8],
    match: hz => feeds('shew', hz, near(hz, 396) || near(hz, 417) || inBand(hz, 13, 30)) },
  { id: 'ba', num: 5, name: 'BA', title: 'SOUL', deity: 'OSIRIS', y: 0.245, nodes: [10, 11, 12],
    match: hz => feeds('ba', hz, near(hz, 432) || near(hz, 444) || inBand(hz, 8, 13)) },
  { id: 'ab', num: 6, name: 'AB', title: 'HEART · MIND', deity: 'ISIS · HATHOR', y: 0.30, nodes: [9, 10, 13],
    match: hz => feeds('ab', hz, near(hz, 639) || near(hz, 174) || near(hz, 10, 0.3) || near(hz, 528)) },
  { id: 'ka', num: 7, name: 'KA', title: 'ENERGY DOUBLE', deity: 'HORUS · ANUBIS', y: 0.40, nodes: [13, 18, 14, 15],
    match: hz => feeds('ka', hz, near(hz, 7.83, 0.3) || near(hz, 285) || inBand(hz, 4, 8)) },
  { id: 'ren', num: 8, name: 'REN', title: 'NAME VIBRATION · DNA CODING', deity: 'SET', y: 0.47, nodes: [19, 16, 17],
    match: hz => feeds('ren', hz, near(hz, 528) || near(hz, 111) || near(hz, 222) || near(hz, 333)) },
  { id: 'khat', num: 9, name: 'KHAT', title: 'PHYSICAL BODY', deity: 'DJED', y: 0.80, nodes: [24, 22, 23, 20, 21],
    match: hz => feeds('khat', hz, inBand(hz, 20, 260) || near(hz, 174)) },
];

/** Mood contribution of one frequency (unit weight). */
export function moodOf(hz: number): Partial<MoodVector> {
  if (hz <= 0) return {};
  if (hz < 4) return { CALM: 1, ENERGY: -0.6, FOCUS: -0.4 };
  if (near(hz, 7.83, 0.3)) return { GROUND: 1, CALM: 0.6 };
  if (hz < 8) return { CALM: 0.8, OPEN: 0.3, ENERGY: -0.3 };
  if (hz < 13) return { CALM: 0.7, OPEN: 0.5, FOCUS: 0.2 };
  if (hz < 30) return { FOCUS: 0.9, ENERGY: 0.3, CALM: -0.4 };
  if (hz < 100) return { FOCUS: 0.8, ENERGY: 0.7 };
  if (near(hz, 174)) return { GROUND: 0.8, CALM: 0.4 };
  if (near(hz, 285)) return { ENERGY: 0.5, GROUND: 0.4 };
  if (near(hz, 396) || near(hz, 417)) return { GROUND: 0.7, OPEN: 0.3, CALM: 0.2 };
  if (near(hz, 432)) return { CALM: 0.6, OPEN: 0.6 };
  if (near(hz, 528)) return { OPEN: 0.7, ENERGY: 0.5 };
  if (near(hz, 639)) return { OPEN: 0.9, CALM: 0.3 };
  if (near(hz, 741)) return { FOCUS: 0.7, ENERGY: 0.4 };
  if (near(hz, 852) || near(hz, 963)) return { FOCUS: 0.5, OPEN: 0.5, ENERGY: 0.3 };
  if (hz < 260) return { GROUND: 0.6, ENERGY: 0.3 };
  // audible lattice tone → chakra colour of its note (C root → B crown on the 432 lattice)
  const note = chakraForFreq(hz).name;
  if (note === 'C' || note === 'C#' || note === 'D') return { GROUND: 0.6, ENERGY: 0.4 };
  if (note === 'D#' || note === 'E') return { ENERGY: 0.6, FOCUS: 0.3 };
  if (note === 'F' || note === 'F#') return { OPEN: 0.7, CALM: 0.3 };
  if (note === 'G' || note === 'G#') return { FOCUS: 0.4, OPEN: 0.4 };
  if (note === 'A' || note === 'A#') return { FOCUS: 0.6, CALM: 0.3 };
  return { CALM: 0.4, OPEN: 0.3, FOCUS: 0.3 };
}

export type BodyState = { id: string; exposure: number; active: boolean; achieved: boolean; achievedAt: number };
export type NodeLevel = { id: number; rest: number; level: number };

export type FieldState = {
  mood: MoodVector;
  bodies: BodyState[];
  nodes: NodeLevel[];
  /** exposure to the current frequency set, seconds */
  session: number;
};

/** Resting-state baseline per node (body-height-weighted: cranial + cardiac nodes idle a touch warmer). */
export const NODE_REST: Record<number, number> = Object.fromEntries(
  BODY_POINTS.map(p => [p.id, [1, 2, 10].includes(p.id) ? 0.14 : [13, 18, 19].includes(p.id) ? 0.12 : 0.10]),
);

export const ACTIVATION_SECONDS = 12;
const TAU = { nodeRise: 6, nodeFall: 18, moodRise: 20, moodFall: 60, exposureFall: 3 };

export function initialFieldState(): FieldState {
  return {
    mood: { CALM: 0, FOCUS: 0, ENERGY: 0, GROUND: 0, OPEN: 0 },
    bodies: LIGHT_BODIES.map(b => ({ id: b.id, exposure: 0, active: false, achieved: false, achievedAt: 0 })),
    nodes: BODY_POINTS.map(p => ({ id: p.id, rest: NODE_REST[p.id], level: NODE_REST[p.id] })),
    session: 0,
  };
}

const step = (cur: number, target: number, dt: number, tau: number) => cur + (target - cur) * (1 - Math.exp(-dt / tau));

/** Advance the field by dt seconds given the frequencies sounding now + the nodes they excite. */
export function stepField(prev: FieldState, freqs: number[], points: ExcitedPoint[], dt: number, now = Date.now()): FieldState {
  const playing = freqs.length > 0;
  // nodes — warm toward excitation, cool to rest
  const nodes = prev.nodes.map(n => {
    const ex = points.find(p => p.id === n.id)?.w || 0;
    const target = n.rest + ex * (1 - n.rest);
    return { ...n, level: step(n.level, target, dt, target > n.level ? TAU.nodeRise : TAU.nodeFall) };
  });
  // mood — average contribution of the active set, slow integrate / slow release
  const sum: MoodVector = { CALM: 0, FOCUS: 0, ENERGY: 0, GROUND: 0, OPEN: 0 };
  freqs.forEach(f => { const m = moodOf(f); (Object.keys(m) as MoodAxis[]).forEach(k => { sum[k] += m[k] || 0; }); });
  const n = Math.max(1, freqs.length);
  const mood = { ...prev.mood };
  MOOD_AXES.forEach(k => {
    const target = Math.max(-1, Math.min(1, sum[k] / Math.sqrt(n)));
    mood[k] = step(prev.mood[k], target, dt, Math.abs(target) > Math.abs(prev.mood[k]) ? TAU.moodRise : TAU.moodFall);
  });
  // light bodies — exposure accumulates while fed, achievement after ACTIVATION_SECONDS
  const bodies = prev.bodies.map(b => {
    const def = LIGHT_BODIES.find(l => l.id === b.id)!;
    const active = freqs.some(def.match);
    const exposure = active ? b.exposure + dt : Math.max(0, b.exposure - dt / TAU.exposureFall);
    const achieved = b.achieved || exposure >= ACTIVATION_SECONDS;
    return { ...b, active, exposure, achieved, achievedAt: achieved && !b.achieved ? now : b.achievedAt };
  });
  return { mood, bodies, nodes, session: playing ? prev.session + dt : 0 };
}

/** Human phrase for the dominant mood shift, e.g. "SETTLING → CALM +34%". */
export function moodLabel(mood: MoodVector): { axis: MoodAxis | null; pct: number; phrase: string } {
  let axis: MoodAxis | null = null; let best = 0;
  MOOD_AXES.forEach(k => { if (Math.abs(mood[k]) > Math.abs(best)) { best = mood[k]; axis = k; } });
  const pct = Math.round(best * 100);
  if (!axis || Math.abs(pct) < 4) return { axis: null, pct: 0, phrase: 'RESTING STATE' };
  const verb: Record<MoodAxis, [string, string]> = {
    CALM: ['SETTLING', 'STIRRING'], FOCUS: ['SHARPENING', 'SOFTENING'], ENERGY: ['CHARGING', 'RELEASING'], GROUND: ['GROUNDING', 'LIFTING'], OPEN: ['OPENING', 'GUARDING'],
  };
  return { axis, pct, phrase: `${verb[axis][pct >= 0 ? 0 : 1]} → ${axis} ${pct >= 0 ? '+' : ''}${pct}%` };
}
