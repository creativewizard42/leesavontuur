/**
 * Decoderen: DE.VC, DE.CVC, DE.CVVC, DE.CCVC, DE.CVCC, DE.CCVCC (ED §2.5).
 * Geschreven woord lezen; het plaatje verschijnt pas NA correct decoderen
 * (ED §11.1). De opties bevatten daarom nooit een `image` vóór het antwoord.
 * DOM-vrij.
 */
import type { ActivityItem, Difficulty, Rng, SkillId, Word } from '../types';
import { getWord, isWordAllowed } from '../content';
import { optionCountFor } from '../core/Adaptive';
import {
  feedbackMeta,
  instructionClip,
  itemId,
  pickWordDistractors,
  placeOptions,
  wordClip,
  wordMetadata,
  type OptionSpec,
} from './util';

export interface WordReadingOptions {
  skillId: SkillId;
  targetWord: string;
  availableWords: readonly string[];
  difficulty: Difficulty;
  rng: Rng;
  learned?: ReadonlySet<string>;
  avoidCorrectIndices?: readonly number[];
}

export function generate(options: WordReadingOptions): ActivityItem {
  const { skillId, targetWord, difficulty, rng } = options;
  const target = getWord(targetWord);
  if (!target) throw new Error(`WordReading.generate: onbekend doelwoord "${targetWord}"`);

  const learned = options.learned ?? new Set(options.availableWords.flatMap((w) => getWord(w)?.graphemes ?? []));
  const pool: Word[] = options.availableWords
    .filter((w) => w !== targetWord && isWordAllowed(w, learned))
    .map((w) => getWord(w))
    .filter((w): w is Word => w !== undefined);

  const distractors = pickWordDistractors(target, pool, difficulty, optionCountFor(difficulty) - 1, rng);

  // Opties zijn identieke audio-knoppen (GD §4e); nooit een plaatje vóór het antwoord.
  const correct: OptionSpec = { id: targetWord, audio: wordClip(targetWord) };
  const distractorSpecs: OptionSpec[] = distractors.map((w) => ({ id: w.word, audio: wordClip(w.word) }));

  const { options: placed, targetId } = placeOptions(correct, distractorSpecs, rng, options.avoidCorrectIndices ?? []);

  return {
    id: itemId('woordlezen', `${skillId}.${targetWord}`, rng),
    skillId,
    kind: 'woordlezen',
    prompt: {
      audio: instructionClip('instr.de.read', 'Lees dit woord. Tik eerst de letters, plak ze daarna aan elkaar.'),
      text: target.word,
      showText: true,
    },
    options: placed,
    targetId,
    difficulty,
    isRetry: false,
    itemKey: targetWord,
    metadata: {
      ...feedbackMeta({
        correct: 'fb.correct.4',
        try1: 'fb.try1.3',
        hint: 'fb.hint.1',
        model: 'fb.model.1',
      }),
      // revealImage wordt door de UI pas ná correct getoond (ED §11.1).
      ...wordMetadata(targetWord, { task: 'read' }),
    },
  };
}
