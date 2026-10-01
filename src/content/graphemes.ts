import type { AudioClip, Grapheme, GraphemeAudio, GraphemeType } from '../types';

/**
 * Grafeeminventaris in introductievolgorde (ED §5.3).
 *
 * `introducedInPhase` slaat in dit project het **blok** uit ED §5.3 op
 * (blok 1 = MVP). Zie ook src/content/words.ts en ARCHITECTURE §5.1, waar
 * `block >= grapheme.introducedInPhase` de unlock-regel is. Voor de MVP is
 * dit 1.
 *
 * `order` is de 1-based positie in de volledige volgorde (1..37 voor de
 * decodeerbare grafemen, 38..41 voor de herkenningsletters c, x, y, q) en is
 * bindend voor unlock-logica (`getGraphemesUpTo`).
 *
 * `soundHint` is de uitspraak-hint voor de opname/TTS (zonder sjwa).
 */

interface RawGrapheme {
  id: string;
  letters: string;
  name: string;
  soundHint: string;
  type: GraphemeType;
  block: number;
  exampleWord?: string;
}

const RAW: readonly RawGrapheme[] = [
  // Blok 1 – MVP (ED §5.2)
  // m: voorbeeld "maan" gebruikt aa (nog niet geleerd) -> alleen auditief (ED §5.3).
  { id: 'm', letters: 'm', name: 'em', soundHint: 'mmm', type: 'continuant', block: 1, exampleWord: 'maan' },
  { id: 'a', letters: 'a', name: 'aa', soundHint: 'a', type: 'vowel-short', block: 1, exampleWord: 'mam' },
  { id: 's', letters: 's', name: 'es', soundHint: 'sss', type: 'continuant', block: 1, exampleWord: 'as' },
  { id: 't', letters: 't', name: 'tee', soundHint: 't', type: 'plosive', block: 1, exampleWord: 'mat' },
  { id: 'k', letters: 'k', name: 'kaa', soundHint: 'k', type: 'plosive', block: 1, exampleWord: 'kam' },
  { id: 'r', letters: 'r', name: 'er', soundHint: 'rrr', type: 'continuant', block: 1, exampleWord: 'ram' },
  // Blok 2
  { id: 'i', letters: 'i', name: 'ie', soundHint: 'i', type: 'vowel-short', block: 2, exampleWord: 'mis' },
  { id: 'v', letters: 'v', name: 'vee', soundHint: 'vvv', type: 'continuant', block: 2, exampleWord: 'vat' },
  { id: 'aa', letters: 'aa', name: 'lange aa', soundHint: 'aaa', type: 'vowel-long', block: 2, exampleWord: 'kaas' },
  { id: 'l', letters: 'l', name: 'el', soundHint: 'lll', type: 'continuant', block: 2, exampleWord: 'lam' },
  { id: 'n', letters: 'n', name: 'en', soundHint: 'nnn', type: 'continuant', block: 2, exampleWord: 'kan' },
  // Blok 3
  { id: 'oo', letters: 'oo', name: 'lange oo', soundHint: 'ooo', type: 'vowel-long', block: 3, exampleWord: 'kool' },
  { id: 'e', letters: 'e', name: 'ee', soundHint: 'e', type: 'vowel-short', block: 3, exampleWord: 'nek' },
  { id: 'd', letters: 'd', name: 'dee', soundHint: 'd', type: 'plosive', block: 3, exampleWord: 'dak' },
  { id: 'ee', letters: 'ee', name: 'lange ee', soundHint: 'eee', type: 'vowel-long', block: 3, exampleWord: 'teen' },
  // Blok 4
  { id: 'p', letters: 'p', name: 'pee', soundHint: 'p', type: 'plosive', block: 4, exampleWord: 'kip' },
  { id: 'o', letters: 'o', name: 'oo', soundHint: 'o', type: 'vowel-short', block: 4, exampleWord: 'pop' },
  { id: 'z', letters: 'z', name: 'zet', soundHint: 'zzz', type: 'continuant', block: 4, exampleWord: 'zon' },
  { id: 'ie', letters: 'ie', name: 'ie', soundHint: 'ie', type: 'vowel-long', block: 4, exampleWord: 'riem' },
  { id: 'h', letters: 'h', name: 'haa', soundHint: 'hhh', type: 'continuant', block: 4, exampleWord: 'hek' },
  // Blok 5
  { id: 'oe', letters: 'oe', name: 'oe', soundHint: 'oe', type: 'vowel-long', block: 5, exampleWord: 'voet' },
  { id: 'u', letters: 'u', name: 'uu', soundHint: 'u', type: 'vowel-short', block: 5, exampleWord: 'hut' },
  { id: 'b', letters: 'b', name: 'bee', soundHint: 'b', type: 'plosive', block: 5, exampleWord: 'bal' },
  { id: 'uu', letters: 'uu', name: 'lange uu', soundHint: 'uuu', type: 'vowel-long', block: 5, exampleWord: 'muur' },
  { id: 'j', letters: 'j', name: 'jee', soundHint: 'jjj', type: 'continuant', block: 5, exampleWord: 'jas' },
  // Blok 6
  { id: 'ij', letters: 'ij', name: 'lange ij', soundHint: 'ij', type: 'diphthong', block: 6, exampleWord: 'ijs' },
  { id: 'w', letters: 'w', name: 'wee', soundHint: 'www', type: 'continuant', block: 6, exampleWord: 'wol' },
  { id: 'g', letters: 'g', name: 'gee', soundHint: 'ggg', type: 'continuant', block: 6, exampleWord: 'gat' },
  { id: 'eu', letters: 'eu', name: 'eu', soundHint: 'eu', type: 'vowel-long', block: 6, exampleWord: 'neus' },
  { id: 'ui', letters: 'ui', name: 'ui', soundHint: 'ui', type: 'diphthong', block: 6, exampleWord: 'huis' },
  // Blok 7
  { id: 'f', letters: 'f', name: 'ef', soundHint: 'fff', type: 'continuant', block: 7, exampleWord: 'fles' },
  { id: 'ei', letters: 'ei', name: 'korte ei', soundHint: 'ei', type: 'diphthong', block: 7, exampleWord: 'geit' },
  { id: 'ou', letters: 'ou', name: 'ou', soundHint: 'ou', type: 'diphthong', block: 7, exampleWord: 'zout' },
  { id: 'au', letters: 'au', name: 'au', soundHint: 'au', type: 'diphthong', block: 7, exampleWord: 'saus' },
  { id: 'ch', letters: 'ch', name: 'cee-haa', soundHint: 'chch', type: 'continuant', block: 7, exampleWord: 'lach' },
  // Blok 8
  { id: 'ng', letters: 'ng', name: 'en-gee', soundHint: 'ng', type: 'continuant', block: 8, exampleWord: 'ring' },
  { id: 'nk', letters: 'nk', name: 'en-kaa', soundHint: 'ngk', type: 'continuant', block: 8, exampleWord: 'bank' },
  // Later: alleen herkennen, niet in decodeeroefeningen (ED §5.3, §2.3).
  { id: 'c', letters: 'c', name: 'see', soundHint: 'k', type: 'plosive', block: 9 },
  { id: 'x', letters: 'x', name: 'iks', soundHint: 'ks', type: 'plosive', block: 9 },
  { id: 'y', letters: 'y', name: 'i-grec', soundHint: 'j', type: 'continuant', block: 9 },
  { id: 'q', letters: 'q', name: 'kuu', soundHint: 'k', type: 'plosive', block: 9 },
];

