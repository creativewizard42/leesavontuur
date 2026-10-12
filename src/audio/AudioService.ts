/**
 * AudioService (ARCHITECTURE §6).
 * Volgorde: opgenomen clip -> Web Speech API nl-NL (ALLEEN localService===true)
 * -> stil (visuele fallback). Zonder audio crasht het spel nooit en er gaat
 * nooit een netwerkverzoek naar een externe host.
 *
 * Een clip geldt alleen als "gespeeld" wanneer het fragment is voltooid
 * (`ended`); bij `error`,
 * play()-reject of timeout volgt de TTS-fallback (EDU-001/QA-001).
 *
 * Voor deze bèta zijn expliciet gegenereerde Nederlandse klankbestanden
 * beschikbaar en als synthetisch gemarkeerd. Web Speech mag ontbrekende
 * klanken of klankreeksen niet als letterteksten uitspreken.
 */
import type { AudioClip } from '../types';
import { isLocalAudioSrc } from './localSrc';
import { needsHumanRecording } from './recordingPolicy';
import { GRAPHEMES } from '../content/graphemes';
import syntheticSources from './syntheticSources.json';

const syntheticFiles = new Set(syntheticSources);

function hintsToGraphemeId(hint: string): string {
  return GRAPHEMES.find(g => g.soundHint === hint || g.ttsHint === hint || g.id === hint)?.id ?? hint;
}

// SEC-R3-005: de src-validatie is gedeeld met `SessionPlanner.readAudio`
// (`src/audio/localSrc.ts`), zodat runtime-audio en hervatte audio hetzelfde
// oordeel geven. Hier opnieuw geëxporteerd voor bestaande importers/tests.
export { isLocalAudioSrc } from './localSrc';

/** Uitkomst: bestandsaudio (eventueel synthetisch), lokale TTS of niets. */
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
 * Kinds die via lokale TTS mogen. De opnamepolicy weigert daarnaast
 * instructies of feedback met ingebedde fonemen.
 */
