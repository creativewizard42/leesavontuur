/**
 * Mastery-formule (EWMA) exact volgens ED §10.2 / ARCHITECTURE §4.
 * DOM-vrij en volledig unit-testbaar.
 *
 * Let op: `SkillState` (src/types.ts) is bevroren. Voor `accuracy` (laatste 20
 * items) en `avgResponseMs` (mediane tijd over laatste 10 correcte items) is
 * een kleine geschiedenis nodig die niet in het canonieke type past. Daarom
 * definiëren we hier lokaal `SkillStateDetail` met twee extra velden. Die
 * extra velden worden door SaveSystem bewaard (JSON) en bij migratie hersteld.
 */
import type { AnswerEvent, SkillId, SkillState } from '../types';

export const START_MASTERY = 0;

/** Lokaal detailtype: canonieke SkillState + rolling windows. */
export interface SkillStateDetail extends SkillState {
  /** Laatste ≤20 terminale items: correct bij 1e poging? (accuracy-venster). */
  recentFirstAttempt: boolean[];
  /** Laatste ≤10 correcte items: responstijd in ms (mediaan-venster). */
  recentResponseMs: number[];
}

const ACCURACY_WINDOW = 20;
const RESPONSE_WINDOW = 10;

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

/** Verse SkillState (startwaarde mastery 0.0, ED §10.2). */
export function createSkillState(overrides: Partial<SkillStateDetail> = {}): SkillStateDetail {
  const base: SkillStateDetail = {
    mastery: START_MASTERY,
    attempts: 0,
    correct: 0,
    accuracy: 0,
    avgResponseMs: 0,
    hintsUsed: 0,
    consecutiveCorrect: 0,
    leitnerBox: 1,
    lastSeenSession: 0,
    sessionsSeen: 0,
    recentFirstAttempt: [],
    recentResponseMs: [],
  };
  return { ...base, ...overrides };
}

/** Herstelt een (mogelijk corrupt/oud) SkillState-object naar het detailtype. */
export function ensureSkillDetail(state: Partial<SkillStateDetail> | undefined): SkillStateDetail {
  if (!state) return createSkillState();
  const recentFirstAttempt = Array.isArray(state.recentFirstAttempt)
    ? state.recentFirstAttempt.filter((v): v is boolean => typeof v === 'boolean').slice(-ACCURACY_WINDOW)
    : [];
  const recentResponseMs = Array.isArray(state.recentResponseMs)
    ? state.recentResponseMs.filter((v): v is number => typeof v === 'number' && Number.isFinite(v)).slice(-RESPONSE_WINDOW)
    : [];
  return {
    mastery: clamp01(state.mastery ?? START_MASTERY),
    attempts: nonNegativeInt(state.attempts),
    correct: nonNegativeInt(state.correct),
    accuracy: clamp01(state.accuracy ?? 0),
    avgResponseMs: nonNegativeNumber(state.avgResponseMs),
    hintsUsed: nonNegativeInt(state.hintsUsed),
    consecutiveCorrect: nonNegativeInt(state.consecutiveCorrect),
    leitnerBox: clampBox(state.leitnerBox ?? 1),
    lastSeenSession: nonNegativeInt(state.lastSeenSession),
    sessionsSeen: nonNegativeInt(state.sessionsSeen),
    recentFirstAttempt,
    recentResponseMs,
  };
}

function nonNegativeInt(value: number | undefined): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return 0;
  return Math.floor(value);
}

function nonNegativeNumber(value: number | undefined): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return 0;
  return value;
}

function clampBox(box: number): number {
  if (!Number.isFinite(box)) return 1;
  return Math.min(5, Math.max(1, Math.floor(box)));
}

/** alpha = max(0.2, 1 / (attempts + 1)) */
export function alphaFor(attempts: number): number {
  return Math.max(0.2, 1 / (attempts + 1));
}

/** Voorlopige rtSlow-drempels per doel (ARCHITECTURE §4.1). */
export const RT_SLOW_MS: Readonly<Record<string, number>> = {
  'LK.*': 4000,
  'DE.CVC': 8000,
  'DE.CCVC': 10000,
  'ZI.*': 20000,
};

/** Doeltijden voor vloeiendheid (ED §10.2 slotnoot). */
export const FL_TARGET_MS: Readonly<Record<string, number>> = {
  'FL.GRAPHEME': 2000,
  'FL.CVC': 3000,
};

const DEFAULT_RT_SLOW_MS = 10000;

/** rtSlow voor een skill-ID (prefixen met * zijn wildcards). */
export function rtSlowFor(skillId: SkillId): number {
  for (const [pattern, value] of Object.entries(RT_SLOW_MS)) {
    if (pattern.endsWith('*')) {
      if (skillId.startsWith(pattern.slice(0, -1))) return value;
    } else if (skillId === pattern) {
      return value;
    }
  }
  return DEFAULT_RT_SLOW_MS;
}

