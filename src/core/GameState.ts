/**
 * Centrale spellogica-state, DOM-vrij (ARCHITECTURE §3, §4).
 *
 * Verwerkt antwoorden via Mastery + SpacedRepetition en houdt de
 * sessie-overgangen bij. Alle functies zijn puur: ze muteren `state` niet.
 */
import type { AnswerEvent, Profile, Rewards, SkillId, SkillState } from '../types';
import {
  createSkillState,
  ensureSkillDetail,
  updateSkillState,
  type SkillStateDetail,
} from './Mastery';
import { createItemState, updateItemState } from './SpacedRepetition';
import { recognizeSkillFor, soundSkillFor } from './Progression';

export interface GameState {
  profile: Profile;
  /** Huidig sessienummer (1-based). */
  sessionNumber: number;
  /** Huidige fase in de sessie-loop (GD §3.1), 1..9. */
  sessionStep: number;
  /** Of er deze sessie al een nieuw grafeem is geïntroduceerd. */
  introducedGraphemeThisSession: boolean;
  /** Aantal items op rij gemodelleerd (frustratiestop, ED §10.3). */
  consecutiveModeled: number;
}

export function createInitialState(profile: Profile): GameState {
  return {
    profile,
    sessionNumber: profile.sessionCount + 1,
    sessionStep: 1,
    introducedGraphemeThisSession: false,
    consecutiveModeled: 0,
  };
}

export function getSkillState(state: GameState, skillId: SkillId): SkillState | undefined {
  return state.profile.skills[skillId];
}

/** Geeft het detailtype terug (incl. rolling windows) of undefined. */
export function getSkillDetail(state: GameState, skillId: SkillId): SkillStateDetail | undefined {
  const raw = state.profile.skills[skillId];
  return raw ? ensureSkillDetail(raw) : undefined;
}

/** Zorgt voor een SkillState; muteert het profiel niet (retourneert een kopie). */
export function ensureSkillState(profile: Profile, skillId: SkillId): Profile {
  if (profile.skills[skillId]) return profile;
  return { ...profile, skills: { ...profile.skills, [skillId]: createSkillState() } };
}

function applyToSkill(
  skills: Record<SkillId, SkillState>,
  skillId: SkillId,
  event: AnswerEvent,
): void {
  const prev = skills[skillId] ?? createSkillState();
  skills[skillId] = updateSkillState(prev, event);
}

/**
 * Kent deterministische beloningen toe: een blad en een vriendjeskaart zodra
 * LK.<g>.SOUND ≥ 0.8 (GD §6.1). Geen kansspel, geen willekeur.
 */
export function syncRewards(profile: Profile): Profile {
  const leaves = new Set(profile.rewards.leaves);
  const cards = new Set(profile.rewards.vriendjeskaarten);
  for (const graphemeId of profile.unlockedGraphemes) {
    const state = profile.skills[soundSkillFor(graphemeId)];
    if (state && state.mastery >= 0.8) {
      leaves.add(graphemeId);
      cards.add(graphemeId);
    }
  }
  const rewards: Rewards = {
    klankvonkjes: profile.rewards.klankvonkjes,
    vriendjeskaarten: [...cards],
    leaves: [...leaves],
  };
  return { ...profile, rewards };
}

/** Telt klankvonkjes op (na afgerond leeswerk, GD §6.1). */
export function addSparks(profile: Profile, count = 1): Profile {
  if (count <= 0) return profile;
  return { ...profile, rewards: { ...profile.rewards, klankvonkjes: profile.rewards.klankvonkjes + count } };
}

/**
 * Verwerkt één antwoord-event: Mastery (primair + secundair), Leitner per
 * item-skill en de frustratieteller. Gok-events veranderen niets.
 */
export function recordAnswer(state: GameState, event: AnswerEvent): GameState {
  const skills: Record<SkillId, SkillState> = { ...state.profile.skills };
  const items = { ...state.profile.items };

  if (!event.isGuess) {
    applyToSkill(skills, event.skillId, event);
    if (event.secondarySkillId) applyToSkill(skills, event.secondarySkillId, event);
    if (event.itemKey) {
      const prev = items[event.itemKey] ?? createItemState(event.itemKey, event.skillId);
      items[event.itemKey] = updateItemState(prev, event, event.sessionNumber);
    }
  }

  let consecutiveModeled = state.consecutiveModeled;
  if (!event.isGuess) {
    if (event.modeled) consecutiveModeled += 1;
    else if (event.correct) consecutiveModeled = 0;
  }

  const profile = syncRewards({ ...state.profile, skills, items });
  return { ...state, profile, consecutiveModeled };
}

/** Start een nieuwe sessie: sessieteller +1 en loop terug naar stap 1. */
export function startNewSession(state: GameState): GameState {
  const profile = { ...state.profile, sessionCount: state.profile.sessionCount + 1 };
  return {
    profile,
    sessionNumber: profile.sessionCount + 1,
    sessionStep: 1,
    introducedGraphemeThisSession: false,
    consecutiveModeled: 0,
  };
}

export function advanceStep(state: GameState, step: number): GameState {
  return { ...state, sessionStep: step };
}

/** Introduceert een grafeem: vrijgeven + RECOGNIZE/SOUND-skill aanmaken. */
export function introduceGrapheme(state: GameState, graphemeId: string): GameState {
  if (state.profile.unlockedGraphemes.includes(graphemeId)) return state;
  let profile: Profile = {
    ...state.profile,
    unlockedGraphemes: [...state.profile.unlockedGraphemes, graphemeId],
  };
  profile = ensureSkillState(profile, recognizeSkillFor(graphemeId));
  profile = ensureSkillState(profile, soundSkillFor(graphemeId));
  return { ...state, profile, introducedGraphemeThisSession: true };
}
