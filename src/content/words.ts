import type { AudioClip, Word, WordPattern } from '../types';
import { GRAPHEMES, PHONEME_BY_ID, isVowelType } from './graphemes';

/**
 * Woordenbank (ED §6.5 + §6.6) plus een kleine set klankzuivere
 * functie-/werkwoordsvormen die nodig zijn voor de voorbeeldzinnen en
 * -teksten uit ED §8 (bv. *is, in, op, en, bij, rolt, pakt, zit*).
 *
 * `pattern` volgt de C/V-klassen van de grafemen (ARCHITECTURE §5.1 regel 4):
 * V = klinker/tweeklank-grafeem, C = medeklinker-grafeem. (De patroonkolom in
 * ED §6.5/§6.6 telt klinkerletters in tweetekenklanken als twee V's; dat is
 * strijdig met diezelfde §6.1-legenda "tweeteken = 1 V". Wij volgen de
 * bindende ARCHITECTURE-afleiding: één symbool per grafeem.)
 *
 * `phonemes` (IPA) worden afgeleid uit `PHONEME_BY_ID`, één per grafeem.
 * `block` = eerste blok waarin alle grafemen bekend zijn (ED §5.3).
 * `image` wordt alleen gezet voor de MVP-woorden waarvoor een SVG-belonings-
 * plaatje bestaat (GD §11.1: plaatje pas ná lezen). Woorden zonder bestaande
 * asset laten het veld expliciet weg.
 */

type RawWord = readonly [
  word: string,
  graphemes: readonly string[],
  opts: {
    mvp?: boolean;
    /** Alleen zinvol i.c.m. mvp: er bestaat een SVG in public/assets. */
    image?: boolean;
    /** Kindvriendelijk/betekenisvol doelwoord (EDU-016); default true. */
    kidFriendly?: boolean;
  },
];

