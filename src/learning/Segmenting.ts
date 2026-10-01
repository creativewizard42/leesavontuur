/**
 * Auditieve analyse / hakken: AN.VC, AN.CVC, AN.CLUSTER, FN.COUNT (ED §2.4).
 * DOM-vrij.
 */
import type { ActivityItem, Difficulty, Rng, SkillId, Word } from '../types';
import { getWord, graphemes, isWordAllowed, segmentWord } from '../content';
import { optionCountFor } from '../core/Adaptive';
import {
  feedbackMeta,
  itemId,
  placeOptions,
  wordClip,
  wordMetadata,
  type OptionSpec,
} from './util';

export interface SegmentingOptions {
  skillId: SkillId;
  word: string;
  rng: Rng;
  difficulty?: Difficulty;
  learned?: ReadonlySet<string>;
  availableWords?: readonly string[];
  avoidCorrectIndices?: readonly number[];
}

/** Hakt een woord in grafeem-IDs (delegeert naar de content-segmentatie). */
export function segment(word: string): string[] {
  return segmentWord(word, graphemes) ?? Array.from(word);
}

export function generate(options: SegmentingOptions): ActivityItem {
  const { skillId, word, rng } = options;
  const difficulty: Difficulty = options.difficulty ?? 'A';
  const segmented = segment(word);
  const phonemeCount = segmented.length;
  const isCountTask = skillId === 'FN.COUNT';

  const correctLabel = isCountTask ? String(phonemeCount) : segmented.join('-');
  const correct: OptionSpec = { id: `ans:${correctLabel}`, label: correctLabel };
  const distractorSpecs = isCountTask
    ? countDistractors(phonemeCount, optionCountFor(difficulty) - 1)
    : sequenceDistractors(word, segmented, difficulty, rng, options);

  const { options: placed, targetId } = placeOptions(
    correct,
    distractorSpecs,
    rng,
    options.avoidCorrectIndices ?? [],
  );

  const prompt = isCountTask
    ? {
        audio: wordClip(word),
        text: `Hoeveel klanken hoor je in ${word}?`,
        showText: false,
      }
    : {
        text: word,
        showText: true,
      };

  const feedback = isCountTask
    ? { correct: 'fb.correct.7', try1: 'fb.try1.1', hint: 'fb.hint.5', model: 'fb.model.1' }
    : { correct: 'fb.correct.7', try1: 'fb.try1.4', hint: 'fb.hint.5', model: 'fb.model.1' };

  return {
    id: itemId('hakken', `${skillId}.${word}`, rng),
    skillId,
    kind: 'hakken',
    prompt,
    options: placed,
    targetId,
    difficulty,
    isRetry: false,
    itemKey: word,
    metadata: {
      ...feedbackMeta(feedback),
      ...wordMetadata(word, { task: isCountTask ? 'count' : 'segment', phonemeCount }),
    },
  };
}

function countDistractors(count: number, needed: number): OptionSpec[] {
  const candidates = [2, 3, 4, 5].filter((c) => c !== count);
  const out: OptionSpec[] = [];
  for (const c of candidates) {
    if (out.length >= needed) break;
    out.push({ id: `ans:${c}`, label: String(c) });
  }
  return out;
}

function sequenceDistractors(
  word: string,
  segmented: readonly string[],
  difficulty: Difficulty,
  rng: Rng,
  options: SegmentingOptions,
): OptionSpec[] {
  const needed = Math.max(1, optionCountFor(difficulty) - 1);
  const seen = new Set<string>([segmented.join('-')]);
  const out: OptionSpec[] = [];

  const learned = options.learned;
  if (learned && options.availableWords) {
    const candidates: Word[] = options.availableWords
      .filter((w) => w !== word && isWordAllowed(w, learned))
      .map((w) => getWord(w))
      .filter((w): w is Word => w !== undefined && w.graphemes.length === segmented.length);
    const start = Math.floor(rng() * Math.max(1, candidates.length));
    for (let i = 0; i < candidates.length && out.length < needed; i++) {
      const candidate = candidates[(start + (i % candidates.length)) % candidates.length];
      if (!candidate) continue;
      const label = candidate.graphemes.join('-');
      if (seen.has(label)) continue;
      seen.add(label);
      out.push({ id: `ans:${label}`, label });
    }
  }

  // Vul aan met omkeringen/rotaties van de correcte segmentatie.
  const reversed = [...segmented].reverse().join('-');
  if (out.length < needed && !seen.has(reversed)) {
    seen.add(reversed);
    out.push({ id: `ans:${reversed}`, label: reversed });
  }
  for (let shift = 1; shift < segmented.length && out.length < needed; shift++) {
    const rotated = [...segmented.slice(shift), ...segmented.slice(0, shift)].join('-');
    if (seen.has(rotated)) continue;
    seen.add(rotated);
    out.push({ id: `ans:${rotated}`, label: rotated });
  }
  return out;
}
