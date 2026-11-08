// Reference data for the Full Spectrum Atlas (Scale of Existence + Roby Chart).
// Symbolic / educational mapping only — not medical or physical claims.
import { FREQUENCY_ARCHIVE } from '../FrequencyArchiveData';
import { LOG_MIN, LOG_MAX, clampFrequency, audioFrequency } from './spectrum';

export type ScaleLevel = { name: string; detail: string; size: string };
export const SCALE_LEVELS: ScaleLevel[] = [
  { name: 'MULTIVERSE', detail: 'Many universes (theoretical)', size: '> 10²⁷ m' },
  { name: 'UNIVERSE', detail: 'All matter, space and time', size: '~8.8 × 10²⁶ m' },
  { name: 'SUPERCLUSTER COMPLEX', detail: 'Web of galactic superclusters', size: '~10²⁵ m' },
  { name: 'GALACTIC SUPERCLUSTER', detail: 'Groups of galaxy clusters', size: '~5 × 10²⁴ m' },
  { name: 'GALACTIC CLUSTER', detail: 'Hundreds to thousands of galaxies', size: '~10²³ m' },
  { name: 'GALAXY', detail: 'Billions of stars', size: '~10²¹ m' },
  { name: 'STAR SYSTEM', detail: 'A star and its planets', size: '~10¹³ m' },
  { name: 'PLANET', detail: 'A celestial body orbiting a star', size: '~10⁷ m' },
  { name: 'CONTINENT', detail: 'Large landmass', size: '~10⁶·⁵ m' },
  { name: 'COUNTRY', detail: 'A nation within a continent', size: '~10⁶ m' },
  { name: 'STATE / PROVINCE', detail: 'Administrative region', size: '~10⁵ m' },
  { name: 'CITY, TOWN OR VILLAGE', detail: 'Human settlement', size: '~10⁴ m' },
  { name: 'LOCAL COMMUNITY', detail: 'People living in an area', size: '~10³ m' },
  { name: 'FAMILY', detail: 'Group of related people', size: '~10¹ m' },
  { name: 'PERSON', detail: 'An individual human', size: '~1.7 m' },
  { name: 'ORGAN SYSTEM', detail: 'Group of organs working together', size: '~1 m' },
  { name: 'ORGAN', detail: 'A functional body part', size: '~10⁻¹ m' },
  { name: 'TISSUE', detail: 'Group of similar cells', size: '~10⁻³ m' },
  { name: 'CELL', detail: 'Basic unit of life', size: '~10⁻⁵ m' },
  { name: 'ORGANELLE', detail: 'Functional structure inside a cell', size: '~10⁻⁶ m' },
  { name: 'MOLECULE', detail: 'Two or more atoms bonded', size: '~10⁻⁹ m' },
  { name: 'ATOM', detail: 'Basic unit of an element', size: '~10⁻¹⁰ m' },
  { name: 'HADRONS & ELECTRONS', detail: 'Protons, neutrons and electrons', size: '~10⁻¹⁵ m' },
  { name: 'QUARKS & GLUONS', detail: 'Fundamental particles (theoretical)', size: '< 10⁻¹⁸ m' },
  { name: 'STRINGS (?)', detail: 'Tiny vibrating strings (theoretical)', size: '~10⁻³⁵ m' },
];

// Each level owns an equal logarithmic slice of the sweep: vast → low Hz, tiny → high Hz.
const SPAN = (LOG_MAX - LOG_MIN) / SCALE_LEVELS.length;
export const scalePosition = (hz: number) => (Math.log10(clampFrequency(hz)) - LOG_MIN) / SPAN;
export const frequencyAtScale = (pos: number) =>
  clampFrequency(Number((10 ** (LOG_MIN + Math.max(0, Math.min(SCALE_LEVELS.length, pos)) * SPAN)).toPrecision(10)));
export const levelIndex = (hz: number) => Math.min(SCALE_LEVELS.length - 1, Math.max(0, Math.floor(scalePosition(hz))));
export const levelCenter = (index: number) => frequencyAtScale(index + 0.5);
/** 100% = centred in the level's band, 0% = on its edge. */
export const levelLock = (hz: number) => {
  const p = scalePosition(hz) - levelIndex(hz);
  return Math.round(Math.max(0, 1 - Math.abs(p - 0.5) * 2) * 100);
};

