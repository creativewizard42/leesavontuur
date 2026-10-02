/**
 * Dynamische clip-opbouw (EDU-R2-002/EDU-R2-007).
 *
 * Instructies en foutspecifieke feedback bevatten `{placeholders}` die per
 * item verschillen (`{sound}`, `{word}`, `{letter}`, `{count}`). Een echte
 * opname kan geen placeholder inspreken, dus genereren we per variabele een
 * concrete clip (`instr.fn.first_sound.m`, `instr.ph.rhyme.raam`, …).
 *
 * `instructionClips(key, vars)` is de runtime-API voor de UI: het levert een
 * **sequentie** van clips (hier één concrete clip) die samen de volledige
 * opdracht uitspreken. Bestaat er een concrete opname, dan wordt die gebruikt;
 * anders valt de clip terug op de (al ingevulde) tekst voor TTS/aria.
 *
 * `docs/RECORDINGS.md` mag daarom nooit meer een letterlijke `{placeholder}`
 * bevatten: de generieke templates met placeholders komen niet in de manifest,
 * alleen hun concrete varianten (zie `instructionVariantClips` /
 * `feedbackVariantClips`).
 */
import type { AudioClip, Word } from '../types';
import { GRAPHEMES, getGraphemeById, isVowelType } from './graphemes';
import { WORDS } from './words';
import { RHYME_GROUPS, SYLLABLE_WORDS } from './phonology';
import { INSTRUCTIONS, resolveInstructionKey, hasPlaceholders } from './instructions';
import { FEEDBACK } from './feedback';
import { formatSoundSequence } from './soundSequence';

function getWord(word: string): Word | undefined {
  return WORDS.find((w) => w.word === word);
}

function soundOf(id: string): string {
  return getGraphemeById(id)?.soundHint ?? id;
}

function lettersOf(id: string): string {
  return getGraphemeById(id)?.letters ?? id;
}

const GRAPHEME_IDS: readonly string[] = GRAPHEMES.map((g) => g.id);
const VOWEL_GRAPHEME_IDS: readonly string[] = GRAPHEMES.filter((g) => isVowelType(g.type)).map((g) => g.id);
const CONSONANT_GRAPHEME_IDS: readonly string[] = GRAPHEMES.filter((g) => !isVowelType(g.type)).map((g) => g.id);
const ALL_WORD_IDS: readonly string[] = WORDS.map((w) => w.word);
const SYLLABLE_IDS: readonly string[] = SYLLABLE_WORDS.map((s) => s.word);
const RHYME_IDS: readonly string[] = [...new Set(RHYME_GROUPS.flat())];

function clipFor(key: string, text: string, kind: AudioClip['kind'] = 'instruction'): AudioClip {
  return { key, src: `audio/feedback/${key}.mp3`, text, kind };
}

interface VariantSpec {
  base: string;
  values: readonly string[];
  text: (value: string) => string;
}

/** Concrete instructievarianten per (instructie × grafeem/woord). */
const INSTRUCTION_VARIANTS: readonly VariantSpec[] = [
  {
    base: 'instr.fn.first_sound',
    values: GRAPHEME_IDS,
    text: (id) => `Welk woord begint met ${soundOf(id)}?`,
  },
  {
    base: 'instr.fn.last_sound',
    values: GRAPHEME_IDS,
    text: (id) => `Welk woord eindigt op ${soundOf(id)}?`,
  },
  {
    base: 'instr.klankjager.first',
    values: GRAPHEME_IDS,
    text: (id) => `Welk woord begint met ${soundOf(id)}?`,
  },
  {
    base: 'instr.klankjager.last',
    values: GRAPHEME_IDS,
    text: (id) => `Welk woord eindigt op ${soundOf(id)}?`,
  },
  {
    base: 'instr.lk.sound_to_grapheme',
    values: GRAPHEME_IDS,
    text: (id) => `Welke letter hoort bij ${soundOf(id)}?`,
  },
  {
    base: 'instr.letterklank.r2',
    values: GRAPHEME_IDS,
    text: (id) => `Welke letter hoort bij ${soundOf(id)}?`,
  },
  {
    base: 'instr.lk.intro',
    values: GRAPHEME_IDS,
    text: (id) => `Dit is de letter ${lettersOf(id)}. Hij zegt ${soundOf(id)}.`,
  },
  { base: 'instr.klim', values: ALL_WORD_IDS, text: (w) => `Klim naar ${w}.` },
  { base: 'instr.klimboom', values: ALL_WORD_IDS, text: (w) => `Klim naar ${w}.` },
  {
    base: 'instr.ph.syllable',
    values: SYLLABLE_IDS,
    text: (w) => `Hoeveel klappen hoor je in ${w}?`,
  },
  { base: 'instr.ph.rhyme', values: RHYME_IDS, text: (w) => `Wat rijmt op ${w}?` },
];

