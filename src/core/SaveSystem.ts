/**
 * Save-systeem (ARCHITECTURE §7): localStorage met schemaVersion + migratie,
 * storage-agnostisch, geen persoonsgegevens.
 *
 * Robuustheid: corrupte of onbruikbare data levert altijd een veilige, verse
 * start op — nooit een crash en nooit verlies van een bruikbaar profiel
 * zonder dat de aanroeper een export kan aanbieden.
 */
import type {
  Profile,
  ProfileSettings,
  Rewards,
  SkillState,
  ItemState,
  SkillId,
  ItemKey,
  Rng,
} from '../types';
import { SAVE_SCHEMA_VERSION } from '../types';
import { ensureSkillDetail, type SkillStateDetail } from './Mastery';
import { createItemState } from './SpacedRepetition';
import { graphemes } from '../content';

export const SAVE_KEY = 'leesavontuur.save.v1';

/** Resultaat van een schrijfpoging; gooit nooit (QA-004 / SEC-006). */
export interface SaveResult {
  ok: boolean;
  reason?: 'quota' | 'unavailable' | 'serialize' | 'unknown' | 'unsupported-version';
}

/** Sleutels die nooit als record-key mogen worden overgenomen (SEC-007). */
const DANGEROUS_KEYS: ReadonlySet<string> = new Set(['__proto__', 'constructor', 'prototype']);

/** Bovengrens voor opgeslagen lijsten (SEC-007 / SEC-015). */
const MAX_UNLOCKED = 64;
const MAX_REWARD_ITEMS = 64;
const MAX_SKILLS = 512;
const MAX_ITEMS = 2048;

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

function defaultSettings(): ProfileSettings {
  return {
    audioEnabled: true,
    reducedMotion: false,
    highContrast: false,
    autoRepeatPrompt: true,
  };
}

function defaultRewards(): Rewards {
  return { klankvonkjes: 0, vriendjeskaarten: [], leaves: [] };
}

/** Eerste grafeem (m) is altijd vrij, maar wordt pas bij introductie toegevoegd. */
export function createFreshProfile(now: number = Date.now(), rng: Rng = Math.random): Profile {
  return {
    schemaVersion: SAVE_SCHEMA_VERSION,
    profileId: Math.floor(rng() * 0xffffffff).toString(36),
    avatarIcon: 'eekhoorn',
    createdAt: new Date(now).toISOString(),
    unlockedGraphemes: [],
    skills: {},
    items: {},
    rewards: defaultRewards(),
    settings: defaultSettings(),
    sessionCount: 0,
  };
}

// ---------------------------------------------------------------------------
// Normalisatie / migratie
// ---------------------------------------------------------------------------

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asStringArray(value: unknown, cap: number = MAX_REWARD_ITEMS): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === 'string').slice(0, cap);
}

function coerceBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function toFiniteNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function normalizeSettings(raw: unknown): ProfileSettings {
  const source = isRecord(raw) ? raw : {};
  const base = defaultSettings();
  return {
    audioEnabled: coerceBoolean(source.audioEnabled, base.audioEnabled),
    reducedMotion: coerceBoolean(source.reducedMotion, base.reducedMotion),
    highContrast: coerceBoolean(source.highContrast, base.highContrast),
    autoRepeatPrompt: coerceBoolean(source.autoRepeatPrompt, base.autoRepeatPrompt),
  };
}

function normalizeRewards(raw: unknown): Rewards {
  const source = isRecord(raw) ? raw : {};
  return {
    klankvonkjes: Math.max(0, Math.floor(toFiniteNumber(source.klankvonkjes, 0))),
    vriendjeskaarten: asStringArray(source.vriendjeskaarten),
    leaves: asStringArray(source.leaves),
  };
}

function normalizeSkills(raw: unknown): Record<SkillId, SkillState> {
  const out: Record<SkillId, SkillState> = Object.create(null) as Record<SkillId, SkillState>;
  if (!isRecord(raw)) return out;
  let count = 0;
  for (const [skillId, value] of Object.entries(raw)) {
    if (!skillId || DANGEROUS_KEYS.has(skillId)) continue;
    if (count >= MAX_SKILLS) break;
    count += 1;
    out[skillId] = ensureSkillDetail(isRecord(value) ? (value as Partial<SkillStateDetail>) : undefined);
  }
  return out;
}

