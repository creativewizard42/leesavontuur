/**
 * Fonologisch bewustzijn: PH.RHYME, PH.SYLLABLE (ED §2.1).
 * Puur auditief (ED §4.1): geen geschreven woord in beeld. Omdat het om
 * grote eenheden gaat (rijm/lettergrepen) is dit bewust auditief materiaal
 * en niet gebonden aan de vrijgegeven grafemen (ED §6.2 regel 8).
 * DOM-vrij.
 */
import type { ActivityItem, Difficulty, Rng } from '../types';
import { feedbackMeta, instructionClip, itemId, placeOptions, wordClip, type OptionSpec } from './util';

export interface PhonologyOptions {
  skillId: 'PH.RHYME' | 'PH.SYLLABLE';
  difficulty: Difficulty;
  count: number;
  rng: Rng;
  avoidCorrectIndices?: readonly number[];
}

interface SyllableWord {
  word: string;
  syllables: number;
}

const SYLLABLE_WORDS: readonly SyllableWord[] = [
  { word: 'maan', syllables: 1 },
  { word: 'raam', syllables: 1 },
  { word: 'kat', syllables: 1 },
  { word: 'vis', syllables: 1 },
  { word: 'soep', syllables: 1 },
  { word: 'konijn', syllables: 2 },
  { word: 'tafel', syllables: 2 },
  { word: 'muren', syllables: 2 },
  { word: 'banaan', syllables: 3 },
  { word: 'olifant', syllables: 3 },
  { word: 'appelap', syllables: 3 },
];

/** Rijmgroepen (eindklank gelijk); auditief materiaal. */
const RHYME_GROUPS: readonly (readonly string[])[] = [
  ['kat', 'mat', 'rat'],
  ['vis', 'mis', 'lis'],
  ['tas', 'kas', 'bas'],
  ['maan', 'kan', 'pan'],
  ['raam', 'kaam', 'aam'],
  ['soep', 'poep', 'groep'],
];

export function generate(options: PhonologyOptions): ActivityItem[] {
  return options.skillId === 'PH.SYLLABLE'
    ? generateSyllables(options)
    : generateRhymes(options);
}

function generateSyllables(options: PhonologyOptions): ActivityItem[] {
  const { count, difficulty, rng } = options;
  const items: ActivityItem[] = [];
  const avoid = [...(options.avoidCorrectIndices ?? [])];

  for (let i = 0; i < count; i++) {
    const entry = SYLLABLE_WORDS[Math.floor(rng() * SYLLABLE_WORDS.length)];
    if (!entry) continue;
    const correct: OptionSpec = { id: `n:${entry.syllables}`, label: String(entry.syllables) };
    const distractorSpecs: OptionSpec[] = [1, 2, 3]
      .filter((n) => n !== entry.syllables)
      .map((n) => ({ id: `n:${n}`, label: String(n) }));

    const { options: placed, targetId } = placeOptions(correct, distractorSpecs, rng, avoid);
    const correctIndex = placed.findIndex((o) => o.id === targetId);
    if (correctIndex >= 0) avoid.push(correctIndex);

    items.push({
      id: itemId('klapbrug', entry.word, rng),
      skillId: 'PH.SYLLABLE',
      kind: 'klapbrug',
      prompt: {
        audio: instructionClip('instr.ph.syllable', `Hoeveel klappen hoor je in ${entry.word}?`),
        text: `Hoeveel klappen hoor je in ${entry.word}?`,
        showText: false,
      },
      options: placed,
      targetId,
      difficulty,
      isRetry: false,
      itemKey: entry.word,
      metadata: {
        ...feedbackMeta({ correct: 'fb.correct.6', try1: 'fb.try1.1', hint: 'fb.hint.1', model: 'fb.model.3' }),
        word: entry.word,
        syllables: entry.syllables,
      },
    });
  }
  return items;
}

function generateRhymes(options: PhonologyOptions): ActivityItem[] {
  const { count, difficulty, rng } = options;
  const items: ActivityItem[] = [];
  const avoid = [...(options.avoidCorrectIndices ?? [])];

  for (let i = 0; i < count; i++) {
    const group = RHYME_GROUPS[Math.floor(rng() * RHYME_GROUPS.length)];
    if (!group || group.length < 2) continue;
    const targetIndex = Math.floor(rng() * group.length);
    const target = group[targetIndex];
    if (!target) continue;
    const rhymeOptions = group.filter((w) => w !== target);
    const correctWord = rhymeOptions[Math.floor(rng() * rhymeOptions.length)];
    if (!correctWord) continue;

    const correct: OptionSpec = { id: correctWord, audio: wordClip(correctWord) };
    const otherWords = RHYME_GROUPS.filter((g) => g !== group).flat();
    const distractorSpecs: OptionSpec[] = pickAuditoryDistractors(otherWords, rng, 2).map((w) => ({
      id: w,
      audio: wordClip(w),
    }));

    const { options: placed, targetId } = placeOptions(correct, distractorSpecs, rng, avoid);
    const correctIndex = placed.findIndex((o) => o.id === targetId);
    if (correctIndex >= 0) avoid.push(correctIndex);

    items.push({
      id: itemId('rijmpoort', target, rng),
      skillId: 'PH.RHYME',
      kind: 'rijmpoort',
      prompt: {
        audio: instructionClip('instr.ph.rhyme', `Wat rijmt op ${target}?`),
        text: `Wat rijmt op ${target}?`,
        showText: false,
      },
      options: placed,
      targetId,
      difficulty,
      isRetry: false,
      itemKey: target,
      metadata: {
        ...feedbackMeta({ correct: 'fb.correct.6', try1: 'fb.try1.1', hint: 'fb.hint.1', model: 'fb.model.3' }),
        word: target,
        rhyme: correctWord,
      },
    });
  }
  return items;
}

function pickAuditoryDistractors(pool: readonly string[], rng: Rng, count: number): string[] {
  const copy = pool.slice();
  const out: string[] = [];
  const n = Math.min(count, copy.length);
  for (let i = 0; i < n; i++) {
    const idx = Math.floor(rng() * copy.length);
    const [value] = copy.splice(idx < copy.length ? idx : 0, 1);
    if (value !== undefined) out.push(value);
  }
  return out;
}