const DEFAULT_TTS_KINDS: readonly AudioClip['kind'][] = [
  'word',
  'sightword',
  'feedback',
  'instruction',
  'sentence',
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
  const elementTimeoutMs = options.elementTimeoutMs ?? 60000;
  const hintPauseMs = options.hintPauseMs ?? 220;
  const delay = options.delay ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
  const speech =
    options.speech !== undefined
      ? options.speech
      : typeof speechSynthesis !== 'undefined'
        ? (speechSynthesis as unknown as SpeechSynthesisLike)
        : null;

  // Safari grants playback permission per media element. Reuse the player
  // unlocked by a tap for subsequent instructions, choices and feedback.
  let sharedElement: HTMLAudioElement | null = null;
  const elementFactory = options.createElement ?? ((src: string) => {
    if (typeof Audio === 'undefined') return null;
    sharedElement ??= new Audio();
    sharedElement.src = src;
    return sharedElement;
  });
  const clipCapable =
    options.clipCapable ?? (options.createElement !== undefined ? true : typeof Audio !== 'undefined');

  let current: HTMLAudioElement | null = null;
  let operation = 0;
  let cancelPlayback: (() => void) | null = null;
  let playbackFailure = 'media-error';
  let lastResult: AudioMode | null = null;

  function canTts(clip: AudioClip): boolean {
    return !needsHumanRecording(clip.key, clip.kind) && ttsKinds.includes(clip.kind) && typeof clip.text === 'string' && clip.text.length > 0;
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

  async function speak(clip: AudioClip, token: number): Promise<boolean> {
    if (!canTts(clip)) return false;
    const voice = await resolveLocalVoice();
    if (!speech || !voice || token !== operation) return false;
    const factory = options.createUtterance ?? defaultUtterance;
    return new Promise<boolean>(resolve => {
      let settled = false;
      const timer = setTimeout(() => { playbackFailure = 'timeout'; finish(false); }, elementTimeoutMs);
      function finish(ok: boolean): void {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        if (cancelPlayback === cancel) cancelPlayback = null;
        resolve(ok);
      }
      const cancel = (): void => finish(false);
      cancelPlayback = cancel;
      try {
        const utterance = factory(clip.text ?? '', voice.lang) as {
          voice?: unknown; onend?: () => void; onerror?: () => void;
        };
        utterance.voice = voice;
        utterance.onend = () => finish(true);
        utterance.onerror = () => finish(false);
        speech.speak(utterance);
      } catch { finish(false); }
    });
  }

  /** Resolve only on ended, never on loadeddata/playing/play() resolution. */
  async function playElement(src: string): Promise<boolean> {
    playbackFailure = 'media-error';
    let element: HTMLAudioElement | null;
    try { element = elementFactory(src); } catch { return false; }
    if (!element) return false;
    current = element;
    return new Promise<boolean>(resolve => {
      let settled = false;
      const timer = setTimeout(() => { playbackFailure = 'timeout'; finish(false); }, elementTimeoutMs);
      function finish(ok: boolean): void {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        element?.removeEventListener('ended', ended);
        element?.removeEventListener('error', failed);
        if (cancelPlayback === cancel) cancelPlayback = null;
        if (current === element) current = null;
        if (!ok) { try { element?.pause(); } catch { /* unsupported media */ } }
        resolve(ok);
      }
      const ended = (): void => finish(true);
      const failed = (error?: unknown): void => {
        playbackFailure = error && typeof error === 'object' && 'name' in error && error.name === 'NotAllowedError'
          ? 'gesture-required' : 'media-error';
        finish(false);
      };
      const cancel = (): void => finish(false);
      cancelPlayback = cancel;
      element?.addEventListener('ended', ended);
      element?.addEventListener('error', failed);
      try { void element?.play()?.catch(failed); } catch (error) { failed(error); }
    });
  }

  async function runClip(clip: AudioClip, token: number): Promise<PlayResult> {
    if (token !== operation) return playResult('unavailable', false, 'cancelled');
    const hasSrc = clip.src.length > 0 && isLocalAudioSrc(clip.src);
    if (clipCapable && hasSrc) {
      const played = await playElement(clip.src);
      if (token !== operation) return playResult('unavailable', false, 'cancelled');
      if (played) {
        lastResult = 'clip';
        return playResult('file', syntheticFiles.has(clip.src));
      }
      // Autoplay failures can be retried after a gesture; do not memoize them.
    }
    if (await speak(clip, token)) {
      lastResult = 'tts';
      return playResult('tts', APPROXIMATE_TTS_KINDS.has(clip.kind));
    }
    if (token !== operation) return playResult('unavailable', false, 'cancelled');
    const reason = hasSrc ? playbackFailure : 'no-audio-available';
    options.onFallback?.(clip.key, reason);
    lastResult = 'silent';
    return playResult('unavailable', false, reason);
  }

  async function playRecordedSounds(word: string, hints: readonly string[], token: number): Promise<PlayResult> {
    const sounds = hints.map(hint => options.source?.getClip(`lk.${hint}.sound`));
    if (sounds.some(sound => !sound)) return playResult('unavailable', false, 'recording-required');
    let outcome: PlayOutcome = 'file';
    let approximate = false;
    for (let i = 0; i < sounds.length; i++) {
      if (token !== operation) return playResult('unavailable', false, 'cancelled');
      const sound = sounds[i];
      if (!sound) continue;
      const result = await runClip(sound, token);
      approximate = approximate || result.approximate;
      if (result.result !== 'file') outcome = 'unavailable';
      if (i < sounds.length - 1 && hintPauseMs > 0) await delay(hintPauseMs);
    }
    return playResult(outcome, approximate, outcome === 'unavailable' ? `recording-required:${word}` : undefined);
  }

  function stop(): void {
    operation += 1;
    cancelPlayback?.();
    cancelPlayback = null;
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
      // The service worker preloads files. Changing the shared player's src
      // here would interrupt a running clip and invalidate Safari permission.
      void keys;
    },
    async play(key: string): Promise<PlayResult> {
      stop();
      const clip = options.source?.getClip(key);
      if (!clip) {
        options.onFallback?.(key, 'clip-not-found');
        lastResult = 'silent';
        return playResult('unavailable', false, 'clip-not-found');
      }
      return runClip(clip, operation);
    },
    playClip(clip) {
      stop();
      return runClip(clip, operation);
    },
    async playSequence(clips: readonly AudioClip[]): Promise<PlayResult> {
      stop();
      const token = operation;
      let best: PlayOutcome = 'file';
      let approximate = false;
      let reason: string | undefined;
      for (const clip of clips) {
        if (token !== operation) return playResult('unavailable', false, 'cancelled');
        const result = await runClip(clip, token);
        if (OUTCOME_RANK[result.result] < OUTCOME_RANK[best]) best = result.result;
        approximate = approximate || result.approximate;
        if (result.reason !== undefined) reason = result.reason;
      }
      return playResult(best, approximate, reason);
    },
    async playStretched(word: string): Promise<PlayResult> {
      stop();
      const token = operation;
      const key = `blend.${word}`;
      const blend: AudioClip =
        options.source?.getClip(key) ?? {
          key,
          src: `audio/blends/${word}.mp3`,
          text: word,
          kind: 'blend',
        };

      // 1. Echte gerekte opname heeft altijd de voorkeur.
      if (clipCapable && isLocalAudioSrc(blend.src)) {
        const played = await playElement(blend.src);
        if (token !== operation) return playResult('unavailable', false, 'cancelled');
        if (played) {
          lastResult = 'clip';
          return playResult('file', syntheticFiles.has(blend.src));
        }

      }

      // A sequence of genuine recorded phonemes is a supported fallback.
      // Synthetic phonemes/letter names can teach the wrong sounds.
      const graphemeIds = splitSoundHints(blend.text).map(hint => {
        const entries = hintsToGraphemeId(hint);
        return entries;
      });
      return playRecordedSounds(word, graphemeIds, token);
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
