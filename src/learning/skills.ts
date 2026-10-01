/**
 * Doel-afleiding per woord (EDU-011).
 *
 * Dunne, DOM-vrije wrapper: de classificatie gebeurt in `content/skills.ts`
 * (`decodeSkillForWord` / `segmentSkillForWord` / `blendSkillForWord`), zodat er
 * één bron van waarheid is voor patroon → leerdoel. Aanroepers in core/learning
 * blijven `skillsForWord` gebruiken.
 */
import type { SkillId, Word } from '../types';
import {
  blendSkillForWord,
  decodeSkillForWord,
  segmentSkillForWord,
} from '../content';

export interface WordSkills {
  /** Decodeerdoel (DE.*) volgens het patroon van het woord. */
  decode: SkillId;
  /** Analyse-/hakdoel (AN.*). */
  segment: SkillId;
  /** Synthese-/plakdoel (SY.*). */
  blend: SkillId;
}

/** Decodeerdoel (DE.*) voor een reeks grafeem-IDs. */
export function decodeSkillForGraphemes(graphemes: readonly string[]): SkillId {
  if (graphemes.length === 0) return 'DE.CVC';
  return decodeSkillForWord(graphemes.join(''));
}

/** Analyse-/hakdoel (AN.*) voor een reeks grafeem-IDs. */
export function segmentSkillForGraphemes(graphemes: readonly string[]): SkillId {
  if (graphemes.length === 0) return 'AN.CLUSTER';
  return segmentSkillForWord(graphemes.join(''));
}

/** Synthese-/plakdoel (SY.*) voor een reeks grafeem-IDs. */
export function blendSkillForGraphemes(graphemes: readonly string[]): SkillId {
  if (graphemes.length === 0) return 'SY.CLUSTER';
  return blendSkillForWord(graphemes.join(''));
}

/** Alle doelen (decode/hak/plak) voor één woord. */
export function skillsForWord(word: string | Word): WordSkills {
  const text = typeof word === 'string' ? word : word.word;
  return {
    decode: decodeSkillForWord(text),
    segment: segmentSkillForWord(text),
    blend: blendSkillForWord(text),
  };
}