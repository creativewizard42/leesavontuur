/**
 * AudioService (ARCHITECTURE §6).
 * Volgorde: opgenomen clip -> Web Speech API nl-NL (ALLEEN localService===true)
 * -> stil (visuele fallback). Zonder audio crasht het spel nooit en er gaat
 * nooit een netwerkverzoek naar een externe host.
 *
 * Een clip geldt alleen als "gespeeld" wanneer het bestand echt laadt en
 * afspeelt (`canplaythrough`/`playing`/play()-resolve); bij `error`,
 * play()-reject of timeout volgt de TTS-fallback (EDU-001/QA-001).
 *
 * Losse klanken/gerekte reeksen zijn in de praktijk opnames; TTS is de
 * tijdelijke, gemarkeerde benadering (`approximate: true`) zolang er geen
 * opnames zijn (ED §13.1, EDU-010).
 */
import type { AudioClip } from '../types';
import { isLocalAudioSrc } from './localSrc';

// SEC-R3-005: de src-validatie is gedeeld met `SessionPlanner.readAudio`
// (`src/audio/localSrc.ts`), zodat runtime-audio en hervatte audio hetzelfde
// oordeel geven. Hier opnieuw geëxporteerd voor bestaande importers/tests.
export { isLocalAudioSrc } from './localSrc';

/** Uitkomst van een audio-poging: echte opname, (tijdelijke) TTS of niets. */
export type PlayOutcome = 'file' | 'tts' | 'unavailable';

/**
 * Rijk resultaat van `play*`. `approximate` is true wanneer de weergave een
 * benadering is (TTS van een losse klank/gerekte reeks i.p.v. een opname), zodat
 * de UI een visuele "tijdelijke computerstem"-markering kan tonen.
 */
export interface PlayResult {
  result: PlayOutcome;
  approximate: boolean;
  /** Reden wanneer `result === 'unavailable'` (bv. 'clip-missing'). */
  reason?: string;
}

/** Bouwt een `PlayResult` (gemak voor aanroepers/tests). */
export function playResult(
  result: PlayOutcome,
  approximate = false,
  reason?: string,
): PlayResult {
  return reason === undefined ? { result, approximate } : { result, approximate, reason };
}

export type AudioMode = 'clip' | 'tts' | 'silent';

export interface AudioService {
  preload(keys: readonly string[]): Promise<void>;
  play(key: string): Promise<PlayResult>;
  playClip(clip: AudioClip): Promise<PlayResult>;
  playSequence(clips: readonly AudioClip[]): Promise<PlayResult>;
  /** Gerekte/gehakte klankreeks van een woord (audio/blends/<woord>.mp3). */
  playStretched(word: string): Promise<PlayResult>;
  stop(): void;
  isAvailable(): boolean;
  readonly mode: AudioMode;
}

export interface AudioClipSource {
  getClip(key: string): AudioClip | undefined;
}

export interface SpeechVoiceLike {
  lang: string;
  localService?: boolean;
  name?: string;
}

export interface SpeechSynthesisLike {
  speak(utterance: unknown): void;
  cancel(): void;
  getVoices(): SpeechVoiceLike[];
  addEventListener?(type: 'voiceschanged', listener: () => void): void;
  removeEventListener?(type: 'voiceschanged', listener: () => void): void;
  onvoiceschanged?: (() => void) | null;
}

