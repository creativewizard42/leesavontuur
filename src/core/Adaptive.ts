/**
 * Adaptieve regels, ED §10.3 / §10.5 / ARCHITECTURE §4.5.
 * DOM-vrij.
 * TODO(Builder): implementeer niveaukeuze, optieaantal en frustratiestop.
 */
import type { AnswerEvent, Difficulty, SkillState } from '../types';

/** Aantal antwoordopties per moeilijkheidsniveau (MVP: 2 -> 3 -> 4). */
export function optionCountFor(_difficulty: Difficulty): number {
  throw new Error('TODO(Builder): Adaptive.optionCountFor');
}

/** Volgend niveau op basis van mastery/consecutiveCorrect/accuracy. */
export function nextDifficulty(
  _difficulty: Difficulty,
  _state: SkillState,
): Difficulty {
  throw new Error('TODO(Builder): Adaptive.nextDifficulty');
}

/** True bij "vereenvoudigen": mastery < 0.5 na >= 6 items of 2x s <= 0.25. */
export function shouldSimplify(_state: SkillState, _recentEvents: readonly AnswerEvent[]): boolean {
  throw new Error('TODO(Builder): Adaptive.shouldSimplify');
}

/** True na 3 items op rij gemodelleerd (frustratiestop). */
export function shouldStopForFrustration(_consecutiveModeled: number): boolean {
  throw new Error('TODO(Builder): Adaptive.shouldStopForFrustration');
}
