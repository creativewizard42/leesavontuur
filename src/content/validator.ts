import type {
  ActivityItem,
  AudioClip,
  ContentBundle,
  Grapheme,
  ValidationIssue,
  ValidationResult,
  Word,
} from '../types';
import {
  AUDITORY_ONLY_EXAMPLES,
  GRAPHEMES,
  isVowelType,
} from './graphemes';
import { WORDS } from './words';
import { SIGHT_WORDS } from './sightWords';
import { SENTENCES } from './sentences';
import { FEEDBACK, REQUIRED_FEEDBACK_KEYS } from './feedback';
import { UI_TEXTS } from './uiTexts';
import { INSTRUCTIONS, INSTRUCTION_KEY_PATTERNS, hasPlaceholders, REQUIRED_INSTRUCTION_KEYS } from './instructions';
import { instructionVariantKeys } from './dynamicClips';
import { PROPER_NAMES } from './properNames';
import { AUDIO_MANIFEST } from './audioManifest';
import { isBlockedWord } from './blocklist';
import {
  PHONOLOGY_KNOWN_WORDS,
  RHYME_GROUPS,
  SYLLABLE_WORDS,
  rhymeTail,
} from './phonology';
import type { ContentBundleExt, ProperName, ValidateOptions } from './types';

export const CONTENT_SCHEMA_VERSION = 1;

/** Minimale omvang van de MVP-woordenlijst (ED §5.2 probleem 1: ≥ 8). */
export const MIN_MVP_WORDS = 8;

