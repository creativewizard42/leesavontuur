/**
 * Voortgang en poortcondities, ED §3 regel 2 / ARCHITECTURE §4.6.
 * DOM-vrij. Alles is gebaseerd op mastery-waarden in het profiel.
 */
import type { Grapheme, Profile, SkillId, SkillState } from '../types';
import { getGrapheme, getGraphemesUpTo, getPhase, graphemes, phases } from '../content';
import { isMastered } from './Mastery';

const MASTERED = 0.8;
const WEAK = 0.6;
const MAX_WEAK = 2;
/** Minimum aantal meetellende items voor "beheerst" (ED §3, LK.SOUND ≥ 12). */
export const MIN_MASTERY_ITEMS = 12;

/** LK.<g>.SOUND – het hoofddoel per grafeem (ED §2.3). */
export function soundSkillFor(graphemeId: string): SkillId {
  return `LK.${graphemeId}.SOUND`;
}

/** LK.<g>.RECOGNIZE – klank → grafeem (ED §2.3). */
export function recognizeSkillFor(graphemeId: string): SkillId {
  return `LK.${graphemeId}.RECOGNIZE`;
}

function masteryOf(profile: Profile, skillId: SkillId): number {
  return profile.skills[skillId]?.mastery ?? 0;
}

function isVowelGrapheme(id: string): boolean {
  const g = getGrapheme(id);
  if (!g) return false;
  return g.type.startsWith('vowel') || g.type === 'diphthong';
}

/** Vrijgegeven grafemen in introductievolgorde. */
export function unlockedGraphemes(profile: Profile): Grapheme[] {
  const unlocked = new Set(profile.unlockedGraphemes);
  return graphemes.filter((g) => unlocked.has(g.id));
}

/** Zwakke vrijgegeven grafemen: LK.<g>.SOUND mastery < 0.6 (ED §3 regel 2). */
export function weakGraphemes(profile: Profile): string[] {
  return profile.unlockedGraphemes.filter((id) => masteryOf(profile, soundSkillFor(id)) < WEAK);
}

/** Aantal vrijgegeven grafemen met LK.SOUND ≥ 0.8. */
export function masteredGraphemeCount(profile: Profile): number {
  return profile.unlockedGraphemes.filter((id) => masteryOf(profile, soundSkillFor(id)) >= MASTERED).length;
}

/** True als minstens één vrijgegeven klinker LK.SOUND ≥ 0.8 heeft. */
function hasMasteredVowel(profile: Profile): boolean {
  return profile.unlockedGraphemes.some(
    (id) => isVowelGrapheme(id) && masteryOf(profile, soundSkillFor(id)) >= MASTERED,
  );
}

function anyRecognizeMastered(profile: Profile, threshold = 0.6): boolean {
  return profile.unlockedGraphemes.some((id) => masteryOf(profile, recognizeSkillFor(id)) >= threshold);
}

/**
 * True als een nieuw grafeem mag worden geïntroduceerd (ED §3):
 * 1. fase 2 is open (FN.FIRST_SOUND ≥ 0.8), en
 * 2. het vorige grafeem in volgorde is **beheerst** (isMastered: mastery ≥ 0.8,
 *    ≥ 12 items, consecutive ≥ 4, ≥ 2 sessies, EDU-025), en
 * 3. som zwakke grafemen ≤ 2, en
 * 4. deze sessie is er nog geen nieuw grafeem geïntroduceerd.
 *
 * De vierde voorwaarde leeft in GameState; geef hem optioneel mee.
 */
export function canIntroduceNewGrapheme(
  profile: Profile,
  options: { introducedGraphemeThisSession?: boolean } = {},
): boolean {
  if (options.introducedGraphemeThisSession === true) return false;
  const next = nextGraphemeToIntroduce(profile);
  if (!next) return false;
  // Eerste letters passen pas als fase 1 (fonemisch bewustzijn) op orde is.
  if (!phaseUnlocked(profile, 2)) return false;
  if (next.order <= 1) return true;
  const previous = graphemes.find((g) => g.order === next.order - 1);
  if (!previous) return true;
  if (!profile.unlockedGraphemes.includes(previous.id)) return false;
  if (!isMastered(profile.skills[soundSkillFor(previous.id)], MIN_MASTERY_ITEMS)) return false;
  if (weakGraphemes(profile).length > MAX_WEAK) return false;
  return true;
}

/** Het volgende grafeem in de volgorde dat nog niet is vrijgegeven. */
export function nextGraphemeToIntroduce(profile: Profile): Grapheme | undefined {
  const unlocked = new Set(profile.unlockedGraphemes);
  return graphemes.find((g) => !unlocked.has(g.id));
}

/**
 * Instapcriteria per fase (ED §3), uitgedrukt in mastery. Alleen fase 1 is
 * onvoorwaardelijk open. Onbekende/nog niet ontworpen fasen → false.
 */
const PHASE_ENTRY: Readonly<Record<number, (profile: Profile) => boolean>> = {
  2: (p) => masteryOf(p, 'FN.FIRST_SOUND') >= 0.8,
  3: (p) => anyRecognizeMastered(p, 0.6),
  4: (p) => masteredGraphemeCount(p) >= 3 && hasMasteredVowel(p),
  5: (p) => masteryOf(p, 'SY.CVC') >= 0.7,
  6: (p) => masteryOf(p, 'DE.CVC') >= 0.8,
  7: (p) => masteryOf(p, 'DE.CVC') >= 0.85,
  8: (p) => masteryOf(p, 'ZI.SIMPLE') >= 0.8,
  9: (p) => masteryOf(p, 'DE.CVC') >= 0.85,
};

/** True als het gebied/de fase open is op basis van mastery. */
export function phaseUnlocked(profile: Profile, phaseId: number): boolean {
  if (phaseId <= 1) return true;
  const rule = PHASE_ENTRY[phaseId];
  return rule ? rule(profile) : false;
}

/** Alle open fasen, in volgorde. */
export function unlockedPhases(profile: Profile): number[] {
  return phases.filter((phase) => phaseUnlocked(profile, phase.id)).map((phase) => phase.id);
}

export const THRESHOLDS = { MASTERED, WEAK, MAX_WEAK } as const;

/**
 * Status van één doel voor dashboard/UI (EDU-029): "Beheerst" alleen via de
 * volledige beheersingsdefinitie `isMastered` (ED §10.3), nooit op mastery
 * alleen.
 */
export type SkillStatus = 'mastered' | 'developing' | 'not_started';

export function skillStatus(
  profile: Profile,
  skillId: SkillId,
  minItems: number = MIN_MASTERY_ITEMS,
): SkillStatus {
  const state: SkillState | undefined = profile.skills[skillId];
  if (isMastered(state, minItems)) return 'mastered';
  if (state && (state.attempts > 0 || state.mastery > 0)) return 'developing';
  return 'not_started';
}

export { getGraphemesUpTo, getPhase };
