/**
 * Adaptieve sessiequeue: bijsturen (QA-010), re-queue (QA-009),
 * frustratiestop (QA-008) en hervatten (QA-007).
 */
import { describe, expect, it } from 'vitest';
import type { ActivityItem, AnswerEvent, Profile } from '../../types';
import { createMemoryStorage } from '../SaveSystem';
import { createFreshProfile } from '../SaveSystem';
import { createSkillState } from '../Mastery';
import {
  createSessionQueue,
  loadSessionState,
  RESUME_TTL_MS,
  saveSessionState,
  SessionQueue,
  type SessionPlan,
} from '../SessionPlanner';

function makeItem(id: string, skillId: string, options: number, difficulty: 'A' | 'B' | 'C' = 'C'): ActivityItem {
  return {
    id,
    skillId,
    kind: 'woordlezen',
    prompt: { text: 'kam', showText: true },
    options: Array.from({ length: options }, (_, i) => ({ id: `${id}.o${i}`, label: `${i}`, correct: i === 0 })),
    targetId: `${id}.o0`,
    difficulty,
    isRetry: false,
    itemKey: id,
    metadata: {},
  };
}

function event(item: ActivityItem, overrides: Partial<AnswerEvent> = {}): AnswerEvent {
  return {
    itemId: item.id,
    skillId: item.skillId,
    itemKey: item.itemKey,
    sessionNumber: 1,
    timestamp: 0,
    selectedOptionId: item.targetId,
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

function plan(items: ActivityItem[]): SessionPlan {
  return {
    sessionNumber: 1,
    sections: [
      { step: 5, name: 'Woorden lezen', items },
      { step: 8, name: 'Beloning', items: [makeItem('reward', 'REWARD', 1)] },
    ],
  };
}

function profileWithWeakSkill(): Profile {
  const profile = createFreshProfile(0, () => 0.5);
  profile.unlockedGraphemes = ['m', 'a'];
  profile.skills['DE.CVC'] = createSkillState({ mastery: 0.2, attempts: 6 });
  profile.skills['LK.m.SOUND'] = createSkillState({
    mastery: 0.95,
    attempts: 12,
    consecutiveCorrect: 4,
    sessionsSeen: 2,
  });
  return profile;
}

describe('SessionQueue – adaptieve keuzes (QA-010)', () => {
  it('vereenvoudigt komende items van hetzelfde doel (4→3→2)', () => {
    const items = [makeItem('a', 'DE.CVC', 4), makeItem('b', 'DE.CVC', 4), makeItem('c', 'DE.CVC', 4)];
    const profile = profileWithWeakSkill();
    const queue = createSessionQueue(plan(items), { sessionNumber: 1, profile, learned: new Set(['m', 'a']) });

    const first = queue.current();
    queue.reportOutcome(event(first!, { correct: false, attempt: 1, itemScore: 0 }), first!);
    expect(items[1]?.options.length).toBe(3);
    expect(items[1]?.metadata?.['simplified']).toBe(true);

    queue.reportOutcome(event(items[1]!, { correct: false, attempt: 1, itemScore: 0 }), items[1]!);
    expect(items[1]?.options.length).toBe(2);
  });

  it('zet een extra-audio-flag bij lage mastery', () => {
    const items = [makeItem('a', 'DE.CVC', 4), makeItem('b', 'DE.CVC', 4)];
    const profile = profileWithWeakSkill();
    const queue = createSessionQueue(plan(items), { sessionNumber: 1, profile, learned: new Set(['m', 'a']) });
    const first = queue.current();
    queue.reportOutcome(event(first!, { correct: false, attempt: 1, itemScore: 0 }), first!);
    expect(items[1]?.metadata?.['extraAudio']).toBe(true);
  });
});

describe('SessionQueue – gemodelleerd item komt terug (QA-009)', () => {
  it('herplant een gemodelleerd item binnen dezelfde sectie', () => {
    const items = [makeItem('a', 'DE.CVC', 3), makeItem('b', 'DE.CVC', 3), makeItem('c', 'DE.CVC', 3), makeItem('d', 'DE.CVC', 3)];
    const queue = createSessionQueue(plan(items), { sessionNumber: 1, rng: () => 0 });
    const first = queue.current();
    queue.reportOutcome(event(first!, { correct: false, modeled: true, attempt: 3, itemScore: 0 }), first!);

    const seen: string[] = [];
    seen.push(queue.next()!.id);
    seen.push(queue.next()!.id);
    seen.push(queue.next()!.id);
    seen.push(queue.next()!.id);
    expect(seen).toContain('a.retry');
    // De herkansing is gemarkeerd als herkansing en heeft dezelfde opties.
    const retry = items.find((i) => i.id === 'a.retry');
    expect(retry?.isRetry).toBe(true);
  });
});

describe('SessionQueue – frustratiestop (QA-008)', () => {
  it('biedt na 3× modeling een makkelijk succes-item', () => {
    const items = [makeItem('a', 'DE.CVC', 3), makeItem('b', 'DE.CVC', 3), makeItem('c', 'DE.CVC', 3), makeItem('d', 'DE.CVC', 3)];
    const profile = profileWithWeakSkill();
    const queue = createSessionQueue(plan(items), { sessionNumber: 1, profile, learned: new Set(['m', 'a']) });

    queue.reportOutcome(event(items[0]!, { correct: false, modeled: true, attempt: 3, itemScore: 0 }), items[0]!);
    queue.next();
    queue.reportOutcome(event(items[1]!, { correct: false, modeled: true, attempt: 3, itemScore: 0 }), items[1]!);
    queue.next();
    queue.reportOutcome(event(items[2]!, { correct: false, modeled: true, attempt: 3, itemScore: 0 }), items[2]!);
    queue.next();

    const current = queue.current();
    expect(current?.kind === 'letterklank' || current?.kind === 'rijmpoort').toBe(true);
    expect(current?.options.length).toBeGreaterThanOrEqual(2);
  });
});

describe('SessionQueue – stoppen en hervatten (QA-007)', () => {
  it('rondt een serialisatie-roundtrip identiek af', () => {
    const items = [makeItem('a', 'DE.CVC', 3), makeItem('b', 'DE.CVC', 3), makeItem('c', 'DE.CVC', 3)];
    const queue = createSessionQueue(plan(items), { sessionNumber: 1 });
    queue.next();
    const json = queue.toJSON(1000);
    const restored = SessionQueue.fromJSON(json);
    expect(restored.current()?.id).toBe(queue.current()?.id);
    expect(restored.remaining()).toBe(queue.remaining());
  });

  it('hervat binnen de TTL en vervalt daarna', () => {
    const storage = createMemoryStorage();
    const items = [makeItem('a', 'DE.CVC', 3), makeItem('b', 'DE.CVC', 3)];
    const queue = createSessionQueue(plan(items), { sessionNumber: 1 });
    const now = 10_000;
    expect(saveSessionState(queue, storage, now)).toEqual({ ok: true });

    const restored = loadSessionState(storage, now + 60_000);
    expect(restored?.current()?.id).toBe('a');

    expect(loadSessionState(storage, now + RESUME_TTL_MS + 1)).toBeUndefined();
  });
});
