import type { AudioClip } from '../types';
import { GRAPHEMES } from './graphemes';
import { WORDS } from './words';
import { SIGHT_WORDS } from './sightWords';
import { SENTENCES } from './sentences';
import { PROPER_NAMES } from './properNames';
import { FEEDBACK } from './feedback';
import { INSTRUCTIONS, hasPlaceholders } from './instructions';
import {
  feedbackVariantClips,
  instructionVariantClips,
} from './dynamicClips';

/**
 * Volledige opnamelijst voor audio (ARCHITECTURE §6.2, GD §11.2, EDU-009/EDU-022).
 *
 * Er zijn nog **geen** opnames; elke clip heeft daarom een `text` (TTS/aria
 * fallback). Losse klanken en gerekte reeksen blijven in dit spel altijd echte
 * opnames (ED §13 regel 1): de `text` hier is enkel de ontwikkel-/noodfallback.
 *
 * Gerekte reeksen gebruiken één canonieke key-conventie (`blend.<woord>`) en
 * expliciete pauzes tussen de klank-hints ("k … a … mmm"), zodat de TTS-fallback
 * en de opnamelijst dezelfde tekst delen.
 */
function blendText(graphemes: readonly string[]): string {
  const byId = new Map(GRAPHEMES.map((g) => [g.id, g]));
  return graphemes
    .map((id) => byId.get(id)?.soundHint ?? id)
    .join(' … ');
}

export function buildAudioManifest(): AudioClip[] {
  const clips = new Map<string, AudioClip>();
  const put = (clip: AudioClip): void => {
    if (!clips.has(clip.key)) clips.set(clip.key, clip);
  };

  for (const g of GRAPHEMES) {
    if (g.audio?.name) put(g.audio.name);
    if (g.audio?.sound) put(g.audio.sound);
    if (g.audio?.example) put(g.audio.example);
  }

  for (const w of WORDS) {
    if (w.audio) put(w.audio);
    put({
      key: `blend.${w.word}`,
      src: `audio/blends/${w.word}.mp3`,
      text: blendText(w.graphemes),
      kind: 'blend',
    });
  }

  for (const pn of PROPER_NAMES) put(pn.audio);

  for (const sw of SIGHT_WORDS) {
    if (sw.audio) put(sw.audio);
  }

  for (const s of SENTENCES) {
    if (s.audio) put(s.audio);
    if (s.comprehension?.questionAudio) put(s.comprehension.questionAudio);
  }

  for (const [key, text] of Object.entries(FEEDBACK)) {
    if (hasPlaceholders(text)) continue; // varianten via feedbackVariantClips()
    put({ key, src: `audio/feedback/${key}.mp3`, text, kind: 'feedback' });
  }

  for (const [key, text] of Object.entries(INSTRUCTIONS)) {
    if (hasPlaceholders(text)) continue; // varianten via instructionVariantClips()
    put({ key, src: `audio/feedback/${key}.mp3`, text, kind: 'instruction' });
  }

  // Concrete varianten per variabele (EDU-R2-002): geen {placeholders} in de lijst.
  for (const clip of feedbackVariantClips()) put(clip);
  for (const clip of instructionVariantClips()) put(clip);

  return [...clips.values()];
}

export const AUDIO_MANIFEST: readonly AudioClip[] = buildAudioManifest();
