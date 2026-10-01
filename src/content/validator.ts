import type {
  AudioClip,
  ContentBundle,
  Grapheme,
  ValidationIssue,
  ValidationResult,
  Word,
} from '../types';
import { GRAPHEMES, isVowelType } from './graphemes';
import { WORDS } from './words';
import { SIGHT_WORDS } from './sightWords';
import { SENTENCES } from './sentences';
import { FEEDBACK } from './feedback';
import { UI_TEXTS } from './uiTexts';
import { isBlockedWord } from './blocklist';

export const CONTENT_SCHEMA_VERSION = 1;

/** De gebouwde contentbundel (bron voor validator en queries). */
export const CURRENT_CONTENT: ContentBundle = {
  schemaVersion: CONTENT_SCHEMA_VERSION,
  graphemes: [...GRAPHEMES],
  words: [...WORDS],
  sightWords: [...SIGHT_WORDS],
  sentences: [...SENTENCES],
  feedback: { ...FEEDBACK },
  uiTexts: { ...UI_TEXTS },
};

// ---------------------------------------------------------------------------
// Segmentatie: langste grafeem-match eerst ("aa" vóór "a").
// ---------------------------------------------------------------------------

/** Segmenteert een woord in grafeem-IDs, of null bij onbekende letters. */
export function segmentWord(
  word: string,
  graphemes: readonly Grapheme[],
): string[] | null {
  const byLetters = new Map<string, Grapheme>();
  let maxLen = 1;
  for (const g of graphemes) {
    byLetters.set(g.letters, g);
    if (g.letters.length > maxLen) maxLen = g.letters.length;
  }
  const lower = word.toLowerCase();
  const out: string[] = [];
  let i = 0;
  while (i < lower.length) {
    let matched: Grapheme | undefined;
    for (let len = Math.min(maxLen, lower.length - i); len >= 1; len--) {
      const chunk = lower.slice(i, i + len);
      const g = byLetters.get(chunk);
      if (g) {
        matched = g;
        break;
      }
    }
    if (!matched) return null;
    out.push(matched.id);
    i += matched.letters.length;
  }
  return out;
}

// ---------------------------------------------------------------------------
// isWordAllowed (runtime-check voor generatoren)
// ---------------------------------------------------------------------------

/**
 * True als `word` volledig te segmenteren is in grafemen die de speler kent
 * en het woord niet geblokkeerd is (ED §6.4). Gebruikt de geïnventariseerde
 * graphemen (langste match eerst).
 */
