/**
 * Centrale spellogica-state. DOM-vrij.
 * TODO(Builder): volledige implementatie (ARCHITECTURE §3, §4).
 */
import type { AnswerEvent, Profile, SkillId, SkillState } from '../types';

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

/** Verwerkt één antwoord-event. TODO(Builder): Mastery + Leitner + Adaptive aanroepen. */
export function recordAnswer(_state: GameState, _event: AnswerEvent): GameState {
  throw new Error('TODO(Builder): GameState.recordAnswer');
}