export type Chakra = { n: number; name: string; power: string; color: string; note: string; notes432: number };
export const CHAKRAS: Chakra[] = [
  { n: 1, name: 'FIRST', power: 'Tribal power, safety, security', color: '#c0302b', note: 'C4', notes432: 256.87 },
  { n: 2, name: 'SECOND', power: 'Relationships, sexuality, creativity', color: '#e8762c', note: 'D4', notes432: 288.33 },
  { n: 3, name: 'THIRD', power: 'Personal power, self-esteem, trust', color: '#f2e33a', note: 'E4', notes432: 323.63 },
  { n: 4, name: 'FOURTH', power: 'Power of love, emotion', color: '#2f8a4c', note: 'F4', notes432: 342.88 },
  { n: 5, name: 'FIFTH', power: 'Power of will, decision-making', color: '#4aa8e0', note: 'G4', notes432: 384.87 },
  { n: 6, name: 'SIXTH', power: 'Power of the mind, adequacy, truth', color: '#3a3f9e', note: 'A4', notes432: 432 },
  { n: 7, name: 'SEVENTH', power: 'Spiritual connection, oneness', color: '#9b6bd0', note: 'B4', notes432: 484.9 },
];

const SOLFEGGIO_ORDER = [396, 417, 528, 639, 741, 852, 963];
export type ToneSetId = 'notes432' | 'solfeggio';
export const TONE_SETS: { id: ToneSetId; label: string }[] = [
  { id: 'notes432', label: '432 NOTES' }, { id: 'solfeggio', label: 'SOLFEGGIO · LIBRARY' },
];
export const chakraTone = (c: Chakra, set: ToneSetId) => set === 'notes432' ? c.notes432 : SOLFEGGIO_ORDER[c.n - 1];
export const chakraToneLabel = (c: Chakra, set: ToneSetId) => {
  if (set === 'notes432') return `${c.note} · ${c.notes432} Hz`;
  const entry = FREQUENCY_ARCHIVE.find(e => e.category === 'solfeggio' && e.frequencies[0] === SOLFEGGIO_ORDER[c.n - 1]);
  return entry ? entry.name : `${SOLFEGGIO_ORDER[c.n - 1]} Hz`;
};

/** Chakra whose tone the audible frequency matches within ±50 cents (octave-equivalent). */
export function resonantChakra(hz: number, set: ToneSetId): { chakra: Chakra; cents: number } | null {
  const audible = audioFrequency(hz);
  let best: { chakra: Chakra; cents: number } | null = null;
  for (const chakra of CHAKRAS) {
    const raw = 1200 * Math.log2(audible / chakraTone(chakra, set));
    const cents = ((raw % 1200) + 1800) % 1200 - 600; // fold to nearest octave
    if (Math.abs(cents) <= 50 && (!best || Math.abs(cents) < Math.abs(best.cents))) best = { chakra, cents: Math.round(cents) };
  }
  return best;
}

