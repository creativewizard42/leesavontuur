import { describe, expect, it } from 'vitest';
import { ALL_GRAPHEMES } from '../../learning/util';
import { createSeededRng } from '../../core/rng';
import * as Phonology from '../../learning/Phonology';
import { isBlockedWord } from '../blocklist';
import { assertItemsAllowed } from '../validator';
import {
  PHONOLOGY_KNOWN_WORDS,
  RHYME_GROUPS,
  SYLLABLE_WORDS,
  allPhonologyWords,
  rhymeTail,
} from '../phonology';

describe('phonologie-bank (EDU-002/EDU-013/EDU-020)', () => {
  it('bevat geen blokkeerwoorden', () => {
    for (const word of allPhonologyWords()) {
      expect(isBlockedWord(word), word).toBe(false);
    }
  });

  it('bevat alleen gecureerde, bestaande woorden (geen appelap/lis/kaam/aam)', () => {
    for (const word of allPhonologyWords()) {
      expect(PHONOLOGY_KNOWN_WORDS.has(word), word).toBe(true);
      expect(/^[a-z]+$/.test(word), word).toBe(true);
    }
    for (const verboden of ['appelap', 'lis', 'kaam', 'aam', 'poep', 'maan-kan']) {
      expect(allPhonologyWords()).not.toContain(verboden);
    }
  });

  it('laat alle woorden in een rijmgroep exact rijmen', () => {
    for (const group of RHYME_GROUPS) {
      expect(group.length, group.join('/')).toBeGreaterThanOrEqual(2);
      const tails = new Set(group.map((w) => rhymeTail(w)));
      expect(tails.size, `${group.join('/')} → ${[...tails].join(',')}`).toBe(1);
    }
  });

  it('maan rijmt niet met kan (korte/lange klinker)', () => {
    expect(rhymeTail('maan')).toBe('aan');
    expect(rhymeTail('kan')).toBe('an');
  });

  it('heeft realistische lettergrepen (1–3) en geen niet-bestaande woorden', () => {
    for (const entry of SYLLABLE_WORDS) {
      expect(entry.syllables).toBeGreaterThanOrEqual(1);
      expect(entry.syllables).toBeLessThanOrEqual(3);
      expect(PHONOLOGY_KNOWN_WORDS.has(entry.word), entry.word).toBe(true);
    }
    expect(SYLLABLE_WORDS.some((e) => e.word === 'appelap')).toBe(false);
    // banaan is 2 lettergrepen, niet 3 (oud-vangnet).
    expect(SYLLABLE_WORDS.some((e) => e.word === 'banaan')).toBe(false);
  });
});

describe('PH-generatoren over veel seeds (EDU-020)', () => {
  for (const skillId of ['PH.RHYME', 'PH.SYLLABLE'] as const) {
    it(`${skillId}: geen blokkeerwoord of onbekend woord`, () => {
      for (let seed = 1; seed <= 200; seed++) {
        const items = Phonology.generate({
          skillId,
          difficulty: 'A',
          count: 3,
          rng: createSeededRng(seed),
        });
        const result = assertItemsAllowed(items, ALL_GRAPHEMES);
        expect(result.ok, JSON.stringify(result.issues)).toBe(true);
        if (skillId === 'PH.RHYME') {
          for (const item of items) {
            for (const option of item.options) {
              if (/^[a-z]+$/.test(option.id)) {
                expect(PHONOLOGY_KNOWN_WORDS.has(option.id), `${seed}:${option.id}`).toBe(true);
              }
            }
          }
        }
      }
    });
  }
});
