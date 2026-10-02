/**
 * Gedeelde helpers voor de activity-generatoren (learning/).
 * DOM-vrij. Alle woordkeuze loopt via de content-API + `isWordAllowed`, zodat
 * nooit niet-geleerde grafemen of geblokkeerde woorden voorkomen (ED §6.4).
 */
import type {
  ActivityItem,
  ActivityOption,
  AudioClip,
  Difficulty,
  Grapheme,
  Rng,
  Word,
} from '../types';
import {
  fbText,
  formatSoundSequence,
  getGrapheme,
  getWord,
  graphemes,
  isBlockedWord,
  isWordAllowed,
  words,
} from '../content';

/** Alle geïnventariseerde grafeem-IDs (fallback wanneer geen geleerde set is meegegeven). */
export const ALL_GRAPHEMES: ReadonlySet<string> = new Set(graphemes.map((g) => g.id));

/** Gebruikt de meegegeven geleerde set, anders de volledige inventaris. */
export function effectiveLearned(learned?: ReadonlySet<string>): ReadonlySet<string> {
  return learned ?? ALL_GRAPHEMES;
}

// ---------------------------------------------------------------------------
// Audio-clips
// ---------------------------------------------------------------------------

export function clip(key: string, src: string, kind: AudioClip['kind'], text?: string): AudioClip {
  const out: AudioClip = { key, src, kind };
  if (text !== undefined) out.text = text;
  return out;
}

export function feedbackClip(key: string): AudioClip {
  return { key, src: `audio/feedback/${key}.mp3`, text: fbText(key), kind: 'feedback' };
}

export function instructionClip(key: string, text: string): AudioClip {
  return { key, src: `audio/feedback/${key}.mp3`, text, kind: 'instruction' };
}

export function graphemeSoundClip(id: string): AudioClip {
  const existing = getGrapheme(id)?.audio?.sound;
  if (existing) return existing;
  const hint = getGrapheme(id)?.soundHint ?? id;
  return { key: `lk.${id}.sound`, src: `audio/graphemes/${id}_sound.mp3`, text: hint, kind: 'grapheme-sound' };
}

export function wordClip(word: string): AudioClip {
  const existing = getWord(word)?.audio;
  if (existing) return existing;
  return { key: `de.${word}`, src: `audio/words/${word}.mp3`, text: word, kind: 'word' };
}

/** Gerekte/gehakte klankreeks ("k … a … m") – altijd als opname (ED §13.1). */
export function blendClip(word: string): AudioClip {
  const w = getWord(word);
  const text = w ? formatSoundSequence(w.graphemes, 'speech') : word;
  return { key: `blend.${word}`, src: `audio/blends/${word}.mp3`, text, kind: 'blend' };
}

// ---------------------------------------------------------------------------
// Grafeem-verwantschap
// ---------------------------------------------------------------------------

function isVowelGrapheme(g: Grapheme): boolean {
  return g.type.startsWith('vowel') || g.type === 'diphthong';
}

/** Klassieke verwarringen (ED §10.5 niveau D). */
const CONFUSION_PAIRS: readonly (readonly [string, string])[] = [
  ['b', 'd'],
  ['b', 'p'],
  ['d', 'p'],
  ['m', 'n'],
  ['u', 'n'],
  ['o', 'oo'],
  ['a', 'aa'],
  ['e', 'ee'],
  ['ei', 'ij'],
  ['ou', 'au'],
  ['g', 'ch'],
  ['t', 'k'],
  ['m', 'r'],
  ['s', 'z'],
  ['v', 'f'],
];

/** Groepen die hetzelfde klinken: nooit twee als antwoordoptie (ED §5.3 note). */
const SAME_SOUND_GROUPS: readonly (readonly string[])[] = [
  ['ei', 'ij'],
  ['ou', 'au'],
  ['g', 'ch'],
];

export function commonConfusion(a: string, b: string): boolean {
  return CONFUSION_PAIRS.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
}

