/**
 * Mini-game 4f "De Klimboom" (GD §4f): audio-opdracht -> juiste geschreven
 * woord tikken. Geen plaatjes, geen tijdsdruk; afleiders zijn minimale paren
 * uit de vrijgegeven woorden. DOM-vrij.
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
  wordMetadata,
  type OptionSpec,
} from './util';

export interface KlimboomOptions {
  count: number;
  difficulty: Difficulty;
  availableWords: readonly string[];
  rng: Rng;
  learned?: ReadonlySet<string>;
  skillId?: SkillId;
  avoidCorrectIndices?: readonly number[];
}

export function generate(options: KlimboomOptions): ActivityItem[] {
  const { count, difficulty, rng } = options;
  const skillId: SkillId = options.skillId ?? 'DE.CVC';
  const learned = options.learned ?? new Set(options.availableWords.flatMap((w) => getWord(w)?.graphemes ?? []));
  const pool: Word[] = options.availableWords
    .filter((w) => isWordAllowed(w, learned))
    .map((w) => getWord(w))
    .filter((w): w is Word => w !== undefined);

  if (pool.length < 2 || count <= 0) return [];

  const remaining = pool.slice();
  const items: ActivityItem[] = [];
  const avoid = [...(options.avoidCorrectIndices ?? [])];

  for (let i = 0; i < count; i++) {
    if (remaining.length === 0) break;
    const targetIndex = Math.floor(rng() * remaining.length);
    const [target] = remaining.splice(targetIndex < remaining.length ? targetIndex : 0, 1);
    if (!target) break;

    const others = pool.filter((w) => w.word !== target.word);
    const distractors = pickWordDistractors(target, others, difficulty, optionCountFor(difficulty) - 1, rng);
    const correct: OptionSpec = { id: target.word, label: target.word };
    const distractorSpecs: OptionSpec[] = distractors.map((w) => ({ id: w.word, label: w.word }));

    const { options: placed, targetId } = placeOptions(correct, distractorSpecs, rng, avoid);
    const correctIndex = placed.findIndex((o) => o.id === targetId);
    if (correctIndex >= 0) avoid.push(correctIndex);

    items.push({
      id: itemId('klimboom', target.word, rng),
      skillId,
      kind: 'klimboom',
      prompt: {
        audio: instructionClip(`instr.klim.${target.word}`, `Klim naar ${target.word}.`),
        text: `Klim naar ${target.word}.`,
        showText: false,
      },
      options: placed,
      targetId,
      difficulty,
      isRetry: false,
      itemKey: target.word,
      metadata: {
        ...feedbackMeta({
          correct: 'fb.correct.2',
          try1: 'fb.try1.3',
          hint: 'fb.hint.1',
          model: 'fb.model.2',
        }),
        ...wordMetadata(target.word, { task: 'klimboom' }),
      },
    });
  }

  return items;
}
