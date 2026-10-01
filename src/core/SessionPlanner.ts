/**
 * Sessieplanner: vaste sessie-loop (GD §3.1) met adaptieve mix 60/25/15
 * (ED §10.3). DOM-vrij en injecteerbaar-RNG.
 *
 * De planner is een pure functie; stoppen/hervatten kan altijd via de
 * `SessionQueue` (sectie-gebaseerd, GD §3.2).
 */
import type { ActivityItem, Difficulty, Profile, Rng, SkillId, Word } from '../types';
import { defaultRng } from '../types';
import { getGrapheme, getWord } from '../content';
import { canIntroduceNewGrapheme, nextGraphemeToIntroduce, recognizeSkillFor, soundSkillFor } from './Progression';
import { selectDueSkills } from './SpacedRepetition';
import { allowedWordObjects, effectiveLearned, feedbackMeta, instructionClip } from '../learning/util';
import * as FirstSound from '../learning/FirstSound';
import * as LetterSound from '../learning/LetterSound';
import * as Segmenting from '../learning/Segmenting';
import * as Blending from '../learning/Blending';
import * as WordReading from '../learning/WordReading';
import * as Klimboom from '../learning/Klimboom';
import * as Phonology from '../learning/Phonology';

export interface SessionSection {
  step: number;
  name: string;
  items: ActivityItem[];
}

export interface SessionPlan {
  sessionNumber: number;
  sections: SessionSection[];
}

const WARMUP_ITEMS = 3;
const SOUND_ITEMS = 3;
const NEW_LETTER_ITEMS = 4;
const PRACTICE_ITEMS = 6;
const WORD_READING_ITEMS = 6;
const MINI_GAME_ITEMS = 8;
const REPETITION_ITEMS = 4;

/** Moeilijkheid op basis van de mastery van een doel (ED §10.3). */
export function difficultyForSkill(profile: Profile, skillId: SkillId): Difficulty {
  const state = profile.skills[skillId];
  if (!state) return 'A';
  if (state.mastery < 0.5) return 'A';
  if (state.mastery > 0.85 && state.consecutiveCorrect >= 5) return 'C';
  return 'B';
}

function pickWords(pool: readonly Word[], count: number, rng: Rng): Word[] {
  if (pool.length === 0) return [];
  const copy = pool.slice();
  const out: Word[] = [];
  for (let i = 0; i < count; i++) {
    if (copy.length === 0) copy.push(...pool);
    const idx = Math.floor(rng() * copy.length);
    const [value] = copy.splice(idx < copy.length ? idx : 0, 1);
    if (value) out.push(value);
  }
  return out;
}

function hasMasteredPh(profile: Profile): boolean {
  return (profile.skills['PH.RHYME']?.mastery ?? 0) >= 0.8 || (profile.skills['PH.SYLLABLE']?.mastery ?? 0) >= 0.8;
}

