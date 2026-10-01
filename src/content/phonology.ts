/**
 * Fonologisch bewustzijn: rijm- en lettergreepdata (ED §2.1, EDU-002/EDU-013/EDU-020).
 *
 * Deze bank staat bewust in `content/` (niet in `learning/Phonology.ts`) zodat
 * de validator haar kan controleren op:
 *  - blokkeerwoorden (ED §6.4);
 *  - echte, gecureerde woorden (geen `appelap`/`lis`/`kaam`/`aam`);
 *  - correcte rijm (alle woorden in een groep delen hetzelfde rijmdeel).
 *
 * Alle woorden hier zijn klein, zonder accenten. Het is puur **auditief**
 * materiaal (ED §6.2 regel 8): het hoeft niet uit vrijgegeven grafemen te
 * bestaan.
 */

export interface SyllableWord {
  word: string;
  syllables: number;
}

/**
 * Rijmgroepen: elk woord in een groep deelt het rijmdeel (klinker + rest).
 * Exact rijmend in het Standaardnederlands, kindbekend en zonder
 * blokkeerwoorden (maan/kan is bewust geschrapt: /aː/ ≠ /ɑ/).
 */
export const RHYME_GROUPS: readonly (readonly string[])[] = [
  ['kat', 'mat', 'rat'],
  ['vis', 'mis'],
  ['tas', 'kas'],
  ['maan', 'aan'],
  ['raam', 'kraam'],
  ['soep', 'groep'],
  ['been', 'teen', 'steen'],
  ['kool', 'school'],
  ['huis', 'muis'],
  ['bok', 'rok'],
  ['pen', 'hen'],
  ['bal', 'stal'],
  ['neus', 'reus'],
  ['geit', 'pleit'],
  ['zout', 'hout'],
  ['saus', 'paus'],
  ['ring', 'kring'],
  ['bank', 'plank'],
  ['boot', 'sloot'],
];

/** Lettergreepbank: echte, kindbekende woorden met het juiste aantal klappen. */
export const SYLLABLE_WORDS: readonly SyllableWord[] = [
  // 1 lettergreep
  { word: 'maan', syllables: 1 },
  { word: 'raam', syllables: 1 },
  { word: 'kat', syllables: 1 },
  { word: 'vis', syllables: 1 },
  { word: 'soep', syllables: 1 },
  { word: 'huis', syllables: 1 },
  { word: 'boot', syllables: 1 },
  { word: 'boom', syllables: 1 },
  { word: 'been', syllables: 1 },
  // 2 lettergrepen
  { word: 'konijn', syllables: 2 },
  { word: 'tafel', syllables: 2 },
  { word: 'muren', syllables: 2 },
  { word: 'bloemen', syllables: 2 },
  { word: 'katten', syllables: 2 },
  { word: 'vissen', syllables: 2 },
  { word: 'bomen', syllables: 2 },
  // 3 lettergrepen
  { word: 'olifant', syllables: 3 },
  { word: 'paraplu', syllables: 3 },
  { word: 'telefoon', syllables: 3 },
  { word: 'krokodil', syllables: 3 },
  { word: 'kabouter', syllables: 3 },
];

/**
 * Gecureerde, bestaande Nederlandse woorden die de phonologie-bank mag
 * gebruiken. De validator weigert elk woord dat hier niet in staat, zodat
 * niet-bestaande vormen (`appelap`, `aam`, `lis`, `kaam`) niet terugkomen.
 */
export const PHONOLOGY_KNOWN_WORDS: ReadonlySet<string> = new Set([
  // rijmwoorden
  'kat', 'mat', 'rat', 'vis', 'mis', 'tas', 'kas', 'maan', 'aan', 'raam',
  'kraam', 'soep', 'groep', 'been', 'teen', 'steen', 'kool', 'school', 'huis',
  'muis', 'bok', 'rok', 'pen', 'hen', 'bal', 'stal', 'neus', 'reus', 'geit',
  'pleit', 'zout', 'hout', 'saus', 'paus', 'ring', 'kring', 'bank', 'plank',
  'boot', 'sloot',
  // lettergreepwoorden
  'boom', 'konijn', 'tafel', 'muren', 'bloemen', 'katten', 'vissen', 'bomen',
  'olifant', 'paraplu', 'telefoon', 'krokodil', 'kabouter',
]);

const RHYME_TAIL_PATTERN = /.*?(aa|ee|oo|uu|ie|oe|ei|ij|ou|au|ui|eu|a|e|i|o|u)([bcdfghjklmnpqrstvwxyz]*)$/;

/**
 * Bepaalt het rijmdeel (klinker + alles erna) van een woord op spelling.
 * Bv. `kraam` -> "aam", `school` -> "ool", `kring` -> "ing".
 */
export function rhymeTail(word: string): string {
  const lower = word.toLowerCase();
  const match = lower.match(RHYME_TAIL_PATTERN);
  if (!match) return lower;
  return `${match[1] ?? ''}${match[2] ?? ''}`;
}

/** Alle woorden uit de phonologie-bank (rijm + lettergrepen). */
export function allPhonologyWords(): string[] {
  const out = new Set<string>();
  for (const group of RHYME_GROUPS) for (const word of group) out.add(word);
  for (const entry of SYLLABLE_WORDS) out.add(entry.word);
  return [...out];
}