export type BodyPart = { part: string; side: 'R' | 'L' | 'W'; belief: string; chakra: number; also?: string; library?: string };
export const SIDE_LABEL = { R: 'RIGHT · MASCULINE · DOING / BELIEF', L: 'LEFT · FEMININE · RECEIVING / TRUST', W: 'WHOLE-BODY SYSTEM' };
export const BODY_PARTS: BodyPart[] = [
  { part: 'Head', side: 'R', chakra: 7, also: 'also in sixth chakra', library: 'mental', belief: 'Resisting the flow of life, sexual fears, over-thinking, refusing responsibility for self' },
  { part: 'Brain', side: 'L', chakra: 7, also: 'also in sixth chakra', library: 'nervous', belief: 'Overthinking, stubbornness' },
  { part: 'Eyes', side: 'R', chakra: 6, library: 'eye', belief: 'Capacity to see clearly' },
  { part: 'Pituitary Gland', side: 'R', chakra: 6, library: 'glands', belief: 'Control' },
  { part: 'Nose', side: 'R', chakra: 6, library: 'respiratory', belief: 'Self-recognition, self-worth' },
  { part: 'Pineal Gland', side: 'L', chakra: 6, library: 'glands', belief: 'Sense of purpose and meaning of life · spiritual connection with God' },
  { part: 'Ears', side: 'L', chakra: 6, library: 'ear', belief: 'Capacity to hear' },
  { part: 'Teeth', side: 'R', chakra: 5, library: 'dental', belief: 'Decisiveness' },
  { part: 'Mouth', side: 'R', chakra: 5, library: 'dental', belief: 'Taking in new ideas, nourishment' },
  { part: 'Throat', side: 'R', chakra: 5, library: 'respiratory', belief: 'Repressed words, opinions, emotions' },
  { part: 'Neck', side: 'L', chakra: 5, library: 'pain', belief: 'Flexibility' },
  { part: 'Thyroid', side: 'L', chakra: 5, library: 'glands', belief: 'Humiliation · "When will it be my turn?"' },
  { part: 'Breasts', side: 'R', chakra: 4, library: 'reproductive', belief: 'Ability to self-nourish, over-protective attitude' },
  { part: 'Heart', side: 'R', chakra: 4, library: 'cardiovascular', belief: 'Ability to receive or give loving intimacy' },
  { part: 'Diaphragm', side: 'R', chakra: 4, library: 'respiratory', belief: 'Feeling unprotected' },
  { part: 'Shoulders', side: 'L', chakra: 4, library: 'pain', belief: 'Life is a burden' },
  { part: 'Thymus', side: 'L', chakra: 4, library: 'immune', belief: 'Feeling attacked by life' },
  { part: 'Lungs', side: 'L', chakra: 4, library: 'respiratory', belief: 'Ability to take in life' },
  { part: 'Arms', side: 'L', chakra: 4, library: 'pain', belief: 'Holding life’s experiences' },
  { part: 'Liver', side: 'R', chakra: 3, library: 'detox', belief: 'Victimization, powerlessness' },
  { part: 'Kidneys', side: 'R', chakra: 3, library: 'kidney', belief: 'Holding old emotions, shame' },
  { part: 'Gallbladder', side: 'R', chakra: 3, library: 'digestive', belief: 'Rage' },
  { part: 'Spleen', side: 'L', chakra: 3, library: 'immune', belief: 'Obsession' },
  { part: 'Pancreas', side: 'L', chakra: 3, library: 'digestive', belief: 'Ability to process sweetness or joy in life' },
  { part: 'Stomach', side: 'L', chakra: 3, library: 'digestive', belief: 'Digesting ideas to begin assimilating' },
  { part: 'Small Intestines', side: 'R', chakra: 2, library: 'digestive', belief: 'Assimilating, absorbing and integrating what is needed' },
  { part: 'Appendix', side: 'R', chakra: 2, library: 'digestive', belief: 'Fear of life' },
  { part: 'Genitals', side: 'R', chakra: 2, library: 'reproductive', belief: 'Creativity, fear of own worth · ovaries = femininity, testicles = masculinity' },
  { part: 'Bladder', side: 'R', chakra: 2, library: 'kidney', belief: 'Fear of letting go' },
  { part: 'Large Intestines', side: 'L', chakra: 2, also: 'upper portion in third chakra', library: 'digestive', belief: 'Holding on to the past, ability to move out what is no longer needed' },
  { part: 'Hips', side: 'L', chakra: 2, library: 'bone', belief: 'Fear of moving forward' },
  { part: 'Rectum', side: 'L', chakra: 2, library: 'digestive', belief: 'Ability to let go of the past, fighting against what everything in us is working for' },
  { part: 'Knees', side: 'R', chakra: 1, library: 'bone', belief: 'Pride and ego, changing self-image' },
  { part: 'Shins', side: 'R', chakra: 1, library: 'bone', belief: 'Standards in life, breaking down ideals' },
  { part: 'Ankles', side: 'R', chakra: 1, library: 'bone', belief: 'Inflexibility in dealing with life / an issue' },
  { part: 'Feet', side: 'R', chakra: 1, library: 'bone', belief: 'Understanding of self, life, others' },
  { part: 'Hands', side: 'L', chakra: 1, library: 'pain', belief: 'Handling life’s experiences' },
  { part: 'Fingers', side: 'L', chakra: 1, library: 'pain', belief: 'Details of life' },
  { part: 'Muscular System', side: 'W', chakra: 1, library: 'pain', belief: 'Resistance to new experiences' },
  { part: 'Skeletal System', side: 'W', chakra: 1, library: 'bone', belief: 'Structure / support of life' },
  { part: 'Skin', side: 'W', chakra: 1, library: 'skin', belief: 'How we present ourselves' },
];

export const libraryCodes = (category?: string) =>
  category ? FREQUENCY_ARCHIVE.filter(e => e.category === category).slice(0, 6) : [];