export function planSession(profile: Profile, rng: Rng = defaultRng): SessionPlan {
  const sessionNumber = profile.sessionCount + 1;
  const learned = effectiveLearned(new Set(profile.unlockedGraphemes));
  const wordPool = allowedWordObjects(learned);
  const sections: SessionSection[] = [];
  const avoid: number[] = [];

  const record = (items: ActivityItem[]): void => {
    for (const item of items) {
      const index = item.options.findIndex((o) => o.id === item.targetId);
      if (index >= 0) avoid.push(index);
    }
  };

  // 1. Warming-up – alleen gemeesterd materiaal (GD §3.1).
  if (hasMasteredPh(profile)) {
    const items = Phonology.generate({
      skillId: rng() < 0.5 ? 'PH.RHYME' : 'PH.SYLLABLE',
      difficulty: 'A',
      count: WARMUP_ITEMS,
      rng,
      avoidCorrectIndices: avoid,
    });
    record(items);
    if (items.length > 0) sections.push({ step: 1, name: 'Warming-up', items });
  }

  // 2. Klankoefening – puur auditief (FN.FIRST_SOUND / FN.LAST_SOUND).
  if (wordPool.length >= 2) {
    const words = wordPool.map((w) => w.word);
    const nickname = rng() < 0.5 ? 'FN.FIRST_SOUND' : 'FN.LAST_SOUND';
    const difficulty = difficultyForSkill(profile, nickname);
    const items = FirstSound.generate({
      skillId: nickname,
      difficulty,
      count: SOUND_ITEMS,
      availableWords: words,
      rng,
      learned,
      avoidCorrectIndices: avoid,
    });
    record(items);
    if (items.length > 0) sections.push({ step: 2, name: 'Klankoefening', items });
  }

  // 3. Nieuwe letter/klank – alleen als de poort opengaat (ED §3 regel 2).
  if (canIntroduceNewGrapheme(profile)) {
    const next = nextGraphemeToIntroduce(profile);
    if (next) {
      const items: ActivityItem[] = [];
      const half = Math.ceil(NEW_LETTER_ITEMS / 2);
      for (let i = 0; i < half; i++) {
        items.push(
          LetterSound.generate({
            skillId: recognizeSkillFor(next.id),
            direction: 'sound-to-grapheme',
            targetGrapheme: next.id,
            learnedGraphemes: learned,
            difficulty: 'A',
            rng,
            avoidCorrectIndices: avoid,
          }),
        );
      }
      for (let i = 0; i < NEW_LETTER_ITEMS - half; i++) {
        items.push(
          LetterSound.generate({
            skillId: soundSkillFor(next.id),
            direction: 'grapheme-to-sound',
            targetGrapheme: next.id,
            learnedGraphemes: learned,
            difficulty: 'A',
            rng,
            avoidCorrectIndices: avoid,
          }),
        );
      }
      record(items);
      sections.push({ step: 3, name: 'Nieuwe letter/klank', items });
    }
  }

  // 4. Oefenen – hakken + plakken met de nieuwste/zwakke grafemen.
  if (wordPool.length >= 2) {
    const targets = pickWords(wordPool, PRACTICE_ITEMS, rng);
    const items: ActivityItem[] = [];
    targets.forEach((target, index) => {
      if (index % 2 === 0) {
        items.push(
          Segmenting.generate({
            skillId: 'AN.CVC',
            word: target.word,
            rng,
            difficulty: difficultyForSkill(profile, 'AN.CVC'),
            learned,
            availableWords: wordPool.map((w) => w.word),
            avoidCorrectIndices: avoid,
          }),
        );
      } else {
        items.push(
          Blending.generate({
            skillId: 'SY.CVC',
            targetWord: target.word,
            availableWords: wordPool.map((w) => w.word),
            difficulty: difficultyForSkill(profile, 'SY.CVC'),
            rng,
            learned,
            avoidCorrectIndices: avoid,
          }),
        );
      }
    });
    record(items);
    if (items.length > 0) sections.push({ step: 4, name: 'Oefenen', items });
  }

  // 5. Woorden lezen – geschreven woord, plaatje pas ná correct.
  if (wordPool.length >= 2) {
    const targets = pickWords(wordPool, WORD_READING_ITEMS, rng);
    const items = targets.map((target) =>
      WordReading.generate({
        skillId: target.pattern === 'VC' ? 'DE.VC' : 'DE.CVC',
        targetWord: target.word,
        availableWords: wordPool.map((w) => w.word),
        difficulty: difficultyForSkill(profile, 'DE.CVC'),
        rng,
        learned,
        avoidCorrectIndices: avoid,
      }),
    );
    record(items);
    if (items.length > 0) sections.push({ step: 5, name: 'Woorden lezen', items });
  }

  // 6. Mini-game De Klimboom – decoderen is de enige route omhoog.
  if (wordPool.length >= 2) {
    const items = Klimboom.generate({
      count: MINI_GAME_ITEMS,
      difficulty: difficultyForSkill(profile, 'DE.CVC'),
      availableWords: wordPool.map((w) => w.word),
      rng,
      learned,
      skillId: 'DE.CVC',
      avoidCorrectIndices: avoid,
    });
    record(items);
    if (items.length > 0) sections.push({ step: 6, name: 'Mini-game De Klimboom', items });
  }

  // 7. Herhaling – Leitner due items (ED §10.4), zwakste eerst.
  const dueItems = selectDueSkills(profile, sessionNumber).slice(0, REPETITION_ITEMS);
  if (dueItems.length > 0) {
    const items: ActivityItem[] = [];
    const wordNames = wordPool.map((w) => w.word);
    for (const due of dueItems) {
      const difficulty = difficultyForSkill(profile, due.skillId);
      const word = getWord(due.itemKey);
      if (word && wordNames.includes(word.word)) {
        items.push(
          WordReading.generate({
            skillId: due.skillId.startsWith('DE.') ? due.skillId : 'DE.CVC',
            targetWord: word.word,
            availableWords: wordNames,
            difficulty,
            rng,
            learned,
            avoidCorrectIndices: avoid,
          }),
        );
        continue;
      }
      if (getGrapheme(due.itemKey)) {
        items.push(
          LetterSound.generate({
            skillId: due.skillId,
            direction: 'grapheme-to-sound',
            targetGrapheme: due.itemKey,
            learnedGraphemes: learned,
            difficulty,
            rng,
            avoidCorrectIndices: avoid,
          }),
        );
      }
    }
    record(items);
    if (items.length > 0) sections.push({ step: 7, name: 'Herhaling', items });
  }

  // 8. Beloning – klein, ná leeswerk, deterministisch (GD §3.1/§6.1).
  const reward: ActivityItem = {
    id: `beloning.${sessionNumber}`,
    skillId: 'REWARD',
    kind: 'beloning',
    prompt: {
      audio: instructionClip('fb.reward.1', 'Een klankvonkje voor jou!'),
      text: 'Een klankvonkje voor jou!',
      showText: false,
    },
    options: [{ id: 'reward', correct: true }],
    targetId: 'reward',
    difficulty: 'A',
    isRetry: false,
    metadata: { ...feedbackMeta({ correct: 'fb.reward.1', try1: 'fb.reward.1', hint: 'fb.reward.1', model: 'fb.reward.1' }) },
  };
  sections.push({ step: 8, name: 'Beloning', items: [reward] });

  return { sessionNumber, sections };
}

