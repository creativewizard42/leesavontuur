/** Activiteit 4c Hakken (GD §4c). Score op AN.* / FN.COUNT, niet DE.*. */
import type { ActivityItem } from '../types';
import * as Segmenting from '../learning/Segmenting';
import { getWord } from '../content';
import { mvpLearned, mvpWordNames } from './shared';

export function createItem(word: string, rng: () => number = Math.random): ActivityItem {
  const skillId = getWord(word)?.pattern === 'VC' ? 'AN.VC' : 'AN.CVC';
  return Segmenting.generate({
    skillId,
    word,
    difficulty: 'A',
    learned: mvpLearned(),
    availableWords: mvpWordNames(),
    rng,
  });
}
