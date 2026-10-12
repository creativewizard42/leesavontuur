import { expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { graphemes, feedbackClips, instructionClips, audioManifest } from '../../content';
import { generate } from '../LetterSound';
import { checkAnswer } from '../answer';
import { createSeededRng } from '../../core/rng';

it('can play every letter instruction and each wrong-answer feedback level without browser TTS', () => {
  const manifest = new Set(audioManifest.map(c => c.src));
  const learned = new Set(graphemes.map(g => g.id));
  for (const g of graphemes) for (const direction of ['grapheme-to-sound', 'sound-to-grapheme'] as const) {
    const item = generate({ skillId: `LK.${g.id}.SOUND`, direction, targetGrapheme: g.id, learnedGraphemes: learned, difficulty: 'D', rng: createSeededRng(42) });
    const clips = instructionClips(item.prompt.audio!.key, { sound: g.id });
    for (const option of item.options) {
      if (option.audio) clips.push(option.audio);
      for (const attempt of [1, 2, 3]) {
        const answer = checkAnswer(item, { optionId: option.id, attempt });
        clips.push(...feedbackClips(answer.feedbackKey, answer.feedbackVars));
      }
    }
    for (const clip of clips) {
      expect(manifest.has(clip.src), clip.key).toBe(true);
      expect(existsSync(`public/${clip.src}`), clip.src).toBe(true);
    }
  }
});
