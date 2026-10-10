/**
 * Bouwt een audio-clipindex uit de content-API en levert een AudioService
 * (ARCHITECTURE §6). Alles same-origin; geen netwerk, geen cloud-TTS.
 */
import type { AudioClip } from '../types';
import { audioManifest } from '../content';
import {
  createAudioService,
  type AudioService,
  type AudioServiceOptions,
} from '../audio/AudioService';

/** Index van alle clips op key, inclusief beide blend-key-conventies. */
export function buildClipIndex(): Map<string, AudioClip> {
  const map = new Map<string, AudioClip>(audioManifest.map(clip => [clip.key, clip]));
  for (const clip of audioManifest) {
    if (clip.kind === 'blend') map.set(clip.key.replace(/^blend\./, 'bl.'), clip);
  }
  return map;
}

export interface AppAudio extends AudioService {
  readonly clips: Map<string, AudioClip>;
}

export interface CreateAudioOptions {
  /** Injecteerbare index (tests). */
  index?: Map<string, AudioClip>;
  clipCapable?: boolean;
  speech?: AudioServiceOptions['speech'];
  createElement?: AudioServiceOptions['createElement'];
  createUtterance?: AudioServiceOptions['createUtterance'];
  onFallback?: (key: string, reason: string) => void;
  ttsKinds?: AudioServiceOptions['ttsKinds'];
}

export function createAppAudio(options: CreateAudioOptions = {}): AppAudio {
  const { index, ...rest } = options;
  const clips = index ?? buildClipIndex();
  const service = createAudioService({
    source: { getClip: (key) => clips.get(key) },
    ...rest,
  });
  return Object.assign(service, { clips }) as AppAudio;
}
