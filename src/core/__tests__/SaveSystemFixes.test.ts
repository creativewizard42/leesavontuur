/**
 * Save-robuustheid (QA-004 / SEC-006 / SEC-007).
 */
import { describe, expect, it } from 'vitest';
import {
  createFreshProfile,
  createMemoryStorage,
  migrate,
  normalizeProfile,
  saveProfile,
  type SaveStorage,
} from '../SaveSystem';
import { createSkillState } from '../Mastery';

function throwingStorage(name: string): SaveStorage {
  return {
    read: () => null,
    write: () => {
      const error = new Error(name);
      error.name = name;
      throw error;
    },
    remove: () => {},
  };
}

describe('SaveSystem – foutafhandeling (QA-004 / SEC-006)', () => {
  it('gooit niet bij een quota-fout en meldt { ok: false, reason }', () => {
    const result = saveProfile(createFreshProfile(), throwingStorage('QuotaExceededError'));
    expect(result).toEqual({ ok: false, reason: 'quota' });
  });

  it('meldt een geblokkeerde opslag als unavailable', () => {
    expect(saveProfile(createFreshProfile(), throwingStorage('SecurityError'))).toEqual({
      ok: false,
      reason: 'unavailable',
    });
  });

  it('schrijft normaal en meldt success', () => {
    const storage = createMemoryStorage();
    expect(saveProfile(createFreshProfile(), storage)).toEqual({ ok: true });
  });
});

describe('SaveSystem – prototype-mutatie en groeibegrenzing (SEC-007)', () => {
  it('negeert __proto__/constructor/prototype-keys en gebruikt null-prototypes', () => {
    const raw = JSON.parse(
      '{"schemaVersion":1,"skills":{"__proto__":{"mastery":1},"constructor":{"mastery":1},"LK.m.SOUND":{"mastery":0.5}},"items":{"__proto__":{"leitnerBox":9},"kam":{"skillId":"DE.CVC"}}}',
    );
    const profile = normalizeProfile(raw);
    expect(({} as Record<string, unknown>)['polluted']).toBeUndefined();
    expect(Object.getPrototypeOf(profile.skills)).toBeNull();
    expect(Object.getPrototypeOf(profile.items)).toBeNull();
    expect(profile.skills['LK.m.SOUND']?.mastery).toBeCloseTo(0.5);
    expect((profile.skills as Record<string, unknown>)['__proto__']).toBeUndefined();
    expect((profile.items as Record<string, unknown>)['constructor']).toBeUndefined();
    // De migratie-route is eveneens veilig.
    const migrated = migrate(
      '{"schemaVersion":0,"skills":{"__proto__":{"mastery":1},"LK.a.SOUND":{"mastery":0.4}}}',
    );
    expect(Object.getPrototypeOf(migrated.skills)).toBeNull();
  });

  it('begrenst opgeslagen lijsten', () => {
    const raw = {
      schemaVersion: 1,
      rewards: { leaves: Array.from({ length: 200 }, (_, i) => `g${i}`), vriendjeskaarten: [] },
      unlockedGraphemes: ['m'],
      skills: {},
      items: {},
    };
    const profile = normalizeProfile(raw);
    expect(profile.rewards.leaves.length).toBeLessThanOrEqual(64);
    const detail = createSkillState({ recentFirstAttempt: Array.from({ length: 100 }, () => true) });
    const withWindow = normalizeProfile({ schemaVersion: 1, skills: { 'DE.CVC': detail } });
    const restored = withWindow.skills['DE.CVC'] as { recentFirstAttempt?: boolean[] } | undefined;
    expect(restored?.recentFirstAttempt?.length).toBeLessThanOrEqual(20);
  });
});
