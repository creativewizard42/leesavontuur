/**
 * Canonieke klankreeksen (reviewfix set B): één helper voor spreek- en
 * weergavevorm, en consistentie tussen de audiomanifest en de runtime-clips.
 */
import { describe, expect, it } from 'vitest';
import type { ActivityItem } from '../../types';
import {
  audioManifest,
  fbText,
  formatSoundSequence,
  words,
} from '../index';
import { checkAnswer } from '../../learning/answer';
import { buildClipIndex } from '../../ui/audioClips';

describe('formatSoundSequence', () => {
  it('maakt dezelfde klanken in dezelfde volgorde in spreek- en weergavevorm', () => {
    expect(formatSoundSequence(['k', 'a', 'm'], 'speech')).toBe('k … a … mmm');
    expect(formatSoundSequence(['k', 'a', 'm'], 'display')).toBe('k - a - mmm');
    // Default is de spreekvorm.
    expect(formatSoundSequence(['k', 'a', 'm'])).toBe('k … a … mmm');
  });

  it('laat onbekende ids (al opgeloste klank-hints) ongewijzigd', () => {
    expect(formatSoundSequence(['k', 'a', 'mmm'], 'display')).toBe('k - a - mmm');
  });
});

describe('blend.<woord>: manifest en runtime-clipindex zijn identiek', () => {
  it('gebruikt voor elk woord exact dezelfde tekst', () => {
    const runtime = buildClipIndex();
    for (const w of words) {
      const manifestClip = audioManifest.find((c) => c.key === `blend.${w.word}`);
      const runtimeClip = runtime.get(`blend.${w.word}`);
      expect(runtimeClip?.text, w.word).toBe(manifestClip?.text);
      expect(manifestClip?.text, w.word).toBe(formatSoundSequence(w.graphemes, 'speech'));
    }
  });
});

describe('fb.specific.blend_retry: gesproken clip en getoonde tekst lopen gelijk', () => {
  function plakItem(): ActivityItem {
    return {
      id: 'test.plakken.kam',
      skillId: 'SY.CVC',
      kind: 'plakken',
      prompt: { text: 'kam', showText: true },
      options: [
        { id: 'kam', label: 'kam', correct: true },
        { id: 'kat', label: 'kat', correct: false },
      ],
      targetId: 'kam',
      difficulty: 'A',
      isRetry: false,
      itemKey: 'kam',
      metadata: { word: 'kam' },
    };
  }

  it('gebruikt dezelfde klankreeks (display) als de variantclip (speech)', () => {
    const result = checkAnswer(plakItem(), { optionId: 'kat', attempt: 1 });
    expect(result.feedbackKey).toBe('fb.specific.blend_retry');

    const expectedDisplay = formatSoundSequence(['k', 'a', 'm'], 'display');
    const expectedSpeech = formatSoundSequence(['k', 'a', 'm'], 'speech');
    expect(result.feedbackVars?.['sounds']).toBe(expectedDisplay);

    const clip = audioManifest.find((c) => c.key === 'fb.specific.blend_retry.kam');
    expect(clip, 'variantclip ontbreekt').toBeDefined();
    expect(clip?.text).toContain(expectedSpeech);

    const shown = fbText(result.feedbackKey, result.feedbackVars);
    expect(shown).toContain(expectedDisplay);
    expect(shown).not.toContain('{');
  });
});
