import { describe, expect, it } from 'vitest';
import type { AnswerEvent, ItemState, Profile } from '../../types';
import { createFreshProfile } from '../SaveSystem';
import {
  degrade,
  dueItemKeys,
  isDue,
  promote,
  selectDueSkills,
  updateItemState,
  MASTERED_BOX,
  MAX_BOX,
} from '../SpacedRepetition';

function baseEvent(overrides: Partial<AnswerEvent> = {}): AnswerEvent {
  return {
    itemId: 'i',
    skillId: 'DE.CVC',
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

function profileWithItems(items: ItemState[]): Profile {
  const profile = createFreshProfile(0, () => 0.5);
  profile.items = Object.fromEntries(items.map((i) => [i.itemKey, i]));
  return profile;
}

function item(itemKey: string, leitnerBox: number, lastSeenSession: number): ItemState {
  return { itemKey, skillId: 'DE.CVC', leitnerBox, lastSeenSession, consecutiveCorrect: 0 };
}

describe('SpacedRepetition – Leitner', () => {
  it('hanteert de box-intervallen 1/2/4/8/16', () => {
    expect(isDue(1, 5, 4)).toBe(true); // elke sessie
    expect(isDue(2, 5, 4)).toBe(false);
    expect(isDue(2, 5, 3)).toBe(true);
    expect(isDue(5, 20, 4)).toBe(true); // 16
    expect(isDue(5, 19, 4)).toBe(false);
    expect(isDue(3, 5, 1)).toBe(true); // 4
  });

  it('promoveert en degradeert volgens ED §10.4', () => {
    expect(promote(1)).toBe(2);
    expect(promote(MAX_BOX)).toBe(MAX_BOX);
    expect(degrade(1, 0)).toBe(1);
    expect(degrade(2, 0)).toBe(1);
    expect(degrade(3, 0)).toBe(1);
    expect(degrade(3, 0.5)).toBe(2);
    expect(degrade(4, 0)).toBe(2);
    expect(degrade(5, 0)).toBe(2);
  });

  it('werkt een item bij: promotie bij 1e-poging-correct, degradatie bij fout', () => {
    const start = item('kam', 2, 0);
    const promoted = updateItemState(start, baseEvent({ correct: true, attempt: 1 }), 3);
    expect(promoted.leitnerBox).toBe(3);
    expect(promoted.lastSeenSession).toBe(3);

    const failed = updateItemState(start, baseEvent({ correct: false, modeled: true, attempt: 3 }), 4);
    expect(failed.leitnerBox).toBe(1);
  });

  it('geeft zwakke items vaker terug en laat vergeten items terugkomen', () => {
    const profile = profileWithItems([
      item('zwak', 1, 0),
      item('sterk', 5, 4),
    ]);
    expect(dueItemKeys(profile, 5)).toEqual(['zwak']);

    const forgotten = profileWithItems([item('box5', 5, 1)]);
    expect(dueItemKeys(forgotten, 20)).toEqual(['box5']);
  });

  it('sorteert due items zwakste box eerst', () => {
    const profile = profileWithItems([
      item('b3', 3, 0),
      item('b1', 1, 0),
      item('b2', 2, 0),
    ]);
    expect(selectDueSkills(profile, 100).map((i) => i.itemKey)).toEqual(['b1', 'b2', 'b3']);
  });

  it('MASTERED_BOX is 3', () => {
    expect(MASTERED_BOX).toBe(3);
  });
});
