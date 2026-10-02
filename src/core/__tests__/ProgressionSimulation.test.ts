/**
 * QA-R2-009: multi-sessie-progressietest.
 *
 * Simuleert een echte leerling via de engine (planner → queue → GameState) en
 * eist dat de MVP-grafemen m,a,s,t,k,r vrijkomen binnen ≤ 30 sessies met
 * perfecte antwoorden, dat woordsecties met ≥ 2 opties verschijnen zodra er
 * genoeg woorden zijn, en dat een leerling met 50% fout nooit een nieuw
 * grafeem zonder beheersing krijgt en niet crasht.
 */
import { describe, expect, it } from 'vitest';
import type { ActivityItem, AnswerEvent, Profile } from '../../types';
import { createFreshProfile } from '../SaveSystem';
import { createSeededRng } from '../rng';
import {
  completeSession,
  createInitialState,
  introduceGrapheme,
  recordItemAnswer,
  type GameState,
} from '../GameState';
import { createSessionQueue, flattenPlan, planSession } from '../SessionPlanner';
import { isScoredActivityItem } from '../../learning/util';
import { createSkillState, isMastered } from '../Mastery';
import { MIN_MASTERY_ITEMS } from '../Progression';

const MVP = ['m', 'a', 's', 't', 'k', 'r'] as const;
const MAX_SESSIONS = 30;

function eventFor(item: ActivityItem, sessionNumber: number, correct: boolean): AnswerEvent {
  const wrong = item.options.find((o) => !o.correct)?.id ?? item.targetId;
  return {
    itemId: item.id,
    skillId: item.skillId,
    itemKey: item.itemKey,
    sessionNumber,
    timestamp: 0,
    selectedOptionId: correct ? item.targetId : wrong,
    correct,
    attempt: correct ? 1 : 3,
    usedHint: false,
    modeled: !correct,
    responseMs: correct ? 1200 : 6000,
    isGuess: false,
    itemScore: correct ? 1 : 0,
  };
}

interface SessionResult {
  state: GameState;
  scoredItems: number;
  minScoredOptions: number;
  wordSectionsWithChoice: boolean;
  scoredLetter: boolean;
  introduced: string[];
}

/** Draait één volledige sessie zoals de UI dat doet. */
function runSession(
  state: GameState,
  rng: () => number,
  isCorrect: (item: ActivityItem, index: number) => boolean,
): SessionResult {
  const plan = planSession(state.profile, rng);
  const queue = createSessionQueue(plan, {
    sessionNumber: state.sessionNumber,
    profile: state.profile,
    learned: new Set(state.profile.unlockedGraphemes),
    rng,
  });
  let next = state;
  let guard = 0;
  let index = 0;
  let scoredItems = 0;
  let minScoredOptions = Number.POSITIVE_INFINITY;
  const introduced: string[] = [];

  while (guard++ < 200) {
    const item = queue.current();
    if (!item) break;
    if (item.metadata?.['introduction'] === true && typeof item.metadata?.['targetGrapheme'] === 'string') {
      const id = item.metadata['targetGrapheme'] as string;
      if (!next.profile.unlockedGraphemes.includes(id)) introduced.push(id);
      next = introduceGrapheme(next, id);
    }
    const correct = isCorrect(item, index);
    const event = eventFor(item, next.sessionNumber, correct);
    next = recordItemAnswer(next, event, item);
    queue.reportOutcome(event, item);
    queue.next();
    index += 1;
  }

  for (const item of flattenPlan(plan)) {
    if (!isScoredActivityItem(item)) continue;
    scoredItems += 1;
    minScoredOptions = Math.min(minScoredOptions, item.options.length);
  }
  const wordSecs = plan.sections.filter((s) => s.step >= 4 && s.step <= 6);
  const wordSectionsWithChoice = wordSecs.some((s) => s.items.some((i) => isScoredActivityItem(i)));
  const scoredLetter = flattenPlan(plan).some((i) => i.skillId.startsWith('LK.') && isScoredActivityItem(i));

  return {
    state: completeSession(next, state.sessionNumber),
    scoredItems,
    minScoredOptions: Number.isFinite(minScoredOptions) ? minScoredOptions : 0,
    wordSectionsWithChoice,
    scoredLetter,
    introduced,
  };
}

