import { describe, expect, it } from 'vitest';
import type { AnswerEvent } from '../../types';
import {
  alphaFor,
  createSkillState,
  effectiveItemScore,
  isMastered,
  itemScoreFor,
  updateSkillState,
} from '../Mastery';

function event(overrides: Partial<AnswerEvent> = {}): AnswerEvent {
  return {
    itemId: 'item',
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

const correctFast = (overrides: Partial<AnswerEvent> = {}): AnswerEvent =>
  event({ correct: true, responseMs: 500, ...overrides });

describe('Mastery – EWMA', () => {
  it('berekent alpha = max(0.2, 1/(attempts+1))', () => {
    expect(alphaFor(0)).toBe(1);
    expect(alphaFor(1)).toBe(0.5);
    expect(alphaFor(4)).toBeCloseTo(0.2);
    expect(alphaFor(100)).toBe(0.2);
  });

  it('dekt de itemscore-tabel exact (ED §10.2)', () => {
    expect(itemScoreFor(correctFast(), 4000)).toBe(1.0);
    expect(itemScoreFor(correctFast({ responseMs: 5000 }), 4000)).toBe(0.85);
    expect(itemScoreFor(event({ correct: true, attempt: 2 }), 4000)).toBe(0.5);
    expect(itemScoreFor(event({ correct: true, attempt: 3, usedHint: true }), 4000)).toBe(0.25);
    expect(itemScoreFor(event({ modeled: true, attempt: 3 }), 4000)).toBe(0.0);
    expect(itemScoreFor(event({ isGuess: true, responseMs: 200 }), 4000)).toBe(0.0);
  });

  it('past de FL.*-doeltijd apart toe (ED §10.2)', () => {
    expect(effectiveItemScore(correctFast({ skillId: 'FL.GRAPHEME', responseMs: 1500 }))).toBe(1.0);
    expect(effectiveItemScore(correctFast({ skillId: 'FL.GRAPHEME', responseMs: 2500 }))).toBe(0.6);
    expect(effectiveItemScore(correctFast({ skillId: 'FL.CVC', responseMs: 2500 }))).toBe(1.0);
  });

  it('laat mastery stijgen bij correct en dalen bij modeling', () => {
    let state = createSkillState();
    state = updateSkillState(state, correctFast());
    expect(state.mastery).toBeCloseTo(1);
    expect(state.attempts).toBe(1);
    expect(state.accuracy).toBe(1);

    const dropped = updateSkillState(state, event({ modeled: true, attempt: 3, sessionNumber: 1 }));
    expect(dropped.mastery).toBeCloseTo(0.5);
    expect(dropped.hintsUsed).toBe(1);
    expect(dropped.consecutiveCorrect).toBe(0);
  });

  it('telt een gok (<500 ms én fout) niet mee', () => {
    const before = createSkillState();
    const after = updateSkillState(before, event({ isGuess: true, correct: false, responseMs: 200 }));
    expect(after.mastery).toBe(0);
    expect(after.attempts).toBe(0);
    expect(after.accuracy).toBe(0);
  });

  it('negeert niet-terminale fouten (poging 1/2 zonder modeling)', () => {
    const before = createSkillState();
    const after = updateSkillState(before, event({ correct: false, attempt: 1, responseMs: 900 }));
    expect(after.attempts).toBe(0);
    expect(after.mastery).toBe(0);
  });

  it('markeert pas beheerst bij mastery, items, streak én ≥2 sessies', () => {
    let state = createSkillState();
    for (let i = 0; i < 5; i++) {
      state = updateSkillState(state, correctFast({ sessionNumber: 1 }));
    }
    expect(state.consecutiveCorrect).toBe(5);
    expect(state.sessionsSeen).toBe(1);
    expect(isMastered(state, 6)).toBe(false);

    state = updateSkillState(state, correctFast({ sessionNumber: 2 }));
    expect(state.sessionsSeen).toBe(2);
    expect(state.attempts).toBe(6);
    expect(state.mastery).toBeGreaterThanOrEqual(0.8);
    expect(isMastered(state, 6)).toBe(true);
    expect(isMastered(state, 12)).toBe(false);
  });

  it('houdt accuracy over max 20 items en mediane responstijd', () => {
    let state = createSkillState();
    for (let i = 0; i < 25; i++) {
      state = updateSkillState(
        state,
        i % 2 === 0 ? correctFast({ sessionNumber: 1 }) : event({ correct: false, modeled: true, attempt: 3 }),
      );
    }
    expect(state.attempts).toBe(25);
    // Laatste 20 items: 10 correct (even) + 10 modeled (oneven) = 10/20.
    expect(state.accuracy).toBeCloseTo(10 / 20);
    expect(state.avgResponseMs).toBeCloseTo(500);
  });
});
