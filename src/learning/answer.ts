/**
 * Antwoord-checkers en event-opbouw.
 * Feedback-flow: 1e fout → foutspecifieke fb.specific.* (EDU-006) of fb.try1.*,
 * 2e fout → hint, 3e fout → modeling (ED §9.2 / GD §5). DOM-vrij.
 */
import type { ActivityItem, AnswerEvent, Word } from '../types';
import { effectiveItemScore } from '../core/Mastery';
import { getGrapheme, getWord } from '../content';
import { commonConfusion, getItemFeedback } from './util';

export interface AnswerInput {
  /** Gekozen optie-id, of null bij timeout/geen antwoord. */
  optionId: string | null;
  /** Pogingnummer binnen dit item (1-based). */
  attempt?: number;
  usedHint?: boolean;
  /** Gokindicator: RT < 500 ms én fout (ED §11 regel 9). */
  isGuess?: boolean;
}

export interface AnswerCheckResult {
  correct: boolean;
  feedbackKey: string;
  isGuess: boolean;
  modeled: boolean;
  /** Variabelen voor {placeholder}s in de feedbacktekst (EDU-006). */
  feedbackVars?: Record<string, string>;
}

// ---------------------------------------------------------------------------
// Foutspecifieke detectie (EDU-006 / ED §9.3)
// ---------------------------------------------------------------------------

interface SpecificFeedback {
  key: string;
  vars: Record<string, string>;
}

function soundHint(id: string | undefined): string {
  if (!id) return '';
  return getGrapheme(id)?.soundHint ?? id;
}

function lettersOf(id: string | undefined): string {
  if (!id) return '';
  return getGrapheme(id)?.letters ?? id;
}

function wordFromItem(item: ActivityItem): Word | undefined {
  const key = typeof item.itemKey === 'string' ? item.itemKey : item.metadata?.['word'];
  return typeof key === 'string' ? getWord(key) : undefined;
}

/**
 * EDU-R2-004: de gerekte klankreeks van het doelwoord voor plak-feedback.
 * Gebruikt `metadata.sequence` (de generatoren zetten daar de soundHints in) en
 * valt anders terug op de grafeemsegmentatie van het woord.
 */
function sequenceSounds(item: ActivityItem): string {
  const raw = item.metadata?.['sequence'];
  if (Array.isArray(raw)) {
    const sounds = raw.filter((s): s is string => typeof s === 'string');
    if (sounds.length > 0) return sounds.join(' - ');
  }
  const word = wordFromItem(item);
  if (word) return word.graphemes.map((g) => soundHint(g)).join(' - ');
  return '';
}

/** EDU-R2-005: het gekozen aantal klanken bij hakken (voor fb.specific.count). */
function chosenCount(item: ActivityItem, chosenId: string): string {
  const option = item.options.find((o) => o.id === chosenId);
  if (option?.label) return option.label;
  if (chosenId.startsWith('n:')) return chosenId.slice(2);
  const target = item.metadata?.['phonemeCount'];
  return typeof target === 'number' ? String(target) : '';
}

function sameGraphemesDifferentOrder(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length || a.length < 2) return false;
  if (a.join('|') === b.join('|')) return false;
  const sortedA = [...a].sort().join('|');
  const sortedB = [...b].sort().join('|');
  return sortedA === sortedB;
}

function specificForWordChoice(item: ActivityItem, chosenId: string): SpecificFeedback | undefined {
  const target = wordFromItem(item);
  const chosen = getWord(chosenId);
  if (!target || !chosen) return undefined;
  const tg = target.graphemes;
  const cg = chosen.graphemes;
  const word = target.word;

  if (sameGraphemesDifferentOrder(tg, cg)) {
    return { key: 'fb.specific.order', vars: { word } };
  }

  let first = -1;
  let last = -1;
  const shared = Math.min(tg.length, cg.length);
  for (let i = 0; i < shared; i++) {
    if (tg[i] !== cg[i]) {
      if (first < 0) first = i;
      last = i;
    }
  }
  if (first < 0) {
    // Zelfde prefix, ander aantal klanken.
    if (cg.length > tg.length) {
      const extra = tg[tg.length - 1];
      return { key: 'fb.specific.last_sound', vars: { sound: soundHint(extra), word } };
    }
    return undefined;
  }

  if (first === last && commonConfusion(tg[first] ?? '', cg[first] ?? '')) {
    return {
      key: 'fb.specific.letter_confusion',
      vars: { letter: lettersOf(cg[first]), sound: soundHint(tg[first]), word },
    };
  }
  if (first === 0) {
    return { key: 'fb.specific.first_sound', vars: { sound: soundHint(tg[0]), letter: lettersOf(tg[0]), word } };
  }
  if (first === tg.length - 1 && first === last) {
    return { key: 'fb.specific.last_sound', vars: { sound: soundHint(tg[first]), letter: lettersOf(tg[first]), word } };
  }
  return {
    key: 'fb.specific.middle_sound',
    vars: {
      sounds: tg.map((g) => soundHint(g)).join(' '),
      sound: soundHint(tg[first]),
      letter: lettersOf(tg[first]),
      word,
    },
  };
}