function normalizeItems(raw: unknown): Record<ItemKey, ItemState> {
  const out: Record<ItemKey, ItemState> = Object.create(null) as Record<ItemKey, ItemState>;
  if (!isRecord(raw)) return out;
  let count = 0;
  for (const [itemKey, value] of Object.entries(raw)) {
    if (!itemKey || DANGEROUS_KEYS.has(itemKey)) continue;
    if (!isRecord(value)) continue;
    if (count >= MAX_ITEMS) break;
    count += 1;
    const skillId = typeof value.skillId === 'string' ? value.skillId : itemKey;
    const base = createItemState(itemKey, skillId);
    out[itemKey] = {
      ...base,
      leitnerBox: Math.min(5, Math.max(1, Math.floor(toFiniteNumber(value.leitnerBox, 1)))),
      lastSeenSession: Math.max(0, Math.floor(toFiniteNumber(value.lastSeenSession, 0))),
      consecutiveCorrect: Math.max(0, Math.floor(toFiniteNumber(value.consecutiveCorrect, 0))),
    };
  }
  return out;
}

/** Bouwt een geldig Profile uit een willekeurig JSON-object. */
export function normalizeProfile(raw: unknown, now: number = Date.now()): Profile {
  const source = isRecord(raw) ? raw : {};
  const fresh = createFreshProfile(now);
  const unlocked = asStringArray(source.unlockedGraphemes, MAX_UNLOCKED);
  const validIds = new Set(graphemes.map((g) => g.id));
  const filteredUnlocked = unlocked.filter((id) => validIds.has(id));
  const createdAt = typeof source.createdAt === 'string' ? source.createdAt : fresh.createdAt;
  return {
    schemaVersion: SAVE_SCHEMA_VERSION,
    profileId: typeof source.profileId === 'string' && source.profileId ? source.profileId : fresh.profileId,
    avatarIcon: typeof source.avatarIcon === 'string' && source.avatarIcon ? source.avatarIcon : fresh.avatarIcon,
    createdAt,
    unlockedGraphemes: filteredUnlocked.length > 0 ? filteredUnlocked : fresh.unlockedGraphemes,
    skills: normalizeSkills(source.skills),
    items: normalizeItems(source.items),
    rewards: normalizeRewards(source.rewards),
    settings: normalizeSettings(source.settings),
    sessionCount: Math.max(0, Math.floor(toFiniteNumber(source.sessionCount, 0))),
  };
}

/**
 * Migreert een (oud) save-object naar de huidige schemaVersion. Onbekende of
 * te nieuwe versies vallen veilig terug op een vers profiel. Gooit nooit.
 */
export function migrate(raw: unknown): Profile {
  let value: unknown = raw;
  if (typeof raw === 'string') {
    try {
      value = JSON.parse(raw);
    } catch {
      return createFreshProfile();
    }
  }
  if (!isRecord(value)) return createFreshProfile();

  const rawVersion = value.schemaVersion;
  let version = typeof rawVersion === 'number' && Number.isFinite(rawVersion) ? Math.floor(rawVersion) : 0;
  if (version > SAVE_SCHEMA_VERSION) return createFreshProfile();

  let current: Record<string, unknown> = value;
  while (version < SAVE_SCHEMA_VERSION) {
    current = migrateStep(version, current);
    version += 1;
  }
  return normalizeProfile(current);
}

/**
 * Eén migratiestap v(n) → v(n+1). v0 = pre-schemaVersion (impliciet). Bij een
 * onbekende versie krijgt de aanroeper een vers profiel via normalizeProfile
 * (dat alle onbekende velden negeert en veilige defaults invult).
 */
function migrateStep(version: number, raw: Record<string, unknown>): Record<string, unknown> {
  switch (version) {
    case 0:
      // v0 → v1: onbekende/ontbrekende velden worden door normalizeProfile
      // aangevuld; we markeren de versie expliciet.
      return { ...raw, schemaVersion: 1 };
    default:
      return { ...raw, schemaVersion: version + 1 };
  }
}

