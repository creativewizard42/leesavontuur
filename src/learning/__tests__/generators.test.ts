import { describe, expect, it } from 'vitest';
import { createSeededRng } from '../../core/rng';
import { getWord, isWordAllowed } from '../../content';
import { checkAnswer } from '../answer';
import * as FirstSound from '../FirstSound';
import * as LetterSound from '../LetterSound';
import * as Segmenting from '../Segmenting';
import * as Blending from '../Blending';
import * as WordReading from '../WordReading';
import * as Klimboom from '../Klimboom';
import { allowedWords } from '../util';

const MVP = new Set(['m', 'a', 's', 't', 'k', 'r']);
const WORDS = allowedWords(MVP);

function seed(n: number) {
  return createSeededRng(n);
}

describe('LetterSound', () => {
  it('keurt correct goed en incorrect fout met de juiste feedbacktrap', () => {
    const item = LetterSound.generate({
      skillId: 'LK.m.SOUND',
      direction: 'grapheme-to-sound',
      targetGrapheme: 'm',
      learnedGraphemes: MVP,
      difficulty: 'B',
      rng: seed(1),
    });

    expect(checkAnswer(item, { optionId: item.targetId, attempt: 1 }).correct).toBe(true);

    const wrong = item.options.find((o) => o.id !== item.targetId);
    expect(wrong).toBeDefined();
    const attempt1 = checkAnswer(item, { optionId: wrong!.id, attempt: 1 });
    expect(attempt1.correct).toBe(false);
    expect(attempt1.feedbackKey).toBe('fb.try1.2');
    expect(checkAnswer(item, { optionId: wrong!.id, attempt: 2 }).feedbackKey).toBe('fb.hint.2');
    const attempt3 = checkAnswer(item, { optionId: wrong!.id, attempt: 3 });
    expect(attempt3.modeled).toBe(true);
    expect(attempt3.feedbackKey).toBe('fb.model.4');
  });

  it('zet ei en ij (en ou/au) nooit samen als opties', () => {
    const item = LetterSound.generate({
      skillId: 'LK.ei.SOUND',
      direction: 'sound-to-grapheme',
      targetGrapheme: 'ei',
      learnedGraphemes: new Set(['ei', 'ij', 'ou', 'au']),
      difficulty: 'C',
      rng: seed(2),
    });
    const ids = item.options.map((o) => o.id);
    expect(ids).not.toContain('g:ij');
    // ou en au mogen nooit samen als opties verschijnen (zelfde klank).
    expect(ids.includes('g:ou') && ids.includes('g:au')).toBe(false);
    expect(ids).toContain('g:ei');
  });

  it('toont bij klank → letter de geschreven letters en nooit een plaatje', () => {
    const item = LetterSound.generate({
      skillId: 'LK.m.RECOGNIZE',
      direction: 'sound-to-grapheme',
      targetGrapheme: 'm',
      learnedGraphemes: MVP,
      difficulty: 'A',
      rng: seed(3),
    });
    expect(item.options.every((o) => o.image === undefined)).toBe(true);
    expect(item.options.some((o) => o.label === 'm')).toBe(true);
  });
});

describe('Segmenting', () => {
  it('hakt kam in k-a-m en telt 3 klanken', () => {
    expect(Segmenting.segment('kam')).toEqual(['k', 'a', 'm']);
    const item = Segmenting.generate({
      skillId: 'AN.CVC',
      word: 'kam',
      rng: seed(4),
      difficulty: 'A',
      learned: MVP,
      availableWords: WORDS,
    });
    expect(item.metadata?.['phonemeCount']).toBe(3);
    expect(item.metadata?.['graphemes']).toEqual(['k', 'a', 'm']);
    expect(item.options.find((o) => o.id === item.targetId)?.label).toBe('k-a-m');
    expect(checkAnswer(item, { optionId: item.targetId }).correct).toBe(true);
  });

  it('maakt een FN.COUNT-variant met het aantal klanken', () => {
    const item = Segmenting.generate({ skillId: 'FN.COUNT', word: 'tas', rng: seed(5) });
    expect(item.options.find((o) => o.id === item.targetId)?.label).toBe('3');
  });
});

