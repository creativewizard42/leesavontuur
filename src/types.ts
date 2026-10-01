/**
 * LEESAVONTUUR – gedeeld datamodel (BRON VAN WAARHEID)
 *
 * Dit bestand is de canonieke set interfaces voor beide builders.
 * Het is in principe bevroren; wijzigingen lopen via de Architect.
 *
 * Regels:
 *  - Alle IDs volgen de conventies uit docs/EDUCATIONAL_DESIGN.md (ED).
 *  - Grafeem-IDs: klein, geen accenten, tweetekenklanken als geheel ("aa", "ij").
 *  - Skill-IDs: "DOMEIN.ONDERWERP[.SUBDOEL]" uit ED §2.
 *  - Geen persoonsgegevens in het save-model (zie ARCHITECTURE §7).
 *
 * Dit bestand is DOM-vrij en mag door core/learning/content geïmporteerd worden.
 */

// ---------------------------------------------------------------------------
// Audio
// ---------------------------------------------------------------------------

export type AudioKind =
  | 'grapheme-sound'
  | 'grapheme-name'
  | 'grapheme-example'
  | 'word'
  | 'sightword'
  | 'feedback'
  | 'instruction'
  | 'blend';

/** Verwijzing naar één audiofragment (opname) met TTS/tekst als fallback. */
export interface AudioClip {
  /** Stabiele logische ID, bv. "lk.m.sound", "de.kam", "fb.correct.1". */
  key: string;
  /** Padconventie, bv. "audio/graphemes/m_sound.mp3". */
  src: string;
  /** Fallback-tekst voor Web Speech API (nl-NL) of aria-live. */
  text?: string;
  kind: AudioKind;
}

/** Audio-set van een grafeem (ED §5.3). */
export interface GraphemeAudio {
  /** Letternaam ("em") – alleen ouderzone/liedje. */
  name?: AudioClip;
  /** Kernklank ("mmm", zonder sjwa) – verplicht. */
  sound: AudioClip;
  /** Voorbeeldwoord, auditief ("maan"). */
  example?: AudioClip;
}

// ---------------------------------------------------------------------------
// Content
// ---------------------------------------------------------------------------

/** Klankcategorie volgens ED §5.3 (type-kolom). */
export type GraphemeType =
  | 'continuant'
  | 'plosive'
  | 'vowel-short'
  | 'vowel-long'
  | 'diphthong';

export interface Grapheme {
  /** Klein, geen accenten, tweetekenklank als geheel: "m", "aa", "ij". */
  id: string;
  /** De letters zoals getoond: "m", "aa". */
  letters: string;
  /** Letternaam: "em", "aa", "es". */
  name: string;
  /** Uitspraak-hint voor opname/TTS zonder sjwa: "mmm", "sss", "rrr". */
  soundHint: string;
  type: GraphemeType;
  /** Fase waarin dit grafeem geïntroduceerd wordt (ED §3). */
  introducedInPhase: number;
  /** Introductievolgorde (1-based) volgens ED §5.3. */
  order: number;
  /** Voorbeeldwoord met alleen geleerde grafemen (optioneel/auditief). */
  exampleWord?: string;
  audio?: GraphemeAudio;
}

/** Woordpatroon volgens ED §6.1/§2.5. V = klinkerfoneem (tweeteken = 1 V). */
export type WordPattern =
  | 'VC'
  | 'VCC'
  | 'VVC'
  | 'CVC'
  | 'CVVC'
  | 'CCVC'
  | 'CVCC'
  | 'CCVVC'
  | 'CVVCC'
  | 'CCVCC'
  | 'MULTI';

export interface Word {
  /** Het geschreven woord. */
  word: string;
  /** Grafeem-segmentatie; graphemes.join('') === word. */
  graphemes: string[];
  /** Fonemen (IPA), één per grafeem; phonemes.length === graphemes.length. */
  phonemes: string[];
  pattern: WordPattern;
  /** Fase (ED §3) waarin het woord past. */
  phase: number;
  /** Blok (ED §5.3) waarin alle grafemen bekend zijn. */
  block: number;
  /** Kindvriendelijk en gepast (ED §6.5). */
  kidFriendly: boolean;
  /** Relatief pad naar belonings-/betekenisplaatje (altijd NA lezen, ED §11). */
  image?: string;
  audio?: AudioClip;
  /** Onderdeel van de MVP-woordenlijst (ED §5.2/§6.5). */
  isMvp?: boolean;
}

