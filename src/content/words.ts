import type { AudioClip, Word, WordPattern } from '../types';

/**
 * Woordenbank. MVP = de 21 klankzuivere woorden met m, a, s, t, k, r
 * (ED §6.5). Alle woorden: block 1, phase 5, kindvriendelijk.
 *
 * `phonemes` zijn IPA-strings, één per grafeem (tweetekenklank = 1 foneem).
 */

interface RawWord {
  word: string;
  graphemes: string[];
  phonemes: string[];
  pattern: WordPattern;
  image?: boolean;
}

const RAW: readonly RawWord[] = [
  { word: 'mam', graphemes: ['m', 'a', 'm'], phonemes: ['m', 'ɑ', 'm'], pattern: 'CVC', image: true },
  { word: 'as', graphemes: ['a', 's'], phonemes: ['ɑ', 's'], pattern: 'VC' },
  { word: 'mat', graphemes: ['m', 'a', 't'], phonemes: ['m', 'ɑ', 't'], pattern: 'CVC', image: true },
  { word: 'tas', graphemes: ['t', 'a', 's'], phonemes: ['t', 'ɑ', 's'], pattern: 'CVC', image: true },
  { word: 'kam', graphemes: ['k', 'a', 'm'], phonemes: ['k', 'ɑ', 'm'], pattern: 'CVC', image: true },
  { word: 'kat', graphemes: ['k', 'a', 't'], phonemes: ['k', 'ɑ', 't'], pattern: 'CVC', image: true },
  { word: 'tak', graphemes: ['t', 'a', 'k'], phonemes: ['t', 'ɑ', 'k'], pattern: 'CVC', image: true },
  { word: 'kas', graphemes: ['k', 'a', 's'], phonemes: ['k', 'ɑ', 's'], pattern: 'CVC', image: true },
  { word: 'mak', graphemes: ['m', 'a', 'k'], phonemes: ['m', 'ɑ', 'k'], pattern: 'CVC' },
  { word: 'ram', graphemes: ['r', 'a', 'm'], phonemes: ['r', 'ɑ', 'm'], pattern: 'CVC', image: true },
  { word: 'rat', graphemes: ['r', 'a', 't'], phonemes: ['r', 'ɑ', 't'], pattern: 'CVC', image: true },
  { word: 'kar', graphemes: ['k', 'a', 'r'], phonemes: ['k', 'ɑ', 'r'], pattern: 'CVC', image: true },
  { word: 'arm', graphemes: ['a', 'r', 'm'], phonemes: ['ɑ', 'r', 'm'], pattern: 'VCC', image: true },
  { word: 'ark', graphemes: ['a', 'r', 'k'], phonemes: ['ɑ', 'r', 'k'], pattern: 'VCC' },
  { word: 'kast', graphemes: ['k', 'a', 's', 't'], phonemes: ['k', 'ɑ', 's', 't'], pattern: 'CVCC', image: true },
  { word: 'mast', graphemes: ['m', 'a', 's', 't'], phonemes: ['m', 'ɑ', 's', 't'], pattern: 'CVCC', image: true },
  { word: 'stam', graphemes: ['s', 't', 'a', 'm'], phonemes: ['s', 't', 'ɑ', 'm'], pattern: 'CCVC', image: true },
  { word: 'kras', graphemes: ['k', 'r', 'a', 's'], phonemes: ['k', 'r', 'ɑ', 's'], pattern: 'CCVC' },
  { word: 'smak', graphemes: ['s', 'm', 'a', 'k'], phonemes: ['s', 'm', 'ɑ', 'k'], pattern: 'CCVC' },
  { word: 'mars', graphemes: ['m', 'a', 'r', 's'], phonemes: ['m', 'ɑ', 'r', 's'], pattern: 'CVCC' },
  { word: 'start', graphemes: ['s', 't', 'a', 'r', 't'], phonemes: ['s', 't', 'ɑ', 'r', 't'], pattern: 'CCVCC' },
];

function wordAudio(word: string): AudioClip {
  return {
    key: `de.${word}`,
    src: `audio/words/${word}.mp3`,
    text: word,
    kind: 'word',
  };
}

export const WORDS: readonly Word[] = RAW.map((w) => {
  const base: Word = {
    word: w.word,
    graphemes: w.graphemes,
    phonemes: w.phonemes,
    pattern: w.pattern,
    phase: 5,
    block: 1,
    kidFriendly: true,
    audio: wordAudio(w.word),
    isMvp: true,
  };
  return w.image === true ? { ...base, image: `images/words/${w.word}.svg` } : base;
});
