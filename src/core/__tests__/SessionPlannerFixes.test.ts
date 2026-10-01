/**
 * Planner-garanties (QA-003 / EDU-004 / EDU-010 / EDU-011).
 */
import { describe, expect, it } from 'vitest';
import type { Profile } from '../../types';
import { createFreshProfile } from '../SaveSystem';
import { createSkillState } from '../Mastery';
import { createSeededRng } from '../rng';
import { canIntroduceNewGrapheme } from '../Progression';
import { isScoredActivityItem } from '../../learning/util';
import { skillsForWord } from '../../learning/skills';
import { flattenPlan, MIN_SCORED_PRACTICE, planSession } from '../SessionPlanner';

function practiceSections(plan: ReturnType<typeof planSession>) {
  return plan.sections.filter((s) => s.step <= 7);
}

function scoredCount(plan: ReturnType<typeof planSession>): number {
  return practiceSections(plan).reduce((total, s) => total + s.items.filter((i) => isScoredActivityItem(i)).length, 0);
}

describe('SessionPlanner – nooit een sessie met alleen beloning (QA-003)', () => {
  it('garandeert minimaal N gescoorde oefenitems voor een vastgelopen profiel', () => {
    const profile = createFreshProfile(0, () => 0.5);
    profile.unlockedGraphemes = ['m'];
    profile.skills['LK.m.SOUND'] = createSkillState({ mastery: 0.75 });
    profile.sessionCount = 4;
    const plan = planSession(profile, createSeededRng(3));
    expect(scoredCount(plan)).toBeGreaterThanOrEqual(MIN_SCORED_PRACTICE);
    expect(plan.sections.some((s) => s.step === 8)).toBe(true);
    expect(practiceSections(plan).length).toBeGreaterThan(0);
  });

  it('geeft ook een vers profiel echte fase-1-oefening (EDU-010)', () => {
    const plan = planSession(createFreshProfile(0, () => 0.5), createSeededRng(5));
    const steps = plan.sections.map((s) => s.step);
    expect(steps).toContain(1);
    expect(steps).toContain(2);
    expect(scoredCount(plan)).toBeGreaterThanOrEqual(MIN_SCORED_PRACTICE);
  });
});

describe('SessionPlanner – nooit een gescoorde 1-optie-oefening (QA-006 / EDU-004)', () => {
  it('markeert elk item met < 2 opties als ongescoord', () => {
    const profiles: Profile[] = [createFreshProfile(0, () => 0.5)];
    const partial = createFreshProfile(0, () => 0.5);
    partial.unlockedGraphemes = ['m'];
    profiles.push(partial);
    const rich = createFreshProfile(0, () => 0.5);
    rich.unlockedGraphemes = ['m', 'a'];
    rich.skills['FN.FIRST_SOUND'] = createSkillState({ mastery: 0.9 });
    rich.skills['LK.m.SOUND'] = createSkillState({ mastery: 0.9, attempts: 12, consecutiveCorrect: 4, sessionsSeen: 2 });
    profiles.push(rich);

    for (const profile of profiles) {
      const plan = planSession(profile, createSeededRng(11));
      for (const item of flattenPlan(plan)) {
        if (item.options.length < 2) {
          expect(item.metadata?.['scored'] === false || item.kind === 'beloning', item.id).toBe(true);
        }
      }
    }
  });

  it('introduceert een nieuwe letter ongescoord als er geen afleider bestaat', () => {
    const profile = createFreshProfile(0, () => 0.5);
    profile.skills['FN.FIRST_SOUND'] = createSkillState({ mastery: 0.9 });
    const plan = planSession(profile, createSeededRng(1));
    const step3 = plan.sections.find((s) => s.step === 3);
    expect(step3).toBeDefined();
    const intro = step3?.items.find((i) => i.metadata?.['introduction'] === true);
    expect(intro?.metadata?.['scored']).toBe(false);
    expect(intro?.options.length).toBe(1);
    // Geen gescoorde items in deze sectie zonder keuze.
    for (const item of step3?.items ?? []) {
      if (isScoredActivityItem(item)) expect(item.options.length).toBeGreaterThanOrEqual(2);
    }
  });
});

describe('SessionPlanner – nieuwe grafeem-unlock pas na beheersing over ≥ 2 sessies (EDU-025)', () => {
  it('opent de poort pas bij isMastered over ≥ 2 sessies', () => {
    const profile = createFreshProfile(0, () => 0.5);
    profile.unlockedGraphemes = ['m'];
    profile.skills['FN.FIRST_SOUND'] = createSkillState({ mastery: 0.9 });
    profile.skills['LK.m.SOUND'] = createSkillState({
      mastery: 1,
      attempts: 12,
      consecutiveCorrect: 4,
      sessionsSeen: 1,
    });
    expect(canIntroduceNewGrapheme(profile)).toBe(false);
    expect(planSession(profile, createSeededRng(1)).sections.some((s) => s.step === 3)).toBe(false);

    profile.skills['LK.m.SOUND'] = createSkillState({
      mastery: 1,
      attempts: 12,
      consecutiveCorrect: 4,
      sessionsSeen: 2,
    });
    expect(canIntroduceNewGrapheme(profile)).toBe(true);
    expect(planSession(profile, createSeededRng(1)).sections.some((s) => s.step === 3)).toBe(true);
  });
});

describe('skillsForWord – patroonclassificatie (EDU-011)', () => {
  it('kiest het juiste decodeerdoel per woordpatroon', () => {
    expect(skillsForWord('as').decode).toBe('DE.VC');
    expect(skillsForWord('kam').decode).toBe('DE.CVC');
    expect(skillsForWord('kaas').decode).toBe('DE.CVVC');
    expect(skillsForWord('stam').decode).toBe('DE.CCVC');
    expect(skillsForWord('kast').decode).toBe('DE.CVCC');
    expect(skillsForWord('start').decode).toBe('DE.CCVCC');
    expect(skillsForWord('fles').decode).toBe('DE.CCVC');
  });

  it('kiest het juiste hak-/plakdoel', () => {
    expect(skillsForWord('as').segment).toBe('AN.VC');
    expect(skillsForWord('kam').segment).toBe('AN.CVC');
    expect(skillsForWord('stam').segment).toBe('AN.CLUSTER');
    expect(skillsForWord('as').blend).toBe('SY.VC');
    expect(skillsForWord('kam').blend).toBe('SY.CVC');
    expect(skillsForWord('kast').blend).toBe('SY.CLUSTER');
  });
});

describe('Sessieplan – determinisme en beloning', () => {
  it('beloont pas ná gescoord leeswerk', () => {
    const plan = planSession(createFreshProfile(0, () => 0.5), createSeededRng(9));
    const reward = flattenPlan(plan).find((i) => i.kind === 'beloning');
    expect(reward?.metadata?.['scored']).toBe(false);
    expect(scoredCount(plan)).toBeGreaterThan(0);
  });

  it('is deterministisch bij dezelfde seed (doelen/typen)', () => {
    const a = planSession(createFreshProfile(0, () => 0.5), createSeededRng(7));
    const b = planSession(createFreshProfile(0, () => 0.5), createSeededRng(7));
    expect(flattenPlan(a).map((i) => i.targetId)).toEqual(flattenPlan(b).map((i) => i.targetId));
    expect(flattenPlan(a).map((i) => i.skillId)).toEqual(flattenPlan(b).map((i) => i.skillId));
  });
});
