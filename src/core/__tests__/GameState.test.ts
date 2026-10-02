import { describe, expect, it } from 'vitest';
import type { AnswerEvent, Profile } from '../../types';
import { createFreshProfile } from '../SaveSystem';
import { createSkillState } from '../Mastery';
import {
  createInitialState,
  getSkillDetail,
  introduceGrapheme,
  recordAnswer,
  startNewSession,
  syncRewards,
} from '../GameState';

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

function baseProfile(): Profile {
  return createFreshProfile(0, () => 0.5);
}

describe('GameState', () => {
  it('werkt mastery én Leitner bij na een correct antwoord', () => {
    const state = createInitialState(baseProfile());
    const next = recordAnswer(state, event());
    expect(next.profile.skills['DE.CVC']?.mastery).toBeGreaterThan(0);
    expect(next.profile.items['kam']?.leitnerBox).toBe(2);
    expect(next.consecutiveModeled).toBe(0);
  });

  it('laat een gok-event de toestand ongemoeid', () => {
    const state = createInitialState(baseProfile());
    const next = recordAnswer(state, event({ correct: false, isGuess: true, responseMs: 200, itemScore: 0 }));
    expect(next.profile.skills['DE.CVC']).toBeUndefined();
    expect(next.profile.items['kam']).toBeUndefined();
  });

  it('telt gemodelleerde items op rij (frustratiestop)', () => {
    let state = createInitialState(baseProfile());
    for (let i = 0; i < 3; i++) {
      state = recordAnswer(state, event({ correct: false, modeled: true, attempt: 3, itemScore: 0 }));
    }
    expect(state.consecutiveModeled).toBe(3);
    expect(getSkillDetail(state, 'DE.CVC')?.attempts).toBe(3);
  });

  it('geeft een grafeem vrij en maakt de bijbehorende skills aan', () => {
    const state = createInitialState(baseProfile());
    const next = introduceGrapheme(state, 'm');
    expect(next.profile.unlockedGraphemes).toContain('m');
    expect(next.profile.skills['LK.m.SOUND']).toBeDefined();
    expect(next.profile.skills['LK.m.RECOGNIZE']).toBeDefined();
    expect(next.introducedGraphemeThisSession).toBe(true);
  });

  it('kent deterministisch een blad en vriendjeskaart toe bij LK.SOUND ≥ 0.8', () => {
    const profile = baseProfile();
    profile.unlockedGraphemes = ['m'];
    profile.skills['LK.m.SOUND'] = createSkillState({ mastery: 0.9 });
    const rewarded = syncRewards(profile);
    expect(rewarded.rewards.leaves).toContain('m');
    expect(rewarded.rewards.vriendjeskaarten).toContain('m');
  });

  it('start een nieuwe sessie met opgehoogde teller', () => {
    const state = createInitialState(baseProfile());
    const next = startNewSession(state);
    expect(next.sessionNumber).toBe(2);
    expect(next.profile.sessionCount).toBe(1);
  });
});