export function isWordAllowed(
  word: string,
  learnedGraphemes: ReadonlySet<string>,
): boolean {
  if (isBlockedWord(word)) return false;
  const seg = segmentWord(word, GRAPHEMES);
  if (!seg) return false;
  for (const id of seg) {
    if (!learnedGraphemes.has(id)) return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// validateContent
// ---------------------------------------------------------------------------

interface ClipRef {
  clip: AudioClip;
  location: string;
}

function derivePattern(
  word: Word,
  byId: Map<string, Grapheme>,
): string | null {
  let out = '';
  for (const id of word.graphemes) {
    const g = byId.get(id);
    if (!g) return null;
    out += isVowelType(g.type) ? 'V' : 'C';
  }
  return out;
}

/** Valideert de content. Retourneert alle issues; `ok` is false bij errors. */
export function validateContent(bundle: ContentBundle = CURRENT_CONTENT): ValidationResult {
  const issues: ValidationIssue[] = [];
  const add = (
    rule: string,
    message: string,
    location?: string,
    severity: 'error' | 'warning' = 'error',
  ): void => {
    const issue: ValidationIssue = { rule, severity, message };
    if (location !== undefined) issue.location = location;
    issues.push(issue);
  };

  const graphemeById = new Map<string, Grapheme>();
  const graphemeByLetters = new Map<string, Grapheme>();
  const seenOrder = new Set<number>();

  for (const g of bundle.graphemes) {
    if (!g.id) add('EMPTY_ID', 'Grafeem zonder id', 'graphemes');
    if (graphemeById.has(g.id)) add('DUPLICATE_ID', `Dubbel grafeem-id: ${g.id}`, `graphemes:${g.id}`);
    graphemeById.set(g.id, g);
    graphemeByLetters.set(g.letters, g);
    if (seenOrder.has(g.order)) {
      add('DUPLICATE_ORDER', `Dubbele grafeemvolgorde: ${g.order}`, `graphemes:${g.id}`);
    }
    seenOrder.add(g.order);
    if (!g.audio?.sound) {
      add('MISSING_SOUND', `Grafeem ${g.id} mist audio.sound`, `graphemes:${g.id}`, 'warning');
    }
    if (!g.soundHint) {
      add('MISSING_HINT', `Grafeem ${g.id} mist soundHint`, `graphemes:${g.id}`);
    }
  }

  const wordSet = new Set<string>();
  for (const w of bundle.words) {
    const loc = `words:${w.word}`;
    if (!w.word) add('EMPTY_ID', 'Woord zonder tekst', 'words');
    if (wordSet.has(w.word)) add('DUPLICATE_ID', `Dubbel woord: ${w.word}`, loc);
    wordSet.add(w.word);

    if (w.graphemes.join('') !== w.word) {
      add('JOIN_MISMATCH', `graphemes.join('') !== "${w.word}"`, loc);
    }
    if (w.graphemes.length !== w.phonemes.length) {
      add(
        'PHONEME_COUNT',
        `Aantal fonemen (${w.phonemes.length}) != aantal grafemen (${w.graphemes.length})`,
        loc,
      );
    }

    let maxBlock = 0;
    for (const id of w.graphemes) {
      const g = graphemeById.get(id);
      if (!g) {
        add('GRAPHENE_UNKNOWN', `Onbekend grafeem "${id}" in woord`, loc);
        continue;
      }
      if (g.introducedInPhase > maxBlock) maxBlock = g.introducedInPhase;
    }
    if (w.block < maxBlock) {
      add(
        'GRAPHENES_NOT_LEARNED',
        `Woord gebruikt grafemen uit blok ${maxBlock} maar staat in blok ${w.block}`,
        loc,
      );
    }

    const derived = derivePattern(w, graphemeById);
    if (derived !== null && w.pattern !== 'MULTI' && derived !== w.pattern) {
      add('PATTERN_MISMATCH', `Patroon "${w.pattern}" != afgeleid "${derived}"`, loc);
    }

    const seg = segmentWord(w.word, bundle.graphemes);
    if (seg && seg.join('|') !== w.graphemes.join('|')) {
      add('SEGMENT_MISMATCH', `Greedy segmentatie wijkt af van opgegeven grafemen`, loc);
    }

    if (isBlockedWord(w.word)) {
      add('BLOCKED_WORD', `Woord staat op de blokkeerlijst`, loc);
    }
    if (!w.kidFriendly) {
      add('NOT_KID_FRIENDLY', `Woord is niet kindvriendelijk gemarkeerd`, loc, 'warning');
    }
  }

  const sightIdSet = new Set<string>();
  const sightWordSet = new Set<string>();
  for (const sw of bundle.sightWords) {
    const loc = `sightWords:${sw.id}`;
    if (!sw.id) add('EMPTY_ID', 'Sight word zonder id', 'sightWords');
    if (sightIdSet.has(sw.id)) add('DUPLICATE_ID', `Dubbel sight-word-id: ${sw.id}`, loc);
    sightIdSet.add(sw.id);
    sightWordSet.add(sw.word.toLowerCase());
    if (sw.introducedAfter && !bundle.sightWords.some((s) => s.id === sw.introducedAfter)) {
      add('SIGHT_CHAIN', `introducedAfter "${sw.introducedAfter}" bestaat niet`, loc);
    }
  }

  const sentenceIdSet = new Set<string>();
  for (const s of bundle.sentences) {
    const loc = `sentences:${s.id}`;
    if (!s.id) add('EMPTY_ID', 'Zin zonder id', 'sentences');
    if (sentenceIdSet.has(s.id)) add('DUPLICATE_ID', `Dubbel zin-id: ${s.id}`, loc);
    sentenceIdSet.add(s.id);
    if (s.words.length === 0) add('EMPTY_SENTENCE', 'Zin zonder woorden', loc);
    for (const w of s.words) {
      const known = wordSet.has(w) || sightWordSet.has(w.toLowerCase());
      if (!known) add('SENTENCE_WORD_UNKNOWN', `Woord "${w}" niet beschikbaar`, loc);
    }
    for (const swId of s.requiresSightWords) {
      if (!sightIdSet.has(swId)) {
        add('SENTENCE_SIGHT_UNKNOWN', `Sight word "${swId}" niet geïntroduceerd`, loc);
      }
    }
    if (s.comprehension) {
      const idx = s.comprehension.correctIndex;
      if (idx < 0 || idx >= s.comprehension.options.length) {
        add('COMPREHENSION_INDEX', `correctIndex ${idx} buiten bereik`, loc);
      }
    }
  }

  // Audio-referenties
  const clipKeys = new Map<string, string>();
  const clips: ClipRef[] = [];
  for (const g of bundle.graphemes) {
    if (g.audio?.name) clips.push({ clip: g.audio.name, location: `graphemes:${g.id}.audio.name` });
    if (g.audio?.sound) clips.push({ clip: g.audio.sound, location: `graphemes:${g.id}.audio.sound` });
    if (g.audio?.example) clips.push({ clip: g.audio.example, location: `graphemes:${g.id}.audio.example` });
  }
  for (const w of bundle.words) {
    if (w.audio) clips.push({ clip: w.audio, location: `words:${w.word}.audio` });
  }
  for (const sw of bundle.sightWords) {
    if (sw.audio) clips.push({ clip: sw.audio, location: `sightWords:${sw.id}.audio` });
  }
  for (const s of bundle.sentences) {
    if (s.audio) clips.push({ clip: s.audio, location: `sentences:${s.id}.audio` });
    if (s.comprehension?.questionAudio) {
      clips.push({ clip: s.comprehension.questionAudio, location: `sentences:${s.id}.questionAudio` });
    }
  }
  for (const { clip, location } of clips) {
    if (!clip.src) add('AUDIO_SRC', 'AudioClip zonder src', location);
    else if (!clip.src.startsWith('audio/')) {
      add('AUDIO_PATH', `Audio-pad "${clip.src}" volgt conventie "audio/..." niet`, location);
    }
    if (!clip.key) add('AUDIO_KEY', 'AudioClip zonder key', location);
    const prev = clipKeys.get(clip.key);
    if (prev !== undefined) {
      add('AUDIO_DUPLICATE_KEY', `Dubbele audio-key "${clip.key}" (ook ${prev})`, location);
    } else {
      clipKeys.set(clip.key, location);
    }
  }

  // Tekstkaarten
  const checkTextMap = (map: Readonly<Record<string, string>>, name: string): void => {
    for (const key of Object.keys(map)) {
      if (!key) add('EMPTY_ID', `${name} zonder id`, name);
      const value = map[key];
      if (value === undefined || value.trim() === '') {
        add('EMPTY_TEXT', `Lege tekst bij ${name}:${key}`, `${name}:${key}`, 'warning');
      }
    }
  };
  checkTextMap(bundle.feedback, 'feedback');
  checkTextMap(bundle.uiTexts, 'uiTexts');

  const errors = issues.filter((i) => i.severity === 'error');
  return { ok: errors.length === 0, issues };
}
