/**
 * EDU-016 / EDU-R2-002 / QA-R2-004: elke woordkeuze (generatoren + planner)
 * loopt via `allowedWordObjects` en mag nooit een niet-kindvriendelijk woord
 * (`kidFriendly:false`) of een geblokkeerd woord teruggeven.
 */
import { describe, expect, it } from 'vitest';
import type { Word } from '../../types';
import { words } from '../../content';
import { ALL_GRAPHEMES, allowedWordObjects, allowedWords } from '../util';

function word(word: string, graphemes: string[], kidFriendly: boolean): Word {
  return {
    word,
    graphemes,
    phonemes: graphemes.map(() => ''),
    pattern: 'CVC',
    phase: 5,
    block: 1,
    kidFriendly,
    audio: { key: `de.${word}`, src: `audio/words/${word}.mp3`, kind: 'word' },
  };
}

describe('allowedWordObjects – kindvriendelijk filter (EDU-016)', () => {
  it('sluit kidFriendly:false uit, ook als alle grafemen geleerd zijn', () => {
    const pool = [word('kam', ['k', 'a', 'm'], true), word('mak', ['m', 'a', 'k'], false)];
    const allowed = allowedWordObjects(new Set(['m', 'a', 'k']), pool);
    expect(allowed.map((w) => w.word)).toEqual(['kam']);
    expect(allowedWords(new Set(['m', 'a', 'k']), pool)).toEqual(['kam']);
  });

  it('levert voor de echte woordenbank nooit een niet-kindvriendelijk woord', () => {
    const allowed = allowedWordObjects(ALL_GRAPHEMES);
    expect(allowed.every((w) => w.kidFriendly)).toBe(true);
    expect(allowed.length).toBe(words.filter((w) => w.kidFriendly).length);
  });
});