export interface SightWord {
  /** "SW.de". */
  id: string;
  word: string;
  /** Blok waarin het pas geïntroduceerd mag worden. */
  requiresBlock?: number;
  /** Skill-ID die eerst gemeesterd moet zijn, bv. "SW.de". */
  introducedAfter?: string;
  audio?: AudioClip;
}

export type SentenceLevel = 'phrase' | 'simple' | 'capital' | 'text';

export interface ComprehensionQuestion {
  /** Audio-prompt, bv. "Wat ziet Lies?". */
  questionAudio?: AudioClip;
  /** Antwoordopties (tekst of beeld-ID), minimaal verschillend (ED §11). */
  options: string[];
  /** Index van het juiste antwoord in `options`. */
  correctIndex: number;
  /** Wordt pas getoond ná het lezen (ED §11 regel 2). */
  showAfterReading: true;
}

export interface Sentence {
  id: string;
  /** De volledige zinstekst, bv. "de kat is nat." */
  text: string;
  /** Losse woorden (laagcase, zonder leestekens) voor de woord-check. */
  words: string[];
  level: SentenceLevel;
  /** Benodigde blokken (ED §5.3). */
  requiresBlocks: number[];
  /** Benodigde, reeds geïntroduceerde sight words (SW-IDs). */
  requiresSightWords: string[];
  comprehension?: ComprehensionQuestion;
  audio?: AudioClip;
}

// ---------------------------------------------------------------------------
// Skills (leerdoelen)
// ---------------------------------------------------------------------------

/**
 * Skill-ID uit ED §2, bv. "PH.RHYME", "FN.FIRST_SOUND", "LK.m.SOUND",
 * "AN.CVC", "SY.CVC", "DE.CVC", "SW.de", "ZI.SIMPLE", "FL.GRAPHEME".
 * Bewust `string` (geen gesloten union) zodat ED kan groeien; de geldige set
 * wordt door content/phases.ts geïnventariseerd.
 */
export type SkillId = string;

/** Per-item sleutel voor Leitner, bv. grafeem "m", woord "kam", sight word "de". */
export type ItemKey = string;

/** Adaptieve toestand per leerdoel (ED §10.1). */
export interface SkillState {
  /** EWMA 0–1. */
  mastery: number;
  /** Aantal meetellende items (gokken tellen niet mee). */
  attempts: number;
  /** Aantal correct bij 1e poging. */
  correct: number;
  /** Aandeel correct bij 1e poging over laatste 20 items. */
  accuracy: number;
  /** Mediane responstijd (ms) over laatste 10 correcte items. */
  avgResponseMs: number;
  /** Aantal items met hint of modeling. */
  hintsUsed: number;
  /** Reeks correct-bij-1e-poging. */
  consecutiveCorrect: number;
  /** Leitner-box 1–5 (ED §10.4). */
  leitnerBox: number;
  /** Sessienummer waarin dit doel voor het laatst is gezien. */
  lastSeenSession: number;
  /** Aantal verschillende sessies met dit doel. */
  sessionsSeen: number;
}

/** Leitner-toestand per item-skill (grafeem/woord/sight word). */
export interface ItemState {
  itemKey: ItemKey;
  skillId: SkillId;
  leitnerBox: number;
  lastSeenSession: number;
  consecutiveCorrect: number;
}

// ---------------------------------------------------------------------------
// Save / profiel
// ---------------------------------------------------------------------------

export interface ProfileSettings {
  audioEnabled: boolean;
  /** Extra rustige modus: geen automatische herhaling/animatie. */
  reducedMotion: boolean;
  highContrast: boolean;
  /** Prompt automatisch herhalen bij lage mastery (GD §7). */
  autoRepeatPrompt: boolean;
}

export interface Rewards {
  /** Klankvonkjes, alleen na leeswerk (GD §6.1). */
  klankvonkjes: number;
  /** Vriendjeskaarten (grafeem-IDs) bij een nieuw gemeesterd grafeem. */
  vriendjeskaarten: string[];
  /** Grafeem-IDs met een blad aan de Klankboom (LK.<g>.SOUND >= 0.8). */
  leaves: string[];
}

/**
 * Opgeslagen profiel. GEEN persoonsgegevens:
 * geen naam, e-mail, geboortedatum of locatie. Identiteit = avatarIcon.
 */
