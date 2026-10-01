/**
 * Mastery-formule (EWMA) exact volgens ED §10.2 / ARCHITECTURE §4.
 * DOM-vrij en volledig unit-testbaar.
 * TODO(Builder): implementeer en dek af met unit tests (§9.1).
 */
import type { AnswerEvent, SkillState } from '../types';

export const START_MASTERY = 0;

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

/** Itemscore s volgens ED §10.2. */
export function itemScoreFor(
  _event: AnswerEvent,
  _rtSlowMs: number,
): number {
  throw new Error('TODO(Builder): Mastery.itemScoreFor');
}

/** EWMA-update op basis van `event.itemScore`. */
export function updateSkillState(
  _prev: SkillState,
  _event: AnswerEvent,
): SkillState {
  throw new Error('TODO(Builder): Mastery.updateSkillState');
}
