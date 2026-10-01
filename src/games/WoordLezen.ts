/** Activiteit 4e Woord lezen (GD §4e). Plaatje pas NA correct. */
import type { ActivityItem } from '../types';
import * as WordReading from '../learning/WordReading';
import { getWord } from '../content';
import { mvpLearned, mvpWordNames } from './shared';

export function createItem(word: string, rng: () => number = Math.random): ActivityItem {
  const item = getWord(word);
  const skillId = item?.pattern === 'VC' ? 'DE.VC' : 'DE.CVC';
  return WordReading.generate({
    skillId,
    targetWord: word,
    availableWords: mvpWordNames(),
    difficulty: 'A',
    learned: mvpLearned(),
    rng,
  });
}