/** True als twee grafemen (vrijwel) dezelfde klank hebben → nooit beide tonen. */
export function hasSameSound(a: string, b: string): boolean {
  if (a === b) return true;
  const ga = getGrapheme(a);
  const gb = getGrapheme(b);
  if (ga && gb && ga.soundHint && gb.soundHint && ga.soundHint === gb.soundHint) return true;
  return SAME_SOUND_GROUPS.some((group) => group.includes(a) && group.includes(b));
}

function graphemeScore(target: Grapheme, candidate: Grapheme, difficulty: Difficulty): number {
  const diffClass = isVowelGrapheme(target) !== isVowelGrapheme(candidate);
  const sameType = target.type === candidate.type;
  const confusion = commonConfusion(target.id, candidate.id);
  switch (difficulty) {
    case 'A':
      return diffClass ? 0 : 1;
    case 'B':
      return diffClass ? 1 : 0;
    case 'C':
      return sameType ? 0 : 1;
    case 'D':
      return confusion ? 0 : sameType ? 1 : 2;
    default:
      return 0;
  }
}

/**
 * Afleiders voor een grafeem, gesorteerd op afstandsniveau (ED §10.5).
 *
 * `allowUnlearnedAuditory` (QA-R2-001 / EDU-R2-001): alleen toegestaan voor
 * **grafeem→klank**-taken. Als er nog geen tweede geleerd grafeem is (de
 * allereerste letter), mogen maximale-afstand-afleiders uit de volledige
 * inventaris worden gebruikt. Die worden als **audio-only klankknop** getoond
 * (geen letter in beeld) en gelden als auditieve discriminatie, de expliciete
 * uitzondering uit ED §6.2 regel 8. Geleerde afleiders krijgen altijd voorrang
 * (ED §10.5 regel 2).
 */
export function pickGraphemeDistractors(
  targetId: string,
  learned: ReadonlySet<string>,
  difficulty: Difficulty,
  count: number,
  rng: Rng,
  allowUnlearnedAuditory = false,
): Grapheme[] {
  const target = getGrapheme(targetId);
  if (!target) return [];
  const chosen: Grapheme[] = [];
  const pickFrom = (pool: readonly Grapheme[], need: number): void => {
    const scored = pool.map((g) => ({ g, score: graphemeScore(target, g, difficulty), r: rng() }));
    scored.sort((a, b) => a.score - b.score || a.r - b.r);
    for (const candidate of scored) {
      if (chosen.length >= Math.max(0, count) || need <= 0) break;
      // Nooit twee opties die hetzelfde klinken (voorkomt dubbel-juiste knoppen).
      if (chosen.some((c) => hasSameSound(c.id, candidate.g.id))) continue;
      chosen.push(candidate.g);
      need -= 1;
    }
  };
  const learnedPool = graphemes.filter(
    (g) => learned.has(g.id) && g.id !== targetId && !hasSameSound(targetId, g.id),
  );
  pickFrom(learnedPool, count);
  if (chosen.length < count && allowUnlearnedAuditory) {
    const extraPool = graphemes.filter(
      (g) => !learned.has(g.id) && g.id !== targetId && !hasSameSound(targetId, g.id),
    );
    pickFrom(extraPool, count - chosen.length);
  }
  return chosen;
}

// ---------------------------------------------------------------------------
// Woord-verwantschap
// ---------------------------------------------------------------------------

/** Grafeem-afstand (aantal posities dat verschilt + lengteverschil). */
export function wordDistance(a: Word, b: Word): number {
  const lengthDiff = Math.abs(a.graphemes.length - b.graphemes.length);
  const shared = Math.min(a.graphemes.length, b.graphemes.length);
  let diff = lengthDiff;
  for (let i = 0; i < shared; i++) {
    if (a.graphemes[i] !== b.graphemes[i]) diff += 1;
  }
  return diff;
}

/**
 * Alle toegestane woorden (content) voor een geleerde grafeem-set.
 *
 * Net als `content.wordsForGraphemes` worden niet-kindvriendelijke woorden
 * (`kidFriendly:false`) uitgesloten, zodat ze nooit als doel- of afleiderwoord
 * in generatoren/planner kunnen opduiken (EDU-016 / EDU-R2-002 / QA-R2-004).
 * De optionele `pool` is injecteerbaar voor tests.
 */
