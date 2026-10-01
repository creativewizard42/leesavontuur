/** Publieke API van de learning-module (activity-generatoren + checkers). */
export * as Phonology from './Phonology';
export * as FirstSound from './FirstSound';
export * as LetterSound from './LetterSound';
export * as Segmenting from './Segmenting';
export * as Blending from './Blending';
export * as WordReading from './WordReading';
export * as Klimboom from './Klimboom';

export { checkAnswer, buildAnswerEvent } from './answer';
export type { AnswerInput, AnswerCheckResult, AnswerEventParams } from './answer';
export type { ItemFeedback } from './util';
export {
  ALL_GRAPHEMES,
  allowedWords,
  allowedWordObjects,
  hasSameSound,
  commonConfusion,
  pickGraphemeDistractors,
  pickWordDistractors,
  wordDistance,
} from './util';