describe('Blending', () => {
  it('kiest het juiste woord bij gerekte klanken en gebruikt alleen toegestane afleiders', () => {
    const item = Blending.generate({
      skillId: 'SY.CVC',
      targetWord: 'kam',
      availableWords: WORDS,
      difficulty: 'C',
      rng: seed(6),
      learned: MVP,
    });
    expect(item.kind).toBe('plakken');
    expect(item.targetId).toBe('kam');
    expect(item.options.length).toBeGreaterThanOrEqual(2);
    for (const option of item.options) {
      expect(isWordAllowed(option.id, MVP)).toBe(true);
    }
    expect(checkAnswer(item, { optionId: 'kam' }).correct).toBe(true);
    const wrong = item.options.find((o) => o.id !== 'kam');
    expect(checkAnswer(item, { optionId: wrong!.id }).correct).toBe(false);
  });
});

describe('WordReading – anti-raad', () => {
  it('toont geen plaatje vóór het antwoord en bewaart het plaatje voor ná correct', () => {
    const item = WordReading.generate({
      skillId: 'DE.CVC',
      targetWord: 'kam',
      availableWords: WORDS,
      difficulty: 'B',
      rng: seed(7),
      learned: MVP,
    });
    expect(item.options.every((o) => o.image === undefined)).toBe(true);
    expect(item.metadata?.['revealImage']).toBe(getWord('kam')?.image);
    // Het doelwoord wordt wél getoond (dat is de leesoefening), maar niet de audio vooraf.
    expect(item.prompt.showText).toBe(true);
    expect(item.prompt.text).toBe('kam');
  });
});

describe('Generatoren gebruiken nooit niet-geleerde grafemen (property over seeds)', () => {
  const learnedSets: ReadonlySet<string>[] = [MVP, new Set(['m', 'a', 's', 't'])];

  for (const learned of learnedSets) {
    const words = allowedWords(learned);

    it(`beperkt alle opties tot de geleerde set (${[...learned].join('')})`, () => {
      for (let s = 1; s <= 25; s++) {
        const rng = seed(s);
        const target = words[s % words.length] ?? 'mat';

        const reading = WordReading.generate({
          skillId: 'DE.CVC',
          targetWord: target,
          availableWords: words,
          difficulty: 'B',
          rng,
          learned,
        });
        for (const option of reading.options) {
          expect(isWordAllowed(option.id, learned), `woord ${option.id}`).toBe(true);
        }

        const blending = Blending.generate({
          skillId: 'SY.CVC',
          targetWord: target,
          availableWords: words,
          difficulty: 'B',
          rng,
          learned,
        });
        for (const option of blending.options) {
          expect(isWordAllowed(option.id, learned), `woord ${option.id}`).toBe(true);
        }

        const klim = Klimboom.generate({
          count: 3,
          difficulty: 'B',
          availableWords: words,
          rng,
          learned,
        });
        for (const item of klim) {
          for (const option of item.options) {
            expect(isWordAllowed(option.id, learned), `woord ${option.id}`).toBe(true);
          }
        }

        const first = FirstSound.generate({
          skillId: 'FN.FIRST_SOUND',
          difficulty: 'B',
          count: 3,
          availableWords: words,
          rng,
          learned,
        });
        for (const item of first) {
          for (const option of item.options) {
            expect(isWordAllowed(option.id, learned), `woord ${option.id}`).toBe(true);
          }
        }

        const letter = LetterSound.generate({
          skillId: 'LK.m.SOUND',
          direction: 'grapheme-to-sound',
          targetGrapheme: 'm',
          learnedGraphemes: learned,
          difficulty: 'B',
          rng,
        });
        for (const option of letter.options) {
          expect(learned.has(option.id.slice(2))).toBe(true);
        }
      }
    });
  }
});
