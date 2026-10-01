/**
 * Anti-raad-garanties over veel seeds (EDU-014, EDU-004, QA-006, EDU-020):
 * afleiders even lang, alleen geleerde grafemen, geen dubbel-juiste opties en
 * het antwoord wordt niet verraden.
 */
import { describe, expect, it } from 'vitest';
import { createSeededRng } from '../../core/rng';
import { getWord, isBlockedWord, isWordAllowed } from '../../content';
import * as FirstSound from '../FirstSound';
import * as LetterSound from '../LetterSound';
import * as Segmenting from '../Segmenting';
import * as Blending from '../Blending';
import * as WordReading from '../WordReading';
import * as Klimboom from '../Klimboom';
import { allowedWordObjects, allowedWords } from '../util';
import { chooseCorrectIndex, placeOptions } from '../util';

const SEEDS = 300;
const MVP = new Set(['m', 'a', 's', 't', 'k', 'r']);
const LEARNED_SETS: ReadonlySet<string>[] = [MVP, new Set(['m', 'a', 's', 't'])];

function relevant(word: string, last: boolean): string | undefined {
  const g = getWord(word)?.graphemes;
  if (!g) return undefined;
  return last ? g[g.length - 1] : g[0];
}

describe('Afleiders – alleen geleerde grafemen, over 300 seeds', () => {
  for (const learned of LEARNED_SETS) {
    const label = [...learned].join('');
    it(`decodeeropties blijven binnen de geleerde set (${label})`, () => {
      const words = allowedWords(learned);
      for (let seed = 1; seed <= SEEDS; seed++) {
        const rng = createSeededRng(seed);
        const target = words[seed % words.length] ?? 'mat';
        const reading = WordReading.generate({ skillId: 'DE.CVC', targetWord: target, availableWords: words, difficulty: 'B', rng, learned });
        for (const option of reading.options) expect(isWordAllowed(option.id, learned), `read ${option.id}`).toBe(true);
        expect(isBlockedWord(reading.targetId)).toBe(false);

        const blending = Blending.generate({ skillId: 'SY.CVC', targetWord: target, availableWords: words, difficulty: 'B', rng, learned });
        for (const option of blending.options) expect(isWordAllowed(option.id, learned), `blend ${option.id}`).toBe(true);

        const klim = Klimboom.generate({ count: 2, difficulty: 'B', availableWords: words, rng, learned });
        for (const item of klim) for (const option of item.options) expect(isWordAllowed(option.id, learned)).toBe(true);

        const first = FirstSound.generate({ skillId: 'FN.FIRST_SOUND', difficulty: 'B', count: 2, availableWords: words, rng, learned });
        for (const item of first) for (const option of item.options) expect(isWordAllowed(option.id, learned)).toBe(true);

        const lastSound = FirstSound.generate({ skillId: 'FN.LAST_SOUND', difficulty: 'B', count: 2, availableWords: words, rng, learned });
        for (const item of lastSound) for (const option of item.options) expect(isWordAllowed(option.id, learned)).toBe(true);

        const letter = LetterSound.generate({ skillId: 'LK.m.SOUND', direction: 'grapheme-to-sound', targetGrapheme: 'm', learnedGraphemes: learned, difficulty: 'B', rng });
        for (const option of letter.options) expect(learned.has(option.id.slice(2))).toBe(true);
      }
    });
  }
});

describe('Afleiders – gelijke woordlengte (ED §11 regel 6)', () => {
  it('kiest bij elk decodeerdoel alleen even lange afleiders', () => {
    const pool = allowedWordObjects(MVP);
    const withPeer = pool.filter((w) => pool.some((o) => o.word !== w.word && o.graphemes.length === w.graphemes.length));
    let checked = 0;
    for (let seed = 1; seed <= SEEDS; seed++) {
      const rng = createSeededRng(seed);
      const target = withPeer[seed % withPeer.length];
      if (!target) continue;
      checked += 1;
      for (const difficulty of ['A', 'B', 'C'] as const) {
        const item = WordReading.generate({ skillId: 'DE.CVC', targetWord: target.word, availableWords: pool.map((w) => w.word), difficulty, rng, learned: MVP });
        const labelled = item.options.filter((o) => o.label !== undefined || o.id === item.targetId);
        for (const option of labelled) {
          const word = getWord(option.id);
          if (word) expect(word.graphemes.length, `seed ${seed} ${target.word}->${option.id}`).toBe(target.graphemes.length);
        }
      }
    }
    expect(checked).toBeGreaterThan(100);
  });
});