export function allowedWordObjects(
  learned: ReadonlySet<string>,
  pool: readonly Word[] = words,
): Word[] {
  return pool.filter((w) => w.kidFriendly && !isBlockedWord(w.word) && isWordAllowed(w.word, learned));
}

/** Alleen de woordteksten (gemak voor generatoren). */
export function allowedWords(learned: ReadonlySet<string>, pool: readonly Word[] = words): string[] {
  return allowedWordObjects(learned, pool).map((w) => w.word);
}

/**
 * Afleider-woorden op basis van woordafstand (ED §10.5): niveau A/B zoekt
 * maximaal verschil, C/D minimale paren. Alleen toegestane woorden.
 *
 * ED §11 regel 6: de afleiders hebben dezelfde lengte als het doelwoord
 * (zelfde aantal grafemen), zodat lengte het antwoord niet verraadt. Als er
 * onvoldoende even lange kandidaten zijn, blijven we bij even lange kandidaten
 * (liever een optie minder dan een lengte-hint).
 */
export function pickWordDistractors(
  target: Word,
  pool: readonly Word[],
  difficulty: Difficulty,
  count: number,
  rng: Rng,
): Word[] {
  const others = pool.filter((w) => w.word !== target.word);
  const sameLength = others.filter((w) => w.graphemes.length === target.graphemes.length);
  const candidates = sameLength;
  const scored = candidates.map((w) => ({
    w,
    r: rng(),
    distance: wordDistance(target, w),
  }));
  const preferDifferent = difficulty === 'A' || difficulty === 'B';
  scored.sort((a, b) => {
    const primary = preferDifferent ? b.distance - a.distance : a.distance - b.distance;
    if (primary !== 0) return primary;
    return a.r - b.r;
  });
  return scored.slice(0, Math.max(0, count)).map((s) => s.w);
}

// ---------------------------------------------------------------------------
// Opties plaatsen (positie willekeurig, nooit 3× dezelfde op rij, ED §10.5-6)
// ---------------------------------------------------------------------------

export interface OptionSpec {
  id: string;
  label?: string;
  audio?: AudioClip;
  image?: string;
}

/**
 * Kiest een index voor het juiste antwoord. De correcte index wordt
 * gelijkmatig over de posities verdeeld (geen positie-patroon, ED §10.5 regel
 * 6) en nooit 3× achter elkaar dezelfde positie.
 */
export function chooseCorrectIndex(n: number, rng: Rng, avoid: readonly number[] = []): number {
  if (n <= 0) return 0;
  if (n === 1) return 0;
  const lastTwo = new Set(avoid.slice(-2));
  const windowSize = Math.max(n, Math.min(avoid.length, n * 2));
  const recent = avoid.slice(-windowSize);
  const counts = new Array<number>(n).fill(0);
  for (const index of recent) {
    if (index >= 0 && index < n) counts[index] = (counts[index] ?? 0) + 1;
  }
  let best = Number.POSITIVE_INFINITY;
  const candidates: number[] = [];
  for (let i = 0; i < n; i++) {
    if (lastTwo.has(i)) continue;
    const count = counts[i] ?? 0;
    if (count < best) {
      best = count;
      candidates.length = 0;
      candidates.push(i);
    } else if (count === best) {
      candidates.push(i);
    }
  }
  if (candidates.length === 0) {
    for (let i = 0; i < n; i++) candidates.push(i);
  }
  const pick = Math.floor(rng() * candidates.length);
  return candidates[pick] ?? 0;
}

export function placeOptions(
  correct: OptionSpec,
  distractors: readonly OptionSpec[],
  rng: Rng,
  avoid: readonly number[] = [],
): { options: ActivityOption[]; targetId: string } {
  const shuffled = shuffleArray(rng, distractors);
  const correctIndex = chooseCorrectIndex(shuffled.length + 1, rng, avoid);
  const options: ActivityOption[] = [];
  let d = 0;
  for (let i = 0; i < shuffled.length + 1; i++) {
    if (i === correctIndex) {
      options.push(toOption(correct, true));
    } else {
      const distractor = shuffled[d];
      d += 1;
      if (distractor) options.push(toOption(distractor, false));
    }
  }
  return { options, targetId: correct.id };
}

