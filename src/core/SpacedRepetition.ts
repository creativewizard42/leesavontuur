/**
 * Spaced repetition (Leitner) per item-skill, ED §10.4 / ARCHITECTURE §4.4.
 * DOM-vrij.
 * TODO(Builder): implementeer box-intervallen en promotie/degradatiepaden.
 */

/** Interval in sessies per box (index 1..5; index 0 ongebruikt). */
export const LEITNER_INTERVALS: readonly number[] = [0, 1, 2, 4, 8, 16];

export const MAX_BOX = 5;
export const MASTERED_BOX = 3;

/** True als een item in deze sessie herhaald moet worden. */
export function isDue(
  _box: number,
  _currentSession: number,
  _lastSeenSession: number,
): boolean {
  throw new Error('TODO(Builder): SpacedRepetition.isDue');
}

/** Promotie bij correct 1e poging zonder hint. */
export function promote(_box: number): number {
  throw new Error('TODO(Builder): SpacedRepetition.promote');
}

/** Degradatie bij fout; `s` = 0.5 geeft in box 3 de speciale route naar box 2. */
export function degrade(_box: number, _itemScore: number): number {
  throw new Error('TODO(Builder): SpacedRepetition.degrade');
}
