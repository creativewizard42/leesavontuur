/**
 * AudioService (ARCHITECTURE §6).
 * Volgorde: opgenomen clip -> Web Speech API nl-NL (ALLEEN localService===true)
 * -> stil (visuele fallback). Zonder audio crasht het spel nooit.
 *
 * TODO(Builder): implementeer clip-loader en lokale TTS-selectie (privacy:
 * nooit cloud-TTS). Vóór release zijn echte opnames verplicht (ED §13.1).
 */
import type { AudioClip } from '../types';

export type PlayResult = 'played-clip' | 'played-tts' | 'silent';
export type AudioMode = 'clip' | 'tts' | 'silent';

export interface AudioService {
  preload(keys: readonly string[]): Promise<void>;
  play(key: string): Promise<PlayResult>;
  stop(): void;
  isAvailable(): boolean;
  readonly mode: AudioMode;
}

/** Stub: doet niets en is altijd beschikbaar als `silent`. */
export function createAudioService(): AudioService {
  let mode: AudioMode = 'silent';
  return {
    get mode() {
      return mode;
    },
    async preload(_keys: readonly string[]): Promise<void> {
      void _keys;
    },
    async play(_key: string): Promise<PlayResult> {
      void _key;
      mode = 'silent';
      return 'silent';
    },
    stop(): void {
      mode = 'silent';
    },
    isAvailable(): boolean {
      return false;
    },
  };
}

export type { AudioClip };
