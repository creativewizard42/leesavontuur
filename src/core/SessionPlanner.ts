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
  ActivityOption,
  ActivityPrompt,
  AnswerEvent,
  AudioClip,
  Difficulty,
  Profile,
  Rng,
  SkillId,
  SkillState,
  Word,
} from '../types';
import { defaultRng } from '../types';
import { audioManifest, feedback, getGrapheme, getWord, instructions } from '../content';
import { sanitizeLocalAudioSrc } from '../audio/localSrc';
import {
  canIntroduceNewGrapheme,
  MIN_MASTERY_ITEMS,
  nextGraphemeToIntroduce,
  phaseTwoFallbackActive,
  phaseTwoOpenedByMastery,
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
import { createSkillState, ensureSkillDetail, isMastered, updateSkillState, type SkillStateDetail } from './Mastery';
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
import * as FirstSound from '../learning/FirstSound';import * as LetterSound from '../learning/LetterSound';
import * as Segmenting from '../learning/Segmenting';
import * as Blending from '../learning/Blending';
import * as WordReading from '../learning/WordReading';
import * as Klimboom from '../learning/Klimboom';
import * as Phonology from '../learning/Phonology';
import { readingPractice } from '../learning/Reading';

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
/**
 * Aantal LK.<g>.SOUND-oefeningen voor zwakke/vrijgegeven grafemen per sessie
 * (QA-R2-001). Zonder deze oefening kan het vorige grafeem nooit `isMastered`
 * worden en loopt de leerroute vast op de eerste letter.
 */
const LETTER_PRACTICE_ITEMS = 4;
/** Minimaal aantal gescoorde oefenitems per sessie (QA-003 / GD §6.1). */
export const MIN_SCORED_PRACTICE = 4;

/**
 * Sessiemix (ED §10.3 / EDU-026): 60% huidig doel, 25% herhaling (Leitner) en
 * 15% voorbereidend (fase-1 auditief). De balans wordt ná het opbouwen van de
 * secties bijgestuurd door Sectie 1/2 (voorbereidend) en Sectie 7 (herhaling)
 * aan te vullen tot de streefverhouding; er wordt nooit iets weggeknipt, zodat
 * de gegarandeerde leerroute intact blijft.
 */
export const SESSION_MIX = { current: 0.6, repetition: 0.25, preparatory: 0.15 } as const;
/** Maximaal aantal items dat een rustige frustratie-wind-down per sectie laat. */
const WIND_DOWN_ITEMS_PER_SECTION = 2;

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

/**
 * QA-R2-001: een vrijgegeven grafeem heeft nog LK-oefening nodig zolang het
 * niet volgens `isMastered` beheerst is. Alleen naar mastery kijken is fout:
 * de eerste correcte beurt zet mastery al op 1.0 door `alpha = 1` bij attempts 0,
 * terwijl er pas ≥ 12 items nodig zijn.
 */
function needsLetterPractice(profile: Profile, graphemeId: string): boolean {
  return !isMastered(profile.skills[soundSkillFor(graphemeId)], MIN_MASTERY_ITEMS);
}

export function planSession(profile: Profile, rng: Rng = defaultRng): SessionPlan {
  const sessionNumber = profile.sessionCount + 1;
  const learned = effectiveLearned(new Set(profile.unlockedGraphemes));
  const wordPool = allowedWordObjects(learned);
  const wordNames = wordPool.map((w) => w.word);
  const choicePool = wordsWithPeerLength(wordPool);
  const sections: SessionSection[] = [];
  const avoid: number[] = [];

  // QA-R3-001: de fase-2-poort is haalbaar (mastery ≥ 0.7) met een
  // sessie-vangnet. `phase2Fallback` betekent: nog geen mastery, maar de
  // eerste letter wordt tóch geïntroduceerd met extra auditieve steun.
  const phase2Mastered = phaseTwoOpenedByMastery(profile);
  const phase2Fallback = phaseTwoFallbackActive(profile);
  // QA-R3-002: leessecties openen pas bij ≥ 2 even lange woorden; anders
  // bestaan er geen gelijke-lengte-afleiders en zouden er 1-optie-"keuzes"
  // ontstaan. In dat geval compenseren we met extra hak-/klankoefening.
  const wordChoiceReady = choicePool.length >= 2;

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
  //    QA-R2-002/QA-R3-001: de fase-2-poort hangt aan FN.FIRST_SOUND (ED §3).
  //    Zolang die poort op mastery dicht is, blijft de warming-up gericht
  //    FIRST_SOUND oefenen (vóór LAST) met maximaal 2 opties (vereenvoudigd),
  //    zodat ook een zwakkere leerling via vereenvoudiging beheersing kan
  //    bereiken. Is alleen het sessie-vangnet actief, dan blijft fase 1 óók
  //    in de warming-up staan (extra auditieve steun).
  {
    const targetedWarmup = !phase2Mastered;
    const nickname = targetedWarmup ? 'FN.FIRST_SOUND' : rng() < 0.5 ? 'FN.FIRST_SOUND' : 'FN.LAST_SOUND';
    const soundCount = targetedWarmup ? SOUND_ITEMS + 1 : SOUND_ITEMS;
    const difficulty = targetedWarmup ? 'A' : difficultyForSkill(profile, nickname);
    const items = FirstSound.generate(
      wordPool.length >= 2
        ? {
            skillId: nickname,
            difficulty,
            count: soundCount,
            availableWords: wordNames,
            rng,
            learned,
            // 2 opties i.p.v. 3 zolang de leerling de klankoefening nog niet
            // beheerst (QA-R3-001: haalbare vereenvoudiging).
            ...(targetedWarmup ? { maxDistractors: 1 } : {}),
            avoidCorrectIndices: avoid,
          }
        : {
            // Fase 1: auditieve woorden mogen niet-geleerde grafemen bevatten
            // (ED §6.2 regel 8) zodat fonemisch bewustzijn oefenbaar is vóór
            // de eerste letters (EDU-010).
            skillId: nickname,
            difficulty: 'A',
            count: soundCount,
            availableWords: [],
            rng,
            auditory: true,
            maxDistractors: 1,
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
      // Gescoorde oefening. Voor de allereerste letter is er nog geen tweede
      // geleerd grafeem: dan oefenen we bewust LK.<g>.SOUND (letter zien →
      // klank kiezen) met audio-only KLANK-afleiders uit de volledige
      // inventaris (QA-R2-001 / EDU-R2-001 keuze (a)); er komt dus geen
      // ongeleerde letter in beeld en het is echte auditieve discriminatie.
      // Klank→grafeem (RECOGNIZE) stellen we uit tot er ≥ 2 geleerde grafemen
      // zijn, zodat er nooit een ongeleerde letter als optie verschijnt
      // (EDU-R2-001 keuze (b)).
      const hasLearnedDistractor = hasDistractorGrapheme(learned, next.id);
      if (hasLearnedDistractor) {
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
      } else {
        for (let i = 0; i < NEW_LETTER_ITEMS; i++) {
          items.push(
            LetterSound.generate({
              skillId: soundSkillFor(next.id),
              direction: 'grapheme-to-sound',
              targetGrapheme: next.id,
              learnedGraphemes: learned,
              allowUnlearnedAuditoryDistractors: true,
              difficulty: 'A',
              rng,
              avoidCorrectIndices: avoid,
            }),
          );
        }
      }
      // QA-R3-001: het sessie-vangnet introduceert de eerste letter zonder
      // mastery. Die krijgt extra auditieve steun en rustige modeling, zodat de
      // overgang niet onvoorbereid voelt (ED §3/§10).
      if (phase2Fallback) {
        for (const item of items) {
          item.metadata = {
            ...(item.metadata ?? {}),
            extraAudio: true,
            modelFirst: true,
            simplified: true,
            fallbackIntro: true,
          };
        }
      }
      record(items);
      sections.push({ step: 3, name: 'Nieuwe letter/klank', items });
    }
  }

  // 4. Oefenen – hakken + plakken met de nieuwste/zwakke grafemen.
  //    Met één toegestaan woord (bv. alleen m+a → "mam") is hakken op een
  //    gesproken woord al mogelijk: de opties zijn aantallen klanken, puur
  //    auditief (ED §4.1). Plakken blijft wachten op ≥ 2 woorden, omdat het
  //    geschreven woordopties toont (EDU-R2-001c).
  if (wordPool.length >= 1) {
    // QA-R3-002: zolang de leessecties dicht zijn (geen even-lange
    // woordparen), compenseren we met extra hak-oefening op de beschikbare
    // woorden. Zo blijft er gescoord woordwerk zonder 1-optie-"keuzes".
    const practiceCount = wordChoiceReady ? PRACTICE_ITEMS : PRACTICE_ITEMS + 2;
    const targets = pickWords(wordPool, practiceCount, rng);
    const canBlend = choicePool.length >= 1;
    const items: ActivityItem[] = [];
    targets.forEach((target, index) => {
      if (index % 2 === 0 || !canBlend) {
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
  //    QA-R3-002: alleen openen bij ≥ 2 even lange woorden (echte keuze).
  if (wordChoiceReady) {
    const targets = pickWords(choicePool, WORD_READING_ITEMS, rng);
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
  //    QA-R3-002: ook hier alleen met ≥ 2 even lange woorden; de bron is de
  //    choicePool zelf, zodat elk doelwoord een gelijke-lengte-afleider heeft.
  if (wordChoiceReady) {
    const items = Klimboom.generate({
      count: MINI_GAME_ITEMS,
      difficulty: difficultyForSkill(profile, 'DE.CVC'),
      availableWords: choicePool.map((w) => w.word),
      rng,
      learned,
      skillId: 'DE.CVC',
      avoidCorrectIndices: avoid,
    });
    record(items);
    if (items.length > 0) sections.push({ step: 6, name: 'Mini-game De Klimboom', items });
  }

  const readingItems = readingPractice(profile, 7, rng);
  if (readingItems.length) sections.push({ step: 17, name: 'Zinnen lezen', items: readingItems });
  const storyItems = readingPractice(profile, 8, rng);
  if (storyItems.length) sections.push({ step: 18, name: 'Verhalen lezen', items: storyItems });

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
    // Zwakke vrijgegeven grafemen blijven oefenbaar, ook zonder woorden en ook
    // wanneer er al woordsecties zijn (anders kan het zojuist geïntroduceerde
    // grafeem nooit `isMastered` worden; QA-R2-001). Voor de allereerste
    // letter gebruiken we audio-only klank-afleiders uit de inventaris.
    {
      const weak = profile.unlockedGraphemes.filter((id) => needsLetterPractice(profile, id));
      const fallback = wordPool.length < 2 ? [...profile.unlockedGraphemes] : [];
      const targets = (weak.length > 0 ? weak : fallback).slice(0, LETTER_PRACTICE_ITEMS);
      // Herhaal de zwakke/nieuwste grafemen tot het gewenste aantal oefeningen,
      // ook als er maar één zwak grafeem is (QA-R2-001: anders kan een zojuist
      // geïntroduceerde letter nooit `isMastered` worden).
      for (let n = 0; n < LETTER_PRACTICE_ITEMS && targets.length > 0; n++) {
        const id = targets[n % targets.length] as string;
        const hasLearnedDistractor = hasDistractorGrapheme(learned, id);
        items.push(
          LetterSound.generate({
            skillId: soundSkillFor(id),
            direction: 'grapheme-to-sound',
            targetGrapheme: id,
            learnedGraphemes: learned,
            allowUnlearnedAuditoryDistractors: !hasLearnedDistractor,
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

  // EDU-026: stuur de sessiemix bij richting 60/25/15 (ED §10.3). Er wordt
  // alleen aangevuld, nooit weggeknipt, zodat de gegarandeerde leerroute
  // (QA-003/QA-R2-001) intact blijft.
  {
    const scoredOf = (list: readonly ActivityItem[]): number => list.filter((i) => isScoredActivityItem(i)).length;
    const total = sections.reduce((sum, section) => sum + scoredOf(section.items), 0);
    const desiredPrep = Math.round(total * SESSION_MIX.preparatory);
    const desiredRep = Math.round(total * SESSION_MIX.repetition);
    let prep = sections.filter((s) => s.step === 1 || s.step === 2).reduce((sum, s) => sum + scoredOf(s.items), 0);
    let rep = sections.filter((s) => s.step === 7).reduce((sum, s) => sum + scoredOf(s.items), 0);

    if (prep < desiredPrep) {
      const extra = Phonology.generate({
        skillId: rng() < 0.5 ? 'PH.RHYME' : 'PH.SYLLABLE',
        difficulty: 'A',
        count: desiredPrep - prep,
        rng,
        avoidCorrectIndices: avoid,
      });
      record(extra);
      const host = sections.find((s) => s.step === 1) ?? sections.find((s) => s.step === 2);
      if (host) host.items.push(...extra);
      else if (extra.length > 0) sections.push({ step: 1, name: 'Klankwarming-up', items: extra });
      prep += extra.filter((i) => isScoredActivityItem(i)).length;
    }

    if (rep < desiredRep && profile.unlockedGraphemes.length > 0) {
      const weak = profile.unlockedGraphemes.filter((id) => needsLetterPractice(profile, id));
      const pool = weak.length > 0 ? weak : [...profile.unlockedGraphemes];
      let added = 0;
      while (rep < desiredRep && added < pool.length) {
        const id = pool[added % pool.length] as string;
        const item = LetterSound.generate({
          skillId: soundSkillFor(id),
          direction: 'grapheme-to-sound',
          targetGrapheme: id,
          learnedGraphemes: learned,
          allowUnlearnedAuditoryDistractors: !hasDistractorGrapheme(learned, id),
          difficulty: difficultyForSkill(profile, soundSkillFor(id)),
          rng,
          avoidCorrectIndices: avoid,
        });
        record([item]);
        const host = sections.find((s) => s.step === 7);
        if (host) host.items.push(item);
        else sections.push({ step: 7, name: 'Herhaling', items: [item] });
        if (isScoredActivityItem(item)) rep += 1;
        added += 1;
      }
    }
  }

  // EDU-027: markeer per item in welke sessiestap het valt, zodat GameState
  // één vonkje per afgeronde leesstap (3–6) kan toekennen (GD §6.1).
  for (const section of sections) {
    for (const item of section.items) {
      item.metadata = { ...(item.metadata ?? {}), step: section.step };
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

// ---------------------------------------------------------------------------
// SEC-R2-001/002: strikte schema-/omvangvalidatie van hervat-JSON
// ---------------------------------------------------------------------------
/** Maximale grootte van de resume-sleutel; groter → negeren (lokale DoS). */
export const MAX_RESUME_BYTES = 200 * 1024;
const MAX_SECTIONS = 32;
const MAX_ITEMS_PER_SECTION = 40;
const MAX_OPTIONS_PER_ITEM = 8;
const MAX_SKILL_STATES = 500;
const MAX_METADATA_KEYS = 40;
const DANGEROUS_KEYS: ReadonlySet<string> = new Set(['__proto__', 'constructor', 'prototype']);

/**
 * SEC-R3-005: whitelist van audio-keys die uit hervat-JSON mogen komen. Een
 * gemanipuleerde resume-sleutel kan zo nooit een willekeurige `key`/`src` op de
 * speler afdwingen (defense-in-depth bovenop `isLocalAudioSrc`). De manifest
 * bevat alle concrete clips; `INSTRUCTIONS`/`FEEDBACK` dekken de dynamische
 * template-keys die (nog) geen eigen opname hebben.
 */
const KNOWN_AUDIO_KEYS: ReadonlySet<string> = new Set([
  ...audioManifest.map((clip) => clip.key),
  ...Object.keys(instructions),
  ...Object.keys(feedback),
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function nonNegInt(value: unknown, fallback = 0): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return fallback;
  return Math.floor(value);
}

/**
 * SEC-R3-005: valideer een audio-`src` uit hervat-JSON. Alleen lokale,
 * relatieve paden zijn toegestaan. Bij ongeldig resultaat laten we de `src` weg
 * zodat de clip via key/TTS blijft werken. De regelgeving is gedeeld met de
 * audio-laag (`sanitizeLocalAudioSrc` uit `src/audio/localSrc.ts`), zodat
 * hervatte audio en runtime-audio voor dezelfde invoer hetzelfde oordeel geven.
 */
function readAudio(value: unknown): AudioClip | undefined {
  if (!isRecord(value)) return undefined;
  const key = value['key'];
  const src = value['src'];
  const kind = value['kind'];
  if (typeof key !== 'string' || typeof src !== 'string' || typeof kind !== 'string') return undefined;
  if (!KNOWN_AUDIO_KEYS.has(key)) return undefined;
  const safeSrc = sanitizeLocalAudioSrc(src);
  // Ongeldige src weglaten; de clip blijft via key/TTS beschikbaar.
  const clip: AudioClip = { key, src: safeSrc ?? '', kind: kind as AudioClip['kind'] };
  if (typeof value['text'] === 'string') clip.text = value['text'];
  return clip;
}

/** Alleen eigen, veilige keys; `__proto__`/`constructor`/`prototype` eruit. */
function sanitizeMetadata(value: unknown): Record<string, unknown> | undefined {
  if (!isRecord(value)) return undefined;
  const out: Record<string, unknown> = Object.create(null) as Record<string, unknown>;
  let count = 0;
  for (const [key, entry] of Object.entries(value)) {
    if (DANGEROUS_KEYS.has(key)) continue;
    if (key === 'questionAudio' || key === 'readingAudio') {
      const clip = readAudio(entry);
      if (clip) out[key] = clip;
    } else { out[key] = entry; }
    count += 1;
    if (count >= MAX_METADATA_KEYS) break;
  }
  return out;
}

function readOption(value: unknown): ActivityOption | undefined {
  if (!isRecord(value)) return undefined;
  const id = value['id'];
  const correct = value['correct'];
  if (typeof id !== 'string' || typeof correct !== 'boolean') return undefined;
  const option: ActivityOption = { id, correct };
  if (typeof value['label'] === 'string') option.label = value['label'];
  if (typeof value['image'] === 'string') option.image = value['image'];
  const audio = readAudio(value['audio']);
  if (audio) option.audio = audio;
  return option;
}

function readItem(value: unknown): ActivityItem | undefined {
  if (!isRecord(value)) return undefined;
  const id = value['id'];
  const skillId = value['skillId'];
  const kind = value['kind'];
  const targetId = value['targetId'];
  const difficulty = value['difficulty'];
  const isRetry = value['isRetry'];
  if (typeof id !== 'string' || typeof skillId !== 'string' || typeof kind !== 'string') return undefined;
  if (typeof targetId !== 'string') return undefined;
  if (difficulty !== 'A' && difficulty !== 'B' && difficulty !== 'C' && difficulty !== 'D') return undefined;
  if (typeof isRetry !== 'boolean') return undefined;
  if (!isRecord(value['prompt'])) return undefined;
  const promptRaw = value['prompt'];
  const showText = promptRaw['showText'];
  if (typeof showText !== 'boolean') return undefined;
  const prompt: ActivityPrompt = { showText };
  if (typeof promptRaw['text'] === 'string') prompt.text = promptRaw['text'];
  const promptAudio = readAudio(promptRaw['audio']);
  if (promptAudio) prompt.audio = promptAudio;

  const optionsRaw = value['options'];
  if (!Array.isArray(optionsRaw) || optionsRaw.length > MAX_OPTIONS_PER_ITEM) return undefined;
  const options: ActivityOption[] = [];
  for (const raw of optionsRaw) {
    const option = readOption(raw);
    if (!option) return undefined;
    options.push(option);
  }

  const item: ActivityItem = { id, skillId, kind, prompt, options, targetId, difficulty, isRetry };
  if (typeof value['secondarySkillId'] === 'string') item.secondarySkillId = value['secondarySkillId'];
  if (typeof value['itemKey'] === 'string') item.itemKey = value['itemKey'];
  const metadata = sanitizeMetadata(value['metadata']);
  if (metadata) item.metadata = metadata;
  return item;
}

function readSections(value: unknown): SessionSection[] | undefined {
  if (!Array.isArray(value) || value.length > MAX_SECTIONS) return undefined;
  const sections: SessionSection[] = [];
  for (const raw of value) {
    if (!isRecord(raw)) return undefined;
    const step = raw['step'];
    const name = raw['name'];
    const itemsRaw = raw['items'];
    if (typeof step !== 'number' || !Number.isFinite(step)) return undefined;
    if (typeof name !== 'string') return undefined;
    if (!Array.isArray(itemsRaw) || itemsRaw.length > MAX_ITEMS_PER_SECTION) return undefined;
    const items: ActivityItem[] = [];
    for (const rawItem of itemsRaw) {
      const item = readItem(rawItem);
      if (!item) return undefined;
      items.push(item);
    }
    sections.push({ step, name, items });
  }
  return sections;
}

function isValidEvent(value: unknown): value is AnswerEvent {
  if (!isRecord(value)) return false;
  return (
    typeof value['itemId'] === 'string' &&
    typeof value['skillId'] === 'string' &&
    typeof value['sessionNumber'] === 'number' &&
    typeof value['timestamp'] === 'number' &&
    typeof value['correct'] === 'boolean' &&
    typeof value['attempt'] === 'number' &&
    typeof value['usedHint'] === 'boolean' &&
    typeof value['modeled'] === 'boolean' &&
    typeof value['responseMs'] === 'number' &&
    typeof value['isGuess'] === 'boolean'
  );
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
      if (this.frustrationCount >= 2) {
        this.windDown = true;
        this.applyWindDown();
      }
    }

    // QA-010 / QA-R2-003: adaptieve bijsturing binnen de sessie. Bij lage
    // mastery is het aantal opties vaak al 2, waardoor opties schrappen niets
    // doet; daarom zetten we aanvullend altijd extra audio + een modelherhaling
    // klaar (zichtbaar effect, geen no-op).
    const difficulty = item.difficulty;
    if (shouldSimplify(nextState, recent)) {
      this.applyOptionReduction(skillId);
      this.applyExtraAudio(skillId);
      this.applyModelSupport(skillId);
    } else {
      const nextDiff = nextDifficulty(difficulty, nextState);
      if (difficultyIndex(nextDiff) < difficultyIndex(difficulty)) {
        this.applyOptionReduction(skillId);
        this.applyModelSupport(skillId);
      }
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

  /**
   * QA-R2-003: bij lage mastery ook een modelherhaling/vereenvoudigingsvlag
   * zetten, óók als het item al 2 opties heeft. Dit is een zichtbaar effect
   * (UI speelt het model rustig voor) en geen no-op zoals opties schrappen.
   */
  private applyModelSupport(skillId: SkillId): void {
    let changed = 0;
    for (let s = this.sectionIndex; s < this.sections.length && changed < 3; s++) {
      const section = this.sections[s];
      if (!section) continue;
      const start = s === this.sectionIndex ? this.itemIndex : 0;
      for (let i = start; i < section.items.length && changed < 3; i++) {
        const item = section.items[i];
        if (!item || item.skillId !== skillId) continue;
        if (item.metadata?.['modelFirst'] === true) continue;
        item.metadata = { ...(item.metadata ?? {}), modelFirst: true, extraAudio: true, simplified: true };
        changed += 1;
      }
    }
  }

  /**
   * QA-R2-003: de frustratie-wind-down rondt de sessie rustig af door elke
   * resterende sectie tot max. {@link WIND_DOWN_ITEMS_PER_SECTION} items te
   * beperken in plaats van de woord-/leessecties volledig over te slaan. Zo
   * blijven de leesstappen (en hun adaptieve bijsturing) bereikbaar. De
   * volgende sessie start vanzelf eenvoudiger omdat de gemodelleerde items de
   * mastery verlagen (ED §10.3).
   */
  private applyWindDown(): void {
    for (let s = this.sectionIndex; s < this.sections.length; s++) {
      const section = this.sections[s];
      if (!section || section.step === 8) continue;
      const start = s === this.sectionIndex ? this.itemIndex : 0;
      const future = section.items.slice(start);
      for (const item of future.slice(0, WIND_DOWN_ITEMS_PER_SECTION)) {
        item.metadata = { ...(item.metadata ?? {}), extraAudio: true, modelFirst: true, simplified: true, windDown: true };
      }
      if (future.length > WIND_DOWN_ITEMS_PER_SECTION) section.items.splice(start + WIND_DOWN_ITEMS_PER_SECTION);
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
      if (this.itemIndex < section.items.length) return;
      this.sectionIndex += 1;
      this.itemIndex = 0;
    }
  }

  /**
   * Serialiseert de queue. De teruggegeven `sections` zijn de **live**
   * secties (geen deep clone): `reportOutcome` muteert ze in-place. Dit is
   * veilig zolang de aanroeper de snapshot synchroon stringify't —
   * `saveSessionState` doet dat direct — zodat er niets muteert vóór het
   * serialiseren. De eerdere `JSON.parse(JSON.stringify(...))` was een
   * overbodige dubbele (de)serialisatie.
   */
  toJSON(now: number = Date.now()): SerializedSessionQueue {
    return {
      version: 1,
      savedAt: now,
      sessionNumber: this.context.sessionNumber,
      sections: this.sections,
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

  /**
   * SEC-R2-001/002: valideert het schema strikt vóór hervatten. Bij een
   * corrupt/ongeoorloofd schema (verkeerde types, te veel secties/items/opties,
   * `__proto__`-keys) wordt `null` teruggegeven in plaats van te crashen.
   */
  static fromJSON(data: unknown, context?: QueueContext): SessionQueue | null {
    if (!isRecord(data)) return null;
    if (data['version'] !== 1) return null;
    const sections = readSections(data['sections']);
    if (!sections) return null;
    const sessionNumber = nonNegInt(data['sessionNumber'], 0);
    // QA-R3-003: geef de hervat-context (profiel/rng/geleerde set) mee, zodat
    // seedSkillState de profiel-mastery kent en buildSuccessItem het juiste
    // (gemeesterde) grafeem kiest i.p.v. de generieke fase-1-fallback.
    const queue = new SessionQueue(
      { sessionNumber, sections },
      {
        sessionNumber,
        ...(context?.rng ? { rng: context.rng } : {}),
        ...(context?.learned ? { learned: context.learned } : {}),
        ...(context?.profile ? { profile: context.profile } : {}),
      },
    );
    queue.sectionIndex = Math.min(nonNegInt(data['sectionIndex']), sections.length);
    queue.itemIndex = nonNegInt(data['itemIndex']);
    queue.consecutiveModeled = nonNegInt(data['consecutiveModeled']);
    queue.frustrationCount = nonNegInt(data['frustrationCount']);
    queue.windDown = data['windDown'] === true;
    queue.requeueCount = nonNegInt(data['requeueCount']);

    const skillStates = data['skillStates'];
    if (isRecord(skillStates)) {
      let count = 0;
      for (const [skill, state] of Object.entries(skillStates)) {
        if (DANGEROUS_KEYS.has(skill) || !isRecord(state)) continue;
        queue.skillStates.set(skill, ensureSkillDetail(state as Partial<SkillStateDetail>));
        count += 1;
        if (count >= MAX_SKILL_STATES) break;
      }
    }
    const recentEvents = data['recentEvents'];
    if (isRecord(recentEvents)) {
      let count = 0;
      for (const [skill, events] of Object.entries(recentEvents)) {
        if (DANGEROUS_KEYS.has(skill) || !Array.isArray(events)) continue;
        const safeEvents = events.filter(isValidEvent).slice(-MAX_EVENTS_PER_SKILL);
        queue.recentEvents.set(skill, safeEvents);
        count += 1;
        if (count >= MAX_SKILL_STATES) break;
      }
    }
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

/**
 * Schrijft de queue synchroon weg. `toJSON` levert de live secties; omdat we
 * hier direct stringifyen (één expressie) kan er niets muteren tussen snapshot
 * en serialisatie (zie `SessionQueue.toJSON`).
 */
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

/**
 * Laadt een onderbroken sessie binnen de TTL; anders undefined.
 *
 * SEC-R3-002: een verlopen of ongeldige resume-sleutel wordt **actief
 * verwijderd** i.p.v. alleen genegeerd, zodat de gedragsdata niet onbeperkt in
 * localStorage blijft staan (AVG-retentie).
 *
 * QA-R3-003: geef `context` (profiel/rng/geleerde set) mee, zodat de hervatte
 * queue dezelfde adaptieve context heeft als een verse queue.
 */
export function loadSessionState(
  storage: SaveStorage,
  now: number = Date.now(),
  ttl: number = RESUME_TTL_MS,
  context?: QueueContext,
): SessionQueue | undefined {
  const discard = (): undefined => {
    try {
      storage.remove(SESSION_RESUME_KEY);
    } catch {
      // Privémodus/quota: niets om te wissen.
    }
    return undefined;
  };
  let raw: string | null = null;
  try {
    raw = storage.read(SESSION_RESUME_KEY);
  } catch {
    return undefined;
  }
  if (!raw) return undefined;
  // SEC-R2-002: begrens de omvang vóór parsen/verwerken (lokale DoS).
  if (raw.length > MAX_RESUME_BYTES) return discard();
  try {
    const data = JSON.parse(raw) as unknown;
    if (!isRecord(data) || data['version'] !== 1) return discard();
    if (typeof data['savedAt'] !== 'number' || now - data['savedAt'] > ttl) return discard();
    const queue = SessionQueue.fromJSON(data, context);
    return queue ?? discard();
  } catch {
    return discard();
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
