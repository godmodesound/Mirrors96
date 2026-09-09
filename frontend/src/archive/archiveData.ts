import { ARCHIVE_CATEGORIES, FREQUENCY_ARCHIVE, FrequencyEntry } from '../FrequencyArchiveData';

export type ArchiveCode = FrequencyEntry & { id: string; index: number };
export type ArchiveView = 'codex' | 'alpha' | 'lab';
export const codeSlug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
export const ARCHIVE_CODES: ArchiveCode[] = FREQUENCY_ARCHIVE.map((entry, index) => ({ ...entry, id: `${entry.category}-${codeSlug(entry.name)}`, index: index + 1 }));
export const SORTED_CODES = [...ARCHIVE_CODES].sort((a, b) => a.name.localeCompare(b.name));
export const letterFor = (name: string) => /^[a-z]/i.test(name) ? name[0].toUpperCase() : '#';
export const LETTERS = [...new Set(SORTED_CODES.map(e => letterFor(e.name)))].sort();
export const COLLECTIONS = ARCHIVE_CATEGORIES.filter(c => c.id !== 'all').map(category => ({
  ...category,
  name: category.id === 'brainwave' ? 'BRAINWAVES' : category.name,
  codes: ARCHIVE_CODES.filter(e => e.category === category.id),
})).filter(c => c.codes.length > 0);
export const categoryName = (id: string) => COLLECTIONS.find(c => c.id === id)?.name || id.toUpperCase();
export const matchesCode = (entry: ArchiveCode, query: string) => {
  const terms = query.trim().toLowerCase().replace(/\s*hz\b/g, '').split(/\s+/).filter(Boolean);
  const haystack = `${entry.name} ${entry.category} ${categoryName(entry.category)} ${entry.frequencies.join(' ')}`.toLowerCase();
  return terms.every(term => haystack.includes(term));
};

const preset = (name: string, frequencies: number[], category: string): ArchiveCode => ({ name, frequencies, category, id: `preset-${codeSlug(name)}`, index: 0 });
export const QUICK_STACKS = [
  { title: 'SOLFEGGIO', subtitle: 'Single-frequency references', codes: [174, 285, 396, 417, 432, 528, 639, 741, 852, 963].map(f => preset(`${f} Hz`, [f], 'solfeggio')) },
  { title: 'SCHUMANN', subtitle: 'Earth resonance references', codes: [7.83, 14.3, 20.8, 27.3, 33.8].map(f => preset(`${f} Hz · Schumann`, [f], 'schumann')) },
  { title: 'MOOD STACKS', subtitle: 'Layered frequency combinations', codes: [
    preset('CALM', [432, 528, 7.83], 'mental'), preset('SAVAGE', [396, 417, 741, 40, 20], 'mental'),
    preset('RAMPED UP', [417, 639, 963, 40], 'mental'), preset('BLISS', [528, 639, 963, 432, 285], 'mental'),
    preset('EUPHORIA', [528, 639, 963, 432, 285, 174], 'mental'), preset('HAPPY', [528, 639, 963, 432], 'mental'),
  ] },
];