const RAW: readonly RawWord[] = [
  // --- MVP (ED §6.5, m, a, s, t, k, r) – 18 kindvriendelijke woorden, 17 met plaatje (GD §11.1) ---
  // mak/smak/mars zijn verwijderd: niet kindvriendelijk (QA-R2-004/EDU-016) en
  // konden als doel-/afleiderwoord opduiken. Het restant blijft ruim ≥ 8 (ED §5.2).
  ['mam', ['m', 'a', 'm'], { mvp: true, image: true }],
  ['as', ['a', 's'], { mvp: true, image: true }],
  ['mat', ['m', 'a', 't'], { mvp: true, image: true }],
  ['tas', ['t', 'a', 's'], { mvp: true, image: true }],
  ['kam', ['k', 'a', 'm'], { mvp: true, image: true }],
  ['kat', ['k', 'a', 't'], { mvp: true, image: true }],
  ['tak', ['t', 'a', 'k'], { mvp: true, image: true }],
  ['kas', ['k', 'a', 's'], { mvp: true, image: true }],
  ['ram', ['r', 'a', 'm'], { mvp: true, image: true }],
  ['rat', ['r', 'a', 't'], { mvp: true, image: true }],
  ['kar', ['k', 'a', 'r'], { mvp: true, image: true }],
  ['arm', ['a', 'r', 'm'], { mvp: true, image: true }],
  ['ark', ['a', 'r', 'k'], { mvp: true, image: true }],
  ['kast', ['k', 'a', 's', 't'], { mvp: true, image: true }],
  ['mast', ['m', 'a', 's', 't'], { mvp: true, image: true }],
  ['stam', ['s', 't', 'a', 'm'], { mvp: true, image: true }],
  ['kras', ['k', 'r', 'a', 's'], { mvp: true, image: true }],
  ['start', ['s', 't', 'a', 'r', 't'], { mvp: true }],

  // --- Fase 5, blok 2 (ED §6.5 #22–48) ---
  ['mis', ['m', 'i', 's'], {}],
  ['kist', ['k', 'i', 's', 't'], {}],
  ['mist', ['m', 'i', 's', 't'], {}],
  ['rit', ['r', 'i', 't'], {}],
  ['tik', ['t', 'i', 'k'], {}],
  ['vis', ['v', 'i', 's'], {}],
  ['vat', ['v', 'a', 't'], {}],
  ['vak', ['v', 'a', 'k'], {}],
  ['kaas', ['k', 'aa', 's'], {}],
  ['raam', ['r', 'aa', 'm'], {}],
  ['vaas', ['v', 'aa', 's'], {}],
  ['kaart', ['k', 'aa', 'r', 't'], {}],
  ['taart', ['t', 'aa', 'r', 't'], {}],
  ['staart', ['s', 't', 'aa', 'r', 't'], {}],
  ['lam', ['l', 'a', 'm'], {}],
  ['slak', ['s', 'l', 'a', 'k'], {}],
  ['stal', ['s', 't', 'a', 'l'], {}],
  ['val', ['v', 'a', 'l'], {}],
  ['kaal', ['k', 'aa', 'l'], {}],
  ['kan', ['k', 'a', 'n'], {}],
  ['man', ['m', 'a', 'n'], {}],
  ['nat', ['n', 'a', 't'], {}],
  ['kin', ['k', 'i', 'n'], {}],
  ['vin', ['v', 'i', 'n'], {}],
  ['maan', ['m', 'aa', 'n'], {}],
  ['kraan', ['k', 'r', 'aa', 'n'], {}],
  ['lint', ['l', 'i', 'n', 't'], {}],

  // --- Fase 5, blok 3 (ED §6.5 #49–66) ---
  ['kool', ['k', 'oo', 'l'], {}],
  ['rook', ['r', 'oo', 'k'], {}],
  ['oom', ['oo', 'm'], {}],
  ['noot', ['n', 'oo', 't'], {}],
  ['look', ['l', 'oo', 'k'], {}],
  ['nek', ['n', 'e', 'k'], {}],
  ['mes', ['m', 'e', 's'], {}],
  ['net', ['n', 'e', 't'], {}],
  ['tent', ['t', 'e', 'n', 't'], {}],
  ['rem', ['r', 'e', 'm'], {}],
  ['melk', ['m', 'e', 'l', 'k'], {}],
  ['dak', ['d', 'a', 'k'], {}],
  ['das', ['d', 'a', 's'], {}],
  ['dal', ['d', 'a', 'l'], {}],
  ['teen', ['t', 'ee', 'n'], {}],
  ['steen', ['s', 't', 'ee', 'n'], {}],
  ['keel', ['k', 'ee', 'l'], {}],
  ['eet', ['ee', 't'], {}],

  // --- Fase 6, blok 4 (ED §6.6 #1–23, #62) ---
  ['pan', ['p', 'a', 'n'], {}],
  ['kip', ['k', 'i', 'p'], {}],
  ['pet', ['p', 'e', 't'], {}],
  ['lip', ['l', 'i', 'p'], {}],
  ['pop', ['p', 'o', 'p'], {}],
  ['mol', ['m', 'o', 'l'], {}],
  ['kop', ['k', 'o', 'p'], {}],
  ['rok', ['r', 'o', 'k'], {}],
  ['sok', ['s', 'o', 'k'], {}],
  ['vos', ['v', 'o', 's'], {}],
  ['pot', ['p', 'o', 't'], {}],
  ['stok', ['s', 't', 'o', 'k'], {}],
  ['slot', ['s', 'l', 'o', 't'], {}],
  ['zon', ['z', 'o', 'n'], {}],
  ['zak', ['z', 'a', 'k'], {}],
  ['zes', ['z', 'e', 's'], {}],
  ['zeep', ['z', 'ee', 'p'], {}],
  ['riem', ['r', 'ie', 'm'], {}],
  ['diep', ['d', 'ie', 'p'], {}],
  ['kies', ['k', 'ie', 's'], {}],
  ['hek', ['h', 'e', 'k'], {}],
  ['hok', ['h', 'o', 'k'], {}],
  ['haas', ['h', 'aa', 's'], {}],
  ['klok', ['k', 'l', 'o', 'k'], {}],

  // --- Fase 6, blok 5 (ED §6.6 #24–39) ---
  ['voet', ['v', 'oe', 't'], {}],
  ['koek', ['k', 'oe', 'k'], {}],
  ['poes', ['p', 'oe', 's'], {}],
  ['soep', ['s', 'oe', 'p'], {}],
  ['stoel', ['s', 't', 'oe', 'l'], {}],
  ['hut', ['h', 'u', 't'], {}],
  ['mus', ['m', 'u', 's'], {}],
  ['bus', ['b', 'u', 's'], {}],
  ['bal', ['b', 'a', 'l'], {}],
  ['bes', ['b', 'e', 's'], {}],
  ['been', ['b', 'ee', 'n'], {}],
  ['boom', ['b', 'oo', 'm'], {}],
  ['boek', ['b', 'oe', 'k'], {}],
  ['muur', ['m', 'uu', 'r'], {}],
  ['vuur', ['v', 'uu', 'r'], {}],
  ['jas', ['j', 'a', 's'], {}],

  // --- Fase 6, blok 6 (ED §6.6 #40–52) ---
  ['ijs', ['ij', 's'], {}],
  ['pijl', ['p', 'ij', 'l'], {}],
  ['lijm', ['l', 'ij', 'm'], {}],
  ['wol', ['w', 'o', 'l'], {}],
  ['wiel', ['w', 'ie', 'l'], {}],
  ['gat', ['g', 'a', 't'], {}],
  ['geel', ['g', 'ee', 'l'], {}],
  ['neus', ['n', 'eu', 's'], {}],
  ['huis', ['h', 'ui', 's'], {}],
  ['muis', ['m', 'ui', 's'], {}],
  ['duim', ['d', 'ui', 'm'], {}],
  ['tuin', ['t', 'ui', 'n'], {}],
  ['buik', ['b', 'ui', 'k'], {}],

  // --- Fase 6, blok 7 (ED §6.6 #53–57) ---
  ['fles', ['f', 'l', 'e', 's'], {}],
  ['geit', ['g', 'ei', 't'], {}],
  ['zout', ['z', 'ou', 't'], {}],
  ['saus', ['s', 'au', 's'], {}],
  ['lach', ['l', 'a', 'ch'], {}],

  // --- Fase 6, blok 8 (ED §6.6 #58–61) ---
  ['ring', ['r', 'i', 'ng'], {}],
  ['slang', ['s', 'l', 'a', 'ng'], {}],
  ['bank', ['b', 'a', 'nk'], {}],
  ['pink', ['p', 'i', 'nk'], {}],

  // --- Klankzuivere functie-/werkwoordsvormen voor ED §8 (zinnen/teksten) ---
  ['en', ['e', 'n'], {}],
  ['in', ['i', 'n'], {}],
  ['is', ['i', 's'], {}],
  ['ik', ['i', 'k'], {}],
  ['op', ['o', 'p'], {}],
  ['al', ['a', 'l'], {}],
  ['bij', ['b', 'ij'], {}],
  ['gras', ['g', 'r', 'a', 's'], {}],
  ['rolt', ['r', 'o', 'l', 't'], {}],
  ['sloot', ['s', 'l', 'oo', 't'], {}],
  ['boot', ['b', 'oo', 't'], {}],
  ['lief', ['l', 'ie', 'f'], {}],
  ['ziet', ['z', 'ie', 't'], {}],
  ['rent', ['r', 'e', 'n', 't'], {}],
  ['pakt', ['p', 'a', 'k', 't'], {}],
  ['zit', ['z', 'i', 't'], {}],
  ['lacht', ['l', 'a', 'ch', 't'], {}],
];

