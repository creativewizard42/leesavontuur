/**
 * Auditieve synthese / plakken: SY.VC, SY.CVC, SY.CLUSTER (ED §2.4).
 * DOM-vrij. TODO(Builder): implementeer generators met minimale paren.
 */
import type { ActivityItem, Difficulty, Rng, SkillId } from '../types';

export interface BlendingOptions {
  skillId: SkillId;
  targetWord: string;
  /** Beschikbare woorden voor afleiders (alleen geleerde grafemen). */
  availableWords: readonly string[];
  difficulty: Difficulty;
  rng: Rng;
}

export function generate(_options: BlendingOptions): ActivityItem {
  throw new Error('TODO(Builder): Blending.generate');
}
