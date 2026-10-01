/**
 * Adaptieve regels, ED §10.3 / §10.5 / ARCHITECTURE §4.5.
 * DOM-vrij.
 */
import type { AnswerEvent, Difficulty, SkillState } from '../types';

export const DIFFICULTY_ORDER: readonly Difficulty[] = ['A', 'B', 'C', 'D'];

/** Index 0..3 van een moeilijkheidsniveau. */
export function difficultyIndex(difficulty: Difficulty): number {
  const index = DIFFICULTY_ORDER.indexOf(difficulty);
  return index < 0 ? 0 : index;
}

/** Niveau bij index (geklemd op A..D). */
export function difficultyAt(index: number): Difficulty {
  const clamped = Math.min(DIFFICULTY_ORDER.length - 1, Math.max(0, index));
  return DIFFICULTY_ORDER[clamped] ?? 'A';
}

/** Eén niveau omhoog (max D). */
export function increase(difficulty: Difficulty): Difficulty {
  return difficultyAt(difficultyIndex(difficulty) + 1);
}

/** Eén niveau omlaag (min A). */
export function simplify(difficulty: Difficulty): Difficulty {
  return difficultyAt(difficultyIndex(difficulty) - 1);
}

/** Aantal antwoordopties per moeilijkheidsniveau (MVP: 2 → 3 → 4). */
export function optionCountFor(difficulty: Difficulty): number {
  switch (difficulty) {
    case 'A':
      return 2;
    case 'B':
      return 3;
    case 'C':
      return 4;
    case 'D':
      return 4;
    default:
      return 2;
  }
}

/** Aantal afleiders (opties − 1). */
export function distractorCountFor(difficulty: Difficulty): number {
  return Math.max(1, optionCountFor(difficulty) - 1);
}

/** Afleider-strategie per niveau (ED §10.5). */
export type DistractorStrategy =
  | 'maximally-different'
  | 'same-class'
  | 'minimal-pair'
  | 'classic-confusion';

export function distractorStrategyFor(difficulty: Difficulty): DistractorStrategy {
  switch (difficulty) {
    case 'A':
      return 'maximally-different';
    case 'B':
      return 'same-class';
    case 'C':
      return 'minimal-pair';
    case 'D':
      return 'classic-confusion';
    default:
      return 'maximally-different';
  }
}

/**
 * Extra audio-ondersteuning (automatisch herhalen/gerekte klanken) bij een
 * eenvoudig niveau of lage mastery (GD §7).
 */
export function audioSupportFor(state: SkillState | undefined, difficulty: Difficulty): boolean {
  if (difficulty === 'A') return true;
  return (state?.mastery ?? 0) < 0.5;
}

/**
 * Volgend niveau op basis van mastery/consecutiveCorrect/accuracy (ED §10.3).
 * Bevordert of verlaagt hooguit één stap.
 */
export function nextDifficulty(difficulty: Difficulty, state: SkillState): Difficulty {
  if (state.mastery > 0.85 && state.consecutiveCorrect >= 5) return increase(difficulty);
  if (state.attempts >= 10 && state.accuracy > 0.95) return increase(difficulty);
  if (state.mastery < 0.5 && state.attempts >= 6) return simplify(difficulty);
  if (state.attempts >= 10 && state.accuracy < 0.65) return simplify(difficulty);
  return difficulty;
}

/** True bij "vereenvoudigen": mastery < 0.5 na ≥ 6 items of 2× s ≤ 0.25. */
export function shouldSimplify(state: SkillState, recentEvents: readonly AnswerEvent[]): boolean {
  if (state.mastery < 0.5 && state.attempts >= 6) return true;
  const terminal = recentEvents.filter((e) => !e.isGuess && (e.correct || e.modeled));
  if (terminal.length < 2) return false;
  const last = terminal[terminal.length - 1];
  const beforeLast = terminal[terminal.length - 2];
  if (!last || !beforeLast) return false;
  return last.itemScore <= 0.25 && beforeLast.itemScore <= 0.25;
}

/** True na 3 items op rij gemodelleerd (frustratiestop, ED §10.3). */
export function shouldStopForFrustration(consecutiveModeled: number): boolean {
  return consecutiveModeled >= 3;
}
