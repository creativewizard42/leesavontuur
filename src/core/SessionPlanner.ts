/**
 * Sessieplanner + sessiequeue (GD §3.1, ED §10.3, ARCHITECTURE §4).
 * DOM-vrij en injecteerbaar-RNG.
 *
 * De planner is een pure functie. De `SessionQueue` is de levende, muteerbare
 * wachtrij tijdens een sessie: hij past adaptieve regels toe
 * (`reportOutcome`), zet gemodelleerde items terug, biedt een succes-item bij
 * frustratie en is serialiseerbaar (stoppen/hervatten, GD §3.2).
 */
import type {
  ActivityItem,
  AnswerEvent,
  Difficulty,
  Profile,
  Rng,
  SkillId,
  SkillState,
  Word,
} from '../types';
import { defaultRng } from '../types';
import { getGrapheme, getWord } from '../content';
import {
  canIntroduceNewGrapheme,
  nextGraphemeToIntroduce,
  recognizeSkillFor,
  skillStatus,
  soundSkillFor,
} from './Progression';
import { selectDueSkills } from './SpacedRepetition';
import {
  audioSupportFor,
  difficultyIndex,
  nextDifficulty,
  shouldSimplify,
  shouldStopForFrustration,
} from './Adaptive';
import { createSkillState, updateSkillState } from './Mastery';
import {
  ALL_GRAPHEMES,
  allowedWordObjects,
  effectiveLearned,
  feedbackMeta,
  graphemeSoundClip,
  instructionClip,
  isScoredActivityItem,
  itemId,
} from '../learning/util';
import { skillsForWord as skillsForWordFn } from '../learning/skills';
import type { SaveResult, SaveStorage } from './SaveSystem';
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
const LETTER_PRACTICE_ITEMS = 2;
/** Minimaal aantal gescoorde oefenitems per sessie (QA-003 / GD §6.1). */
export const MIN_SCORED_PRACTICE = 4;

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

/** Woorden die minstens één even lang "peer"-woord hebben (ED §11 regel 6). */
function wordsWithPeerLength(pool: readonly Word[]): Word[] {
  return pool.filter(
    (w) => pool.some((other) => other.word !== w.word && other.graphemes.length === w.graphemes.length),
  );
}

function hasMasteredPh(profile: Profile): boolean {
  return (profile.skills['PH.RHYME']?.mastery ?? 0) >= 0.8 || (profile.skills['PH.SYLLABLE']?.mastery ?? 0) >= 0.8;
}

function pickPhSkill(profile: Profile, rng: Rng): 'PH.RHYME' | 'PH.SYLLABLE' {
  const rhyme = profile.skills['PH.RHYME']?.mastery ?? 0;
  const syllable = profile.skills['PH.SYLLABLE']?.mastery ?? 0;
  if (rhyme === syllable) return rng() < 0.5 ? 'PH.RHYME' : 'PH.SYLLABLE';
  return rhyme < syllable ? 'PH.RHYME' : 'PH.SYLLABLE';
}

function hasDistractorGrapheme(learned: ReadonlySet<string>, targetId: string): boolean {
  for (const id of learned) if (id !== targetId) return true;
  return false;
}