/** De gebouwde contentbundel (bron voor validator en queries). */
export const CURRENT_CONTENT: ContentBundleExt = {
  schemaVersion: CONTENT_SCHEMA_VERSION,
  graphemes: [...GRAPHEMES],
  words: [...WORDS],
  sightWords: [...SIGHT_WORDS],
  sentences: [...SENTENCES],
  feedback: { ...FEEDBACK },
  uiTexts: { ...UI_TEXTS },
  properNames: [...PROPER_NAMES],
  instructions: { ...INSTRUCTIONS },
  audioManifest: [...AUDIO_MANIFEST],
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
// assertItemsAllowed (runtime-check voor generatoruitvoer, EDU-020)
// ---------------------------------------------------------------------------

const OPTION_PREFIX = /^(?:g|ans|n|sw|pn|de|blend|bl):/;

function alphabeticCandidate(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  const stripped = value.replace(OPTION_PREFIX, '').toLowerCase();
  return /^[a-z]+$/.test(stripped) ? stripped : undefined;
}

/**
 * Controleert de woorden in gegenereerde items (zowel het juiste antwoord als
 * de afleiders) tegen de blokkeerlijst en `isWordAllowed`. Herbruikbaar in
 * content-tests over veel seeds (EDU-020). Alleen alfabetische optie-ids/labels
 * van lengte ≥ 2 worden als woord beschouwd; grafeem-/getal-/reeks-opties
 * (`g:m`, `ans:3`, `ans:k-a-m`) worden overgeslagen.
 */
export function assertItemsAllowed(
  items: readonly ActivityItem[],
  learned: ReadonlySet<string>,
): ValidationResult {
  const issues: ValidationIssue[] = [];
  const add = (rule: string, message: string, location: string): void => {
    issues.push({ rule, severity: 'error', message, location });
  };

  for (const item of items) {
    const candidates = new Set<string>();
    for (const option of item.options) {
      const fromId = alphabeticCandidate(option.id);
      if (fromId !== undefined) candidates.add(fromId);
      const fromLabel = alphabeticCandidate(option.label);
      if (fromLabel !== undefined) candidates.add(fromLabel);
    }
    for (const word of candidates) {
      const location = `items:${item.id}:${word}`;
      if (isBlockedWord(word)) {
        add('ITEM_WORD_BLOCKED', `Geblokkeerd woord "${word}" in gegenereerd item`, location);
      } else if (!isWordAllowed(word, learned)) {
        add(
          'ITEM_WORD_NOT_ALLOWED',
          `Woord "${word}" gebruikt niet-geleerde grafemen of bestaat niet`,
          location,
        );
      }
    }
  }

  const errors = issues.filter((i) => i.severity === 'error');
  return { ok: errors.length === 0, issues };
}

// ---------------------------------------------------------------------------
// validateContent
// ---------------------------------------------------------------------------

function asExt(bundle: ContentBundle): Partial<ContentBundleExt> {
  return bundle as Partial<ContentBundleExt>;
}

/** Patroon uit de C/V-klassen van de grafemen (ARCHITECTURE §5.1 regel 4). */
function derivePattern(word: Word, byId: Map<string, Grapheme>): string | null {
  let out = '';
  for (const id of word.graphemes) {
    const g = byId.get(id);
    if (!g) return null;
    out += isVowelType(g.type) ? 'V' : 'C';
  }
  return out;
}

/** Valideert de content. Retourneert alle issues; `ok` is false bij errors. */
export function validateContent(
  bundle: ContentBundle = CURRENT_CONTENT,
  options: ValidateOptions = {},
): ValidationResult {
  const ext = asExt(bundle);
  const properNames: ProperName[] = Array.isArray(ext.properNames) ? ext.properNames : [];
  const instructions: Record<string, string> = ext.instructions ?? {};
  const manifest: AudioClip[] = Array.isArray(ext.audioManifest) ? ext.audioManifest : [];
  const existingAssets = options.existingAssets;
  const requireFeedbackKeys = options.requireFeedbackKeys !== false;

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

  // --- grafemen -------------------------------------------------------------
  const graphemeById = new Map<string, Grapheme>();
  const graphemeByLetters = new Map<string, Grapheme>();
  const seenGraphemeOrder = new Set<number>();

  for (const g of bundle.graphemes) {
    if (!g.id) add('EMPTY_ID', 'Grafeem zonder id', 'graphemes');
    if (graphemeById.has(g.id)) {
      add('DUPLICATE_ID', `Dubbel grafeem-id: ${g.id}`, `graphemes:${g.id}`);
    }
    if (graphemeByLetters.has(g.letters)) {
      add('DUPLICATE_ID', `Dubbele grafeem-letters: "${g.letters}"`, `graphemes:${g.id}`);
    }
    graphemeById.set(g.id, g);
    graphemeByLetters.set(g.letters, g);
    if (seenGraphemeOrder.has(g.order)) {
      add('DUPLICATE_ORDER', `Dubbele grafeemvolgorde: ${g.order}`, `graphemes:${g.id}`);
    }
    seenGraphemeOrder.add(g.order);
    if (!g.soundHint) {
      add('MISSING_HINT', `Grafeem ${g.id} mist soundHint`, `graphemes:${g.id}`);
    }
    if (!g.audio?.sound) {
      add('MISSING_SOUND', `Grafeem ${g.id} mist audio.sound`, `graphemes:${g.id}`, 'warning');
    }
    if (g.introducedInPhase < 1 || g.introducedInPhase > 9) {
      add('BLOCK_RANGE', `Grafeem ${g.id} heeft ongeldig blok ${g.introducedInPhase}`, `graphemes:${g.id}`);
    }
  }

  // Tweede pass: voorbeeldwoorden mogen alleen eerder geleerde grafemen
  // gebruiken (of expliciet "alleen auditief" zijn, ED §5.3).
  for (const g of bundle.graphemes) {
    if (g.exampleWord === undefined) continue;
    const seg = segmentWord(g.exampleWord, bundle.graphemes);
    if (!seg) {
      add('EXAMPLE_UNKNOWN', `Voorbeeldwoord "${g.exampleWord}" niet segmenteerbaar`, `graphemes:${g.id}`);
      continue;
    }
    if (AUDITORY_ONLY_EXAMPLES.has(g.id)) continue;
    for (const segId of seg) {
      const sg = graphemeById.get(segId);
      if (sg && sg.order > g.order) {
        add(
          'EXAMPLE_ORDER',
          `Voorbeeldwoord "${g.exampleWord}" van ${g.id} gebruikt nog niet geleerd grafeem "${segId}"`,
          `graphemes:${g.id}`,
        );
      }
    }
  }

  // --- woorden --------------------------------------------------------------
  const wordSet = new Set<string>();
  const wordByWord = new Map<string, Word>();
  let mvpCount = 0;

  for (const w of bundle.words) {
    const loc = `words:${w.word}`;
    if (!w.word) add('EMPTY_ID', 'Woord zonder tekst', 'words');
    if (wordSet.has(w.word)) add('DUPLICATE_ID', `Dubbel woord: ${w.word}`, loc);
    wordSet.add(w.word);
    wordByWord.set(w.word, w);
    if (w.isMvp === true) mvpCount += 1;

    if (w.graphemes.length === 0) add('EMPTY_WORD', `Woord "${w.word}" zonder grafemen`, loc);

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
    for (const p of w.phonemes) {
      if (!p || /\s/.test(p)) add('PHONEME_INVALID', `Ongeldig foneem "${p}"`, loc);
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
      add('SEGMENT_MISMATCH', 'Greedy segmentatie wijkt af van opgegeven grafemen', loc);
    }

    if (isBlockedWord(w.word)) {
      add('BLOCKED_WORD', 'Woord staat op de blokkeerlijst', loc);
    }
    if (!w.kidFriendly) {
      add('NOT_KID_FRIENDLY', 'Woord is niet kindvriendelijk gemarkeerd', loc, 'warning');
    }
    if (w.phase < 1 || w.phase > 9) {
      add('PHASE_RANGE', `Woord "${w.word}" heeft ongeldige fase ${w.phase}`, loc);
    }
    if (w.block < 1 || w.block > 9) {
      add('BLOCK_RANGE', `Woord "${w.word}" heeft ongeldig blok ${w.block}`, loc);
    }
  }

  if (mvpCount < MIN_MVP_WORDS) {
    add(
      'MVP_TOO_FEW',
      `MVP heeft ${mvpCount} woorden; minimaal ${MIN_MVP_WORDS} vereist (ED §5.2)`,
      'words',
    );
  }

  // --- phonologie-bank (EDU-002/EDU-013/EDU-020) ---------------------------
  const checkPhonologyWord = (word: string, location: string): void => {
    if (!/^[a-z]+$/.test(word)) {
      add('PHONOLOGY_WORD_FORM', `Phonologiewoord "${word}" is geen klein alfabetisch woord`, location);
      return;
    }
    if (isBlockedWord(word)) {
      add('PHONOLOGY_BLOCKED', `Blokkeerwoord "${word}" in de phonologie-bank`, location);
      return;
    }
    if (!PHONOLOGY_KNOWN_WORDS.has(word) && !wordByWord.has(word)) {
      add('PHONOLOGY_WORD_UNKNOWN', `"${word}" is geen gecureerd/bestaand woord`, location);
    }
  };

  for (const group of RHYME_GROUPS) {
    const location = `phonology:rhyme:${group.join('/')}`;
    if (group.length < 2) {
      add('PHONOLOGY_RHYME_SIZE', 'Rijmgroep heeft minder dan 2 woorden', location);
    }
    const tails = new Set(group.map((w) => rhymeTail(w)));
    if (tails.size > 1) {
      add(
        'PHONOLOGY_RHYME_MISMATCH',
        `Rijmgroep deelt niet hetzelfde rijmdeel (${[...tails].join(', ')})`,
        location,
      );
    }
    for (const word of group) checkPhonologyWord(word, location);
  }

  for (const entry of SYLLABLE_WORDS) {
    const location = `phonology:syllable:${entry.word}`;
    if (!Number.isInteger(entry.syllables) || entry.syllables < 1 || entry.syllables > 4) {
      add('PHONOLOGY_SYLLABLE_RANGE', `Ongeldig lettergreepaantal ${entry.syllables}`, location);
    }
    checkPhonologyWord(entry.word, location);
  }

  // --- sight words ----------------------------------------------------------
  const sightIdSet = new Set<string>();
  const sightByWord = new Set<string>();
  const sightById = new Map<string, { requiresBlock?: number; introducedAfter?: string }>();

  for (const sw of bundle.sightWords) {
    const loc = `sightWords:${sw.id}`;
    if (!sw.id) add('EMPTY_ID', 'Sight word zonder id', 'sightWords');
    if (sightIdSet.has(sw.id)) add('DUPLICATE_ID', `Dubbel sight-word-id: ${sw.id}`, loc);
    sightIdSet.add(sw.id);
    sightByWord.add(sw.word.toLowerCase());
    sightById.set(sw.id, {
      ...(sw.requiresBlock === undefined ? {} : { requiresBlock: sw.requiresBlock }),
      ...(sw.introducedAfter === undefined ? {} : { introducedAfter: sw.introducedAfter }),
    });
    if (sw.introducedAfter && !bundle.sightWords.some((s) => s.id === sw.introducedAfter)) {
      add('SIGHT_CHAIN', `introducedAfter "${sw.introducedAfter}" bestaat niet`, loc);
    }
    if (sw.requiresBlock !== undefined && (sw.requiresBlock < 1 || sw.requiresBlock > 9)) {
      add('BLOCK_RANGE', `Sight word ${sw.id} heeft ongeldig blok ${sw.requiresBlock}`, loc);
    }
  }

  // --- eigen namen (ED §8.1) ------------------------------------------------
  const properIdSet = new Set<string>();
  const properByWord = new Map<string, ProperName>();
  for (const pn of properNames) {
    const loc = `properNames:${pn.id}`;
    if (!pn.id) add('EMPTY_ID', 'Eigen naam zonder id', 'properNames');
    if (properIdSet.has(pn.id)) add('DUPLICATE_ID', `Dubbel naam-id: ${pn.id}`, loc);
    properIdSet.add(pn.id);
    if (pn.graphemes.join('') !== pn.word) {
      add('JOIN_MISMATCH', `Graphemes van naam "${pn.name}" sluiten niet aan op "${pn.word}"`, loc);
    }
    for (const id of pn.graphemes) {
      if (!graphemeById.has(id)) {
        add('GRAPHENE_UNKNOWN', `Onbekend grafeem "${id}" in naam`, loc);
      }
    }
    properByWord.set(pn.word.toLowerCase(), pn);
  }

  // --- zinnen ---------------------------------------------------------------
  const sentenceIdSet = new Set<string>();
  const checkWordNeed = (word: string): { block: number; known: boolean } => {
    const inWords = wordByWord.get(word);
    if (inWords) return { block: inWords.block, known: true };
    const inNames = properByWord.get(word.toLowerCase());
    if (inNames) return { block: inNames.requiresBlock, known: true };
    if (sightByWord.has(word.toLowerCase())) {
      const swId = [...sightIdSet].find((id) => {
        const sw = bundle.sightWords.find((s) => s.id === id);
        return sw?.word.toLowerCase() === word.toLowerCase();
      });
      const sw = swId ? sightById.get(swId) : undefined;
      return { block: sw?.requiresBlock ?? 1, known: true };
    }
    return { block: 0, known: false };
  };

  for (const s of bundle.sentences) {
    const loc = `sentences:${s.id}`;
    if (!s.id) add('EMPTY_ID', 'Zin zonder id', 'sentences');
    if (sentenceIdSet.has(s.id)) add('DUPLICATE_ID', `Dubbel zin-id: ${s.id}`, loc);
    sentenceIdSet.add(s.id);
    if (s.words.length === 0) add('EMPTY_SENTENCE', 'Zin zonder woorden', loc);

    let neededBlock = 0;
    for (const w of s.words) {
      const need = checkWordNeed(w);
      if (!need.known) {
        add('SENTENCE_WORD_UNKNOWN', `Woord "${w}" niet beschikbaar`, loc);
      } else if (need.block > neededBlock) {
        neededBlock = need.block;
      }
    }

    for (const swId of s.requiresSightWords) {
      const sw = sightById.get(swId);
      if (!sw) {
        add('SENTENCE_SIGHT_UNKNOWN', `Sight word "${swId}" niet geïntroduceerd`, loc);
        continue;
      }
      if (sw.requiresBlock !== undefined && sw.requiresBlock > neededBlock) {
        neededBlock = sw.requiresBlock;
      }
    }

    const maxReqBlock =
      s.requiresBlocks.length > 0 ? Math.max(...s.requiresBlocks) : 0;
    if (neededBlock > maxReqBlock) {
      add(
        'SENTENCE_BLOCK_MISSING',
        `Zin vereist blok ${neededBlock} maar requiresBlocks = [${s.requiresBlocks.join(', ')}]`,
        loc,
      );
    }

    if (s.comprehension) {
      const idx = s.comprehension.correctIndex;
      if (idx < 0 || idx >= s.comprehension.options.length) {
        add('COMPREHENSION_INDEX', `correctIndex ${idx} buiten bereik`, loc);
      }
      if (!s.comprehension.showAfterReading) {
        add('COMPREHENSION_VISIBILITY', 'Begripsopties moeten pas ná lezen verschijnen', loc);
      }
    }
  }

  // --- feedback / teksten ---------------------------------------------------
  const checkTextMap = (
    map: Readonly<Record<string, string>>,
    name: string,
  ): void => {
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
  checkTextMap(instructions, 'instructions');

  if (requireFeedbackKeys) {
    for (const key of REQUIRED_FEEDBACK_KEYS) {
      if (!(key in bundle.feedback)) {
        add('MISSING_FEEDBACK_KEY', `Feedback-ID "${key}" uit GAME_DESIGN §5 ontbreekt`, 'feedback');
      }
    }
  }

  // --- audio-referenties ----------------------------------------------------
  const clips: { clip: AudioClip; location: string }[] = [];
  for (const g of bundle.graphemes) {
    if (g.audio?.name) clips.push({ clip: g.audio.name, location: `graphemes:${g.id}.audio.name` });
    if (g.audio?.sound) clips.push({ clip: g.audio.sound, location: `graphemes:${g.id}.audio.sound` });
    if (g.audio?.example) clips.push({ clip: g.audio.example, location: `graphemes:${g.id}.audio.example` });
  }
  for (const w of bundle.words) {
    if (w.audio) clips.push({ clip: w.audio, location: `words:${w.word}.audio` });
  }
  for (const pn of properNames) {
    if (pn.audio) clips.push({ clip: pn.audio, location: `properNames:${pn.id}.audio` });
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
  for (const clip of manifest) {
    clips.push({ clip, location: `audioManifest:${clip.key}` });
  }

  const clipByKey = new Map<string, string>();
  for (const { clip, location } of clips) {
    if (!clip.src) {
      add('AUDIO_SRC', 'AudioClip zonder src', location);
    } else if (!clip.src.startsWith('audio/')) {
      add('AUDIO_PATH', `Audio-pad "${clip.src}" volgt conventie "audio/..." niet`, location);
    } else if (existingAssets && !existingAssets.has(clip.src)) {
      add(
        'AUDIO_ASSET_MISSING',
        `Geen opname gevonden voor "${clip.src}" (TTS/tekst-fallback actief)`,
        location,
        'warning',
      );
    }
    if (!clip.key) {
      add('AUDIO_KEY', 'AudioClip zonder key', location);
    } else {
      const prev = clipByKey.get(clip.key);
      if (prev !== undefined && prev !== clip.src) {
        add('AUDIO_DUPLICATE_KEY', `Dubbele audio-key "${clip.key}" met verschillend pad`, location);
      } else {
        clipByKey.set(clip.key, clip.src);
      }
    }
    if (!clip.text || clip.text.trim() === '') {
      add('AUDIO_TEXT', `AudioClip "${clip.key}" mist fallback-tekst`, location, 'warning');
    }
  }

  // --- instructie-keys (EDU-009, EDU-R2-002) --------------------------------
  for (const key of REQUIRED_INSTRUCTION_KEYS) {
    const template = instructions[key];
    if (template === undefined) {
      add('MISSING_INSTRUCTION', `Vereiste instructie-key "${key}" ontbreekt in INSTRUCTIONS`, 'instructions');
      continue;
    }
    if (hasPlaceholders(template)) {
      // Dynamische instructie: eis een concrete clip per variabele (EDU-R2-002).
      for (const variantKey of instructionVariantKeys(key)) {
        if (!clipByKey.has(variantKey)) {
          add(
            'MISSING_INSTRUCTION_AUDIO',
            `Geen audio-clip voor dynamische instructie-variant "${variantKey}"`,
            `audioManifest:${variantKey}`,
          );
        }
      }
    } else if (!clipByKey.has(key)) {
      add('MISSING_INSTRUCTION_AUDIO', `Geen audio-clip voor instructie-key "${key}"`, 'audioManifest');
    }
  }
  for (const pattern of INSTRUCTION_KEY_PATTERNS) {
    if (!(pattern.template in instructions)) {
      add(
        'MISSING_INSTRUCTION',
        `Template "${pattern.template}" voor dynamische key "${pattern.prefix}*" ontbreekt`,
        'instructions',
      );
    }
    for (const w of bundle.words) {
      const key = `${pattern.prefix}${w.word}`;
      if (!clipByKey.has(key)) {
        add('MISSING_INSTRUCTION_AUDIO', `Geen audio-clip voor dynamische key "${key}"`, 'audioManifest');
      }
    }
  }

  // --- beeld-referenties ----------------------------------------------------
  for (const w of bundle.words) {
    if (!w.image) continue;
    const loc = `words:${w.word}.image`;
    if (!w.image.startsWith('assets/') && !w.image.startsWith('images/')) {
      add('IMAGE_PATH', `Beeldpad "${w.image}" volgt conventie niet`, loc);
    } else if (existingAssets && !existingAssets.has(w.image)) {
      add('IMAGE_ASSET_MISSING', `Geen afbeelding gevonden voor "${w.image}"`, loc);
    }
  }

  const errors = issues.filter((i) => i.severity === 'error');
  return { ok: errors.length === 0, issues };
}
