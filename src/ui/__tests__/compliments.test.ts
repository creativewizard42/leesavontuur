import { expect, it } from 'vitest';
import { createComplimentPicker } from '../compliments';
import { feedbackClips } from '../../content';
import { existsSync } from 'node:fs';

it('varies praise during a session without repeating or attributing untested reading skills', () => {
  const pick = createComplimentPicker();
  const keys = Array.from({ length: 16 }, () => pick('fb.correct.6'));
  expect(new Set(keys).size).toBeGreaterThanOrEqual(6);
  keys.forEach((key, index) => {
    expect(key).not.toBe(keys[index - 1]);
    expect(['fb.correct.4', 'fb.correct.5', 'fb.correct.7']).not.toContain(key);
    const clips = feedbackClips(key);
    expect(clips.length).toBeGreaterThan(0);
    for (const clip of clips) expect(existsSync(`public/${clip.src}`), clip.src).toBe(true);
  });
});
