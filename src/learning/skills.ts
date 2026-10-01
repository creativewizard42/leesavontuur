/**
 * Lokale doel-afleiding per woord (EDU-011).
 *
 * Deze module is een tijdelijke, DOM-vrije wrapper. Zodra de content-builder
 * `decodeSkillForWord(word)`, `segmentSkillForWord(word)` en
 * `blendSkillForWord(word)` in `src/content/index.ts` levert, kan de integrator
 * `skillsForWord` hiernaar laten delegeren zonder de aanroepers te wijzigen.
 */
import type { SkillId, Word } from '../types';
import { getGrapheme, getWord } from '../content';

export interface WordSkills {
  /** Decodeerdoel (DE.*) volgens het patroon van het woord. */
  decode: SkillId;
  /** Analyse-/hakdoel (AN.*). */
  segment: SkillId;
  /** Synthese-/plakdoel (SY.*). */
  blend: SkillId;
}

function isVowelGrapheme(id: string): boolean {
  const g = getGrapheme(id);
  if (!g) return false;
  return g.type.startsWith('vowel') || g.type === 'diphthong';
}

/** Tweeteken-/lange klinker (aa, oo, ee, ie, oe, uu, ij, ei, ou, au, eu, ui). */
function isLongVowelOrDigraph(id: string): boolean {
  const g = getGrapheme(id);
  if (!g) return false;
  const vowel = g.type.startsWith('vowel') || g.type === 'diphthong';
  return vowel && id.length >= 2;
}

function countLeadingConsonants(graphemes: readonly string[]): number {
  let n = 0;
  for (const id of graphemes) {
    if (isVowelGrapheme(id)) break;
    n += 1;
  }
  return n;
}

function countTrailingConsonants(graphemes: readonly string[]): number {
  let n = 0;
  for (let i = graphemes.length - 1; i >= 0; i--) {
    const id = graphemes[i];
    if (!id || isVowelGrapheme(id)) break;
    n += 1;
  }
  return n;
}

function isVc(graphemes: readonly string[]): boolean {
  return graphemes.length === 2 && isVowelGrapheme(graphemes[0] ?? '') && !isVowelGrapheme(graphemes[1] ?? '');
}

function isCvc(graphemes: readonly string[]): boolean {
  return (
    graphemes.length === 3 &&
    !isVowelGrapheme(graphemes[0] ?? '') &&
    isVowelGrapheme(graphemes[1] ?? '') &&
    !isVowelGrapheme(graphemes[2] ?? '')
  );
}

export function decodeSkillForGraphemes(graphemes: readonly string[]): SkillId {
  if (graphemes.length === 0) return 'DE.CVC';
  if (isVc(graphemes)) return 'DE.VC';
  if (graphemes.some(isLongVowelOrDigraph)) return 'DE.CVVC';
  const leading = countLeadingConsonants(graphemes);
  const trailing = countTrailingConsonants(graphemes);
  if (leading >= 2 && trailing >= 2) return 'DE.CCVCC';
  if (leading >= 2) return 'DE.CCVC';
  if (trailing >= 2) return 'DE.CVCC';
  return 'DE.CVC';
}

export function segmentSkillForGraphemes(graphemes: readonly string[]): SkillId {
  if (isVc(graphemes)) return 'AN.VC';
  if (isCvc(graphemes)) return 'AN.CVC';
  return 'AN.CLUSTER';
}

export function blendSkillForGraphemes(graphemes: readonly string[]): SkillId {
  if (isVc(graphemes)) return 'SY.VC';
  if (isCvc(graphemes)) return 'SY.CVC';
  return 'SY.CLUSTER';
}

/** Alle doelen (decode/hak/plak) voor één woord. */
export function skillsForWord(word: string | Word): WordSkills {
  const w = typeof word === 'string' ? getWord(word) : word;
  const graphemes = w?.graphemes ?? [];
  return {
    decode: decodeSkillForGraphemes(graphemes),
    segment: segmentSkillForGraphemes(graphemes),
    blend: blendSkillForGraphemes(graphemes),
  };
}
