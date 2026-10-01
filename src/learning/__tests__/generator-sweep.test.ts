import { describe, expect, it } from 'vitest';
import { createSeededRng } from '../../core/rng';
import { graphemes } from '../../content';
import { assertItemsAllowed } from '../../content/validator';
import { ALL_GRAPHEMES, allowedWords } from '../util';
import * as FirstSound from '../FirstSound';
import * as LetterSound from '../LetterSound';
import * as Segmenting from '../Segmenting';
import * as Blending from '../Blending';
import * as WordReading from '../WordReading';
import * as Klimboom from '../Klimboom';
import * as Phonology from '../Phonology';
import type { ActivityItem } from '../../types';

/**
 * Generator-sweep (EDU-020): alle generatoren mogen over veel seeds en
 * verschillende geleerde-setten nooit geblokkeerde of niet-geleerde woorden
 * produceren. `assertItemsAllowed` is de runtime-check uit content/validator.
 */
const SEEDS = 300;

const MVP: ReadonlySet<string> = new Set(['m', 'a', 's', 't', 'k', 'r']);
const MID: ReadonlySet<string> = new Set(
  graphemes
    .filter((g) => g.order <= 20)
    .map((g) => g.id),
);

const LEARNED_SETS: readonly { name: string; learned: ReadonlySet<string> }[] = [
  { name: 'mvp', learned: MVP },
  { name: 'mid', learned: MID },
  { name: 'all', learned: ALL_GRAPHEMES },
];

function assertOk(items: readonly ActivityItem[], learned: ReadonlySet<string>, label: string): void {
  const result = assertItemsAllowed(items, learned);
  expect(result.ok, `${label}: ${JSON.stringify(result.issues)}`).toBe(true);
}

describe('generator-sweep: alleen toegestane woorden (EDU-020)', () => {
  for (const { name, learned } of LEARNED_SETS) {
    const words = allowedWords(learned);
    const graphemeIds = [...learned];

    it(`set "${name}": alle generatoren over ${SEEDS} seeds`, () => {
      for (let seed = 1; seed <= SEEDS; seed++) {
        const target = words[seed % Math.max(1, words.length)];

        // Woordgeneratoren (alleen als er genoeg woorden zijn).
        if (target !== undefined && words.length >= 2) {
          const reading = WordReading.generate({
            skillId: 'DE.CVC',
            targetWord: target,
            availableWords: words,
            difficulty: 'B',
            rng: createSeededRng(seed),
            learned,
          });
          assertOk([reading], learned, `${name}#${seed} WordReading`);

          const blending = Blending.generate({
            skillId: 'SY.CVC',
            targetWord: target,
            availableWords: words,
            difficulty: 'C',
            rng: createSeededRng(seed),
            learned,
          });
          assertOk([blending], learned, `${name}#${seed} Blending`);

          const segmenting = Segmenting.generate({
            skillId: 'AN.CVC',
            word: target,
            difficulty: 'A',
            rng: createSeededRng(seed),
            learned,
            availableWords: words,
          });
          assertOk([segmenting], learned, `${name}#${seed} Segmenting`);
        }

        if (words.length >= 2) {
          const klim = Klimboom.generate({
            count: 3,
            difficulty: 'B',
            availableWords: words,
            rng: createSeededRng(seed),
            learned,
          });
          assertOk(klim, learned, `${name}#${seed} Klimboom`);

          const first = FirstSound.generate({
            skillId: 'FN.FIRST_SOUND',
            difficulty: 'B',
            count: 3,
            availableWords: words,
            rng: createSeededRng(seed),
            learned,
          });
          assertOk(first, learned, `${name}#${seed} FirstSound`);
        }

        // Puur auditieve klankjager (fase 1): woorden los van de geleerde set,
        // maar nog steeds binnen de volledige grafeeminventaris.
        const auditory = FirstSound.generate({
          skillId: 'FN.LAST_SOUND',
          difficulty: 'A',
          count: 3,
          availableWords: words,
          rng: createSeededRng(seed),
          auditory: true,
        });
        assertOk(auditory, ALL_GRAPHEMES, `${name}#${seed} FirstSound-auditory`);

        if (graphemeIds.length >= 1) {
          const g = graphemeIds[seed % graphemeIds.length];
          if (g !== undefined) {
            const letter = LetterSound.generate({
              skillId: 'LK.g.SOUND',
              direction: 'grapheme-to-sound',
              targetGrapheme: g,
              learnedGraphemes: learned,
              difficulty: 'B',
              rng: createSeededRng(seed),
            });
            assertOk([letter], learned, `${name}#${seed} LetterSound`);
          }
        }

        // Fonologie is auditief en niet gebonden aan de geleerde set.
        for (const skillId of ['PH.RHYME', 'PH.SYLLABLE'] as const) {
          const ph = Phonology.generate({
            skillId,
            difficulty: 'A',
            count: 3,
            rng: createSeededRng(seed),
          });
          assertOk(ph, ALL_GRAPHEMES, `${name}#${seed} ${skillId}`);
        }
      }
    });
  }
});