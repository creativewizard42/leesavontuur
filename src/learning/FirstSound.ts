/**
 * Fonemisch bewustzijn: FN.FIRST_SOUND, FN.LAST_SOUND, FN.MID_SOUND,
 * FN.COUNT (ED §2.2). Auditief, geen geschreven woord in beeld (ED §11.3).
 * DOM-vrij. TODO(Builder): implementeer generators.
 */
import type { ActivityItem, Difficulty, Rng, SkillId } from '../types';

export interface FirstSoundOptions {
  skillId: Extract<SkillId, string>;
  difficulty: Difficulty;
  count: number;
  /** Beschikbare woorden (uit content, alleen geleerde grafemen). */
  availableWords: readonly string[];
  rng: Rng;
}

export function generate(_options: FirstSoundOptions): ActivityItem[] {
  throw new Error('TODO(Builder): FirstSound.generate');
}