/**
 * Expliciet "alleen auditief" aangeboden voorbeeldwoorden (ED §5.3): het
 * voorbeeldwoord gebruikt grafemen die op dat moment nog niet geleerd zijn.
 * De validator staat dit alleen toe voor de hier genoemde grafeem-IDs.
 */
export const AUDITORY_ONLY_EXAMPLES: ReadonlySet<string> = new Set(['m']);

/** Alleen herkennen, nooit decoderen (ED §5.3, §2.3). */
export const RECOGNITION_ONLY_GRAPHENES: ReadonlySet<string> = new Set([
  'c',
  'x',
  'y',
  'q',
]);

/**
 * Canonieke IPA-klank per geïndexeerd grafeem. Woord-fonemen worden hieruit
 * afgeleid zodat `phonemes.length === graphemes.length` altijd klopt
 * (tweetekenklank = één foneem).
 */
export const PHONEME_BY_ID: Readonly<Record<string, string>> = {
  m: 'm',
  a: 'ɑ',
  s: 's',
  t: 't',
  k: 'k',
  r: 'r',
  i: 'ɪ',
  v: 'v',
  aa: 'aː',
  l: 'l',
  n: 'n',
  oo: 'oː',
  e: 'ɛ',
  d: 'd',
  ee: 'eː',
  p: 'p',
  o: 'ɔ',
  z: 'z',
  ie: 'i',
  h: 'ɦ',
  oe: 'u',
  u: 'ʏ',
  b: 'b',
  uu: 'y',
  j: 'j',
  ij: 'ɛi',
  w: 'ʋ',
  g: 'ɣ',
  eu: 'øː',
  ui: 'œy',
  f: 'f',
  ei: 'ɛi',
  ou: 'ʌu',
  au: 'ʌu',
  ch: 'x',
  ng: 'ŋ',
  nk: 'ŋk',
  c: 'k',
  x: 'ks',
  y: 'j',
  q: 'k',
};

function audioFor(g: RawGrapheme): GraphemeAudio {
  const sound: AudioClip = {
    key: `lk.${g.id}.sound`,
    src: `audio/graphemes/${g.id}_sound.mp3`,
    text: g.soundHint,
    kind: 'grapheme-sound',
  };
  const name: AudioClip = {
    key: `lk.${g.id}.name`,
    src: `audio/graphemes/${g.id}_name.mp3`,
    text: g.name,
    kind: 'grapheme-name',
  };
  const audio: GraphemeAudio = { sound, name };
  if (g.exampleWord !== undefined) {
    audio.example = {
      key: `lk.${g.id}.example`,
      src: `audio/graphemes/${g.id}_example.mp3`,
      text: g.exampleWord,
      kind: 'grapheme-example',
    };
  }
  return audio;
}

export const GRAPHEMES: readonly Grapheme[] = RAW.map((g, index) => {
  const base: Grapheme = {
    id: g.id,
    letters: g.letters,
    name: g.name,
    soundHint: g.soundHint,
    type: g.type,
    introducedInPhase: g.block,
    order: index + 1,
    audio: audioFor(g),
  };
  return g.exampleWord === undefined ? base : { ...base, exampleWord: g.exampleWord };
});

const GRAPHEME_BY_ID: ReadonlyMap<string, Grapheme> = new Map(
  GRAPHEMES.map((g) => [g.id, g]),
);

export function getGraphemeById(id: string): Grapheme | undefined {
  return GRAPHEME_BY_ID.get(id);
}

/** True als het grafeemtype een klinker vertegenwoordigt (V in patronen). */
export function isVowelType(type: GraphemeType): boolean {
  return type === 'vowel-short' || type === 'vowel-long' || type === 'diphthong';
}
