/** Activiteit 4b Letter-klank (GD §4b). */
import type { ActivityItem } from '../types';
import * as LetterSound from '../learning/LetterSound';
import { mvpLearned } from './shared';

export interface LetterKlankOptions {
  direction: 'grapheme-to-sound' | 'sound-to-grapheme';
  targetGrapheme: string;
  difficulty: 'A' | 'B' | 'C' | 'D';
  rng?: () => number;
}

export function createItem(options: LetterKlankOptions): ActivityItem {
  const skillId =
    options.direction === 'grapheme-to-sound'
      ? `LK.${options.targetGrapheme}.SOUND`
      : `LK.${options.targetGrapheme}.RECOGNIZE`;
  return LetterSound.generate({
    skillId,
    direction: options.direction,
    targetGrapheme: options.targetGrapheme,
    learnedGraphemes: mvpLearned(),
    difficulty: options.difficulty,
    rng: options.rng ?? Math.random,
  });
}
