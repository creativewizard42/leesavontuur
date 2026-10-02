import { describe, expect, it } from 'vitest';
import type { Profile } from '../../types';
import { createFreshProfile } from '../SaveSystem';
import { createSkillState } from '../Mastery';
import {
  canIntroduceNewGrapheme,
  nextGraphemeToIntroduce,
  PHASE_2_FALLBACK_SESSIONS,
  phaseUnlocked,
  skillStatus,
  unlockedPhases,
  weakGraphemes,
} from '../Progression';

function profile(): Profile {
  return createFreshProfile(0, () => 0.5);
}

function mastered(overrides: Partial<ReturnType<typeof createSkillState>> = {}) {
  return createSkillState({ mastery: 0.9, attempts: 12, consecutiveCorrect: 4, sessionsSeen: 2, ...overrides });
}

function withPhase1(p: Profile): Profile {
  p.skills['FN.FIRST_SOUND'] = createSkillState({ mastery: 0.9 });
  return p;
}

describe('Progression – unlock en poortconditie', () => {
  it('geeft de eerste letter pas vrij als fase 1 (FN) op orde is', () => {
    const p = profile();
    expect(nextGraphemeToIntroduce(p)?.id).toBe('m');
    expect(canIntroduceNewGrapheme(p)).toBe(false);
    withPhase1(p);
    expect(canIntroduceNewGrapheme(p)).toBe(true);
  });

  it('geeft een nieuw grafeem pas vrij als het vorige beheerst is (isMastered, EDU-025)', () => {
    const p = withPhase1(profile());
    p.unlockedGraphemes = ['m'];
    expect(nextGraphemeToIntroduce(p)?.id).toBe('a');
    expect(canIntroduceNewGrapheme(p)).toBe(false);

    // Mastery alleen is niet genoeg: er zijn ≥ 12 items, ≥ 4 op rij en ≥ 2 sessies nodig.
    p.skills['LK.m.SOUND'] = createSkillState({ mastery: 0.95 });
    expect(canIntroduceNewGrapheme(p)).toBe(false);

    p.skills['LK.m.SOUND'] = mastered();
    expect(canIntroduceNewGrapheme(p)).toBe(true);
  });

  it('blokkeert bij meer dan 2 zwakke grafemen', () => {
    const p = withPhase1(profile());
    p.unlockedGraphemes = ['m', 'a', 's', 't', 'k'];
    p.skills['LK.t.SOUND'] = mastered();
    p.skills['LK.s.SOUND'] = createSkillState({ mastery: 0.9 });
    p.skills['LK.m.SOUND'] = createSkillState({ mastery: 0.1 });
    p.skills['LK.a.SOUND'] = createSkillState({ mastery: 0.1 });
    p.skills['LK.k.SOUND'] = createSkillState({ mastery: 0.1 });
    expect(weakGraphemes(p)).toHaveLength(3);
    expect(canIntroduceNewGrapheme(p)).toBe(false);
  });

  it('respecteert max één nieuw grafeem per sessie', () => {
    const p = withPhase1(profile());
    p.unlockedGraphemes = ['m'];
    p.skills['LK.m.SOUND'] = mastered();
    expect(canIntroduceNewGrapheme(p, { introducedGraphemeThisSession: true })).toBe(false);
  });

  it('opent fasen uitsluitend op basis van mastery', () => {
    const p = profile();
    expect(phaseUnlocked(p, 1)).toBe(true);
    expect(phaseUnlocked(p, 2)).toBe(false);
    p.skills['FN.FIRST_SOUND'] = createSkillState({ mastery: 0.85 });
    expect(phaseUnlocked(p, 2)).toBe(true);
    expect(unlockedPhases(p)).toContain(1);
    expect(unlockedPhases(p)).toContain(2);
  });

  it('QA-R3-001: fase 2 opent al bij mastery 0.75 (haalbaar voor een tweede-poging-leerling)', () => {
    const p = profile();
    p.skills['FN.FIRST_SOUND'] = createSkillState({ mastery: 0.75 });
    expect(phaseUnlocked(p, 2)).toBe(true);
  });

  it('QA-R3-001: het sessie-vangnet opent fase 2 na PHASE_2_FALLBACK_SESSIONS', () => {
    const p = profile();
    p.sessionCount = PHASE_2_FALLBACK_SESSIONS - 1;
    expect(phaseUnlocked(p, 2)).toBe(false);
    p.sessionCount = PHASE_2_FALLBACK_SESSIONS;
    expect(phaseUnlocked(p, 2)).toBe(true);
  });

  it('geeft "Beheerst" alleen via isMastered (EDU-029)', () => {
    const p = profile();
    p.skills['LK.m.SOUND'] = createSkillState({ mastery: 1 });
    expect(skillStatus(p, 'LK.m.SOUND')).toBe('developing');
    p.skills['LK.m.SOUND'] = mastered();
    expect(skillStatus(p, 'LK.m.SOUND')).toBe('mastered');
    expect(skillStatus(p, 'LK.a.SOUND')).toBe('not_started');
  });
});
