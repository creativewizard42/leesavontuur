/**
 * Fonemisch bewustzijn: FN.FIRST_SOUND, FN.LAST_SOUND (ED §2.2).
 * Auditief, geen geschreven woord in beeld (ED §11.3).
 *
 * EDU-005: elke kandidaat heeft eigen audio en het item markeert expliciet een
 * luisterstap vóór de keuzestap (`metadata.interaction`), zodat de UI op touch
 * eerst alle kandidaten afspeelt en pas daarna laat kiezen. Er is nooit meer dan
 * één juiste optie (afleiders hebben een andere relevante klank).
 * DOM-vrij.
 */
import type { ActivityItem, Difficulty, Rng, Word } from '../types';
import { getGrapheme, getWord, isBlockedWord, isWordAllowed } from '../content';
import {
  feedbackMeta,
  instructionClip,
  itemId,
  placeOptions,
  wordClip,
  wordMetadata,
  type OptionSpec,
} from './util';

export interface FirstSoundOptions {
  skillId: string;
  difficulty: Difficulty;
  count: number;
  /** Beschikbare woorden (uit content, alleen geleerde grafemen). */
  availableWords: readonly string[];
  rng: Rng;
  /** Vrijgegeven grafemen; filtert woorden via isWordAllowed (ED §6.4). */
  learned?: ReadonlySet<string>;
  /**
   * Puur auditieve oefening (fase 1): woorden mogen niet-geleerde grafemen
   * bevatten (ED §6.2 regel 8 / §5.3). De woordenlijst blijft kindvriendelijk.
   */
  auditory?: boolean;
  auditoryWords?: readonly string[];
  /**
   * QA-R3-001: maximaal aantal afleiders (default 2). Zolang de fase-2-poort
   * dicht is, gebruiken we 1 afleider (2 opties) zodat een zwakkere leerling via
   * vereenvoudiging beheersing kan bereiken.
   */
  maxDistractors?: number;
  /** Posities van het juiste antwoord in recente items (nooit 3× op rij). */
  avoidCorrectIndices?: readonly number[];
}

/**
 * Auditieve woorden voor fase 1; los van de vrijgegeven grafemen (ED §6.2
 * regel 8). Kort, kindvriendelijk, met duidelijke eerste/laatste klank.
 */
export const DEFAULT_AUDITORY_WORDS: readonly string[] = [
  'maan',
  'as',
  'vis',
  'kat',
  'mat',
  'tas',
  'soep',
  'raam',
  'mus',
  'bus',
  'kip',
  'zon',
];

function relevantGrapheme(word: Word, last: boolean): string | undefined {
  return last ? word.graphemes[word.graphemes.length - 1] : word.graphemes[0];
}

export function generate(options: FirstSoundOptions): ActivityItem[] {
  const { skillId, difficulty, count, rng } = options;
  const last = skillId === 'FN.LAST_SOUND';
  const learned = options.learned ?? new Set(options.availableWords.flatMap((w) => getWord(w)?.graphemes ?? []));
  const auditief = options.auditory === true;
  const source = auditief ? (options.auditoryWords ?? DEFAULT_AUDITORY_WORDS) : options.availableWords;
  const pool = source
    .filter((w) => !isBlockedWord(w))
    .filter((w) => auditief || isWordAllowed(w, learned))
    .map((w) => getWord(w))
    .filter((w): w is Word => w !== undefined && w.graphemes.length > 0);

  if (pool.length < 2 || count <= 0) return [];

  const remaining = pool.slice();
  const items: ActivityItem[] = [];
  const avoid = [...(options.avoidCorrectIndices ?? [])];

  for (let i = 0; i < count && remaining.length >= 1; i++) {
    const pickIndex = Math.floor(rng() * remaining.length);
    const [target] = remaining.splice(pickIndex < remaining.length ? pickIndex : 0, 1);
    if (!target) break;

    const targetGrapheme = relevantGrapheme(target, last);
    if (!targetGrapheme) continue;
    const targetSound = getGrapheme(targetGrapheme)?.soundHint ?? targetGrapheme;

    // Afleiders: andere relevante klank (nooit dubbel-juist) en bij voorkeur
    // even lang (ED §11 regel 6). Liever één optie dan een dubbel-juiste knop.
    const distinctSound = remaining.filter((w) => relevantGrapheme(w, last) !== targetGrapheme);
    const sameLength = distinctSound.filter((w) => w.graphemes.length === target.graphemes.length);
    const usable = sameLength.length >= 1 ? sameLength : distinctSound;
    const maxDistractors = Math.max(1, options.maxDistractors ?? 2);
    const distractors = pickDistinct(usable, Math.max(1, Math.min(maxDistractors, usable.length)), rng);

    const correct: OptionSpec = { id: target.word, audio: wordClip(target.word) };
    const distractorSpecs: OptionSpec[] = distractors.map((w) => ({ id: w.word, audio: wordClip(w.word) }));

    const { options: placed, targetId } = placeOptions(correct, distractorSpecs, rng, avoid);
    const correctIndex = placed.findIndex((o) => o.id === targetId);
    if (correctIndex >= 0) avoid.push(correctIndex);

    const text = last
      ? `Welk woord eindigt op ${targetSound}?`
      : `Welk woord begint met ${targetSound}?`;
    // EDU-R3-005: zet meteen de concrete variantkey (geen generieke template
    // met placeholder in `prompt.audio`), zodat de fallback-clip naar een
    // bestaand manifestpad wijst.
    const instructionKey = `${last ? 'instr.fn.last_sound' : 'instr.fn.first_sound'}.${targetGrapheme}`;

    items.push({
      id: itemId('klankjager', `${skillId}.${target.word}`, rng),
      skillId,
      kind: 'klankjager',
      prompt: {
        audio: instructionClip(instructionKey, text),
        text,
        showText: false,
      },
      options: placed,
      targetId,
      difficulty,
      isRetry: false,
      itemKey: target.word,
      metadata: {
        ...feedbackMeta({
          correct: 'fb.correct.6',
          try1: 'fb.try1.2',
          hint: 'fb.hint.4',
          model: 'fb.model.3',
        }),
        ...wordMetadata(target.word, { targetGrapheme, task: last ? 'last-sound' : 'first-sound' }),
        // EDU-005: expliciete luisterstap vóór de keuzestap; elke optie heeft audio.
        interaction: 'listen-then-choose',
        listenFirst: true,
        candidateIds: placed.map((o) => o.id),
        auditory: auditief,
        scored: placed.length >= 2,
      },
    });
  }

  return items;
}

function pickDistinct(pool: readonly Word[], count: number, rng: Rng): Word[] {
  const copy = pool.slice();
  const out: Word[] = [];
  const n = Math.min(count, copy.length);
  for (let i = 0; i < n; i++) {
    const idx = Math.floor(rng() * copy.length);
    const [value] = copy.splice(idx < copy.length ? idx : 0, 1);
    if (value) out.push(value);
  }
  return out;
}
