import type { AudioClip, SightWord } from '../types';

/**
 * Sight words (ED §7.1). Bewust klein; maximaal één nieuw per sessie.
 * Introductieketen: SW.de → SW.een → SW.het. SW.ze/we/je pas nadat het
 * betreffende blok geleerd is.
 *
 * Sight words zijn niet-klankzuiver (sjwa) en worden direct herkend. Ze tellen
 * nooit mee voor DE.*-mastery (ED §7.3).
 */

function clip(id: string, word: string): AudioClip {
  return {
    key: `sw.${id}`,
    src: `audio/sightwords/${id}.mp3`,
    text: word,
    kind: 'sightword',
  };
}

interface RawSightWord {
  id: string;
  word: string;
  requiresBlock: number;
  introducedAfter?: string;
}

const RAW: readonly RawSightWord[] = [
  { id: 'SW.de', word: 'de', requiresBlock: 1 },
  { id: 'SW.een', word: 'een', requiresBlock: 1, introducedAfter: 'SW.de' },
  { id: 'SW.het', word: 'het', requiresBlock: 1, introducedAfter: 'SW.een' },
  { id: 'SW.ze', word: 'ze', requiresBlock: 4 },
  { id: 'SW.we', word: 'we', requiresBlock: 6 },
  { id: 'SW.je', word: 'je', requiresBlock: 5 },
];

export const SIGHT_WORDS: readonly SightWord[] = RAW.map((sw) => ({
  id: sw.id,
  word: sw.word,
  requiresBlock: sw.requiresBlock,
  ...(sw.introducedAfter === undefined ? {} : { introducedAfter: sw.introducedAfter }),
  audio: clip(sw.id, sw.word),
}));