/** Doeltijd voor FL.* (of undefined). */
export function flTargetFor(skillId: SkillId): number | undefined {
  return FL_TARGET_MS[skillId];
}

/**
 * Itemscore s volgens ED §10.2.
 * `rtSlowMs` geldt voor correct-bij-1e-poging (snel/lang).
 * Gok (isGuess), niet-terminale fout en modeling geven 0; de aanroeper
 * (updateSkillState) telt alleen terminale, niet-gok-events mee.
 */
export function itemScoreFor(event: AnswerEvent, rtSlowMs: number): number {
  if (event.isGuess) return 0;
  if (event.modeled) return 0;
  if (!event.correct) return 0;
  if (event.attempt <= 1 && !event.usedHint) {
    return event.responseMs <= rtSlowMs ? 1.0 : 0.85;
  }
  if (event.attempt === 2) return 0.5;
  return 0.25;
}

/** True als dit event een item afrondt (en dus meetelt). */
export function isTerminalEvent(event: AnswerEvent): boolean {
  if (event.isGuess) return false;
  return event.correct || event.modeled;
}

/** Effectieve itemscore, inclusief de FL.*-uitzondering (ED §10.2). */
export function effectiveItemScore(event: AnswerEvent): number {
  const flTarget = flTargetFor(event.skillId);
  if (flTarget !== undefined && event.correct && event.attempt <= 1 && !event.usedHint && !event.modeled) {
    return event.responseMs <= flTarget ? 1.0 : 0.6;
  }
  return itemScoreFor(event, rtSlowFor(event.skillId));
}

/** Mediane waarde; 0 bij een lege lijst. */
export function median(values: readonly number[]): number {
  if (values.length === 0) return 0;
  const sorted = values.slice().sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const hi = sorted[mid] ?? 0;
  if (sorted.length % 2 === 1) return hi;
  const lo = sorted[mid - 1] ?? 0;
  return (lo + hi) / 2;
}

/**
 * EWMA-update op basis van het terminale event.
 * Gok- en niet-terminale events laten de state onveranderd.
 */
export function updateSkillState(prev: SkillState, event: AnswerEvent): SkillStateDetail {
  const current = ensureSkillDetail(prev);
  if (!isTerminalEvent(event)) return current;

  const score = effectiveItemScore(event);
  const alpha = alphaFor(current.attempts);
  const mastery = clamp01(current.mastery + alpha * (score - current.mastery));
  const attempts = current.attempts + 1;

  const firstTryCorrect = event.correct && event.attempt <= 1 && !event.usedHint && !event.modeled;
  const correct = current.correct + (firstTryCorrect ? 1 : 0);
  const consecutiveCorrect = firstTryCorrect ? current.consecutiveCorrect + 1 : 0;
  const hintsUsed = current.hintsUsed + (event.usedHint || event.modeled ? 1 : 0);

  const recentFirstAttempt = [...current.recentFirstAttempt, firstTryCorrect].slice(-ACCURACY_WINDOW);
  const correctCount = recentFirstAttempt.filter(Boolean).length;
  const accuracy = recentFirstAttempt.length === 0 ? 0 : correctCount / recentFirstAttempt.length;

  const recentResponseMs = event.correct
    ? [...current.recentResponseMs, event.responseMs].slice(-RESPONSE_WINDOW)
    : current.recentResponseMs;
  const avgResponseMs = median(recentResponseMs);

  const sameSession = current.lastSeenSession === event.sessionNumber;
  const sessionsSeen = sameSession ? current.sessionsSeen : current.sessionsSeen + 1;

  return {
    mastery,
    attempts,
    correct,
    accuracy,
    avgResponseMs,
    hintsUsed,
    consecutiveCorrect,
    leitnerBox: current.leitnerBox,
    lastSeenSession: event.sessionNumber,
    sessionsSeen,
    recentFirstAttempt,
    recentResponseMs,
  };
}

/**
 * Beheersingscriterium (ED §10.3): mastery ≥ 0.8 en attempts ≥ minItems en
 * consecutiveCorrect ≥ 4 en sessionsSeen ≥ 2.
 */
export function isMastered(state: SkillState | undefined, minItems: number): boolean {
  if (!state) return false;
  return (
    state.mastery >= 0.8 &&
    state.attempts >= minItems &&
    state.consecutiveCorrect >= 4 &&
    state.sessionsSeen >= 2
  );
}

/** Zwak grafeem: LK.<g>.SOUND mastery < 0.6 (ED §3 regel 2). */
export function isWeak(state: SkillState | undefined, threshold = 0.6): boolean {
  return (state?.mastery ?? 0) < threshold;
}
