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
import { resolveInstructionKey, REQUIRED_INSTRUCTION_KEYS } from './instructions';
import { PROPER_NAMES } from './properNames';
import { AUDIO_MANIFEST } from './audioManifest';
import { getArea, getPhase, AREAS, PHASES } from './phases';
import { isBlockedWord } from './blocklist';
import {
  RHYME_GROUPS,
  SYLLABLE_WORDS,
  PHONOLOGY_KNOWN_WORDS,
  rhymeTail,
  allPhonologyWords,
} from './phonology';
import { decodeSkillForWord, segmentSkillForWord, blendSkillForWord } from './skills';
import {
  CURRENT_CONTENT,
  assertItemsAllowed,
  isWordAllowed,
  segmentWord,
  validateContent,
} from './validator';
import type { ProperName } from './properNames';
import type { ActivityItem } from '../types';

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
export const requiredInstructionKeys = REQUIRED_INSTRUCTION_KEYS;
export const rhymeGroups = RHYME_GROUPS;
export const syllableWords = SYLLABLE_WORDS;
export const phonologyKnownWords = PHONOLOGY_KNOWN_WORDS;

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

/** Feedbacktekst met `{placeholder}`-vervanging (backwards compatible met 1 arg). */
export function fbText(key: string, vars: Record<string, string> = {}): string {
  const template = feedback[key];
  if (template === undefined) return key;
  return template.replace(/\{(\w+)\}/g, (match, name: string) => vars[name] ?? match);
}

/** Instructietekst met `{placeholder}`-vervanging; valt terug op de key. */
export function instruction(key: string, vars: Record<string, string> = {}): string {
  const direct = instructions[key];
  if (direct !== undefined) {
    return direct.replace(/\{(\w+)\}/g, (match, name: string) => vars[name] ?? match);
  }
  const dynamic = resolveInstructionKey(key);
  if (dynamic) {
    const template = instructions[dynamic.template];
    if (template !== undefined) {
      const merged = { ...dynamic.vars, ...vars };
      return template.replace(/\{(\w+)\}/g, (match, name: string) => merged[name] ?? match);
    }
  }
  return key;
}

/** Rijmdeel (klinker + rest) van een woord, voor rijmvalidatie. */
export { rhymeTail, allPhonologyWords };
export { decodeSkillForWord, segmentSkillForWord, blendSkillForWord };
export { resolveInstructionKey };

// --- validation / helpers -------------------------------------------------

export { validateContent, assertItemsAllowed, isWordAllowed, isBlockedWord, segmentWord, getPhase, getArea };
export type { ValidationResult, ProperName, ActivityItem };
export type { DecodeSkill, SegmentSkill, BlendSkill } from './skills';
