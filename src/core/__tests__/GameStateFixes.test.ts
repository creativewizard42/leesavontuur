/**
 * Engine-fixes: idempotent afronden (QA-005) en nooit scoren van ongescoorde of
 * 1-optie-items (QA-006 / EDU-004).
 */
import { describe, expect, it } from 'vitest';
import type { ActivityItem, AnswerEvent, Profile } from '../../types';
import { createFreshProfile } from '../SaveSystem';
import { completeSession, createInitialState, recordAnswer, recordItemAnswer, startNewSession } from '../GameState';

function event(overrides: Partial<AnswerEvent> = {}): AnswerEvent {
  return {
    itemId: 'item',
    skillId: 'DE.CVC',
    itemKey: 'kam',
    sessionNumber: 1,
    timestamp: 0,
    selectedOptionId: 'kam',
    correct: true,
    attempt: 1,
    usedHint: false,
    modeled: false,
    responseMs: 1200,
    isGuess: false,
    itemScore: 1,
    ...overrides,
  };
}

function item(options: number, scored?: boolean): ActivityItem {
  const opts = Array.from({ length: options }, (_, i) => ({ id: `o${i}`, correct: i === 0 }));
  return {
    id: 'item',
    skillId: 'DE.CVC',
    kind: 'woordlezen',
    prompt: { text: 'kam', showText: true },
    options: opts,
    targetId: 'o0',
    difficulty: 'B',
    isRetry: false,
    metadata: scored === undefined ? {} : { scored },
  };
}

function baseProfile(): Profile {
  return createFreshProfile(0, () => 0.5);
}

describe('GameState – idempotent afronden (QA-005)', () => {
  it('telt een dubbele finish met hetzelfde sessie-id maar één keer', () => {
    let state = createInitialState(baseProfile());
    const sessionId = state.sessionNumber;
    state = completeSession(state, sessionId);
    const afterFirst = state;
    state = completeSession(state, sessionId);
    expect(state.profile.rewards.klankvonkjes).toBe(1);
    expect(state.profile.sessionCount).toBe(1);
    expect(state).toBe(afterFirst);
  });

  it('laat een volgende sessie normaal afronden', () => {
    let state = createInitialState(baseProfile());
    state = completeSession(state, state.sessionNumber);
    state = completeSession(state, state.sessionNumber);
    expect(state.profile.sessionCount).toBe(2);
    expect(state.profile.rewards.klankvonkjes).toBe(2);
  });

  it('houdt startNewSession als dunne wrapper werkend', () => {
    const next = startNewSession(createInitialState(baseProfile()));
    expect(next.sessionNumber).toBe(2);
    expect(next.profile.sessionCount).toBe(1);
  });
});

describe('GameState – vonkje per leesstap (EDU-027)', () => {
  function readingItem(step: number, id: string): ActivityItem {
    return {
      id,
      skillId: 'DE.CVC',
      kind: 'woordlezen',
      prompt: { text: 'kam', showText: true },
      options: [
        { id: `${id}.o0`, correct: true },
        { id: `${id}.o1`, correct: false },
      ],
      targetId: `${id}.o0`,
      difficulty: 'A',
      isRetry: false,
      metadata: { step },
    };
  }

  it('kent één vonkje per afgeronde leesstap 3–6 toe', () => {
    let state = createInitialState(baseProfile());
    for (const step of [3, 4, 5, 6]) {
      const it = readingItem(step, `i${step}`);
      state = recordItemAnswer(state, event({ itemId: it.id }), it);
    }
    state = completeSession(state, state.sessionNumber);
    expect(state.profile.rewards.klankvonkjes).toBe(4);
  });

  it('geeft minstens één vonkje bij een sessie zonder leesstappen', () => {
    let state = createInitialState(baseProfile());
    state = completeSession(state, state.sessionNumber);
    expect(state.profile.rewards.klankvonkjes).toBe(1);
  });
});

describe('GameState – ongescoorde items (QA-006 / EDU-004)', () => {
  it('negeert items met één optie volledig', () => {
    const state = createInitialState(baseProfile());
    const next = recordItemAnswer(state, event(), item(1));
    expect(next).toBe(state);
    expect(next.profile.skills['DE.CVC']).toBeUndefined();
    expect(next.profile.items['kam']).toBeUndefined();
  });

  it('negeert expliciet ongescoorde items (modeling/kennismaking)', () => {
    const state = createInitialState(baseProfile());
    const next = recordItemAnswer(state, event(), item(3, false));
    expect(next).toBe(state);
  });

  it('scoort gewone items met ≥ 2 opties', () => {
    const state = createInitialState(baseProfile());
    const next = recordItemAnswer(state, event(), item(3));
    expect(next.profile.skills['DE.CVC']?.mastery).toBeGreaterThan(0);
    expect(next.profile.items['kam']?.leitnerBox).toBe(2);
  });

  it('scoort het secundaire doel mee (EDU-021)', () => {
    const state = createInitialState(baseProfile());
    const next = recordAnswer(state, event({ skillId: 'FN.COUNT', secondarySkillId: 'AN.CVC' }));
    expect(next.profile.skills['FN.COUNT']?.attempts).toBeGreaterThan(0);
    expect(next.profile.skills['AN.CVC']?.attempts).toBeGreaterThan(0);
  });
});