export interface Profile {
  schemaVersion: number;
  /** Willekeurige lokale ID, geen PII. */
  profileId: string;
  /** Gekozen dierenicoon als profielidentiteit. */
  avatarIcon: string;
  /** ISO-tijdstip van aanmaak (lokaal). */
  createdAt: string;
  /** Vrijgegeven grafeem-IDs. */
  unlockedGraphemes: string[];
  skills: Record<SkillId, SkillState>;
  /** Leitner-toestand per item-skill. */
  items: Record<ItemKey, ItemState>;
  rewards: Rewards;
  settings: ProfileSettings;
  sessionCount: number;
}

// ---------------------------------------------------------------------------
// Activiteiten / items
// ---------------------------------------------------------------------------

export type Difficulty = 'A' | 'B' | 'C' | 'D';

export interface ActivityPrompt {
  /** Audio-prompt (opname). */
  audio?: AudioClip;
  /** Fallback/aria-tekst. */
  text?: string;
  /** Of de prompt als leesbare tekst in beeld mag (vrijwel altijd false, GD §8.1). */
  showText: boolean;
}

export interface ActivityOption {
  id: string;
  /** Optionele zichtbare tekst (bv. het geschreven woord bij DE.*). */
  label?: string;
  /** Audio die bij deze optie hoort (identieke knoppen, GD §4). */
  audio?: AudioClip;
  /** Beeld-ID; alleen als beloning/betekenis NA correct (ED §11). */
  image?: string;
  /** Of dit de juiste optie is (precies één true). */
  correct: boolean;
}

/** Eén concrete oefenopdracht die de UI rendert. */
export interface ActivityItem {
  id: string;
  skillId: SkillId;
  /** Secundair doel (bv. AN.CVC naast FN.COUNT); telt mee voor scoring. */
  secondarySkillId?: SkillId;
  /** Activiteittype, bv. "klankjager" | "letterklank" | "hakken" | "plakken" | "woordlezen" | "klimboom". */
  kind: string;
  prompt: ActivityPrompt;
  options: ActivityOption[];
  /** id van de juiste optie (equivalent aan optie met correct=true). */
  targetId: string;
  difficulty: Difficulty;
  /** True als dit een herkansing is van een eerder gemodelleerd item. */
  isRetry: boolean;
  /** Leitner-sleutel van het doelitem voor deze opdracht. */
  itemKey?: ItemKey;
  metadata?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Antwoorden / events
// ---------------------------------------------------------------------------

/** Enige event dat Mastery en SpacedRepetition consumeren. */
export interface AnswerEvent {
  itemId: string;
  skillId: SkillId;
  secondarySkillId?: SkillId;
  /** Leitner-sleutel (grafeem/woord/sight word). */
  itemKey?: ItemKey;
  sessionNumber: number;
  timestamp: number;
  /** Gekozen optie-id, of null bij timeout/geen antwoord. */
  selectedOptionId: string | null;
  correct: boolean;
  /** Pogingnummer binnen dit item (1-based). */
  attempt: number;
  usedHint: boolean;
  modeled: boolean;
  responseMs: number;
  /** Gokindicator: responseMs < 500 && !correct (ED §11 regel 9). */
  isGuess: boolean;
  /** Itemscore s volgens ED §10.2. */
  itemScore: number;
}

// ---------------------------------------------------------------------------
// Content-bundel
// ---------------------------------------------------------------------------

export interface ContentBundle {
  schemaVersion: number;
  graphemes: Grapheme[];
  words: Word[];
  sightWords: SightWord[];
  sentences: Sentence[];
  /** fb.* → tekst (GD §5). */
  feedback: Record<string, string>;
  /** ui.* → tekst. */
  uiTexts: Record<string, string>;
}

// ---------------------------------------------------------------------------
// Validatie
// ---------------------------------------------------------------------------

export interface ValidationIssue {
  rule: string;
  severity: 'error' | 'warning';
  message: string;
  location?: string;
}

export interface ValidationResult {
  ok: boolean;
  issues: ValidationIssue[];
}

// ---------------------------------------------------------------------------
// Gedeelde hulpmiddelen
// ---------------------------------------------------------------------------

/** Injecteerbare randombron (deterministische tests). Retourneert [0,1). */
export type Rng = () => number;

/** Standaard niet-deterministische RNG. */
export const defaultRng: Rng = () => Math.random();

export const SAVE_SCHEMA_VERSION = 1;
