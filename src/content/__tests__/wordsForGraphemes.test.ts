import { describe, expect, it } from 'vitest';
import { GRAPHEMES } from '../graphemes';
import { WORDS } from '../words';
import { wordsForGraphemes } from '../index';

const ALL = new Set(GRAPHEMES.map((g) => g.id));
const MVP = new Set(['m', 'a', 's', 't', 'k', 'r']);

describe('wordsForGraphemes – kindvriendelijk filter (QA-R2-004/EDU-016)', () => {
  it('bevat geen niet-kindvriendelijke woorden in de woordbank', () => {
    expect(WORDS.filter((w) => !w.kidFriendly)).toEqual([]);
  });

  it('sluit niet-kindvriendelijke woorden standaard uit', () => {
    const result = wordsForGraphemes(MVP);
    expect(result.length).toBeGreaterThanOrEqual(8);
    for (const w of result) {
      expect(w.kidFriendly, w.word).toBe(true);
    }
    expect(result.map((w) => w.word)).not.toContain('mak');
    expect(result.map((w) => w.word)).not.toContain('smak');
    expect(result.map((w) => w.word)).not.toContain('mars');
  });

  it('geeft met includeNotKidFriendly dezelfde set zolang alles kindvriendelijk is', () => {
    const base = wordsForGraphemes(ALL).map((w) => w.word);
    const all = wordsForGraphemes(ALL, { includeNotKidFriendly: true }).map((w) => w.word);
    expect(all).toEqual(base);
  });
});
