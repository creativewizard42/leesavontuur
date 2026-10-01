import type { Sentence } from '../types';

/**
 * Zinnen (ED §8). MVP gebruikt alleen woordgroepen (level "phrase");
 * volledige zinnen/teksten horen bij fase 7+ en zijn hier voorbereid.
 *
 * Regel: elk woord is een bekend `Word` of een geïntroduceerd sight word.
 */
export const SENTENCES: readonly Sentence[] = [
  {
    id: 'ZI.PHRASE.de-kat',
    text: 'de kat',
    words: ['de', 'kat'],
    level: 'phrase',
    requiresBlocks: [1],
    requiresSightWords: ['SW.de'],
  },
  {
    id: 'ZI.PHRASE.een-tas',
    text: 'een tas',
    words: ['een', 'tas'],
    level: 'phrase',
    requiresBlocks: [1],
    requiresSightWords: ['SW.een'],
  },
  {
    id: 'ZI.PHRASE.de-ram',
    text: 'de ram',
    words: ['de', 'ram'],
    level: 'phrase',
    requiresBlocks: [1],
    requiresSightWords: ['SW.de'],
  },
];
