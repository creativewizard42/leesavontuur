/**
 * Spaced repetition (Leitner) per item-skill, ED §10.4 / ARCHITECTURE §4.4.
 * DOM-vrij.
 */
import type { AnswerEvent, ItemKey, ItemState, Profile, SkillId } from '../types';

/** Interval in sessies per box (index 1..5; index 0 ongebruikt). */
export const LEITNER_INTERVALS: readonly number[] = [0, 1, 2, 4, 8, 16];

export const MAX_BOX = 5;
export const MASTERED_BOX = 3;

function clampBox(box: number): number {
  if (!Number.isFinite(box)) return 1;
  return Math.min(MAX_BOX, Math.max(1, Math.floor(box)));
}

/** Interval (in sessies) voor een box. */
export function intervalFor(box: number): number {
  return LEITNER_INTERVALS[clampBox(box)] ?? 1;
}

/** True als een item in deze sessie herhaald moet worden. */
export function isDue(box: number, currentSession: number, lastSeenSession: number): boolean {
  return currentSession - lastSeenSession >= intervalFor(box);
}

export function isItemDue(item: ItemState, sessionNo: number): boolean {
  return isDue(item.leitnerBox, sessionNo, item.lastSeenSession);
}

/** Promotie bij correct 1e poging zonder hint (ED §10.4). */
export function promote(box: number): number {
  return Math.min(MAX_BOX, clampBox(box) + 1);
}

/**
 * Degradatie bij fout/niet-bevorderend item.
 * Box 3 heeft een speciale route: s = 0.5 (correct bij 2e poging) → box 2,
 * anders → box 1.
 */
export function degrade(box: number, itemScore: number): number {
  const b = clampBox(box);
  switch (b) {
    case 1:
      return 1;
    case 2:
      return 1;
    case 3:
      return itemScore >= 0.5 ? 2 : 1;
    case 4:
    case 5:
      return 2;
    default:
      return 1;
  }
}

/** Verse ItemState (box 1, nooit gezien). */
export function createItemState(itemKey: ItemKey, skillId: SkillId): ItemState {
  return { itemKey, skillId, leitnerBox: 1, lastSeenSession: 0, consecutiveCorrect: 0 };
}

/** True als dit event de box bevordert (correct 1e poging, geen hint/modeling). */
function isPromoting(event: AnswerEvent): boolean {
  return !event.isGuess && event.correct && event.attempt <= 1 && !event.usedHint && !event.modeled;
}

/**
 * Leidt de nieuwe Leitner-toestand af uit één event.
 * Gok- en niet-terminale events laten de toestand onveranderd.
 */
export function updateItemState(prev: ItemState, event: AnswerEvent, sessionNo: number): ItemState {
  if (event.isGuess) return prev;
  if (!event.correct && !event.modeled) return prev;
  const promoting = isPromoting(event);
  const leitnerBox = promoting ? promote(prev.leitnerBox) : degrade(prev.leitnerBox, event.itemScore);
  const consecutiveCorrect = promoting ? prev.consecutiveCorrect + 1 : 0;
  return { ...prev, leitnerBox, lastSeenSession: sessionNo, consecutiveCorrect };
}

/**
 * Alle items die deze sessie herhaald moeten worden, zwakste box eerst
 * (laagste box = kortste interval = eerst herhalen).
 */
export function selectDueSkills(profile: Profile, sessionNo: number): ItemState[] {
  return Object.values(profile.items)
    .filter((item) => isItemDue(item, sessionNo))
    .sort(
      (a, b) =>
        a.leitnerBox - b.leitnerBox ||
        a.lastSeenSession - b.lastSeenSession ||
        a.itemKey.localeCompare(b.itemKey),
    );
}

/** Alleen de itemKeys van de due items (gemakkelijke consumptie). */
export function dueItemKeys(profile: Profile, sessionNo: number): ItemKey[] {
  return selectDueSkills(profile, sessionNo).map((item) => item.itemKey);
}

/**
 * "Vast gemeesterd" (ED §10.4 slotnoot): ≥ 80% van de items van dit doel
 * staat in box ≥ 3. Zonder items → false.
 */
export function isSolidlyMastered(profile: Profile, skillId: SkillId, ratio = 0.8): boolean {
  const items = Object.values(profile.items).filter((item) => item.skillId === skillId);
  if (items.length === 0) return false;
  const inHighBox = items.filter((item) => item.leitnerBox >= MASTERED_BOX).length;
  return inHighBox / items.length >= ratio;
}

/** True als een "gemeesterd" doel is teruggevallen (ED §10.3 "terugval"). */
export function hasRegressed(mastery: number, threshold = 0.65): boolean {
  return mastery < threshold;
}
