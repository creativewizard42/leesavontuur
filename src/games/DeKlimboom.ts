/**
 * Mini-game 4f "De Klimboom" (GD §4f). Audio-opdracht -> juiste geschreven
 * woord tikken; geen tijdsdruk. Afleiders = minimale paren uit MVP-lijst.
 */
import type { ActivityItem } from '../types';
import * as Klimboom from '../learning/Klimboom';
import { mvpLearned, mvpWordNames } from './shared';

export interface KlimboomOptions {
  count: number;
  difficulty: 'A' | 'B' | 'C' | 'D';
  rng?: () => number;
}

export function createItems(options: KlimboomOptions): ActivityItem[] {
  return Klimboom.generate({
    count: options.count,
    difficulty: options.difficulty,
    availableWords: mvpWordNames(),
    learned: mvpLearned(),
    skillId: 'DE.CVC',
    rng: options.rng ?? Math.random,
  });
}
