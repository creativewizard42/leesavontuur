import type { AudioClip } from '../types';
import { GRAPHEMES, PHONEME_BY_ID } from './graphemes';

/**
 * Eigen namen (ED §8.1 regel 4): Rik, Lies, Joep, Fem. Kort en klankzuiver.
 * Ze zijn geen methode-personages. In zinnen worden ze als **decodeerbaar
 * woord** behandeld: elk grafeem moet geleerd zijn (`requiresBlock`), met een
 * hoofdletter aan het zinsbegin (LK.<g>.UPPER, ED §2.3).
 *
 * De `words`-lijst van een zin gebruikt de laagcase vorm; het geschreven
 * `text` toont de naam met hoofdletter.
 */
export interface ProperName {
  id: string;
  /** Weergave met hoofdletter, bv. "Rik". */
  name: string;
  /** Laagcase decodeervorm, bv. "rik". */
  word: string;
  graphemes: string[];
  phonemes: string[];
  /** Eerste blok waarin alle grafemen bekend zijn. */
  requiresBlock: number;
  audio: AudioClip;
}

const GRAPHEME_BY_ID = new Map(GRAPHEMES.map((g) => [g.id, g]));

function blockFor(ids: readonly string[]): number {
  let block = 1;
  for (const id of ids) {
    const g = GRAPHEME_BY_ID.get(id);
    if (g !== undefined && g.introducedInPhase > block) block = g.introducedInPhase;
  }
  return block;
}

const RAW: readonly [name: string, letters: readonly string[]][] = [
  ['Rik', ['r', 'i', 'k']],
  ['Lies', ['l', 'ie', 's']],
  ['Joep', ['j', 'oe', 'p']],
  ['Fem', ['f', 'e', 'm']],
];

export const PROPER_NAMES: readonly ProperName[] = RAW.map(([name, letters]) => {
  const word = name.toLowerCase();
  return {
    id: `PN.${word}`,
    name,
    word,
    graphemes: [...letters],
    phonemes: letters.map((id) => PHONEME_BY_ID[id] ?? ''),
    requiresBlock: blockFor(letters),
    audio: {
      key: `pn.${word}`,
      src: `audio/names/${word}.mp3`,
      text: name,
      kind: 'word',
    },
  };
});
