/** Activiteit 4b Letter-klank (GD §4b). */
import type { ActivityItem } from '../types';

export interface LetterKlankOptions {
  direction: 'grapheme-to-sound' | 'sound-to-grapheme';
  targetGrapheme: string;
  difficulty: 'A' | 'B' | 'C' | 'D';
}

export function createItem(_options: LetterKlankOptions): ActivityItem {
  throw new Error('TODO(Builder): LetterKlank.createItem');
}