function specificForKlankjager(item: ActivityItem, chosenId: string): SpecificFeedback | undefined {
  const targetGrapheme = item.metadata?.['targetGrapheme'];
  if (typeof targetGrapheme !== 'string') return undefined;
  const targetWord = wordFromItem(item);
  const chosen = getWord(chosenId);
  const last = item.skillId === 'FN.LAST_SOUND';
  const relevant = (w: Word | undefined): string | undefined =>
    w ? (last ? w.graphemes[w.graphemes.length - 1] : w.graphemes[0]) : undefined;
  if (chosen && relevant(chosen) === targetGrapheme) return undefined;
  return {
    key: last ? 'fb.specific.last_sound' : 'fb.specific.first_sound',
    vars: {
      sound: soundHint(targetGrapheme),
      letter: lettersOf(targetGrapheme),
      word: targetWord?.word ?? '',
    },
  };
}

function specificForLetterSound(item: ActivityItem, chosenId: string): SpecificFeedback | undefined {
  const targetGrapheme = item.metadata?.['targetGrapheme'];
  if (typeof targetGrapheme !== 'string') return undefined;
  const chosenGrapheme = chosenId.startsWith('g:') ? chosenId.slice(2) : chosenId;
  if (chosenGrapheme === targetGrapheme) return undefined;
  if (commonConfusion(targetGrapheme, chosenGrapheme)) {
    return { key: 'fb.specific.letter_confusion', vars: { letter: lettersOf(chosenGrapheme), sound: soundHint(targetGrapheme) } };
  }
  return {
    key: 'fb.specific.middle_sound',
    vars: { sounds: `${soundHint(targetGrapheme)} ${soundHint(chosenGrapheme)}`, letter: lettersOf(targetGrapheme) },
  };
}

function specificFeedback(item: ActivityItem, chosenId: string): SpecificFeedback | undefined {
  switch (item.kind) {
    case 'plakken':
      // EDU-R2-004: nooit een lege {sounds}; vul de gerekte klankreeks.
      return { key: 'fb.specific.blend_retry', vars: { word: wordFromItem(item)?.word ?? '', sounds: sequenceSounds(item) } };
    case 'hakken':
      // EDU-R2-005: tel-fout krijgt tel-feedback, niet de leesrichting-uitleg.
      return { key: 'fb.specific.count', vars: { count: chosenCount(item, chosenId) } };
    case 'woordlezen':
    case 'klimboom':
      return specificForWordChoice(item, chosenId);
    case 'klankjager':
      return specificForKlankjager(item, chosenId);
    case 'letterklank':
      return specificForLetterSound(item, chosenId);
    default:
      return undefined;
  }
}

// ---------------------------------------------------------------------------
// Antwoordcheck
// ---------------------------------------------------------------------------

/** Bepaalt correctheid en de juiste feedback-sleutel voor dit antwoord. */
export function checkAnswer(item: ActivityItem, answer: AnswerInput): AnswerCheckResult {
  const feedback = getItemFeedback(item);
  const attempt = answer.attempt ?? 1;

  if (answer.isGuess) {
    return { correct: false, feedbackKey: 'fb.guess.1', isGuess: true, modeled: false };
  }

  const chosen = item.options.find((o) => o.id === answer.optionId);
  const correct = chosen !== undefined && chosen.id === item.targetId;
  if (correct) {
    return { correct: true, feedbackKey: feedback?.correct ?? 'fb.correct.3', isGuess: false, modeled: false };
  }

  if (attempt >= 3) {
    return { correct: false, feedbackKey: feedback?.model ?? 'fb.model.1', isGuess: false, modeled: true };
  }
  if (attempt === 2) {
    return { correct: false, feedbackKey: feedback?.hint ?? 'fb.hint.1', isGuess: false, modeled: false };
  }

  const specific = answer.optionId ? specificFeedback(item, answer.optionId) : undefined;
  const byOption = answer.optionId ? feedback?.try1ByOption?.[answer.optionId] : undefined;
  const result: AnswerCheckResult = {
    correct: false,
    feedbackKey: specific?.key ?? byOption ?? feedback?.try1 ?? 'fb.try1.1',
    isGuess: false,
    modeled: false,
  };
  if (specific) result.feedbackVars = specific.vars;
  return result;
}

export interface AnswerEventParams {
  sessionNumber: number;
  timestamp: number;
  responseMs: number;
  attempt?: number;
  usedHint?: boolean;
}

/** Bouwt het enige event dat Mastery/Leitner consumeren (ARCHITECTURE §3). */
export function buildAnswerEvent(
  item: ActivityItem,
  answer: AnswerInput,
  params: AnswerEventParams,
): AnswerEvent {
  const check = checkAnswer(item, answer);
  const responseMs = params.responseMs;
  const isGuess = answer.isGuess ?? (!check.correct && responseMs < 500);
  const event: AnswerEvent = {
    itemId: item.id,
    skillId: item.skillId,
    sessionNumber: params.sessionNumber,
    timestamp: params.timestamp,
    selectedOptionId: answer.optionId,
    correct: check.correct,
    attempt: answer.attempt ?? 1,
    usedHint: answer.usedHint ?? false,
    modeled: check.modeled,
    responseMs,
    isGuess,
    itemScore: 0,
  };
  if (item.secondarySkillId) event.secondarySkillId = item.secondarySkillId;
  if (item.itemKey) event.itemKey = item.itemKey;
  event.itemScore = effectiveItemScore(event);
  return event;
}
