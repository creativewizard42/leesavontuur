/**
 * Auditieve analyse / hakken: AN.VC, AN.CVC, AN.CLUSTER, FN.COUNT (ED §2.4).
 *
 * EDU-003: het antwoord mag niet verraden worden. Het item toont daarom nooit
 * de gesegmenteerde vorm naast het woord. Het kind hoort het woord en kiest het
 * **aantal klanken**; voor een rijkere UI staat de grafeemreeks als
 * `metadata.tapUnits` klaar (tik-in-volgorde), maar de gescoorde keuze is het
 * aantal (ED §4.1 "Klanken tellen" ↔ FN.COUNT + AN.CVC, EDU-021).
 * DOM-vrij.
 */
import type { ActivityItem, Difficulty, Rng, SkillId } from '../types';
import { graphemes, segmentWord } from '../content';
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

/** Secundair doel zodat FN.COUNT en AN.CVC elkaar versterken (EDU-021). */
export function secondarySkillFor(skillId: SkillId): SkillId | undefined {
  if (skillId === 'FN.COUNT') return 'AN.CVC';
  if (skillId.startsWith('AN.')) return 'FN.COUNT';
  return undefined;
}

export function generate(options: SegmentingOptions): ActivityItem {
  const { skillId, word, rng } = options;
  const difficulty: Difficulty = options.difficulty ?? 'A';
  const segmented = segment(word);
  const phonemeCount = segmented.length;

  const correct: OptionSpec = { id: `n:${phonemeCount}`, label: String(phonemeCount) };
  const distractorSpecs = countDistractors(phonemeCount, Math.max(1, optionCountFor(difficulty) - 1));

  const { options: placed, targetId } = placeOptions(
    correct,
    distractorSpecs,
    rng,
    options.avoidCorrectIndices ?? [],
  );

  const item: ActivityItem = {
    id: itemId('hakken', `${skillId}.${word}`, rng),
    skillId,
    kind: 'hakken',
    prompt: {
      audio: wordClip(word),
      text: `Hoeveel klanken hoor je in ${word}?`,
      // Auditief: geen geschreven woord in beeld (ED §11 regel 3).
      showText: false,
    },
    options: placed,
    targetId,
    difficulty,
    isRetry: false,
    itemKey: word,
    metadata: {
      ...feedbackMeta(
        skillId === 'FN.COUNT'
          ? { correct: 'fb.correct.7', try1: 'fb.try1.1', hint: 'fb.hint.5', model: 'fb.model.1' }
          : { correct: 'fb.correct.7', try1: 'fb.try1.4', hint: 'fb.hint.5', model: 'fb.model.1' },
      ),
      ...wordMetadata(word, {
        task: 'segment',
        // Beide responsmodi zijn beschikbaar; UI kiest 'tap' (tik-in-volgorde)
        // of 'count' (aantal klanken). Nooit de gesegmenteerde vorm als optie.
        responseMode: 'count',
        tapUnits: segmented,
        phonemeCount,
      }),
    },
  };
  const secondary = secondarySkillFor(skillId);
  if (secondary) item.secondarySkillId = secondary;
  return item;
}

function countDistractors(count: number, needed: number): OptionSpec[] {
  const candidates = [2, 3, 4, 5].filter((c) => c !== count);
  const out: OptionSpec[] = [];
  for (const c of candidates) {
    if (out.length >= needed) break;
    out.push({ id: `n:${c}`, label: String(c) });
  }
  return out;
}
