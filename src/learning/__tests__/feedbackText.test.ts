/**
 * EDU-R3-001 (algemeen): geen enkele gerenderde feedbackzin mag ooit een
 * `{placeholder}` tonen. We genereren voor elke activiteit echte items, kiezen
 * een fout antwoord en controleren de feedbacktekst voor poging 1, 2 en 3.
 */
import { describe, expect, it } from 'vitest';
import type { ActivityItem } from '../../types';
import { checkAnswer } from '../answer';
import { fbText, wordsForBlock } from '../../content';
import { createSeededRng } from '../../core/rng';
import * as FirstSound from '../FirstSound';
import * as Phonology from '../Phonology';
import * as LetterSound from '../LetterSound';
import * as WordReading from '../WordReading';
import * as Blending from '../Blending';
import * as Segmenting from '../Segmenting';
import * as Klimboom from '../Klimboom';

const MVP = new Set(['m', 'a', 's', 't', 'k', 'r']);
const WORDS = wordsForBlock(1).map((w) => w.word);

function sampleItems(): ActivityItem[] {
  const rng = createSeededRng(2026);
  return [
    ...FirstSound.generate({ skillId: 'FN.FIRST_SOUND', difficulty: 'B', count: 3, availableWords: WORDS, rng, learned: MVP }),
    ...Phonology.generate({ skillId: 'PH.RHYME', difficulty: 'A', count: 2, rng }),
    ...Phonology.generate({ skillId: 'PH.SYLLABLE', difficulty: 'A', count: 2, rng }),
    LetterSound.generate({
      skillId: 'LK.m.SOUND',
      direction: 'grapheme-to-sound',
      targetGrapheme: 'm',
      learnedGraphemes: new Set(['m']),
      difficulty: 'A',
      rng,
      allowUnlearnedAuditoryDistractors: true,
    }),
    LetterSound.generate({
      skillId: 'LK.m.SOUND',
      direction: 'sound-to-grapheme',
      targetGrapheme: 'm',
      learnedGraphemes: new Set(['m']),
      difficulty: 'A',
      rng,
    }),
    WordReading.generate({ skillId: 'DE.CVC', targetWord: 'kat', availableWords: WORDS, difficulty: 'B', rng, learned: MVP }),
    Blending.generate({ skillId: 'SY.CVC', targetWord: 'kat', availableWords: WORDS, difficulty: 'A', rng, learned: MVP }),
    Segmenting.generate({ skillId: 'AN.CVC', word: 'kam', difficulty: 'A', rng, learned: MVP, availableWords: WORDS }),
    ...Klimboom.generate({ count: 3, difficulty: 'A', availableWords: WORDS, rng, learned: MVP, skillId: 'DE.CVC' }),
  ];
}

describe('feedbacktekst – nooit een {placeholder} (EDU-R3-001)', () => {
  it('vult alle placeholders in zichtbare feedback over alle activiteiten', () => {
    const items = sampleItems();
    expect(items.length).toBeGreaterThan(0);
    for (const item of items) {
      const wrong = item.options.find((o) => o.id !== item.targetId);
      if (!wrong || item.options.length < 2) continue;
      for (const attempt of [1, 2, 3]) {
        const result = checkAnswer(item, { optionId: wrong.id, attempt });
        const text = fbText(result.feedbackKey, result.feedbackVars ?? {});
        expect(text, `${item.kind}/${result.feedbackKey}`).not.toContain('{');
        expect(text, `${item.kind}/${result.feedbackKey}`).not.toContain('}');
        // Geen key-lek in de zichtbare tekst.
        expect(text, `${item.kind}/${result.feedbackKey}`).not.toContain('fb.');
      }
    }
  });
});
