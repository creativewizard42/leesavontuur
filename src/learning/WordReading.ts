/**
 * Decoderen: DE.VC, DE.CVC, DE.CVVC, DE.CCVC, DE.CVCC, DE.CCVCC (ED §2.5).
 * Plaatje pas NA correct decoderen (ED §11.1).
 * DOM-vrij. TODO(Builder): implementeer generators.
 */
import type { ActivityItem, Difficulty, Rng, SkillId } from '../types';

export interface WordReadingOptions {
  skillId: SkillId;
  targetWord: string;
  availableWords: readonly string[];
  difficulty: Difficulty;
  rng: Rng;
}

export function generate(_options: WordReadingOptions): ActivityItem {
  throw new Error('TODO(Builder): WordReading.generate');
}
