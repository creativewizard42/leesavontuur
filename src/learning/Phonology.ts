/**
 * Fonologisch bewustzijn: PH.RHYME, PH.SYLLABLE (ED §2.1).
 * DOM-vrij. TODO(Builder): implementeer generators.
 */
import type { ActivityItem, Difficulty, Rng } from '../types';

export interface PhonologyOptions {
  skillId: 'PH.RHYME' | 'PH.SYLLABLE';
  difficulty: Difficulty;
  count: number;
  rng: Rng;
}

export function generate(_options: PhonologyOptions): ActivityItem[] {
  throw new Error('TODO(Builder): Phonology.generate');
}