/** Concrete foutspecifieke feedbackvarianten (EDU-006). */
const FEEDBACK_VARIANTS: readonly VariantSpec[] = [
  {
    base: 'fb.specific.first_sound',
    values: GRAPHEME_IDS,
    text: (id) => `Bijna! Luister naar het begin: ${soundOf(id)}…`,
  },
  {
    base: 'fb.specific.last_sound',
    values: GRAPHEME_IDS,
    text: (id) => `Bijna! Luister naar het laatste stukje: ${soundOf(id)}…`,
  },
  {
    base: 'fb.specific.middle_sound',
    values: VOWEL_GRAPHEME_IDS,
    text: (id) => `Luister naar het midden: ${soundOf(id)}… Welke klinker hoor je?`,
  },
  {
    base: 'fb.specific.middle_consonant',
    values: CONSONANT_GRAPHEME_IDS,
    text: (id) => `Luister naar het midden: ${soundOf(id)}…`,
  },
  {
    base: 'fb.specific.letter_sound',
    values: GRAPHEME_IDS,
    text: (id) => `Deze letter zegt ${soundOf(id)}. Probeer het nog eens.`,
  },
  {
    base: 'fb.specific.order',
    values: ALL_WORD_IDS,
    text: (w) => `We lezen van links naar rechts: ${w}. Probeer het nog eens.`,
  },
  {
    base: 'fb.specific.blend_retry',
    values: ALL_WORD_IDS,
    text: (w) => {
      const word = getWord(w);
      const sequence = word ? formatSoundSequence(word.graphemes, 'speech') : w;
      const template =
        FEEDBACK['fb.specific.blend_retry'] ??
        'Luister nog eens: {sounds}. Kun jij ze samenplakken?';
      return template.replace('{sounds}', sequence);
    },
  },
  {
    base: 'fb.specific.count',
    values: ['2', '3', '4', '5'],
    text: (n) => `Je telde ${n}. Tel nog eens mee: hoeveel klanken hoor je?`,
  },
];

function variantClips(specs: readonly VariantSpec[], kind: AudioClip['kind']): AudioClip[] {
  const out: AudioClip[] = [];
  for (const spec of specs) {
    for (const value of spec.values) {
      out.push(clipFor(`${spec.base}.${value}`, spec.text(value), kind));
    }
  }
  return out;
}

function variantKeys(specs: readonly VariantSpec[], base: string): string[] {
  const spec = specs.find((s) => s.base === base);
  return spec ? spec.values.map((v) => `${spec.base}.${v}`) : [];
}

/** Alle concrete instructieclips voor de manifest (geen placeholders). */
export function instructionVariantClips(): AudioClip[] {
  return variantClips(INSTRUCTION_VARIANTS, 'instruction');
}

/** Alle concrete feedbackclips voor de manifest (geen placeholders). */
export function feedbackVariantClips(): AudioClip[] {
  return variantClips(FEEDBACK_VARIANTS, 'feedback');
}

/** Snelle lookup van bestaande concrete feedback-variantkeys (SEC-R3-005). */
const FEEDBACK_VARIANT_KEY_SET: ReadonlySet<string> = new Set(
  feedbackVariantClips().map((clip) => clip.key),
);

/**
 * Concrete sleutels die een dynamische instructie-key in de manifest moet
 * hebben (validator eist dit per variabele, EDU-R2-002).
 */
export function instructionVariantKeys(base: string): string[] {
  const keys = variantKeys(INSTRUCTION_VARIANTS, base);
  return keys.length > 0 ? keys : variantKeys(FEEDBACK_VARIANTS, base);
}

/** Primair variabel placeholdernaam per instructie-key (bepaalt de variant-sleutel). */
const PRIMARY_VAR: Readonly<Record<string, string>> = {
  'instr.fn.first_sound': 'sound',
  'instr.fn.last_sound': 'sound',
  'instr.klankjager.first': 'klank',
  'instr.klankjager.last': 'klank',
  'instr.lk.sound_to_grapheme': 'sound',
  'instr.letterklank.r2': 'klank',
  'instr.lk.intro': 'letter',
  'instr.klimboom': 'woord',
  'instr.klankjager.candidates': 'woorden',
  'instr.woordlezen.reveal': 'woord',
  'instr.ph.syllable': 'word',
  'instr.ph.rhyme': 'word',
};

const GRAPHEME_VARS: ReadonlySet<string> = new Set(['sound', 'klank', 'letter']);

