/**
 * AudioService (ARCHITECTURE §6).
 * Volgorde: opgenomen clip -> Web Speech API nl-NL (ALLEEN localService===true)
 * -> stil (visuele fallback). Zonder audio crasht het spel nooit en er gaat
 * nooit een netwerkverzoek naar een externe host.
 *
 * Losse klanken/gerekte reeksen zijn in de praktijk opnames; TTS is alleen
 * een ontwikkel-/noodfallback voor hele woorden/feedback (ED §13.1).
 */
import type { AudioClip } from '../types';

export type PlayResult = 'played-clip' | 'played-tts' | 'silent';
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
}

const DEFAULT_TTS_KINDS: readonly AudioClip['kind'][] = [
  'word',
  'sightword',
  'feedback',
  'instruction',
];

/** Alleen relatieve, same-origin paden toestaan (privacy, ARCHITECTURE §6/§8). */
export function isLocalAudioSrc(src: string): boolean {
  if (!src) return false;
  if (src.startsWith('//')) return false;
  return !/^[a-z][a-z0-9+.-]*:/i.test(src);
}

function hasLocalDutchVoice(speech: SpeechSynthesisLike | null): SpeechVoiceLike | undefined {
  if (!speech) return undefined;
  let voices: SpeechVoiceLike[] = [];
  try {
    voices = speech.getVoices();
  } catch {
    return undefined;
  }
  return voices.find((v) => v.localService === true && /^nl(-|_)?/i.test(v.lang ?? ''));
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

export function createAudioService(options: AudioServiceOptions = {}): AudioService {
  const ttsKinds = options.ttsKinds ?? DEFAULT_TTS_KINDS;
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

  function canTts(clip: AudioClip): boolean {
    return ttsKinds.includes(clip.kind) && typeof clip.text === 'string' && clip.text.length > 0;
  }

  function speak(clip: AudioClip): boolean {
    const voice = hasLocalDutchVoice(speech);
    if (!speech || !voice || !canTts(clip)) return false;
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

  async function playElement(src: string): Promise<boolean> {
    let element: HTMLAudioElement | null = null;
    try {
      element = elementFactory(src);
    } catch {
      element = null;
    }
    if (!element) return false;
    current = element;
    try {
      await new Promise<void>((resolve) => {
        let settled = false;
        const finish = (): void => {
          if (settled) return;
          settled = true;
          if (typeof element?.removeEventListener === 'function') {
            element.removeEventListener('ended', finish);
            element.removeEventListener('error', finish);
          }
          resolve();
        };
        if (typeof element?.addEventListener === 'function') {
          element.addEventListener('ended', finish);
          element.addEventListener('error', finish);
        }
        try {
          const maybe = element?.play();
          if (maybe && typeof (maybe as Promise<void>).catch === 'function') {
            (maybe as Promise<void>).catch(finish);
          }
        } catch {
          finish();
        }
        // Veiligheidsnet: als het element geen events vuurt, niet oneindig wachten.
        setTimeout(finish, 15000);
      });
    } catch {
      return false;
    }
    return true;
  }

  async function playClip(clip: AudioClip): Promise<PlayResult> {
    stop();
    if (clipCapable && isLocalAudioSrc(clip.src) && clip.src) {
      const played = await playElement(clip.src);
      if (played) {
        lastResult = 'clip';
        return 'played-clip';
      }
    }
    if (speak(clip)) {
      lastResult = 'tts';
      return 'played-tts';
    }
    options.onFallback?.(clip.key, 'no-audio-available');
    lastResult = 'silent';
    return 'silent';
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
      if (hasLocalDutchVoice(speech)) return 'tts';
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
        return 'silent';
      }
      return playClip(clip);
    },
    playClip,
    async playSequence(clips: readonly AudioClip[]): Promise<PlayResult> {
      let result: PlayResult = 'silent';
      for (const clip of clips) {
        const currentResult = await playClip(clip);
        if (currentResult !== 'silent') result = currentResult;
      }
      return result;
    },
    async playStretched(word: string): Promise<PlayResult> {
      const key = `blend.${word}`;
      const clip: AudioClip =
        options.source?.getClip(key) ?? {
          key,
          src: `audio/blends/${word}.mp3`,
          text: word,
          kind: 'blend',
        };
      return playClip(clip);
    },
    stop,
    isAvailable(): boolean {
      return clipCapable || hasLocalDutchVoice(speech) !== undefined;
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

/** Volledig in-memory mock: geen DOM, geen TTS, deterministisch. */
export function createMockAudioService(
  options: { available?: boolean; mode?: AudioMode; result?: PlayResult } = {},
): MockAudioService {
  const played: string[] = [];
  const clips: AudioClip[] = [];
  const sequences: string[][] = [];
  let available = options.available ?? true;
  let result: PlayResult = options.result ?? 'played-clip';
  let lastMode: AudioMode = options.mode ?? 'clip';
  let stoppedCount = 0;

  const record = (clip: AudioClip): PlayResult => {
    played.push(clip.key);
    clips.push(clip);
    lastMode = result === 'played-clip' ? 'clip' : result === 'played-tts' ? 'tts' : 'silent';
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
      lastMode = result === 'played-clip' ? 'clip' : result === 'played-tts' ? 'tts' : 'silent';
      return result;
    },
    async playClip(clip: AudioClip) {
      return record(clip);
    },
    async playSequence(list: readonly AudioClip[]) {
      sequences.push(list.map((c) => c.key));
      let last: PlayResult = 'silent';
      for (const clip of list) last = record(clip);
      return list.length === 0 ? 'silent' : last;
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