const GRAPHEME_BY_ID = new Map(GRAPHEMES.map((g) => [g.id, g]));

export function patternForGraphemes(ids: readonly string[]): WordPattern {
  let out = '';
  for (const id of ids) {
    const g = GRAPHEME_BY_ID.get(id);
    out += g !== undefined && isVowelType(g.type) ? 'V' : 'C';
  }
  return out as WordPattern;
}

function phonemesForGraphemes(ids: readonly string[]): string[] {
  return ids.map((id) => PHONEME_BY_ID[id] ?? '');
}

function blockForGraphemes(ids: readonly string[]): number {
  let block = 1;
  for (const id of ids) {
    const g = GRAPHEME_BY_ID.get(id);
    if (g !== undefined && g.introducedInPhase > block) block = g.introducedInPhase;
  }
  return block;
}

/** Fase waarin het woord past: korte patronen = 5, clusters = 6 (ED §3, §6.1). */
function phaseForPattern(pattern: WordPattern): number {
  return pattern === 'VC' || pattern === 'CVC' ? 5 : 6;
}

function wordAudio(word: string): AudioClip {
  return {
    key: `de.${word}`,
    src: `audio/words/${word}.mp3`,
    text: word,
    kind: 'word',
  };
}

export const WORDS: readonly Word[] = RAW.map(([word, graphemes, opts]) => {
  const pattern = patternForGraphemes(graphemes);
  const base: Word = {
    word,
    graphemes: [...graphemes],
    phonemes: phonemesForGraphemes(graphemes),
    pattern,
    phase: phaseForPattern(pattern),
    block: blockForGraphemes(graphemes),
    kidFriendly: opts.kidFriendly !== false,
    audio: wordAudio(word),
  };
  const withMvp: Word = opts.mvp === true ? { ...base, isMvp: true } : base;
  return opts.mvp === true && opts.image === true
    ? { ...withMvp, image: `assets/images/words/${word}.svg` }
    : withMvp;
});

/** MVP-woorden (ED §5.2) – moet ≥ 8 zijn (ED §5.2 probleem 1). */
export const MVP_WORDS: readonly Word[] = WORDS.filter((w) => w.isMvp === true);