function toOption(spec: OptionSpec, correct: boolean): ActivityOption {
  const option: ActivityOption = { id: spec.id, correct };
  if (spec.label !== undefined) option.label = spec.label;
  if (spec.audio !== undefined) option.audio = spec.audio;
  if (spec.image !== undefined) option.image = spec.image;
  return option;
}

/** Lokale Fisher-Yates (vermijdt een extra afhankelijkheid in de helper). */
function shuffleArray<T>(rng: Rng, items: readonly T[]): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const a = out[i];
    const b = out[j];
    if (a === undefined || b === undefined) continue;
    out[i] = b;
    out[j] = a;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Feedback-metadata
// ---------------------------------------------------------------------------

/** Escalatieladder per item (GD §5): correct / 1e fout / hint / modeling. */
export interface ItemFeedback {
  correct: string;
  try1: string;
  hint: string;
  model: string;
  /** Optionele foutspecifieke 1e-poging-feedback per optie-id. */
  try1ByOption?: Record<string, string>;
}

export function feedbackMeta(fb: ItemFeedback): Record<string, unknown> {
  const out: Record<string, unknown> = { feedback: fb };
  return out;
}

export function getItemFeedback(item: ActivityItem): ItemFeedback | undefined {
  const raw = item.metadata?.['feedback'];
  if (typeof raw !== 'object' || raw === null) return undefined;
  const value = raw as Partial<ItemFeedback>;
  if (
    typeof value.correct !== 'string' ||
    typeof value.try1 !== 'string' ||
    typeof value.hint !== 'string' ||
    typeof value.model !== 'string'
  ) {
    return undefined;
  }
  const out: ItemFeedback = {
    correct: value.correct,
    try1: value.try1,
    hint: value.hint,
    model: value.model,
  };
  if (value.try1ByOption && typeof value.try1ByOption === 'object') {
    out.try1ByOption = value.try1ByOption;
  }
  return out;
}

/** Metadata met woord-/grafeemdetails voor de UI (o.a. post-answer reveal). */
export function wordMetadata(word: string, extra: Record<string, unknown> = {}): Record<string, unknown> {
  const w = getWord(word);
  const meta: Record<string, unknown> = { word, ...extra };
  if (w) {
    meta['graphemes'] = w.graphemes;
    meta['pattern'] = w.pattern;
    if (w.image) meta['revealImage'] = w.image;
  }
  return meta;
}

/**
 * Vult `{placeholder}`-variabelen in een template (EDU-006). Puur, zodat het
 * los van de content getest kan worden.
 */
export function applyFeedbackVars(template: string, vars?: Record<string, string>): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) => vars[name] ?? match);
}

/**
 * Vult `{placeholder}`-variabelen in een feedbacktekst (EDU-006). F3 gebruikt
 * dit om `feedbackKey` + `feedbackVars` als spreekbare tekst/aria weer te geven.
 */
export function formatFeedbackText(key: string, vars?: Record<string, string>): string {
  return applyFeedbackVars(fbText(key), vars);
}

/**
 * Een item is gescoord als het minstens twee opties heeft en niet expliciet als
 * ongescoord is gemarkeerd (kennismaking/modeling, EDU-004).
 */
export function isScoredActivityItem(item: Pick<ActivityItem, 'options' | 'metadata'>): boolean {
  if (item.metadata?.['scored'] === false) return false;
  return item.options.length >= 2;
}

/** Metadata dat een item ongescoord (kennismaking/modeling) markeert. */
export function unscoredMetadata(extra: Record<string, unknown> = {}): Record<string, unknown> {
  return { scored: false, ...extra };
}

let itemCounter = 0;

/** Deterministische, unieke item-id (seed-afhankelijk). */
export function itemId(kind: string, key: string, rng: Rng): string {
  itemCounter += 1;
  const suffix = Math.floor(rng() * 1e9).toString(36);
  return `${kind}.${key}.${itemCounter.toString(36)}${suffix}`;
}