// ---------------------------------------------------------------------------
// Publieke API
// ---------------------------------------------------------------------------

/** Laadt het profiel; ontbrekende/corrupte data → veilige verse start. */
export function loadProfile(storage: SaveStorage = defaultStorage()): Profile {
  let raw: string | null = null;
  try {
    raw = storage.read(SAVE_KEY);
  } catch {
    return createFreshProfile();
  }
  if (raw === null || raw === '') return createFreshProfile();
  return migrate(raw);
}

function classifyWriteError(error: unknown): SaveResult['reason'] {
  const name = typeof error === 'object' && error !== null && 'name' in error ? String((error as { name?: unknown }).name) : '';
  if (name === 'QuotaExceededError' || name === 'NS_ERROR_DOM_QUOTA_REACHED') return 'quota';
  if (name === 'SecurityError' || name === 'InvalidStateError') return 'unavailable';
  return 'unknown';
}

/**
 * Schrijft het genormaliseerde profiel. Gooit nooit: bij quota/privémodus of
 * een serializeerfout volgt `{ ok: false, reason }` (QA-004 / SEC-006).
 */
export function saveProfile(profile: Profile, storage: SaveStorage = defaultStorage()): SaveResult {
  try {
    const existing = storage.read(SAVE_KEY);
    if (existing) {
      let value: unknown;
      try { value = JSON.parse(existing); } catch { value = null; }
      if (isRecord(value) && typeof value.schemaVersion === 'number' && value.schemaVersion > SAVE_SCHEMA_VERSION) {
        return { ok: false, reason: 'unsupported-version' };
      }
    }
  } catch { /* write attempt below reports inaccessible storage */ }
  let json: string;
  try {
    json = JSON.stringify(normalizeProfile(profile));
  } catch {
    return { ok: false, reason: 'serialize' };
  }
  try {
    storage.write(SAVE_KEY, json);
    return { ok: true };
  } catch (error) {
    return { ok: false, reason: classifyWriteError(error) };
  }
}

/** JSON-export (ouderzone). Nooit PII: alleen het lokale profiel. */
export function exportProfile(profile: Profile): string {
  return JSON.stringify(normalizeProfile(profile), null, 2);
}

/** Validate imports before any state change; never turn an invalid backup into a fresh profile. */
export function parseProfileImport(json: string): Profile {
  if (json.length > 1024 * 1024) throw new Error('Het bestand is te groot (maximaal 1 MB).');
  let raw: unknown;
  try {
    raw = JSON.parse(json, (key, value: unknown) => {
      if (DANGEROUS_KEYS.has(key)) throw new Error('Onveilige sleutel');
      return value;
    });
  } catch { throw new Error('Dit is geen geldig Leesavontuur-bestand.'); }
  if (!isRecord(raw) || raw.schemaVersion !== SAVE_SCHEMA_VERSION ||
      typeof raw.profileId !== 'string' || !raw.profileId ||
      typeof raw.sessionCount !== 'number' || !Number.isInteger(raw.sessionCount) || raw.sessionCount < 0 ||
      !Array.isArray(raw.unlockedGraphemes) || raw.unlockedGraphemes.length > MAX_UNLOCKED ||
      raw.unlockedGraphemes.some(id => typeof id !== 'string' || !graphemes.some(g => g.id === id)) ||
      !isRecord(raw.skills) || !isRecord(raw.items) || !isRecord(raw.settings) || !isRecord(raw.rewards)) {
    throw new Error('Dit profiel is onvolledig of gebruikt een andere appversie.');
  }
  return normalizeProfile(raw);
}

/** Wist de save en geeft een vers profiel terug (dubbele bevestiging in UI). */
export function resetProfile(storage: SaveStorage = defaultStorage()): Profile {
  try {
    storage.remove(SAVE_KEY);
  } catch {
    // Privémodus/quota: ga door met een vers profiel in het geheugen.
  }
  const fresh = createFreshProfile();
  saveProfile(fresh, storage);
  return fresh;
}
