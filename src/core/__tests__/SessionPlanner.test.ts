import { describe, expect, it } from 'vitest';
import type { Profile } from '../../types';
import { createFreshProfile } from '../SaveSystem';
import { createSkillState } from '../Mastery';
import { createSeededRng } from '../rng';
import { createSessionQueue, flattenPlan, planSession } from '../SessionPlanner';

function richProfile(): Profile {
  const profile = createFreshProfile(1000, () => 0.5);
  profile.unlockedGraphemes = ['m', 'a', 's', 't', 'k', 'r'];
  profile.skills['PH.RHYME'] = createSkillState({ mastery: 0.9 });
  profile.skills['FN.FIRST_SOUND'] = createSkillState({ mastery: 0.9 });
  profile.skills['SY.CVC'] = createSkillState({ mastery: 0.8 });
  profile.skills['AN.CVC'] = createSkillState({ mastery: 0.8 });
  for (const g of profile.unlockedGraphemes) {
    // Beheerst volgens isMastered (EDU-025), zodat de poort opengaat.
    profile.skills[`LK.${g}.SOUND`] = createSkillState({
      mastery: 0.9,
      attempts: 12,
      consecutiveCorrect: 4,
      sessionsSeen: 2,
    });
  }
  profile.skills['DE.CVC'] = createSkillState({ mastery: 0.8 });
  profile.items['kam'] = {
    itemKey: 'kam',
    skillId: 'DE.CVC',
    leitnerBox: 1,
    lastSeenSession: 0,
    consecutiveCorrect: 0,
  };
  return profile;
}

describe('SessionPlanner – volgorde en lengte', () => {
  it('plant de vaste sessie-loop in oplopende volgorde', () => {
    const plan = planSession(richProfile(), createSeededRng(42));
    const steps = plan.sections.map((s) => s.step);
    expect(steps).toEqual([...steps].sort((a, b) => a - b));
    expect(new Set(steps).size).toBe(steps.length);
    expect(steps).toContain(1);
    expect(steps).toContain(2);
    expect(steps).toContain(3);
    expect(steps).toContain(4);
    expect(steps).toContain(5);
    expect(steps).toContain(6);
    expect(steps).toContain(7);
    expect(steps).toContain(8);

    const total = flattenPlan(plan).length;
    expect(total).toBeGreaterThanOrEqual(5);
    expect(total).toBeLessThanOrEqual(80);
  });

  it('geeft een vers profiel een fase-1-sessie zonder gescoorde 1-optie-items (EDU-004/EDU-010)', () => {
    const plan = planSession(createFreshProfile(0, () => 0.5), createSeededRng(1));
    const steps = plan.sections.map((s) => s.step);
    // Fase 1 is bereikbaar: klankwarming-up + auditieve klankoefening.
    expect(steps).toContain(1);
    expect(steps).toContain(2);
    // Nog geen letters: introductie pas als FN op orde is (ED §3).
    expect(steps).not.toContain(3);
    expect(steps).toContain(8);
    for (const item of flattenPlan(plan)) {
      if (item.metadata?.['scored'] === false) continue;
      if (item.kind === 'beloning') continue;
      expect(item.options.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('laat stap 3 weg als de poort dicht is', () => {
    const gated = createFreshProfile(0, () => 0.5);
    gated.unlockedGraphemes = ['m', 'a'];
    const plan = planSession(gated, createSeededRng(2));
    expect(plan.sections.some((s) => s.step === 3)).toBe(false);
  });

  it('is deterministisch bij dezelfde seed', () => {
    const a = planSession(richProfile(), createSeededRng(7));
    const b = planSession(richProfile(), createSeededRng(7));
    expect(flattenPlan(a).map((i) => i.targetId)).toEqual(flattenPlan(b).map((i) => i.targetId));
  });
});

describe('SessionQueue – stoppen kan altijd (GD §3.2)', () => {
  it('loopt door alle items en hervat op sectieniveau', () => {
    const plan = planSession(richProfile(), createSeededRng(3));
    const total = flattenPlan(plan).length;
    const queue = createSessionQueue(plan);

    let seen = 0;
    while (queue.hasNext()) {
      queue.next();
      seen += 1;
    }
    expect(seen).toBe(total);

    const resumed = createSessionQueue(plan);
    resumed.skipToStep(8);
    expect(resumed.currentSection()?.step).toBe(8);
    expect(resumed.remaining()).toBe(1);
  });
});
