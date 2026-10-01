/**
 * Antwoord-checkers en event-opbouw.
 * Feedback-flow: 1e fout → fb.try1.*, 2e fout → hint, 3e fout → modeling
 * (ED §9.2 / GD §5). DOM-vrij.
 */
import type { ActivityItem, AnswerEvent } from '../types';
import { effectiveItemScore } from '../core/Mastery';
import { getItemFeedback } from './util';

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
}

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
  const specific = answer.optionId ? feedback?.try1ByOption?.[answer.optionId] : undefined;
  return {
    correct: false,
    feedbackKey: specific ?? feedback?.try1 ?? 'fb.try1.1',
    isGuess: false,
    modeled: false,
  };
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
