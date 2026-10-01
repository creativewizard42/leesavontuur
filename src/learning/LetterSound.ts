/**
 * Letter-klank: LK.<g>.SOUND, LK.<g>.RECOGNIZE, LK.<g>.UPPER (ED §2.3).
 * Nooit twee juiste antwoorden (ei/ij, ou/au, g/ch) (ED §10.5).
 * DOM-vrij. TODO(Builder): implementeer generators.
 */
import type { ActivityItem, Difficulty, Rng, SkillId } from '../types';

export type LetterDirection = 'grapheme-to-sound' | 'sound-to-grapheme';

export interface LetterSoundOptions {
  skillId: SkillId;
  direction: LetterDirection;
  targetGrapheme: string;
  learnedGraphemes: ReadonlySet<string>;
  difficulty: Difficulty;
  rng: Rng;
}

export function generate(_options: LetterSoundOptions): ActivityItem {
  throw new Error('TODO(Builder): LetterSound.generate');
}
