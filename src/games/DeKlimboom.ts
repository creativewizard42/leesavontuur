/**
 * Mini-game 4f "De Klimboom" (GD §4f). Audio-opdracht -> juiste geschreven
 * woord tikken; geen tijdsdruk. Afleiders = minimale paren uit MVP-lijst.
 */
import type { ActivityItem } from '../types';

export interface KlimboomOptions {
  count: number;
  difficulty: 'A' | 'B' | 'C' | 'D';
}

export function createItems(_options: KlimboomOptions): ActivityItem[] {
  throw new Error('TODO(Builder): DeKlimboom.createItems');
}
