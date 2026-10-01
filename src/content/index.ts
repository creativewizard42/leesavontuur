/**
 * Publieke API van de content-module (ARCHITECTURE §10.3).
 *
 * De Builder programmeert hiertegen. De Content Builder mag de implementatie
 * en data uitbreiden, maar houdt bestaande signatures stabiel.
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
import { WORDS, MVP_WORDS } from './words';
import { SIGHT_WORDS } from './sightWords';
import { SENTENCES } from './sentences';
import { FEEDBACK, REQUIRED_FEEDBACK_KEYS } from './feedback';
import { UI_TEXTS } from './uiTexts';
import { INSTRUCTIONS } from './instructions';
import { PROPER_NAMES } from './properNames';
import { AUDIO_MANIFEST } from './audioManifest';
import { getArea, getPhase, AREAS, PHASES } from './phases';
import { isBlockedWord } from './blocklist';
import {
  CURRENT_CONTENT,
  isWordAllowed,
  segmentWord,
  validateContent,
} from './validator';
import type { ProperName } from './properNames';

// --- data -----------------------------------------------------------------

export const graphemes: readonly Grapheme[] = GRAPHEMES;
export const words: readonly Word[] = WORDS;
export const sightWords: readonly SightWord[] = SIGHT_WORDS;
export const sentences: readonly Sentence[] = SENTENCES;
export const feedback: Readonly<Record<string, string>> = FEEDBACK;
export const uiTexts: Readonly<Record<string, string>> = UI_TEXTS;
export const instructions: Readonly<Record<string, string>> = INSTRUCTIONS;
export const properNames: readonly ProperName[] = PROPER_NAMES;
export const audioManifest = AUDIO_MANIFEST;
export const content: ContentBundle = CURRENT_CONTENT;
export const phases = PHASES;
export const areas = AREAS;
export const requiredFeedbackKeys = REQUIRED_FEEDBACK_KEYS;

// --- queries --------------------------------------------------------------

export function getGrapheme(id: string): Grapheme | undefined {
  return graphemes.find((g) => g.id === id);
}

export function getWord(word: string): Word | undefined {
  return words.find((w) => w.word === word);
}

export function getProperName(word: string): ProperName | undefined {
  const lower = word.toLowerCase();
  return properNames.find((pn) => pn.word === lower || pn.name.toLowerCase() === lower);
}

/** Alle grafemen met order <= n (introductievolgorde). */
export function getGraphemesUpTo(order: number): Grapheme[] {
  return graphemes.filter((g) => g.order <= order);
}

/** Alle woorden die volledig uit `learned` grafemen bestaan. */
export function wordsForGraphemes(learned: ReadonlySet<string>): Word[] {
  return words.filter((w) => w.graphemes.every((g) => learned.has(g)));
}

/** MVP-woorden (ED §5.2): alleen m, a, s, t, k, r. */
export function getMvpWords(): Word[] {
  return [...MVP_WORDS];
}

/** Woorden waarvan alle grafemen in `block` of eerder bekend zijn. */
export function wordsForBlock(block: number): Word[] {
  return words.filter((w) => w.block <= block);
}

export function ui(key: string): string {
  return uiTexts[key] ?? key;
}

export function fbText(key: string): string {
  return feedback[key] ?? key;
}

/** Instructietekst met `{placeholder}`-vervanging; valt terug op de key. */
export function instruction(key: string, vars: Record<string, string> = {}): string {
  const template = instructions[key];
  if (template === undefined) return key;
  return template.replace(/\{(\w+)\}/g, (match, name: string) => vars[name] ?? match);
}

// --- validation / helpers -------------------------------------------------

export { validateContent, isWordAllowed, isBlockedWord, segmentWord, getPhase, getArea };
export type { ValidationResult, ProperName };
