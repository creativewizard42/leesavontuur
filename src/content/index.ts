/**
 * Publieke API van de content-module (ARCHITECTURE §10.3).
 *
 * De Builder programmeert hiertegen. De Content Builder mag de implementatie
 * en data uitbreiden, maar houdt deze signatures stabiel.
 *
 * STATUS: werkende stub met echte MVP-data (m, a, s, t, k, r).
 * TODO(Content Builder): fase 6–9 data, meer woorden/zinnen, echte audio-refs,
 *        volledige dekking van ED §5–§8.
 */
import type {
  ContentBundle,
  Grapheme,
  Sentence,
  SightWord,
  ValidationResult,
  Word,
} from '../types';
import { GRAPHEMES } from './graphemes';
import { WORDS } from './words';
import { SIGHT_WORDS } from './sightWords';
import { SENTENCES } from './sentences';
import { FEEDBACK } from './feedback';
import { UI_TEXTS } from './uiTexts';
import { getPhase, PHASES } from './phases';
import { isBlockedWord } from './blocklist';
import {
  CURRENT_CONTENT,
  isWordAllowed,
  segmentWord,
  validateContent,
} from './validator';

// --- data -----------------------------------------------------------------

export const graphemes: readonly Grapheme[] = GRAPHEMES;
export const words: readonly Word[] = WORDS;
export const sightWords: readonly SightWord[] = SIGHT_WORDS;
export const sentences: readonly Sentence[] = SENTENCES;
export const feedback: Readonly<Record<string, string>> = FEEDBACK;
export const uiTexts: Readonly<Record<string, string>> = UI_TEXTS;
export const content: ContentBundle = CURRENT_CONTENT;
export const phases = PHASES;

// --- queries --------------------------------------------------------------

export function getGrapheme(id: string): Grapheme | undefined {
  return graphemes.find((g) => g.id === id);
}

export function getWord(word: string): Word | undefined {
  return words.find((w) => w.word === word);
}

/** Alle grafemen met order <= n (introductievolgorde). */
export function getGraphemesUpTo(order: number): Grapheme[] {
  return graphemes.filter((g) => g.order <= order);
}

/** Alle woorden die volledig uit `learned` grafemen bestaan. */
export function wordsForGraphemes(learned: ReadonlySet<string>): Word[] {
  return words.filter((w) => w.graphemes.every((g) => learned.has(g)));
}

export function ui(key: string): string {
  return uiTexts[key] ?? key;
}

export function fbText(key: string): string {
  return feedback[key] ?? key;
}

// --- validation / helpers -------------------------------------------------

export { validateContent, isWordAllowed, isBlockedWord, segmentWord, getPhase };
export type { ValidationResult };
