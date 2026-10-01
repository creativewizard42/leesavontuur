/** Activiteit 4a Klankjager: FN.FIRST_SOUND / FN.LAST_SOUND (GD §4a). */
import type { ActivityItem } from '../types';

export interface KlankjagerOptions {
  difficulty: 'A' | 'B' | 'C' | 'D';
  count: number;
}

export function createItems(_options: KlankjagerOptions): ActivityItem[] {
  throw new Error('TODO(Builder): Klankjager.createItems');
}