describe('QA-R2-009 – multi-sessie progressie vanaf een vers profiel', () => {
  it('speelt m,a,s,t,k,r vrij binnen 30 sessies met perfecte antwoorden', () => {
    let state = createInitialState(createFreshProfile(0, () => 0.5));
    const rng = createSeededRng(2026);
    const unlockSession: Record<string, number> = {};
    let sawWordSectionWithChoice = false;
    let sawScoredLetter = false;

    for (let session = 1; session <= MAX_SESSIONS; session++) {
      const result = runSession(state, rng, () => true);
      state = result.state;
      if (result.wordSectionsWithChoice) sawWordSectionWithChoice = true;
      if (result.scoredLetter) sawScoredLetter = true;
      for (const id of state.profile.unlockedGraphemes) {
        if (unlockSession[id] === undefined) unlockSession[id] = session;
      }
      if (MVP.every((g) => state.profile.unlockedGraphemes.includes(g))) break;
    }

    // Rapporteer de unlock-sessies (zichtbaar in testuitvoer).
    // eslint-disable-next-line no-console
    console.log('Unlock-sessies per grafeem:', JSON.stringify(unlockSession));

    expect(sawScoredLetter, 'er moeten gescoorde LK-oefeningen bestaan').toBe(true);
    expect(unlockSession['m'], 'eerste letter m moet vrijkomen').toBeDefined();
    expect(unlockSession['a'], 'tweede letter a moet na beheersing van m vrijkomen').toBeDefined();
    expect(unlockSession['r'], 'alle MVP-letters moeten vrijkomen').toBeDefined();
    expect(unlockSession['r']!, 'binnen 30 sessies').toBeLessThanOrEqual(MAX_SESSIONS);
    expect(MVP.every((g) => state.profile.unlockedGraphemes.includes(g))).toBe(true);
    expect(sawWordSectionWithChoice, 'woordsecties met ≥ 2 opties moeten verschijnen').toBe(true);
  });

  it('geeft nooit een gescoord item met minder dan 2 opties (beide leerlingen)', () => {
    for (const seed of [2026, 77]) {
      let state = createInitialState(createFreshProfile(0, () => 0.5));
      const rng = createSeededRng(seed);
      const isCorrect = seed === 2026 ? () => true : (_i: ActivityItem, index: number) => index % 2 === 0;
      for (let session = 1; session <= 12; session++) {
        const result = runSession(state, rng, isCorrect);
        expect(result.minScoredOptions).toBeGreaterThanOrEqual(2);
        expect(result.scoredItems).toBeGreaterThanOrEqual(4);
        state = result.state;
      }
    }
  });

  it('geeft een leerling met 50% fout geen nieuwe letter zonder beheersing en crasht niet', () => {
    let state = createInitialState(createFreshProfile(0, () => 0.5));
    const rng = createSeededRng(77);
    for (let session = 1; session <= MAX_SESSIONS; session++) {
      state = runSession(state, rng, (_item, index) => index % 2 === 0).state;
    }
    const unlocked = state.profile.unlockedGraphemes;
    // Vrijgave gebeurt uitsluitend via de planner (canIntroduceNewGrapheme), dus
    // de set is altijd een prefix van de MVP-volgorde.
    expect(unlocked).toEqual(MVP.filter((g) => unlocked.includes(g)));
    // Een zwakke leerling mag niet alle letters hebben vrijgespeeld.
    expect(unlocked.length).toBeLessThan(MVP.length);
  });
});

describe('QA-R2-001 – de allereerste letter is echt oefen-/masterbaar', () => {
  it('genereert gescoorde LK.<g>.SOUND-items met audio-only klankafleiders', () => {
    const profile: Profile = createFreshProfile(0, () => 0.5);
    profile.skills['FN.FIRST_SOUND'] = {
      mastery: 0.9,
      attempts: 12,
      correct: 12,
      accuracy: 1,
      avgResponseMs: 1000,
      hintsUsed: 0,
      consecutiveCorrect: 12,
      leitnerBox: 5,
      lastSeenSession: 2,
      sessionsSeen: 2,
    };
    const plan = planSession(profile, createSeededRng(1));
    const step3 = plan.sections.find((s) => s.step === 3);
    expect(step3).toBeDefined();
    const scored = (step3?.items ?? []).filter((i) => isScoredActivityItem(i));
    const mSound = scored.filter((i) => i.skillId === 'LK.m.SOUND');
    expect(mSound.length).toBeGreaterThanOrEqual(2);
    for (const item of mSound) {
      // Klank kiezen: geen letters op het scherm, alleen audio-knoppen.
      expect(item.options.every((o) => o.label === undefined && o.audio !== undefined)).toBe(true);
      expect(item.metadata?.['auditoryDistractors']).toBe(true);
    }
  });
});

