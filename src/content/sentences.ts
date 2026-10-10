import type { AudioClip, Sentence } from '../types';

/**
 * Zinnen en korte teksten (ED §8). Elke `words`-vermelding is een bestaand
 * `Word`, een geïntroduceerd sight word of een eigen naam (ProperName). De
 * validator controleert dekking, sight-word-keten en blokvereisten.
 *
 * `requiresBlocks` = alle blokken die nodig zijn voor de zin/tekst.
 */

function sentenceAudio(id: string, text: string): AudioClip {
  return {
    key: `zi.${id}`,
    src: `audio/sentences/${id}.mp3`,
    text,
    kind: 'sentence',
  };
}

function questionAudio(id: string, text: string): AudioClip {
  return {
    key: `zi.${id}.vraag`,
    src: `audio/sentences/${id}_vraag.mp3`,
    text,
    kind: 'instruction',
  };
}

export const SENTENCES: readonly Sentence[] = [
  // --- Woordgroepen (ZI.PHRASE) – ED §8.2 ---
  {
    id: 'ZI.PHRASE.de-kat',
    text: 'de kat',
    words: ['de', 'kat'],
    level: 'phrase',
    requiresBlocks: [1, 7],
    requiresSightWords: ['SW.de'],
    audio: sentenceAudio('ZI.PHRASE.de-kat', 'de kat'),
  },
  {
    id: 'ZI.PHRASE.een-tas',
    text: 'een tas',
    words: ['een', 'tas'],
    level: 'phrase',
    requiresBlocks: [1, 7],
    requiresSightWords: ['SW.een'],
    audio: sentenceAudio('ZI.PHRASE.een-tas', 'een tas'),
  },
  {
    id: 'ZI.PHRASE.mam-en-de-kat',
    text: 'mam en de kat',
    words: ['mam', 'en', 'de', 'kat'],
    level: 'phrase',
    requiresBlocks: [1, 3, 7],
    requiresSightWords: ['SW.de'],
    audio: sentenceAudio('ZI.PHRASE.mam-en-de-kat', 'mam en de kat'),
  },

  // --- Eenvoudige zinnen (ZI.SIMPLE) – ED §8.2 ---
  {
    id: 'ZI.SIMPLE.de-kat-is-nat',
    text: 'de kat is nat.',
    words: ['de', 'kat', 'is', 'nat'],
    level: 'simple',
    requiresBlocks: [1, 2, 7],
    requiresSightWords: ['SW.de'],
    audio: sentenceAudio('ZI.SIMPLE.de-kat-is-nat', 'de kat is nat'),
    comprehension: {
      questionAudio: questionAudio('ZI.SIMPLE.de-kat-is-nat', 'Wie is nat?'),
      options: ['de kat', 'de rat'], correctIndex: 0, showAfterReading: true,
    },
  },
  {
    id: 'ZI.SIMPLE.ik-eet-kaas',
    text: 'ik eet kaas.',
    words: ['ik', 'eet', 'kaas'],
    level: 'simple',
    requiresBlocks: [3],
    requiresSightWords: [],
    audio: sentenceAudio('ZI.SIMPLE.ik-eet-kaas', 'ik eet kaas'),
    comprehension: {
      questionAudio: questionAudio('ZI.SIMPLE.ik-eet-kaas', 'Wat eet ik?'),
      options: ['kaas', 'soep', 'vis'], correctIndex: 0, showAfterReading: true,
    },
  },
  {
    id: 'ZI.SIMPLE.mam-is-in-de-kas',
    text: 'mam is in de kas.',
    words: ['mam', 'is', 'in', 'de', 'kas'],
    level: 'simple',
    requiresBlocks: [1, 2, 7],
    requiresSightWords: ['SW.de'],
    audio: sentenceAudio('ZI.SIMPLE.mam-is-in-de-kas', 'mam is in de kas'),
  },
  {
    id: 'ZI.SIMPLE.de-rat-zit-in-de-tas',
    text: 'de rat zit in de tas.',
    words: ['de', 'rat', 'zit', 'in', 'de', 'tas'],
    level: 'simple',
    requiresBlocks: [4, 7],
    requiresSightWords: ['SW.de'],
    audio: sentenceAudio('ZI.SIMPLE.de-rat-zit-in-de-tas', 'de rat zit in de tas'),
  },
  {
    id: 'ZI.SIMPLE.de-kip-is-op-het-dak',
    text: 'de kip is op het dak.',
    words: ['de', 'kip', 'is', 'op', 'het', 'dak'],
    level: 'simple',
    requiresBlocks: [4, 7],
    requiresSightWords: ['SW.de', 'SW.een', 'SW.het'],
    audio: sentenceAudio('ZI.SIMPLE.de-kip-is-op-het-dak', 'de kip is op het dak'),
  },
  {
    id: 'ZI.SIMPLE.de-zon-is-geel',
    text: 'de zon is geel.',
    words: ['de', 'zon', 'is', 'geel'],
    level: 'simple',
    requiresBlocks: [6, 7],
    requiresSightWords: ['SW.de'],
    audio: sentenceAudio('ZI.SIMPLE.de-zon-is-geel', 'de zon is geel'),
  },
  {
    id: 'ZI.SIMPLE.de-muis-zit-in-het-huis',
    text: 'de muis zit in het huis.',
    words: ['de', 'muis', 'zit', 'in', 'het', 'huis'],
    level: 'simple',
    requiresBlocks: [6, 7],
    requiresSightWords: ['SW.de', 'SW.een', 'SW.het'],
    audio: sentenceAudio('ZI.SIMPLE.de-muis-zit-in-het-huis', 'de muis zit in het huis'),
  },

  // --- Zinnen met hoofdletter/naam (ZI.CAPITAL) – ED §8.2 ---
  {
    id: 'ZI.CAPITAL.rik-pakt-de-bal',
    text: 'Rik pakt de bal.',
    words: ['rik', 'pakt', 'de', 'bal'],
    level: 'capital',
    requiresBlocks: [5, 7],
    requiresSightWords: ['SW.de'],
    audio: sentenceAudio('ZI.CAPITAL.rik-pakt-de-bal', 'Rik pakt de bal'),
  },
  {
    id: 'ZI.CAPITAL.lies-ziet-een-vos-in-de-tuin',
    text: 'Lies ziet een vos in de tuin.',
    words: ['lies', 'ziet', 'een', 'vos', 'in', 'de', 'tuin'],
    level: 'capital',
    requiresBlocks: [6, 7],
    requiresSightWords: ['SW.de', 'SW.een'],
    audio: sentenceAudio('ZI.CAPITAL.lies-ziet-een-vos-in-de-tuin', 'Lies ziet een vos in de tuin'),
  },
  {
    id: 'ZI.CAPITAL.joep-eet-soep',
    text: 'Joep eet soep.',
    words: ['joep', 'eet', 'soep'],
    level: 'capital',
    requiresBlocks: [5],
    requiresSightWords: [],
    audio: sentenceAudio('ZI.CAPITAL.joep-eet-soep', 'Joep eet soep'),
    comprehension: {
      questionAudio: questionAudio('ZI.CAPITAL.joep-eet-soep', 'Wat eet Joep?'),
      options: ['soep', 'kaas'], correctIndex: 0, showAfterReading: true,
    },
  },

  // --- Korte teksten (TX.SHORT) – ED §8.3 ---
  {
    id: 'TX.SHORT.1',
    text: 'Lies is in de tuin. Ze ziet een muis. De muis rent in het gras. Lies lacht.',
    words: [
      'lies', 'is', 'in', 'de', 'tuin',
      'ze', 'ziet', 'een', 'muis',
      'de', 'muis', 'rent', 'in', 'het', 'gras',
      'lies', 'lacht',
    ],
    level: 'text',
    requiresBlocks: [7],
    requiresSightWords: ['SW.de', 'SW.een', 'SW.het', 'SW.ze'],
    comprehension: {
      questionAudio: questionAudio('TX.SHORT.1', 'Wat ziet Lies?'),
      options: ['muis', 'vos', 'kat'],
      correctIndex: 0,
      showAfterReading: true,
    },
    audio: sentenceAudio('TX.SHORT.1', 'Lies is in de tuin. Ze ziet een muis. De muis rent in het gras. Lies lacht.'),
  },
  {
    id: 'TX.SHORT.2',
    text: 'Rik pakt een bal. De bal rolt in de sloot. Joep zit in de boot. Joep pakt de bal.',
    words: [
      'rik', 'pakt', 'een', 'bal',
      'de', 'bal', 'rolt', 'in', 'de', 'sloot',
      'joep', 'zit', 'in', 'de', 'boot',
      'joep', 'pakt', 'de', 'bal',
    ],
    level: 'text',
    requiresBlocks: [5, 7],
    requiresSightWords: ['SW.de', 'SW.een'],
    comprehension: {
      questionAudio: questionAudio('TX.SHORT.2', 'Wie pakt de bal uit de sloot?'),
      options: ['Rik', 'Joep'],
      correctIndex: 1,
      showAfterReading: true,
    },
    audio: sentenceAudio('TX.SHORT.2', 'Rik pakt een bal. De bal rolt in de sloot. Joep zit in de boot. Joep pakt de bal.'),
  },
  {
    id: 'TX.SHORT.3',
    text: 'Fem is bij de geit. De geit eet gras. Fem lacht. De geit is lief.',
    words: [
      'fem', 'is', 'bij', 'de', 'geit',
      'de', 'geit', 'eet', 'gras',
      'fem', 'lacht',
      'de', 'geit', 'is', 'lief',
    ],
    level: 'text',
    requiresBlocks: [7],
    requiresSightWords: ['SW.de'],
    comprehension: {
      questionAudio: questionAudio('TX.SHORT.3', 'Wat eet de geit?'),
      options: ['gras', 'soep', 'kaas'],
      correctIndex: 0,
      showAfterReading: true,
    },
    audio: sentenceAudio('TX.SHORT.3', 'Fem is bij de geit. De geit eet gras. Fem lacht. De geit is lief.'),
  },
];