export function planSession(profile: Profile, rng: Rng = defaultRng): SessionPlan {
  const sessionNumber = profile.sessionCount + 1;
  const learned = effectiveLearned(new Set(profile.unlockedGraphemes));
  const wordPool = allowedWordObjects(learned);
  const wordNames = wordPool.map((w) => w.word);
  const choicePool = wordsWithPeerLength(wordPool);
  const sections: SessionSection[] = [];
  const avoid: number[] = [];

  const record = (items: ActivityItem[]): void => {
    for (const item of items) {
      const index = item.options.findIndex((o) => o.id === item.targetId);
      if (index >= 0) avoid.push(index);
    }
  };

  // 1. Klankwarming-up – auditief, fase 1 (ED §3, EDU-010).
  {
    const phSkill = pickPhSkill(profile, rng);
    const difficulty = hasMasteredPh(profile) ? difficultyForSkill(profile, phSkill) : 'A';
    const items = Phonology.generate({ skillId: phSkill, difficulty, count: WARMUP_ITEMS, rng, avoidCorrectIndices: avoid });
    record(items);
    if (items.length > 0) sections.push({ step: 1, name: 'Klankwarming-up', items });
  }

  // 2. Klankoefening – puur auditief (FN.FIRST_SOUND / FN.LAST_SOUND).
  {
    const nickname = rng() < 0.5 ? 'FN.FIRST_SOUND' : 'FN.LAST_SOUND';
    const difficulty = difficultyForSkill(profile, nickname);
    const items = FirstSound.generate(
      wordPool.length >= 2
        ? {
            skillId: nickname,
            difficulty,
            count: SOUND_ITEMS,
            availableWords: wordNames,
            rng,
            learned,
            avoidCorrectIndices: avoid,
          }
        : {
            // Fase 1: auditieve woorden mogen niet-geleerde grafemen bevatten
            // (ED §6.2 regel 8) zodat fonemisch bewustzijn oefenbaar is vóór
            // de eerste letters (EDU-010).
            skillId: nickname,
            difficulty: 'A',
            count: SOUND_ITEMS,
            availableWords: [],
            rng,
            auditory: true,
            avoidCorrectIndices: avoid,
          },
    );
    record(items);
    if (items.length > 0) sections.push({ step: 2, name: 'Klankoefening', items });
  }

  // 3. Nieuwe letter/klank – alleen als de poort opengaat (ED §3).
  if (canIntroduceNewGrapheme(profile)) {
    const next = nextGraphemeToIntroduce(profile);
    if (next) {
      const items: ActivityItem[] = [];
      // Kennismaking is ongescoord (modeling), nooit een 1-optie-score (EDU-004).
      items.push({
        id: itemId('letterintro', next.id, rng),
        skillId: recognizeSkillFor(next.id),
        kind: 'letterklank',
        prompt: {
          audio: instructionClip('instr.lk.intro', `Dit is de letter ${next.letters}. Hij zegt ${next.soundHint}.`),
          text: next.letters,
          showText: true,
        },
        options: [{ id: `g:${next.id}`, label: next.letters, audio: graphemeSoundClip(next.id), correct: true }],
        targetId: `g:${next.id}`,
        difficulty: 'A',
        isRetry: false,
        itemKey: next.id,
        metadata: {
          ...feedbackMeta({ correct: 'fb.correct.1', try1: 'fb.try1.2', hint: 'fb.hint.2', model: 'fb.model.4' }),
          targetGrapheme: next.id,
          introduction: true,
          scored: false,
        },
      });
      // Gescoorde oefening pas als er ≥ 2 opties mogelijk zijn (EDU-004).
      if (hasDistractorGrapheme(learned, next.id)) {
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
        const skill = skillsForWordFn(target).segment;
        items.push(
          Segmenting.generate({
            skillId: skill,
            word: target.word,
            rng,
            difficulty: difficultyForSkill(profile, skill),
            learned,
            availableWords: wordNames,
            avoidCorrectIndices: avoid,
          }),
        );
      } else {
        const blendTarget = choicePool.find((w) => w.word === target.word) ?? choicePool[0] ?? target;
        const skill = skillsForWordFn(blendTarget).blend;
        items.push(
          Blending.generate({
            skillId: skill,
            targetWord: blendTarget.word,
            availableWords: wordNames,
            difficulty: difficultyForSkill(profile, skill),
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
    const source = choicePool.length >= 2 ? choicePool : wordPool;
    const targets = pickWords(source, WORD_READING_ITEMS, rng);
    const items = targets.map((target) => {
      const skill = skillsForWordFn(target).decode;
      return WordReading.generate({
        skillId: skill,
        targetWord: target.word,
        availableWords: wordNames,
        difficulty: difficultyForSkill(profile, skill),
        rng,
        learned,
        avoidCorrectIndices: avoid,
      });
    });
    record(items);
    if (items.length > 0) sections.push({ step: 5, name: 'Woorden lezen', items });
  }

  // 6. Mini-game De Klimboom – decoderen is de enige route omhoog.
  if (wordPool.length >= 2) {
    const source = choicePool.length >= 2 ? choicePool : wordPool;
    const items = Klimboom.generate({
      count: MINI_GAME_ITEMS,
      difficulty: difficultyForSkill(profile, 'DE.CVC'),
      availableWords: source.map((w) => w.word),
      rng,
      learned,
      skillId: 'DE.CVC',
      avoidCorrectIndices: avoid,
    });
    record(items);
    if (items.length > 0) sections.push({ step: 6, name: 'Mini-game De Klimboom', items });
  }

  // 7. Herhaling – Leitner due items (ED §10.4) + oefening op vrijgegeven
  //    grafemen (voorkomt de progressiedeadlock, QA-003).
  {
    const items: ActivityItem[] = [];
    const dueItems = selectDueSkills(profile, sessionNumber).slice(0, REPETITION_ITEMS);
    for (const due of dueItems) {
      const word = getWord(due.itemKey);
      if (word && wordNames.includes(word.word)) {
        const skill = skillsForWordFn(word).decode;
        items.push(
          WordReading.generate({
            skillId: skill,
            targetWord: word.word,
            availableWords: wordNames,
            difficulty: difficultyForSkill(profile, skill),
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
            skillId: due.skillId.startsWith('LK.') ? due.skillId : soundSkillFor(due.itemKey),
            direction: 'grapheme-to-sound',
            targetGrapheme: due.itemKey,
            learnedGraphemes: learned,
            difficulty: difficultyForSkill(profile, due.skillId),
            rng,
            avoidCorrectIndices: avoid,
          }),
        );
      }
    }
    // Zwakke vrijgegeven grafemen blijven oefenbaar, ook zonder woorden.
    if (wordPool.length < 2 && hasDistractorGrapheme(learned, '')) {
      const weak = new Set<string>();
      for (const id of profile.unlockedGraphemes) {
        const skill = soundSkillFor(id);
        if ((profile.skills[skill]?.mastery ?? 0) < 0.8) weak.add(id);
      }
      // Valt terug op alle vrijgegeven grafemen als er (nog) geen zwakke zijn.
      const targets = [...(weak.size > 0 ? weak : new Set(profile.unlockedGraphemes))].slice(0, LETTER_PRACTICE_ITEMS);
      for (const id of targets) {
        if (!hasDistractorGrapheme(learned, id)) continue;
        items.push(
          LetterSound.generate({
            skillId: soundSkillFor(id),
            direction: 'grapheme-to-sound',
            targetGrapheme: id,
            learnedGraphemes: learned,
            difficulty: difficultyForSkill(profile, soundSkillFor(id)),
            rng,
            avoidCorrectIndices: avoid,
          }),
        );
      }
    }
    record(items);
    if (items.length > 0) sections.push({ step: 7, name: 'Herhaling', items });
  }

  // Garandeer minimaal N gescoorde oefenitems (QA-003): vul aan met fase-1
  // auditieve oefening, die altijd beschikbaar is.
  {
    let scored = sections.reduce(
      (total, section) => total + section.items.filter((item) => isScoredActivityItem(item)).length,
      0,
    );
    if (scored < MIN_SCORED_PRACTICE) {
      const needed = MIN_SCORED_PRACTICE - scored;
      const extra = Phonology.generate({
        skillId: rng() < 0.5 ? 'PH.RHYME' : 'PH.SYLLABLE',
        difficulty: 'A',
        count: needed,
        rng,
        avoidCorrectIndices: avoid,
      });
      record(extra);
      scored += extra.filter((item) => isScoredActivityItem(item)).length;
      const existing = sections.find((s) => s.step === 7);
      if (existing) existing.items.push(...extra);
      else if (extra.length > 0) sections.push({ step: 7, name: 'Extra oefening', items: extra });
    }
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
    metadata: {
      ...feedbackMeta({ correct: 'fb.reward.1', try1: 'fb.reward.1', hint: 'fb.reward.1', model: 'fb.reward.1' }),
      scored: false,
    },
  };
  sections.push({ step: 8, name: 'Beloning', items: [reward] });

  return { sessionNumber, sections };
}

// ---------------------------------------------------------------------------
// Adaptieve, hervatbare sessiequeue (GD §3.2 / ED §10.3)
// ---------------------------------------------------------------------------

export interface QueueContext {
  sessionNumber: number;
  rng?: Rng;
  learned?: ReadonlySet<string>;
  profile?: Profile;
}

export interface SerializedSessionQueue {
  version: 1;
  savedAt: number;
  sessionNumber: number;
  sections: SessionSection[];
  sectionIndex: number;
  itemIndex: number;
  consecutiveModeled: number;
  frustrationCount: number;
  windDown: boolean;
  requeueCount: number;
  skillStates: Record<SkillId, SkillState>;
  recentEvents: Record<SkillId, AnswerEvent[]>;
}

const MAX_REQUEUES_PER_SESSION = 6;
const MAX_EVENTS_PER_SKILL = 20;

function cloneItem(item: ActivityItem): ActivityItem {
  return JSON.parse(JSON.stringify(item)) as ActivityItem;
}

/** Makkelijk succes-item: een gemeesterd grafeem, anders fase-1 auditief. */
function buildSuccessItem(ctx: QueueContext, rng: Rng): ActivityItem | undefined {
  const learned = ctx.learned ?? ALL_GRAPHEMES;
  if (ctx.profile) {
    const candidates = ctx.profile.unlockedGraphemes.filter((id) => {
      const status = skillStatus(ctx.profile as Profile, soundSkillFor(id));
      return (status === 'mastered' || (ctx.profile?.skills[soundSkillFor(id)]?.mastery ?? 0) >= 0.8) &&
        hasDistractorGrapheme(learned, id);
    });
    if (candidates.length > 0) {
      const target = candidates[Math.floor(rng() * candidates.length)] ?? candidates[0];
      if (target) {
        return LetterSound.generate({
          skillId: soundSkillFor(target),
          direction: 'grapheme-to-sound',
          targetGrapheme: target,
          learnedGraphemes: learned,
          difficulty: 'A',
          rng,
        });
      }
    }
  }
  return Phonology.generate({ skillId: 'PH.RHYME', difficulty: 'A', count: 1, rng })[0];
}

export class SessionQueue {
  private sections: SessionSection[];
  private sectionIndex = 0;
  private itemIndex = 0;
  private consecutiveModeled = 0;
  private frustrationCount = 0;
  private windDown = false;
  private requeueCount = 0;
  private readonly context: QueueContext;
  private readonly skillStates: Map<SkillId, SkillState>;
  private readonly recentEvents: Map<SkillId, AnswerEvent[]>;

  constructor(plan: SessionPlan, context?: QueueContext) {
    this.sections = plan.sections;
    this.context = context ?? { sessionNumber: plan.sessionNumber };
    this.skillStates = new Map();
    this.recentEvents = new Map();
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
      if (this.windDown && section.step !== 8) continue;
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

  /**
   * Verwerkt de uitkomst van het huidige item en stuurt volgende items bij
   * (ED §10.3): vereenvoudigen, extra audio, frustratiestop, re-queue van
   * gemodelleerde items. UI roept dit aan ná elk antwoord, vóór `next()`.
   */
  reportOutcome(event: AnswerEvent, item: ActivityItem): void {
    if (event.isGuess || !isScoredActivityItem(item)) return;

    const skillId = event.skillId;
    const prev = this.skillStates.get(skillId) ?? this.seedSkillState(skillId);
    const nextState = updateSkillState(prev, event);
    this.skillStates.set(skillId, nextState);
    const recent = (this.recentEvents.get(skillId) ?? []).concat(event).slice(-MAX_EVENTS_PER_SKILL);
    this.recentEvents.set(skillId, recent);

    if (event.modeled) this.consecutiveModeled += 1;
    else if (event.correct) this.consecutiveModeled = 0;

    // QA-009: gemodelleerd item komt later in dezelfde sessie terug.
    if (event.modeled && !item.isRetry && this.requeueCount < MAX_REQUEUES_PER_SESSION) {
      const gap = 2 + Math.floor((this.context.rng?.() ?? 0.5) * 2);
      this.scheduleRequeue(item, gap);
      this.requeueCount += 1;
    }

    // QA-008: frustratiestop na 3× modeling op rij.
    if (shouldStopForFrustration(this.consecutiveModeled)) {
      this.consecutiveModeled = 0;
      this.frustrationCount += 1;
      this.insertSuccessItem();
      if (this.frustrationCount >= 2) this.windDown = true;
    }

    // QA-010: adaptieve bijsturing binnen de sessie.
    const difficulty = item.difficulty;
    if (shouldSimplify(nextState, recent)) {
      this.applyOptionReduction(skillId);
      this.applyExtraAudio(skillId);
    } else {
      const nextDiff = nextDifficulty(difficulty, nextState);
      if (difficultyIndex(nextDiff) < difficultyIndex(difficulty)) this.applyOptionReduction(skillId);
    }
    if (audioSupportFor(nextState, difficulty)) this.applyExtraAudio(skillId);
  }

  private seedSkillState(skillId: SkillId): SkillState {
    const fromProfile = this.context.profile?.skills[skillId];
    if (fromProfile) return { ...fromProfile, recentFirstAttempt: [], recentResponseMs: [] } as SkillState;
    return createSkillState();
  }

  private insertIntoCurrentSection(item: ActivityItem, offset: number): void {
    const section = this.currentSection();
    if (!section || section.step === 8) return;
    const position = Math.min(section.items.length, this.itemIndex + offset);
    section.items.splice(position, 0, item);
  }

  private scheduleRequeue(item: ActivityItem, gap: number): void {
    const retry = cloneItem(item);
    retry.isRetry = true;
    retry.id = `${item.id}.retry`;
    this.insertIntoCurrentSection(retry, 1 + gap);
  }

  private insertSuccessItem(): void {
    if (this.windDown) return;
    const success = buildSuccessItem(this.context, this.context.rng ?? defaultRng);
    if (success) this.insertIntoCurrentSection(success, 1);
  }

  /** Verlaagt het aantal opties (4→3→2) voor komende items van dit doel. */
  private applyOptionReduction(skillId: SkillId): void {
    let changed = 0;
    for (let s = this.sectionIndex; s < this.sections.length && changed < 3; s++) {
      const section = this.sections[s];
      if (!section) continue;
      const start = s === this.sectionIndex ? this.itemIndex : 0;
      for (let i = start; i < section.items.length && changed < 3; i++) {
        const item = section.items[i];
        if (!item || item.skillId !== skillId || item.options.length <= 2) continue;
        const removeAt = item.options.map((o, index) => ({ o, index })).reverse().find(({ o }) => !o.correct)?.index;
        if (removeAt === undefined) continue;
        item.options = item.options.filter((_, index) => index !== removeAt);
        item.metadata = { ...(item.metadata ?? {}), optionCount: item.options.length, simplified: true };
        changed += 1;
      }
    }
  }

  /** Markeert komende items van dit doel voor extra audio-ondersteuning. */
  private applyExtraAudio(skillId: SkillId): void {
    let changed = 0;
    for (let s = this.sectionIndex; s < this.sections.length && changed < 3; s++) {
      const section = this.sections[s];
      if (!section) continue;
      const start = s === this.sectionIndex ? this.itemIndex : 0;
      for (let i = start; i < section.items.length && changed < 3; i++) {
        const item = section.items[i];
        if (!item || item.skillId !== skillId) continue;
        if (item.metadata?.['extraAudio'] === true) continue;
        item.metadata = { ...(item.metadata ?? {}), extraAudio: true };
        changed += 1;
      }
    }
  }

  private normalize(): void {
    while (this.sectionIndex < this.sections.length) {
      const section = this.sections[this.sectionIndex];
      if (!section) {
        this.sectionIndex += 1;
        this.itemIndex = 0;
        continue;
      }
      if (this.windDown && section.step !== 8) {
        this.sectionIndex += 1;
        this.itemIndex = 0;
        continue;
      }
      if (this.itemIndex < section.items.length) return;
      this.sectionIndex += 1;
      this.itemIndex = 0;
    }
  }

  toJSON(now: number = Date.now()): SerializedSessionQueue {
    return {
      version: 1,
      savedAt: now,
      sessionNumber: this.context.sessionNumber,
      sections: JSON.parse(JSON.stringify(this.sections)) as SessionSection[],
      sectionIndex: this.sectionIndex,
      itemIndex: this.itemIndex,
      consecutiveModeled: this.consecutiveModeled,
      frustrationCount: this.frustrationCount,
      windDown: this.windDown,
      requeueCount: this.requeueCount,
      skillStates: Object.fromEntries(this.skillStates),
      recentEvents: Object.fromEntries(this.recentEvents),
    };
  }

  static fromJSON(data: SerializedSessionQueue): SessionQueue {
    const queue = new SessionQueue(
      { sessionNumber: data.sessionNumber, sections: (data.sections ?? []).map((s) => ({ ...s, items: s.items.map(cloneItem) })) },
      { sessionNumber: data.sessionNumber },
    );
    queue.sectionIndex = Math.max(0, data.sectionIndex);
    queue.itemIndex = Math.max(0, data.itemIndex);
    queue.consecutiveModeled = Math.max(0, data.consecutiveModeled);
    queue.frustrationCount = Math.max(0, data.frustrationCount);
    queue.windDown = data.windDown === true;
    queue.requeueCount = Math.max(0, data.requeueCount);
    for (const [skill, state] of Object.entries(data.skillStates ?? {})) queue.skillStates.set(skill, state);
    for (const [skill, events] of Object.entries(data.recentEvents ?? {})) queue.recentEvents.set(skill, events);
    queue.normalize();
    return queue;
  }
}

export function createSessionQueue(plan: SessionPlan, context?: QueueContext): SessionQueue {
  return new SessionQueue(plan, context);
}

/** Alle items op een rij (gemak voor tests/UI). */
export function flattenPlan(plan: SessionPlan): ActivityItem[] {
  return plan.sections.flatMap((section) => section.items);
}

// ---------------------------------------------------------------------------
// Sessie opslaan/hervatten (QA-007)
// ---------------------------------------------------------------------------

export const SESSION_RESUME_KEY = 'leesavontuur.session.v1';
/** Een onderbroken sessie vervalt na 12 uur (GD §3.2). */
export const RESUME_TTL_MS = 12 * 60 * 60 * 1000;

export function saveSessionState(
  queue: SessionQueue,
  storage: SaveStorage,
  now: number = Date.now(),
): SaveResult {
  try {
    storage.write(SESSION_RESUME_KEY, JSON.stringify(queue.toJSON(now)));
    return { ok: true };
  } catch {
    return { ok: false, reason: 'unavailable' };
  }
}

/** Laadt een onderbroken sessie binnen de TTL; anders undefined. */
export function loadSessionState(
  storage: SaveStorage,
  now: number = Date.now(),
  ttl: number = RESUME_TTL_MS,
): SessionQueue | undefined {
  let raw: string | null = null;
  try {
    raw = storage.read(SESSION_RESUME_KEY);
  } catch {
    return undefined;
  }
  if (!raw) return undefined;
  try {
    const data = JSON.parse(raw) as SerializedSessionQueue;
    if (data.version !== 1) return undefined;
    if (typeof data.savedAt !== 'number' || now - data.savedAt > ttl) return undefined;
    return SessionQueue.fromJSON(data);
  } catch {
    return undefined;
  }
}

export function clearSessionState(storage: SaveStorage): void {
  try {
    storage.remove(SESSION_RESUME_KEY);
  } catch {
    // Privémodus/quota: niets om te wissen.
  }
}

export { skillsForWord } from '../learning/skills';
