/**
 * Auditieve analyse / hakken: AN.VC, AN.CVC, AN.CLUSTER (ED §2.4).
 * DOM-vrij. TODO(Builder): implementeer generators.
 */
import type { ActivityItem, Rng, SkillId } from '../types';
import { graphemes, segmentWord } from '../content';

export interface SegmentingOptions {
  skillId: SkillId;
  word: string;
  rng: Rng;
}

/** Hakt een woord in grafeem-IDs (delegeert naar de content-segmentatie). */
export function segment(word: string): string[] {
  return segmentWord(word, graphemes) ?? Array.from(word);
}

export function generate(_options: SegmentingOptions): ActivityItem {
  throw new Error('TODO(Builder): Segmenting.generate');
}