// ---------------------------------------------------------------------------
// Queue: stoppen/hervatten op sectieniveau (GD §3.2)
// ---------------------------------------------------------------------------

export class SessionQueue {
  private readonly sections: SessionSection[];
  private sectionIndex = 0;
  private itemIndex = 0;

  constructor(plan: SessionPlan) {
    this.sections = plan.sections;
  }

  currentSection(): SessionSection | undefined {
    return this.sections[this.sectionIndex];
  }

  current(): ActivityItem | undefined {
    return this.currentSection()?.items[this.itemIndex];
  }

  hasNext(): boolean {
    return this.current() !== undefined;
  }

  next(): ActivityItem | undefined {
    const item = this.current();
    if (!item) return undefined;
    this.itemIndex += 1;
    this.normalize();
    return item;
  }

  remaining(): number {
    let total = 0;
    for (let s = this.sectionIndex; s < this.sections.length; s++) {
      const section = this.sections[s];
      if (!section) continue;
      const start = s === this.sectionIndex ? this.itemIndex : 0;
      total += Math.max(0, section.items.length - start);
    }
    return total;
  }

  /** Hervat bij de gegeven sectie (of de eerstvolgende). */
  skipToStep(step: number): void {
    for (let i = 0; i < this.sections.length; i++) {
      const section = this.sections[i];
      if (section && section.step >= step) {
        this.sectionIndex = i;
        this.itemIndex = 0;
        return;
      }
    }
    this.sectionIndex = this.sections.length;
    this.itemIndex = 0;
  }

  private normalize(): void {
    while (this.sectionIndex < this.sections.length) {
      const section = this.sections[this.sectionIndex];
      if (section && this.itemIndex < section.items.length) return;
      this.sectionIndex += 1;
      this.itemIndex = 0;
    }
  }
}

export function createSessionQueue(plan: SessionPlan): SessionQueue {
  return new SessionQueue(plan);
}

/** Alle items op een rij (gemak voor tests/UI). */
export function flattenPlan(plan: SessionPlan): ActivityItem[] {
  return plan.sections.flatMap((section) => section.items);
}
