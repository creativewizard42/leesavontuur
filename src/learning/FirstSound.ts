/**
 * Fonemisch bewustzijn: FN.FIRST_SOUND, FN.LAST_SOUND (ED §2.2).
 * Auditief, geen geschreven woord in beeld (ED §11.3).
 * DOM-vrij.
 */
import type { ActivityItem, Difficulty, Rng, Word } from '../types';
import { getGrapheme, getWord, isWordAllowed } from '../content';
import {
  feedbackMeta,
  instructionClip,
  itemId,
  placeOptions,
  wordClip,
  wordMetadata,
  type OptionSpec,
} from './util';

export interface FirstSoundOptions {
  skillId: string;
  difficulty: Difficulty;
  count: number;
  /** Beschikbare woorden (uit content, alleen geleerde grafemen). */
  availableWords: readonly string[];
  rng: Rng;
  /** Vrijgegeven grafemen; filtert woorden via isWordAllowed (ED §6.4). */
  learned?: ReadonlySet<string>;
  /** Posities van het juiste antwoord in recente items (nooit 3× op rij). */
  avoidCorrectIndices?: readonly number[];
}

function relevantGrapheme(word: Word, last: boolean): string | undefined {
  return last ? word.graphemes[word.graphemes.length - 1] : word.graphemes[0];
}

export function generate(options: FirstSoundOptions): ActivityItem[] {
  const { skillId, difficulty, count, rng } = options;
  const last = skillId === 'FN.LAST_SOUND';
  const learned = options.learned ?? new Set(options.availableWords.flatMap((w) => getWord(w)?.graphemes ?? []));
  const pool = options.availableWords
    .filter((w) => isWordAllowed(w, learned))
    .map((w) => getWord(w))
    .filter((w): w is Word => w !== undefined && w.graphemes.length > 0);

  if (pool.length < 2 || count <= 0) return [];

  const remaining = pool.slice();
  const items: ActivityItem[] = [];
  const avoid = [...(options.avoidCorrectIndices ?? [])];

  for (let i = 0; i < count && remaining.length >= 1; i++) {
    const pickIndex = Math.floor(rng() * remaining.length);
    const [target] = remaining.splice(pickIndex < remaining.length ? pickIndex : 0, 1);
    if (!target) break;

    const targetGrapheme = relevantGrapheme(target, last);
    if (!targetGrapheme) continue;
    const targetSound = getGrapheme(targetGrapheme)?.soundHint ?? targetGrapheme;

    const distractorPool = remaining.filter((w) => relevantGrapheme(w, last) !== targetGrapheme);
    const usable = distractorPool.length >= 1 ? distractorPool : remaining;
    const distractors = pickDistinct(usable, Math.max(1, Math.min(2, usable.length)), rng);

    const correct: OptionSpec = { id: target.word, audio: wordClip(target.word) };
    const distractorSpecs: OptionSpec[] = distractors.map((w) => ({ id: w.word, audio: wordClip(w.word) }));

    const { options: placed, targetId } = placeOptions(correct, distractorSpecs, rng, avoid);
    const correctIndex = placed.findIndex((o) => o.id === targetId);
    if (correctIndex >= 0) avoid.push(correctIndex);

    const text = last
      ? `Welk woord eindigt op ${targetSound}?`
      : `Welk woord begint met ${targetSound}?`;

    items.push({
      id: itemId('klankjager', `${skillId}.${target.word}`, rng),
      skillId,
      kind: 'klankjager',
      prompt: {
        audio: instructionClip(last ? 'instr.fn.last_sound' : 'instr.fn.first_sound', text),
        text,
        showText: false,
      },
      options: placed,
      targetId,
      difficulty,
      isRetry: false,
      itemKey: target.word,
      metadata: {
        ...feedbackMeta({
          correct: 'fb.correct.6',
          try1: 'fb.try1.2',
          hint: 'fb.hint.4',
          model: 'fb.model.3',
        }),
        ...wordMetadata(target.word, { targetGrapheme, task: last ? 'last-sound' : 'first-sound' }),
      },
    });
  }

  return items;
}

function pickDistinct(pool: readonly Word[], count: number, rng: Rng): Word[] {
  const copy = pool.slice();
  const out: Word[] = [];
  const n = Math.min(count, copy.length);
  for (let i = 0; i < n; i++) {
    const idx = Math.floor(rng() * copy.length);
    const [value] = copy.splice(idx < copy.length ? idx : 0, 1);
    if (value) out.push(value);
  }
  return out;
}