describe('FirstSound – elke kandidaat beluisterbaar, nooit dubbel-juist (EDU-005)', () => {
  it('heeft audio op elke optie en markeert luisteren-vóór-kiezen', () => {
    for (let seed = 1; seed <= 100; seed++) {
      const rng = createSeededRng(seed);
      const items = FirstSound.generate({ skillId: 'FN.FIRST_SOUND', difficulty: 'B', count: 3, availableWords: allowedWords(MVP), rng, learned: MVP });
      for (const item of items) {
        expect(item.metadata?.['interaction']).toBe('listen-then-choose');
        expect(item.metadata?.['listenFirst']).toBe(true);
        for (const option of item.options) expect(option.audio, `${item.id} ${option.id}`).toBeDefined();
        expect(item.metadata?.['candidateIds']).toEqual(item.options.map((o) => o.id));
      }
    }
  });

  it('heeft precies één optie met de doelklank (geen dubbel-correct)', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const rng = createSeededRng(seed);
      const last = seed % 2 === 0;
      const items = FirstSound.generate({
        skillId: last ? 'FN.LAST_SOUND' : 'FN.FIRST_SOUND',
        difficulty: 'B',
        count: 3,
        availableWords: allowedWords(MVP),
        rng,
        learned: MVP,
      });
      for (const item of items) {
        const targetSound = relevant(item.targetId, last);
        const matches = item.options.filter((o) => relevant(o.id, last) === targetSound);
        expect(matches).toHaveLength(1);
      }
    }
  });
});

describe('Segmenting – verraadt het antwoord niet (EDU-003)', () => {
  it('toont nooit de gesegmenteerde vorm als optie', () => {
    for (let seed = 1; seed <= 100; seed++) {
      const item = Segmenting.generate({ skillId: 'AN.CVC', word: 'kam', rng: createSeededRng(seed), difficulty: 'B', learned: MVP });
      for (const option of item.options) {
        expect((option.label ?? '').includes('-')).toBe(false);
        expect(option.label).not.toBe('k-a-m');
      }
      expect(item.metadata?.['tapUnits']).toEqual(['k', 'a', 'm']);
      expect(item.prompt.showText).toBe(false);
    }
  });
});

describe('Positie van het juiste antwoord – gelijkmatig verdeeld (ED §10.5 regel 6)', () => {
  it('verdeelt de correcte index over alle posities zonder 3× op rij', () => {
    const n = 3;
    const avoid: number[] = [];
    const counts = new Array<number>(n).fill(0);
    let lastRun = 0;
    let previous = -1;
    for (let i = 0; i < 300; i++) {
      const index = chooseCorrectIndex(n, createSeededRng(i + 1), avoid);
      counts[index] = (counts[index] ?? 0) + 1;
      lastRun = index === previous ? lastRun + 1 : 1;
      expect(lastRun).toBeLessThanOrEqual(2);
      previous = index;
      avoid.push(index);
    }
    const min = Math.min(...counts);
    const max = Math.max(...counts);
    expect(min).toBeGreaterThan(60);
    expect(max).toBeLessThan(140);
    expect(counts.reduce((a, b) => a + b, 0)).toBe(300);
  });

  it('plaatst precies één juiste optie', () => {
    for (let seed = 1; seed <= 50; seed++) {
      const { options, targetId } = placeOptions(
        { id: 'good' },
        [
          { id: 'b1' },
          { id: 'b2' },
          { id: 'b3' },
        ],
        createSeededRng(seed),
      );
      expect(options.filter((o) => o.correct)).toHaveLength(1);
      expect(options.find((o) => o.id === targetId)?.correct).toBe(true);
    }
  });
});