describe('QA-R3-001 – haalbare fase-2-poort voor de 50%-leerling', () => {
  it('geeft de eerste letter binnen ≤ 15 sessies; daarna nooit een letter zonder beheersing van de vorige', () => {
    // Perfect, "herstelt bij tweede poging" (score 0,5) en "gemodelleerd"
    // (score 0) — alle drie mogen niet eindeloos in fase 1 blijven hangen.
    const learners: { label: string; isCorrect: (item: ActivityItem, index: number) => boolean }[] = [
      { label: 'perfect', isCorrect: () => true },
      { label: '50%-tweede-poging', isCorrect: (_i, index) => index % 2 === 0 },
      { label: '50%-gemodelleerd', isCorrect: (_i, index) => index % 2 === 1 },
    ];

    for (const learner of learners) {
      let state = createInitialState(createFreshProfile(0, () => 0.5));
      const rng = createSeededRng(77);
      const unlockSession: Record<string, number> = {};

      for (let session = 1; session <= 15; session++) {
        state = runSession(state, rng, learner.isCorrect).state;
        const unlocked = [...state.profile.unlockedGraphemes];
        // Vrijgave is altijd een prefix van de MVP-volgorde ...
        expect(unlocked, learner.label).toEqual(MVP.filter((g) => unlocked.includes(g)));
        // ... en elke letter ná de eerste vereist beheersing van de vorige.
        for (let i = 1; i < unlocked.length; i++) {
          const prev = unlocked[i - 1]!;
          const skill = state.profile.skills[`LK.${prev}.SOUND`];
          expect(skill !== undefined && isMastered(skill, MIN_MASTERY_ITEMS), `${learner.label}: ${prev} beheerst vóór ${unlocked[i]}`).toBe(true);
        }
        for (const id of unlocked) if (unlockSession[id] === undefined) unlockSession[id] = session;
      }

      expect(unlockSession['m'], `${learner.label}: eerste letter m binnen 15 sessies`).toBeDefined();
      expect(unlockSession['m']!, learner.label).toBeLessThanOrEqual(15);
    }
  });
});

describe('QA-R3-002 – nooit 1-optie-"keuzes" in de leessecties', () => {
  it('laat de leessecties weg zolang er geen ≥ 2 even lange woorden zijn, maar compenseert met hakwerk', () => {
    const profile: Profile = createFreshProfile(0, () => 0.5);
    // m,a,s → woordenbank = {mam, as}: geen enkel even-lang paar.
    profile.unlockedGraphemes = ['m', 'a', 's'];
    profile.skills['FN.FIRST_SOUND'] = createSkillState({ mastery: 0.9, attempts: 12 });
    const plan = planSession(profile, createSeededRng(5));

    expect(plan.sections.some((s) => s.step === 5), 'geen woordleessectie zonder keuze').toBe(false);
    expect(plan.sections.some((s) => s.step === 6), 'geen Klimboom zonder keuze').toBe(false);

    for (const section of plan.sections) {
      if (section.step !== 5 && section.step !== 6) continue;
      for (const item of section.items) expect(item.options.length).toBeGreaterThanOrEqual(2);
    }

    // Compensatie: er blijft gescoord hak-/klankwerk zonder 1-optie-items.
    const practice = plan.sections.find((s) => s.step === 4);
    expect(practice).toBeDefined();
    expect(practice!.items.some((i) => isScoredActivityItem(i))).toBe(true);
    for (const item of flattenPlan(plan)) {
      if (item.options.length < 2) expect(item.metadata?.['scored'] === false || item.kind === 'beloning').toBe(true);
    }
  });
});
