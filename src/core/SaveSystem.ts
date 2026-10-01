/**
 * Save-systeem (ARCHITECTURE §7): localStorage met schemaVersion + migratie,
 * storage-agnostisch, geen persoonsgegevens.
 * TODO(Builder): implementeer migraties en export/reset.
 */
import type { Profile } from '../types';
import { SAVE_SCHEMA_VERSION } from '../types';

export const SAVE_KEY = 'leesavontuur.save.v1';

export interface SaveStorage {
  read(key: string): string | null;
  write(key: string, value: string): void;
  remove(key: string): void;
}

/** In-memory fallback (tests / geen localStorage). */
export function createMemoryStorage(): SaveStorage {
  const map = new Map<string, string>();
  return {
    read: (k) => map.get(k) ?? null,
    write: (k, v) => void map.set(k, v),
    remove: (k) => void map.delete(k),
  };
}

/** localStorage-adapter; valt terug op memory als localStorage ontbreekt. */
export function defaultStorage(): SaveStorage {
  if (typeof localStorage === 'undefined') return createMemoryStorage();
  return {
    read: (k) => localStorage.getItem(k),
    write: (k, v) => localStorage.setItem(k, v),
    remove: (k) => localStorage.removeItem(k),
  };
}

export function createFreshProfile(now: number = Date.now()): Profile {
  return {
    schemaVersion: SAVE_SCHEMA_VERSION,
    profileId: Math.random().toString(36).slice(2),
    avatarIcon: 'eekhoorn',
    createdAt: new Date(now).toISOString(),
    unlockedGraphemes: [],
    skills: {},
    items: {},
    rewards: { klankvonkjes: 0, vriendjeskaarten: [], leaves: [] },
    settings: {
      audioEnabled: true,
      reducedMotion: false,
      highContrast: false,
      autoRepeatPrompt: true,
    },
    sessionCount: 0,
  };
}

export function loadProfile(_storage: SaveStorage = defaultStorage()): Profile {
  throw new Error('TODO(Builder): SaveSystem.loadProfile');
}

export function saveProfile(_profile: Profile, _storage: SaveStorage = defaultStorage()): void {
  throw new Error('TODO(Builder): SaveSystem.saveProfile');
}

/** Migreert een (oud) save-object naar de huidige schemaVersion. */
export function migrate(_raw: unknown): Profile {
  throw new Error('TODO(Builder): SaveSystem.migrate');
}

export function exportProfile(_profile: Profile): string {
  throw new Error('TODO(Builder): SaveSystem.exportProfile');
}

export function resetProfile(_storage: SaveStorage = defaultStorage()): Profile {
  throw new Error('TODO(Builder): SaveSystem.resetProfile');
}
