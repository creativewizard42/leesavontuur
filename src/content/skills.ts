/**
 * Patroon → leerdoel-mapping (EDU-011, ED §2.5/§6.1).
 *
 * Leidt het decodeer-/analyse-/synthesedoel af uit de **grafemen** van een
 * woord (niet uit de opgeslagen `pattern`-string), zodat cluster- en
 * langeklinkerwoorden niet langer als DE.CVC/AN.CVC worden gescoord:
 *  - lange klinker/tweeteken → CVVC-categorie;
 *  - medeklinkerclusters (≥ 2 voor of na de klinker) → cluster-categorie;
 *  - meer dan één klinkernucleus → MULTI.
 *
 * Deze functies zijn puur (geen state) en DOM-vrij.
 */
import type { Grapheme } from '../types';
import { GRAPHEMES, isVowelType } from './graphemes';
import { segmentWord } from './validator';

export type DecodeSkill =
  | 'DE.VC'
  | 'DE.CVC'
  | 'DE.CVVC'
  | 'DE.CCVC'
  | 'DE.CVCC'
  | 'DE.CCVCC'
  | 'DE.MULTI';

export type SegmentSkill = 'AN.VC' | 'AN.CVC' | 'AN.CLUSTER';
export type BlendSkill = 'SY.VC' | 'SY.CVC' | 'SY.CLUSTER';

const GRAPHEME_BY_ID: ReadonlyMap<string, Grapheme> = new Map(
  GRAPHEMES.map((g) => [g.id, g]),
);

interface WordShape {
  length: number;
  vowels: number;
  consonantsBefore: number;
  consonantsAfter: number;
  hasLongVowel: boolean;
}

function shapeOf(word: string): WordShape | null {
  const segment = segmentWord(word, GRAPHEMES);
  if (!segment) return null;
  const vowelFlags = segment.map((id) => {
    const g = GRAPHEME_BY_ID.get(id);
    return g !== undefined && isVowelType(g.type);
  });
  const vowels = vowelFlags.filter(Boolean).length;
  const firstVowel = vowelFlags.indexOf(true);
  const consonantsBefore = firstVowel < 0 ? segment.length : firstVowel;
  const consonantsAfter = firstVowel < 0 ? 0 : segment.length - 1 - firstVowel;
  const hasLongVowel = segment.some((id) => {
    const g = GRAPHEME_BY_ID.get(id);
    return g !== undefined && isVowelType(g.type) && g.type !== 'vowel-short';
  });
  return { length: segment.length, vowels, consonantsBefore, consonantsAfter, hasLongVowel };
}

/** Decodeerdoel (DE.*) voor een geschreven woord. */
export function decodeSkillForWord(word: string): DecodeSkill {
  const shape = shapeOf(word);
  if (!shape) return 'DE.MULTI';
  if (shape.vowels >= 2) return 'DE.MULTI';

  if (shape.consonantsBefore === 0) {
    // Begint met een klinker (VC/VVC/VCC/V).
    if (shape.consonantsAfter === 0) return 'DE.VC';
    if (shape.hasLongVowel) return shape.consonantsAfter >= 2 ? 'DE.CVCC' : 'DE.CVVC';
    return shape.consonantsAfter >= 2 ? 'DE.CVCC' : 'DE.VC';
  }

  const onsetCluster = shape.consonantsBefore >= 2;
  const codaCluster = shape.consonantsAfter >= 2;
  if (onsetCluster && codaCluster) return 'DE.CCVCC';
  if (onsetCluster) return 'DE.CCVC';
  if (codaCluster) return 'DE.CVCC';
  if (shape.hasLongVowel) return 'DE.CVVC';
  return 'DE.CVC';
}

function clusterCategory(word: string): 'VC' | 'CVC' | 'CLUSTER' {
  const shape = shapeOf(word);
  if (!shape) return 'CLUSTER';
  if (shape.vowels >= 2) return 'CLUSTER';
  if (shape.consonantsBefore >= 2 || shape.consonantsAfter >= 2) return 'CLUSTER';
  if (shape.length === 2 && shape.consonantsBefore === 0) return 'VC';
  return 'CVC';
}

/** Analyseerdoel (AN.*) voor auditief hakken. */
export function segmentSkillForWord(word: string): SegmentSkill {
  return `AN.${clusterCategory(word)}` as SegmentSkill;
}

/** Synthesedoel (SY.*) voor auditief plakken. */
export function blendSkillForWord(word: string): BlendSkill {
  return `SY.${clusterCategory(word)}` as BlendSkill;
}
