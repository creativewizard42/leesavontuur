/**
 * Auditieve synthese / plakken: SY.VC, SY.CVC, SY.CLUSTER (ED §2.4).
 * Route 1: gerekte klanken horen -> juiste geschreven woord kiezen.
 * Afleiders zijn minimale paren (ED §10.5). DOM-vrij.
 */
import type { ActivityItem, Difficulty, Rng, SkillId, Word } from '../types';
import { getGrapheme, getWord, isWordAllowed } from '../content';
import { optionCountFor } from '../core/Adaptive';
import { blendClip, feedbackMeta, itemId, pickWordDistractors, placeOptions, wordClip, wordMetadata, type OptionSpec } from './util';

export interface BlendingOptions {
  skillId: SkillId;
  targetWord: string;
  /** Beschikbare woorden voor afleiders (alleen geleerde grafemen). */
  availableWords: readonly string[];
  difficulty: Difficulty;
  rng: Rng;
  learned?: ReadonlySet<string>;
  avoidCorrectIndices?: readonly number[];
}

export function generate(options: BlendingOptions): ActivityItem {
  const { skillId, targetWord, difficulty, rng } = options;
  const target = getWord(targetWord);
  if (!target) throw new Error(`Blending.generate: onbekend doelwoord "${targetWord}"`);

  const learned = options.learned ?? new Set(options.availableWords.flatMap((w) => getWord(w)?.graphemes ?? []));
  const pool: Word[] = options.availableWords
    .filter((w) => w !== targetWord && isWordAllowed(w, learned))
    .map((w) => getWord(w))
    .filter((w): w is Word => w !== undefined);

  const distractors = pickWordDistractors(target, pool, difficulty, optionCountFor(difficulty) - 1, rng);
  const correct: OptionSpec = { id: targetWord, label: targetWord, audio: wordClip(targetWord) };
  const distractorSpecs: OptionSpec[] = distractors.map((w) => ({
    id: w.word,
    label: w.word,
    audio: wordClip(w.word),
  }));

  const { options: placed, targetId } = placeOptions(correct, distractorSpecs, rng, options.avoidCorrectIndices ?? []);

  const sequence = target.graphemes.map((id) => getGrapheme(id)?.soundHint ?? id);

  return {
    id: itemId('plakken', `${skillId}.${targetWord}`, rng),
    skillId,
    kind: 'plakken',
    prompt: {
      audio: blendClip(targetWord),
      text: 'Plak de klanken aan elkaar. Welk woord hoor je?',
      showText: false,
    },
    options: placed,
    targetId,
    difficulty,
    isRetry: false,
    itemKey: targetWord,
    metadata: {
      ...feedbackMeta({
        correct: 'fb.correct.5',
        try1: 'fb.try1.3',
        hint: 'fb.hint.1',
        model: 'fb.model.1',
      }),
      ...wordMetadata(targetWord, { task: 'blend', sequence }),
    },
  };
}
