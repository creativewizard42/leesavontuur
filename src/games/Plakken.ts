/** Activiteit 4d Plakken (GD §4d). */
import type { ActivityItem } from '../types';

export interface PlakkenOptions {
  targetWord: string;
  difficulty: 'A' | 'B' | 'C' | 'D';
}

export function createItem(_options: PlakkenOptions): ActivityItem {
  throw new Error('TODO(Builder): Plakken.createItem');
}
