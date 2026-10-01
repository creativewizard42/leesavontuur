/**
 * Voortgang en poortcondities, ED §3 regel 2 / ARCHITECTURE §4.6.
 * DOM-vrij.
 * TODO(Builder): implementeer fase-unlock en grafeem-introductie.
 */
import type { Grapheme, Profile } from '../types';
import { getGraphemesUpTo, getPhase } from '../content';

const MASTERED = 0.8;
const WEAK = 0.6;
const MAX_WEAK = 2;

/** True als een nieuw grafeem mag worden geïntroduceerd (poortconditie). */
export function canIntroduceNewGrapheme(_profile: Profile): boolean {
  throw new Error('TODO(Builder): Progression.canIntroduceNewGrapheme');
}

/** Het volgende grafeem in de volgorde dat nog niet is vrijgegeven. */
export function nextGraphemeToIntroduce(_profile: Profile): Grapheme | undefined {
  throw new Error('TODO(Builder): Progression.nextGraphemeToIntroduce');
}

export const THRESHOLDS = { MASTERED, WEAK, MAX_WEAK } as const;

export { getGraphemesUpTo, getPhase };
