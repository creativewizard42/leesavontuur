import { describe, expect, it } from 'vitest';
import type { AnswerEvent } from '../../types';
import { createSkillState } from '../Mastery';
import {
  audioSupportFor,
  distractorStrategyFor,
  nextDifficulty,
  optionCountFor,
  shouldSimplify,
  shouldStopForFrustration,
} from '../Adaptive';

function event(overrides: Partial<AnswerEvent> = {}): AnswerEvent {
  return {
    itemId: 'i',
    skillId: 'LK.m.SOUND',
    sessionNumber: 1,
    timestamp: 0,
    selectedOptionId: 'x',
    correct: false,
    attempt: 1,
    usedHint: false,
    modeled: false,
    responseMs: 1000,
    isGuess: false,
    itemScore: 0,
    ...overrides,
  };
}

describe('Adaptive – niveau, opties en frustratie', () => {
  it('geeft 2 → 3 → 4 opties', () => {
    expect(optionCountFor('A')).toBe(2);
    expect(optionCountFor('B')).toBe(3);
    expect(optionCountFor('C')).toBe(4);
    expect(optionCountFor('D')).toBe(4);
  });

  it('kiest de afleider-strategie per niveau', () => {
    expect(distractorStrategyFor('A')).toBe('maximally-different');
    expect(distractorStrategyFor('D')).toBe('classic-confusion');
  });

  it('maakt moeilijker bij veel goed (mastery > 0.85 en streak ≥ 5)', () => {
    const strong = createSkillState({ mastery: 0.9, consecutiveCorrect: 5, attempts: 8 });
    expect(nextDifficulty('A', strong)).toBe('B');
    expect(nextDifficulty('C', strong)).toBe('D');
    expect(nextDifficulty('D', strong)).toBe('D');
  });

  it('maakt eenvoudiger bij veel fouten', () => {
    const weak = createSkillState({ mastery: 0.4, attempts: 6, consecutiveCorrect: 0 });
    expect(nextDifficulty('C', weak)).toBe('B');
    expect(nextDifficulty('B', weak)).toBe('A');
    expect(nextDifficulty('A', weak)).toBe('A');
  });

  it('geeft extra audio-ondersteuning bij niveau A of lage mastery', () => {
    expect(audioSupportFor(createSkillState({ mastery: 0.9 }), 'A')).toBe(true);
    expect(audioSupportFor(createSkillState({ mastery: 0.9 }), 'C')).toBe(false);
    expect(audioSupportFor(createSkillState({ mastery: 0.3 }), 'C')).toBe(true);
  });

  it('vereenvoudigt na 6 items met lage mastery of 2× s ≤ 0.25', () => {
    const weak = createSkillState({ mastery: 0.4, attempts: 6 });
    expect(shouldSimplify(weak, [])).toBe(true);

    const states = createSkillState({ mastery: 0.7, attempts: 8 });
    const recent = [
      event({ correct: false, modeled: true, itemScore: 0 }),
      event({ correct: true, attempt: 3, usedHint: true, itemScore: 0.25 }),
    ];
    expect(shouldSimplify(states, recent)).toBe(true);
    expect(shouldSimplify(states, [event({ correct: true, itemScore: 1 })])).toBe(false);
  });

  it('stopt bij frustratie na 3 gemodelleerde items', () => {
    expect(shouldStopForFrustration(2)).toBe(false);
    expect(shouldStopForFrustration(3)).toBe(true);
  });
});
