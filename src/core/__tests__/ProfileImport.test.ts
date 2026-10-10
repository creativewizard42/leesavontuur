import { describe, expect, it } from 'vitest';
import { createFreshProfile, createMemoryStorage, exportProfile, parseProfileImport, saveProfile, SAVE_KEY } from '../SaveSystem';

describe('Profile recovery', () => {
  it('round-trips a supported exported profile', () => {
    const profile = createFreshProfile(); profile.sessionCount = 15;
    expect(parseProfileImport(exportProfile(profile))).toEqual(profile);
  });
  it('rejects incomplete, corrupt, oversized, future and dangerous input', () => {
    const profile = createFreshProfile();
    for (const raw of ['{}', 'broken', 'x'.repeat(1024 * 1024 + 1),
      JSON.stringify({ ...profile, schemaVersion: 99 }),
      '{"__proto__":{"polluted":true}}', JSON.stringify({ ...profile, unlockedGraphemes: ['unknown'] })]) {
      expect(() => parseProfileImport(raw)).toThrow();
    }
  });
  it('preserves newer saves instead of overwriting them with fresh defaults', () => {
    const storage = createMemoryStorage();
    const future = JSON.stringify({ ...createFreshProfile(), schemaVersion: 99 });
    storage.write(SAVE_KEY, future);
    expect(saveProfile(createFreshProfile(), storage)).toEqual({ ok: false, reason: 'unsupported-version' });
    expect(storage.read(SAVE_KEY)).toBe(future);
  });
});