export interface AudioServiceOptions {
  /** Bron van clips op key (meestal gebouwd uit de content). */
  source?: AudioClipSource;
  /** Injecteerbaar element (tests); null = geen clip-afspeler. */
  createElement?: (src: string) => HTMLAudioElement | null;
  /** Of opgenomen clips afspeelbaar zijn (default: Audio beschikbaar). */
  clipCapable?: boolean;
  /** Injecteerbare Web Speech API (tests). */
  speech?: SpeechSynthesisLike | null;
  /** Injecteerbare utterance-factory (tests). */
  createUtterance?: (text: string, lang: string) => unknown;
  /** Callback bij stilte-fallback, zodat de UI visuele ondersteuning toont. */
  onFallback?: (key: string, reason: string) => void;
  /** Kinds die via TTS mogen als er geen opname is. */
  ttsKinds?: readonly AudioClip['kind'][];
  /** Hoe lang (ms) te wachten op `voiceschanged` als `getVoices()` leeg is. */
  voiceWaitMs?: number;
  /** Timeout (ms) voor het laden/afspelen van een clip. */
  elementTimeoutMs?: number;
  /** Pauze (ms) tussen klank-hints bij een gerekte reeks. */
  hintPauseMs?: number;
  /** Injecteerbare pauze (tests). */
  delay?: (ms: number) => Promise<void>;
}

/**
 * Kinds die via TTS mogen. Losse klanken (`grapheme-sound`) horen hier alleen
 * als **tijdelijke, gemarkeerde** benadering (EDU-001/ED §13.1) bij; de
 * `approximate`-vlag waarschuwt de UI.
 */
const DEFAULT_TTS_KINDS: readonly AudioClip['kind'][] = [
  'word',
  'sightword',
  'feedback',
  'instruction',
  'sentence',
  'grapheme-sound',
  'grapheme-name',
  'grapheme-example',
];

/** Kinds waarvan TTS een benadering is (losse klank / gerekte reeks). */
const APPROXIMATE_TTS_KINDS: ReadonlySet<AudioClip['kind']> = new Set([
  'grapheme-sound',
  'blend',
]);

/**
 * Alleen relatieve, same-origin paden toestaan (privacy, ARCHITECTURE §6/§8).
 * De implementatie staat in `src/audio/localSrc.ts` en wordt gedeeld met
 * `SessionPlanner.readAudio` (resume-src-validatie), zodat runtime-audio en
 * hervatte audio dezelfde bron accepteren (SEC-R3-005).
 */

function isLocalDutchVoice(voice: SpeechVoiceLike): boolean {
  return voice.localService === true && /^nl(-|_)?/i.test(voice.lang ?? '');
}

function defaultUtterance(text: string, lang: string): unknown {
  const Ctor = (globalThis as { SpeechSynthesisUtterance?: new (t: string) => unknown }).SpeechSynthesisUtterance;
  if (typeof Ctor === 'function') {
    const utterance = new Ctor(text) as { lang?: string };
    utterance.lang = lang;
    return utterance;
  }
  return { text, lang };
}

const OUTCOME_RANK: Readonly<Record<PlayOutcome, number>> = { unavailable: 0, tts: 1, file: 2 };

function betterOutcome(a: PlayOutcome, b: PlayOutcome): PlayOutcome {
  return OUTCOME_RANK[b] > OUTCOME_RANK[a] ? b : a;
}

