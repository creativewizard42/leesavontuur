import { describe, expect, it } from 'vitest';
import type { Profile } from '../../types';
import { createFreshProfile } from '../SaveSystem';
import { createSkillState } from '../Mastery';
import {
  canIntroduceNewGrapheme,
  nextGraphemeToIntroduce,
  phaseUnlocked,
  unlockedPhases,
  weakGraphemes,
} from '../Progression';

function profile(): Profile {
  return createFreshProfile(0, () => 0.5);
}

describe('Progression – unlock en poortconditie', () => {
  it('laat het eerste grafeem (m) altijd toe', () => {
    const p = profile();
    expect(nextGraphemeToIntroduce(p)?.id).toBe('m');
    expect(canIntroduceNewGrapheme(p)).toBe(true);
  });

  it('geeft pas een nieuw grafeem vrij als het vorige LK.SOUND ≥ 0.8 heeft', () => {
    const p = profile();
    p.unlockedGraphemes = ['m'];
    expect(nextGraphemeToIntroduce(p)?.id).toBe('a');
    expect(canIntroduceNewGrapheme(p)).toBe(false);

    p.skills['LK.m.SOUND'] = createSkillState({ mastery: 0.9 });
    expect(canIntroduceNewGrapheme(p)).toBe(true);
  });

  it('blokkeert bij meer dan 2 zwakke grafemen', () => {
    const p = profile();
    p.unlockedGraphemes = ['m', 'a', 's', 't'];
    p.skills['LK.s.SOUND'] = createSkillState({ mastery: 0.9 });
    p.skills['LK.m.SOUND'] = createSkillState({ mastery: 0.1 });
    p.skills['LK.a.SOUND'] = createSkillState({ mastery: 0.1 });
    p.skills['LK.t.SOUND'] = createSkillState({ mastery: 0.1 });
    expect(weakGraphemes(p)).toHaveLength(3);
    expect(canIntroduceNewGrapheme(p)).toBe(false);
  });

  it('respecteert max één nieuw grafeem per sessie', () => {
    const p = profile();
    p.skills['LK.m.SOUND'] = createSkillState({ mastery: 0.9 });
    p.unlockedGraphemes = ['m'];
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
});
