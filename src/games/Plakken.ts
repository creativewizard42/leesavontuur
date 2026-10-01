/** Activiteit 4d Plakken (GD §4d). */
import type { ActivityItem } from '../types';
import * as Blending from '../learning/Blending';
import { getWord } from '../content';
import { mvpLearned, mvpWordNames } from './shared';

export interface PlakkenOptions {
  targetWord: string;
  difficulty: 'A' | 'B' | 'C' | 'D';
  rng?: () => number;
}

export function createItem(options: PlakkenOptions): ActivityItem {
  const skillId = getWord(options.targetWord)?.pattern === 'VC' ? 'SY.VC' : 'SY.CVC';
  return Blending.generate({
    skillId,
    targetWord: options.targetWord,
    availableWords: mvpWordNames(),
    difficulty: options.difficulty,
    learned: mvpLearned(),
    rng: options.rng ?? Math.random,
  });
}
