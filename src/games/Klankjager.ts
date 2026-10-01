/** Activiteit 4a Klankjager: FN.FIRST_SOUND / FN.LAST_SOUND (GD §4a). */
import type { ActivityItem } from '../types';
import * as FirstSound from '../learning/FirstSound';
import { mvpLearned, mvpWordNames } from './shared';

export interface KlankjagerOptions {
  difficulty: 'A' | 'B' | 'C' | 'D';
  count: number;
  skillId?: 'FN.FIRST_SOUND' | 'FN.LAST_SOUND';
  rng?: () => number;
}

export function createItems(options: KlankjagerOptions): ActivityItem[] {
  return FirstSound.generate({
    skillId: options.skillId ?? 'FN.FIRST_SOUND',
    difficulty: options.difficulty,
    count: options.count,
    availableWords: mvpWordNames(),
    learned: mvpLearned(),
    rng: options.rng ?? Math.random,
  });
}
