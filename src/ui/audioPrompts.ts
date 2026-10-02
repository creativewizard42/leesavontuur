/**
 * Audio-instructies voor de UI (EDU-R2-006).
 *
 * De Content-builder levert (ronde 2) `instructionClips(key, vars) -> AudioClip[]`
 * dat een sequentie van dragers + variabele clips teruggeeft. Zolang die functie
 * nog niet bestaat, valt de UI terug op één clip via `instructionClip`.
 *
 * Feature-detectie gebeurt via een namespace-import, zodat deze UI blijft
 * compileren tegen de huidige content-API (parallelle builders, ronde 2).
 */
import type { AudioClip } from '../types';
import * as contentApi from '../content';
import { instructionClip } from '../learning/util';

interface InstructionClipsApi {
  instructionClips?: (key: string, vars?: Record<string, string>) => unknown;
}

interface FeedbackClipsApi {
  feedbackClips?: (key: string, vars?: Record<string, string>) => unknown;
  fbText?: (key: string, vars?: Record<string, string>) => string;
}

function isAudioClip(value: unknown): value is AudioClip {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Partial<AudioClip>;
  return typeof candidate.key === 'string' && typeof candidate.src === 'string';
}

/**
 * Bouwt de spreekreeks voor een instructiesleutel. Leeg wanneer de sleutel nog
 * niet bestaat (dan tonen we niets in plaats van de key).
 */
export function instructionSequence(key: string, vars: Record<string, string> = {}): AudioClip[] {
  const api = contentApi as unknown as InstructionClipsApi;
  if (typeof api.instructionClips === 'function') {
    try {
      const clips = api.instructionClips(key, vars);
      if (Array.isArray(clips)) return clips.filter(isAudioClip);
    } catch {
      /* val terug op de enkelvoudige clip */
    }
  }
  const text = contentApi.instruction(key, vars);
  if (!text || text === key) return [];
  return [instructionClip(key, text)];
}

/**
 * Bouwt de spreekreeks voor een feedback-key (EDU-R3-002). Gebruikt de
 * content-API `feedbackClips` (met vars-variant); valt anders terug op één clip
 * met de al ingevulde feedbacktekst, zodat er nooit een `{placeholder}` wordt
 * uitgesproken of getoond.
 */
export function feedbackSequence(key: string, vars: Record<string, string> = {}): AudioClip[] {
  const api = contentApi as unknown as FeedbackClipsApi;
  if (typeof api.feedbackClips === 'function') {
    try {
      const clips = api.feedbackClips(key, vars);
      if (Array.isArray(clips)) return clips.filter(isAudioClip);
    } catch {
      /* val terug op de enkelvoudige clip */
    }
  }
  const text = api.fbText ? api.fbText(key, vars) : '';
  if (!text || text === key) return [];
  return [{ key, src: `audio/feedback/${key}.mp3`, text, kind: 'feedback' }];
}
