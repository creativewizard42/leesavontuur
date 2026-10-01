import { describe, expect, it } from 'vitest';
import {
  createFreshProfile,
  createMemoryStorage,
  exportProfile,
  loadProfile,
  migrate,
  resetProfile,
  saveProfile,
  SAVE_KEY,
} from '../SaveSystem';
import { createSkillState } from '../Mastery';

describe('SaveSystem – opslaan, laden, migreren, corruptie', () => {
  it('rondt een profiel rond via save/load', () => {
    const storage = createMemoryStorage();
    const profile = createFreshProfile(1000, () => 0.25);
    profile.skills['LK.m.SOUND'] = createSkillState({ mastery: 0.5, attempts: 3 });
    profile.sessionCount = 2;
    saveProfile(profile, storage);

    const loaded = loadProfile(storage);
    expect(loaded.sessionCount).toBe(2);
    expect(loaded.skills['LK.m.SOUND']?.mastery).toBeCloseTo(0.5);
    expect(loaded.schemaVersion).toBe(1);
  });

  it('bewaart de niet-canonieke detailvelden (accuracy-venster)', () => {
    const storage = createMemoryStorage();
    const profile = createFreshProfile(0, () => 0.5);
    profile.skills['DE.CVC'] = createSkillState({ mastery: 0.6, recentFirstAttempt: [true, false, true] });
    saveProfile(profile, storage);
    const loaded = loadProfile(storage);
    const detail = loaded.skills['DE.CVC'] as { recentFirstAttempt?: boolean[] } | undefined;
    expect(detail?.recentFirstAttempt).toEqual([true, false, true]);
  });

  it('valt veilig terug bij corrupte of onbruikbare data', () => {
    const storage = createMemoryStorage();
    storage.write(SAVE_KEY, '{niet geldig');
    expect(() => loadProfile(storage)).not.toThrow();
    expect(loadProfile(storage).schemaVersion).toBe(1);

    storage.write(SAVE_KEY, JSON.stringify({ schemaVersion: 1, skills: 'kapot' }));
    const recovered = loadProfile(storage);
    expect(recovered.skills).toEqual({});
    expect(Array.isArray(recovered.unlockedGraphemes)).toBe(true);
  });

  it('migreert oudere (v0) saves naar de huidige versie', () => {
    const migrated = migrate({ unlockedGraphemes: ['m'], sessionCount: 4 });
    expect(migrated.schemaVersion).toBe(1);
    expect(migrated.sessionCount).toBe(4);
    expect(migrated.unlockedGraphemes).toContain('m');
  });

  it('weigert een te nieuwe schemaVersion veilig', () => {
    const migrated = migrate({ schemaVersion: 999, sessionCount: 3 });
    expect(migrated.schemaVersion).toBe(1);
    expect(migrated.sessionCount).toBe(0);
  });

  it('exporteert JSON zonder persoonsgegevens', () => {
    const json = exportProfile(createFreshProfile(0, () => 0.5));
    const parsed = JSON.parse(json) as Record<string, unknown>;
    expect(parsed['schemaVersion']).toBe(1);
    expect(parsed).not.toHaveProperty('name');
    expect(parsed).not.toHaveProperty('email');
  });

  it('reset naar een vers profiel', () => {
    const storage = createMemoryStorage();
    const fresh = createFreshProfile(0, () => 0.5);
    saveProfile({ ...fresh, sessionCount: 7 }, storage);
    const reset = resetProfile(storage);
    expect(reset.sessionCount).toBe(0);
    expect(loadProfile(storage).sessionCount).toBe(0);
  });
});
