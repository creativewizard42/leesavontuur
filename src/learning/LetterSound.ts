/**
 * Letter-klank: LK.<g>.SOUND, LK.<g>.RECOGNIZE (ED §2.3).
 * Nooit twee juiste antwoorden (ei/ij, ou/au, g/ch) (ED §10.5).
 * DOM-vrij.
 */
import type { ActivityItem, Difficulty, Rng } from '../types';
import { getGrapheme } from '../content';
import { optionCountFor } from '../core/Adaptive';
import {
  feedbackMeta,
  graphemeSoundClip,
  instructionClip,
  itemId,
  placeOptions,
  pickGraphemeDistractors,
  type OptionSpec,
} from './util';

export type LetterDirection = 'grapheme-to-sound' | 'sound-to-grapheme';

export interface LetterSoundOptions {
  skillId: string;
  direction: LetterDirection;
  targetGrapheme: string;
  learnedGraphemes: ReadonlySet<string>;
  difficulty: Difficulty;
  rng: Rng;
  /** Posities van het juiste antwoord in recente items (nooit 3× op rij). */
  avoidCorrectIndices?: readonly number[];
}

export function generate(options: LetterSoundOptions): ActivityItem {
  const { skillId, direction, targetGrapheme, learnedGraphemes, difficulty, rng } = options;
  const target = getGrapheme(targetGrapheme);
  const targetSound = target?.soundHint ?? targetGrapheme;

  const distractorCount = Math.max(1, optionCountFor(difficulty) - 1);
  const distractors = pickGraphemeDistractors(
    targetGrapheme,
    learnedGraphemes,
    difficulty,
    distractorCount,
    rng,
  );

  let correct: OptionSpec;
  let distractorSpecs: OptionSpec[];
  let promptText: string;

  if (direction === 'grapheme-to-sound') {
    // Letter zien (stil) -> juiste klankknop kiezen.
    correct = { id: `g:${targetGrapheme}`, audio: graphemeSoundClip(targetGrapheme) };
    distractorSpecs = distractors.map((g) => ({ id: `g:${g.id}`, audio: graphemeSoundClip(g.id) }));
    promptText = 'Welke klank zegt deze letter?';
  } else {
    // Klank horen -> juiste letter kiezen.
    correct = { id: `g:${targetGrapheme}`, label: target?.letters ?? targetGrapheme, audio: graphemeSoundClip(targetGrapheme) };
    distractorSpecs = distractors.map((g) => ({ id: `g:${g.id}`, label: g.letters, audio: graphemeSoundClip(g.id) }));
    promptText = `Welke letter hoort bij ${targetSound}?`;
  }

  const { options: placed, targetId } = placeOptions(
    correct,
    distractorSpecs,
    rng,
    options.avoidCorrectIndices ?? [],
  );

  const prompt =
    direction === 'grapheme-to-sound'
      ? {
          audio: instructionClip('instr.lk.grapheme_to_sound', promptText),
          text: target?.letters ?? targetGrapheme,
          showText: true,
        }
      : {
          audio: graphemeSoundClip(targetGrapheme),
          text: promptText,
          showText: false,
        };

  return {
    id: itemId('letterklank', `${skillId}.${direction}.${targetGrapheme}`, rng),
    skillId,
    kind: 'letterklank',
    prompt,
    options: placed,
    targetId,
    difficulty,
    isRetry: false,
    itemKey: targetGrapheme,
    metadata: {
      ...feedbackMeta({
        correct: 'fb.correct.1',
        try1: 'fb.try1.2',
        hint: 'fb.hint.2',
        model: 'fb.model.4',
      }),
      targetGrapheme,
      direction,
    },
  };
}
