/**
 * Bouwt een audio-clipindex uit de content-API en levert een AudioService
 * (ARCHITECTURE §6). Alles same-origin; geen netwerk, geen cloud-TTS.
 */
import type { AudioClip } from '../types';
import { content, getGrapheme, getWord, graphemes, instructions, properNames, sentences, sightWords } from '../content';
import {
  createAudioService,
  type AudioService,
  type AudioServiceOptions,
} from '../audio/AudioService';

function blendText(word: string): string {
  const w = getWord(word);
  if (w) return w.graphemes.map((id) => getGrapheme(id)?.soundHint ?? id).join('-');
  return word;
}

/** Index van alle clips op key, inclusief beide blend-key-conventies. */
export function buildClipIndex(): Map<string, AudioClip> {
  const map = new Map<string, AudioClip>();
  const put = (clip: AudioClip | undefined): void => {
    if (clip && !map.has(clip.key)) map.set(clip.key, clip);
  };

  for (const g of graphemes) {
    put(g.audio?.sound);
    put(g.audio?.name);
    put(g.audio?.example);
  }
  for (const w of content.words) {
    put(w.audio);
    const blend: AudioClip = {
      key: `blend.${w.word}`,
      src: `audio/blends/${w.word}.mp3`,
      text: blendText(w.word),
      kind: 'blend',
    };
    put(blend);
    if (!map.has(`bl.${w.word}`)) map.set(`bl.${w.word}`, blend);
  }
  for (const sw of sightWords) put(sw.audio);
  for (const s of sentences) {
    put(s.audio);
    put(s.comprehension?.questionAudio);
  }
  for (const pn of properNames) put(pn.audio);
  for (const [key, text] of Object.entries(content.feedback)) {
    put({ key, src: `audio/feedback/${key}.mp3`, text, kind: 'feedback' });
  }
  for (const [key, text] of Object.entries(instructions)) {
    put({ key, src: `audio/feedback/${key}.mp3`, text, kind: 'instruction' });
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