/** Zet een variabele om naar een grafeem-id (accepteert id, letters of klankhint). */
function resolveGraphemeId(value: string): string {
  if (getGraphemeById(value)) return value;
  const match = GRAPHEMES.find((g) => g.soundHint === value || g.letters === value);
  return match?.id ?? value;
}

/** Spreekbare waarde voor een placeholder (klanken zonder sjwa, letters, woorden). */
function spokenValue(name: string, value: string): string {
  if (name === 'sound' || name === 'klank') return soundOf(resolveGraphemeId(value));
  if (name === 'letter') return lettersOf(resolveGraphemeId(value));
  return value;
}

function fillTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in vars ? spokenValue(name, vars[name] as string) : match,
  );
}

/**
 * Bouwt de afspeelsequentie voor een (mogelijk dynamische) instructie-key.
 *
 * - Vaste instructie → één clip met die key.
 * - Dynamische instructie → één concrete clip per variabele
 *   (`instr.fn.first_sound.m`), met de al ingevulde tekst als TTS/aria-fallback.
 * - Onbekende key → lege sequentie.
 */
export function instructionClips(key: string, vars: Record<string, string> = {}): AudioClip[] {
  const direct = INSTRUCTIONS[key];

  // Dynamische pattern-key (bv. `instr.klim.kam`): de key is al concreet.
  if (direct === undefined) {
    const dynamic = resolveInstructionKey(key);
    if (!dynamic) return [];
    const template = INSTRUCTIONS[dynamic.template];
    if (template === undefined) return [];
    const merged = { ...dynamic.vars, ...vars };
    return [clipFor(key, fillTemplate(template, merged))];
  }

  if (!hasPlaceholders(direct)) return [clipFor(key, direct)];

  const primary = PRIMARY_VAR[key];
  const raw = primary ? vars[primary] : undefined;
  const effective: Record<string, string> = { ...vars };
  const graphemeId =
    primary !== undefined && GRAPHEME_VARS.has(primary) && raw !== undefined
      ? resolveGraphemeId(raw)
      : undefined;
  if (graphemeId !== undefined) {
    for (const name of ['sound', 'klank', 'letter']) {
      if (!(name in effective)) effective[name] = graphemeId;
    }
  }
  const text = fillTemplate(direct, effective);
  if (raw === undefined || primary === undefined) return [clipFor(key, text)];
  const slug = GRAPHEME_VARS.has(primary) ? resolveGraphemeId(raw) : raw;
  return [clipFor(`${key}.${slug}`, text)];
}

/** Primair variabel placeholdernaam per foutspecifieke feedback-key. */
const FEEDBACK_PRIMARY_VAR: Readonly<Record<string, string>> = {
  'fb.specific.first_sound': 'sound',
  'fb.specific.last_sound': 'sound',
  'fb.specific.middle_sound': 'sound',
  'fb.specific.middle_consonant': 'sound',
  'fb.specific.letter_sound': 'sound',
  'fb.specific.order': 'word',
  'fb.specific.letter_confusion': 'letter',
  'fb.specific.blend_retry': 'word',
  'fb.specific.count': 'count',
};

/**
 * Bouwt de afspeelreeks voor een feedback-key (EDU-R3-002). Net als bij
 * instructies levert dit één concrete clip (`fb.specific.first_sound.m`) met de
 * al ingevulde tekst als TTS/aria-fallback. Zo wordt elke feedbackzin ook
 * daadwerkelijk uitgesproken en verschijnt er nooit een `{placeholder}` in
 * beeld. De concrete key wordt alleen gebruikt als hij echt in de manifest
 * bestaat (SEC-R3-005); anders blijft de basiskey met ingevulde tekst staan.
 */
export function feedbackClips(key: string, vars: Record<string, string> = {}): AudioClip[] {
  const template = FEEDBACK[key];
  if (template === undefined) return [];
  if (!hasPlaceholders(template)) return [clipFor(key, template, 'feedback')];

  const primary = FEEDBACK_PRIMARY_VAR[key];
  const raw = primary ? vars[primary] : undefined;
  const effective: Record<string, string> = { ...vars };
  const graphemeId =
    primary !== undefined && GRAPHEME_VARS.has(primary) && raw !== undefined
      ? resolveGraphemeId(raw)
      : undefined;
  if (graphemeId !== undefined) {
    for (const name of ['sound', 'klank', 'letter']) {
      if (!(name in effective)) effective[name] = graphemeId;
    }
  }
  const text = fillTemplate(template, effective);
  if (primary === undefined || raw === undefined) return [clipFor(key, text, 'feedback')];
  const slug = GRAPHEME_VARS.has(primary) ? resolveGraphemeId(raw) : raw;
  const concrete = `${key}.${slug}`;
  return [clipFor(FEEDBACK_VARIANT_KEY_SET.has(concrete) ? concrete : key, text, 'feedback')];
}
