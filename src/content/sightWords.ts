import type { SightWord } from '../types';

/**
 * Sight words (ED §7.1). Buiten de MVP-scope, maar de data staat klaar.
 * Introductieketen: SW.de -> SW.een -> SW.het; SW.ze/we/je na bekend blok.
 */
export const SIGHT_WORDS: readonly SightWord[] = [
  { id: 'SW.de', word: 'de', requiresBlock: 1, audio: clip('de', 'de') },
  { id: 'SW.een', word: 'een', requiresBlock: 1, introducedAfter: 'SW.de', audio: clip('een', 'een') },
  { id: 'SW.het', word: 'het', requiresBlock: 1, introducedAfter: 'SW.een', audio: clip('het', 'het') },
  { id: 'SW.ze', word: 'ze', requiresBlock: 4, audio: clip('ze', 'ze') },
  { id: 'SW.we', word: 'we', requiresBlock: 6, audio: clip('we', 'we') },
  { id: 'SW.je', word: 'je', requiresBlock: 5, audio: clip('je', 'je') },
];

function clip(word: string, text: string) {
  return {
    key: `de.${word}`,
    src: `audio/words/${word}.mp3`,
    text,
    kind: 'sightword' as const,
  };
}