/** Splitst een hint-reeks ("k-a-mmm", "k … a … m") in losse klank-hints. */
export function splitSoundHints(text: string | undefined): string[] {
  if (!text) return [];
  return text
    .split(/\s*(?:[·•\-–—…]|\s)\s*/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

export function createAudioService(options: AudioServiceOptions = {}): AudioService {
  const ttsKinds = options.ttsKinds ?? DEFAULT_TTS_KINDS;
  const voiceWaitMs = options.voiceWaitMs ?? 1200;
  const elementTimeoutMs = options.elementTimeoutMs ?? 15000;
  const hintPauseMs = options.hintPauseMs ?? 220;
  const delay = options.delay ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
  const speech =
    options.speech !== undefined
      ? options.speech
      : typeof speechSynthesis !== 'undefined'
        ? (speechSynthesis as unknown as SpeechSynthesisLike)
        : null;

  const elementFactory =
    options.createElement ??
    (typeof Audio !== 'undefined' ? (src: string) => new Audio(src) : () => null);
  const clipCapable =
    options.clipCapable ?? (options.createElement !== undefined ? true : typeof Audio !== 'undefined');

  let current: HTMLAudioElement | null = null;
  let lastResult: AudioMode | null = null;
  /** Onthoud per sessie welke src's ontbraken, om herhaalde 404-pogingen te vermijden. */
  const missingSrcs = new Set<string>();

  function canTts(clip: AudioClip): boolean {
    return ttsKinds.includes(clip.kind) && typeof clip.text === 'string' && clip.text.length > 0;
  }

  function localVoiceNow(): SpeechVoiceLike | undefined {
    if (!speech) return undefined;
    let voices: SpeechVoiceLike[] = [];
    try {
      voices = speech.getVoices() ?? [];
    } catch {
      return undefined;
    }
    return voices.find(isLocalDutchVoice);
  }

  /**
   * Zoekt een lokale nl-NL stem. Is `getVoices()` nog leeg (vaak bij de eerste
   * aanroep), dan wachten we kort op `voiceschanged`. Er wordt **nooit** een
   * default-/cloudstem gekozen.
   */
  async function resolveLocalVoice(): Promise<SpeechVoiceLike | undefined> {
    const immediate = localVoiceNow();
    if (immediate) return immediate;
    if (!speech) return undefined;
    let voices: SpeechVoiceLike[] = [];
    try {
      voices = speech.getVoices() ?? [];
    } catch {
      return undefined;
    }
    // Stemmenlijst is gevuld maar bevat geen lokale nl-stem: niet wachten.
    if (voices.length > 0) return undefined;
    if (voiceWaitMs <= 0) return undefined;

    return await new Promise<SpeechVoiceLike | undefined>((resolve) => {
      let done = false;
      let timer: ReturnType<typeof setTimeout> | undefined;
      const finish = (value: SpeechVoiceLike | undefined): void => {
        if (done) return;
        done = true;
        if (timer !== undefined) clearTimeout(timer);
        if (typeof speech.removeEventListener === 'function') {
          speech.removeEventListener('voiceschanged', onChange);
        } else if (speech.onvoiceschanged === onChange) {
          speech.onvoiceschanged = null;
        }
        resolve(value ?? localVoiceNow());
      };
      const onChange = (): void => finish(localVoiceNow());
      timer = setTimeout(() => finish(undefined), voiceWaitMs);
      if (typeof speech.addEventListener === 'function') {
        speech.addEventListener('voiceschanged', onChange);
      } else {
        speech.onvoiceschanged = onChange;
      }
    });
  }

  async function speak(clip: AudioClip): Promise<boolean> {
    if (!canTts(clip)) return false;
    const voice = await resolveLocalVoice();
    if (!speech || !voice) return false;
    const factory = options.createUtterance ?? defaultUtterance;
    try {
      const utterance = factory(clip.text ?? '', voice.lang);
      if (utterance && typeof utterance === 'object') {
        (utterance as { voice?: unknown }).voice = voice;
      }
      speech.speak(utterance);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Speelt één opname af. Succesvol alleen wanneer het bestand echt laadt en
   * afspeelt; bij `error`/reject/timeout volgt `false` (EDU-001).
   */
  async function playElement(src: string): Promise<boolean> {
    let element: HTMLAudioElement | null = null;
    try {
      element = elementFactory(src);
    } catch {
      element = null;
    }
    if (!element) return false;
    current = element;
    return await new Promise<boolean>((resolve) => {
      let settled = false;
      let timer: ReturnType<typeof setTimeout> | undefined;
      const detach = (): void => {
        if (typeof element?.removeEventListener !== 'function') return;
        element.removeEventListener('canplaythrough', succeed);
        element.removeEventListener('playing', succeed);
        element.removeEventListener('loadeddata', succeed);
        element.removeEventListener('ended', succeed);
        element.removeEventListener('error', fail);
      };
      const succeed = (): void => {
        if (settled) return;
        settled = true;
        if (timer !== undefined) clearTimeout(timer);
        detach();
        resolve(true);
      };
      const fail = (): void => {
        if (settled) return;
        settled = true;
        if (timer !== undefined) clearTimeout(timer);
        detach();
        resolve(false);
      };
      if (typeof element?.addEventListener === 'function') {
        element.addEventListener('canplaythrough', succeed);
        element.addEventListener('playing', succeed);
        element.addEventListener('loadeddata', succeed);
        element.addEventListener('ended', succeed);
        element.addEventListener('error', fail);
      }
      timer = setTimeout(fail, elementTimeoutMs);
      try {
        const maybe = element?.play();
        if (maybe && typeof (maybe as Promise<void>).then === 'function') {
          (maybe as Promise<void>).then(succeed).catch(fail);
        }
      } catch {
        fail();
      }
    });
  }

  async function runClip(clip: AudioClip): Promise<PlayResult> {
    stop();
    const hasSrc = clip.src.length > 0 && isLocalAudioSrc(clip.src);
    if (clipCapable && hasSrc && !missingSrcs.has(clip.src)) {
      const played = await playElement(clip.src);
      if (played) {
        lastResult = 'clip';
        return playResult('file');
      }
      missingSrcs.add(clip.src);
    }
    if (await speak(clip)) {
      lastResult = 'tts';
      return playResult('tts', APPROXIMATE_TTS_KINDS.has(clip.kind));
    }
    let reason: string;
    if (!hasSrc) reason = 'no-audio-available';
    else if (missingSrcs.has(clip.src)) reason = 'clip-missing';
    else reason = 'no-voice-available';
    options.onFallback?.(clip.key, reason);
    lastResult = 'silent';
    return playResult('unavailable', false, reason);
  }

  async function playHintSequence(word: string, hints: readonly string[]): Promise<PlayResult> {
    let best: PlayOutcome = 'unavailable';
    let reason: string | undefined;
    for (let i = 0; i < hints.length; i++) {
      const clip: AudioClip = {
        key: `blend.${word}.${i}`,
        src: '',
        text: hints[i] ?? '',
        kind: 'grapheme-sound',
      };
      const result = await runClip(clip);
      best = betterOutcome(best, result.result);
      if (result.reason !== undefined) reason = result.reason;
      if (i < hints.length - 1 && hintPauseMs > 0) await delay(hintPauseMs);
    }
    // Alleen een echte TTS-weergave is een "benadering"; bij volledige stilte
    // (geen stem) is approximate onwaar (EDU-R2-007).
    return playResult(best, best === 'tts', reason);
  }

  function stop(): void {
    if (current) {
      try {
        current.pause();
        current.currentTime = 0;
      } catch {
        /* negeren: stoppen mag nooit crashen */
      }
      current = null;
    }
    try {
      speech?.cancel();
    } catch {
      /* negeren */
    }
  }

  return {
    get mode(): AudioMode {
      if (lastResult === 'clip') return 'clip';
      if (lastResult === 'tts') return 'tts';
      if (lastResult === 'silent') return 'silent';
      if (clipCapable) return 'clip';
      if (localVoiceNow()) return 'tts';
      return 'silent';
    },
    async preload(keys: readonly string[]): Promise<void> {
      // Stemmen warm maken; clips worden door de browser geladen bij play.
      try {
        speech?.getVoices();
      } catch {
        /* negeren */
      }
      if (!clipCapable) return;
      for (const key of keys) {
        const clip = options.source?.getClip(key);
        if (clip && isLocalAudioSrc(clip.src)) {
          try {
            elementFactory(clip.src);
          } catch {
            /* negeren */
          }
        }
      }
    },
    async play(key: string): Promise<PlayResult> {
      const clip = options.source?.getClip(key);
      if (!clip) {
        options.onFallback?.(key, 'clip-not-found');
        lastResult = 'silent';
        return playResult('unavailable', false, 'clip-not-found');
      }
      return runClip(clip);
    },
    playClip: runClip,
    async playSequence(clips: readonly AudioClip[]): Promise<PlayResult> {
      let best: PlayOutcome = 'unavailable';
      let approximate = false;
      let reason: string | undefined;
      for (const clip of clips) {
        const result = await runClip(clip);
        best = betterOutcome(best, result.result);
        approximate = approximate || result.approximate;
        if (result.reason !== undefined) reason = result.reason;
      }
      return playResult(best, approximate, reason);
    },
    async playStretched(word: string): Promise<PlayResult> {
      const key = `blend.${word}`;
      const blend: AudioClip =
        options.source?.getClip(key) ?? {
          key,
          src: `audio/blends/${word}.mp3`,
          text: word,
          kind: 'blend',
        };

      // 1. Echte gerekte opname heeft altijd de voorkeur.
      if (clipCapable && isLocalAudioSrc(blend.src) && !missingSrcs.has(blend.src)) {
        const played = await playElement(blend.src);
        if (played) {
          lastResult = 'clip';
          return playResult('file');
        }
        missingSrcs.add(blend.src);
      }

      // 2. Anders: losse klank-hints na elkaar met korte pauzes (benadering).
      const hints = splitSoundHints(blend.text);
      if (hints.length > 1) {
        return playHintSequence(word, hints);
      }

      // 3. Laatste redmiddel: het hele woord als benadering.
      return runClip({
        key,
        src: '',
        text: blend.text ?? word,
        kind: 'grapheme-sound',
      });
    },
    stop,
    isAvailable(): boolean {
      return clipCapable || localVoiceNow() !== undefined;
    },
  };
}

// ---------------------------------------------------------------------------
// Mock (tests)
// ---------------------------------------------------------------------------

export interface MockAudioService extends AudioService {
  readonly played: string[];
  readonly clips: readonly AudioClip[];
  readonly sequences: readonly (readonly string[])[];
  readonly stopped: number;
  readonly lastMode: AudioMode;
  setAvailable(value: boolean): void;
  setResult(value: PlayResult): void;
}

function modeFor(result: PlayResult): AudioMode {
  if (result.result === 'file') return 'clip';
  if (result.result === 'tts') return 'tts';
  return 'silent';
}

/** Volledig in-memory mock: geen DOM, geen TTS, deterministisch. */
export function createMockAudioService(
  options: { available?: boolean; mode?: AudioMode; result?: PlayResult } = {},
): MockAudioService {
  const played: string[] = [];
  const clips: AudioClip[] = [];
  const sequences: string[][] = [];
  let available = options.available ?? true;
  let result: PlayResult = options.result ?? playResult('file');
  let lastMode: AudioMode = options.mode ?? 'clip';
  let stoppedCount = 0;

  const record = (clip: AudioClip): PlayResult => {
    played.push(clip.key);
    clips.push(clip);
    lastMode = modeFor(result);
    return result;
  };

  return {
    played,
    clips,
    sequences,
    get stopped() {
      return stoppedCount;
    },
    get lastMode() {
      return lastMode;
    },
    get mode() {
      return lastMode;
    },
    setAvailable(value: boolean) {
      available = value;
    },
    setResult(value: PlayResult) {
      result = value;
    },
    async preload(keys: readonly string[]) {
      void keys;
    },
    async play(key: string) {
      played.push(key);
      lastMode = modeFor(result);
      return result;
    },
    async playClip(clip: AudioClip) {
      return record(clip);
    },
    async playSequence(list: readonly AudioClip[]) {
      sequences.push(list.map((c) => c.key));
      let last: PlayResult = playResult('unavailable');
      for (const clip of list) last = record(clip);
      return list.length === 0 ? playResult('unavailable') : last;
    },
    async playStretched(word: string) {
      return record({ key: `blend.${word}`, src: `audio/blends/${word}.mp3`, text: word, kind: 'blend' });
    },
    stop() {
      stoppedCount += 1;
    },
    isAvailable() {
      return available;
    },
  };
}

export type { AudioClip };
