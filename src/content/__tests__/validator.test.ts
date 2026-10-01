import { describe, expect, it } from 'vitest';
import {
  CURRENT_CONTENT,
  isWordAllowed,
  segmentWord,
  validateContent,
} from '../validator';
import type { ValidationIssue, WordPattern } from '../types';
import type { ContentBundleExt } from '../types';
import { isBlockedWord } from '../blocklist';
import { GRAPHEMES } from '../graphemes';

const MVP = new Set(['m', 'a', 's', 't', 'k', 'r']);

function clone(): ContentBundleExt {
  return structuredClone(CURRENT_CONTENT) as ContentBundleExt;
}

function errors(bundle: ContentBundleExt): ValidationIssue[] {
  return validateContent(bundle).issues.filter((i) => i.severity === 'error');
}

function rules(bundle: ContentBundleExt): string[] {
  return validateContent(bundle).issues.map((i) => i.rule);
}

function realImagePaths(): Set<string> {
  const set = new Set<string>();
  for (const w of CURRENT_CONTENT.words) {
    if (w.image) set.add(w.image);
  }
  return set;
}

describe('content – echte data', () => {
  it('valideert de huidige content zonder fouten', () => {
    const result = validateContent();
    const errorList = result.issues.filter((i) => i.severity === 'error');
    expect(errorList, JSON.stringify(errorList, null, 2)).toHaveLength(0);
    expect(result.ok).toBe(true);
  });

  it('bevat alle 37 grafemen plus de herkenningsletters in volgorde', () => {
    expect(GRAPHEMES).toHaveLength(41);
    for (let i = 0; i < GRAPHEMES.length; i++) {
      expect(GRAPHEMES[i]?.order).toBe(i + 1);
    }
  });

  it('heeft minstens 8 MVP-woorden, elk alleen uit m, a, s, t, k, r', () => {
    const mvp = CURRENT_CONTENT.words.filter((w) => w.isMvp === true);
    expect(mvp.length).toBeGreaterThanOrEqual(8);
    for (const w of mvp) {
      for (const g of w.graphemes) {
        expect(MVP.has(g), `${w.word} gebruikt ${g}`).toBe(true);
      }
    }
  });
});

describe('isWordAllowed', () => {
  it('laat "kat" toe met geleerde k, a, t', () => {
    expect(isWordAllowed('kat', new Set(['k', 'a', 't']))).toBe(true);
  });

  it('weigert "boom" met k, a, t (b en oo ontbreken)', () => {
    expect(isWordAllowed('boom', new Set(['k', 'a', 't']))).toBe(false);
  });

  it('weigert "kaas" met k, a, s zonder aa (tweetekenklank)', () => {
    expect(segmentWord('kaas', GRAPHEMES)).toEqual(['k', 'aa', 's']);
    expect(isWordAllowed('kaas', new Set(['k', 'a', 's']))).toBe(false);
    expect(isWordAllowed('kaas', new Set(['k', 'a', 's', 'aa']))).toBe(true);
  });

  it('weigert geblokkeerde woorden (ED §6.4)', () => {
    expect(isBlockedWord('kak')).toBe(true);
    expect(isWordAllowed('kak', MVP)).toBe(false);
  });

  it('segmenteert tweetekenklanken als één grafeem', () => {
    expect(segmentWord('muur', GRAPHEMES)).toEqual(['m', 'uu', 'r']);
  });
});

describe('validator – audio bij ontbrekende opnames', () => {
  it('maakt ontbrekende audio tot een waarschuwing, niet een fout', () => {
    const result = validateContent(clone(), { existingAssets: realImagePaths() });
    const errorList = result.issues.filter((i) => i.severity === 'error');
    expect(errorList, JSON.stringify(errorList, null, 2)).toHaveLength(0);
    expect(result.ok).toBe(true);
    expect(result.issues.some((i) => i.rule === 'AUDIO_ASSET_MISSING' && i.severity === 'warning')).toBe(true);
  });

  it('maakt een ontbrekend beeld een fout', () => {
    const result = validateContent(clone(), { existingAssets: new Set() });
    expect(result.ok).toBe(false);
    expect(result.issues.some((i) => i.rule === 'IMAGE_ASSET_MISSING')).toBe(true);
  });
});

describe('validator – detecteert opzettelijk kapotte fixtures', () => {
  it('JOIN_MISMATCH', () => {
    const bundle = clone();
    const w = bundle.words[0];
    if (w) w.graphemes = ['x'];
    expect(rules(bundle)).toContain('JOIN_MISMATCH');
  });

  it('GRAPHENES_NOT_LEARNED (blok te laag)', () => {
    const bundle = clone();
    const mis = bundle.words.find((w) => w.word === 'mis');
    if (mis) mis.block = 1;
    expect(rules(bundle)).toContain('GRAPHENES_NOT_LEARNED');
  });

  it('PHONEME_COUNT', () => {
    const bundle = clone();
    bundle.words[0]?.phonemes.pop();
    expect(rules(bundle)).toContain('PHONEME_COUNT');
  });

  it('PATTERN_MISMATCH', () => {
    const bundle = clone();
    const w = bundle.words[0];
    if (w) w.pattern = 'CCCC' as WordPattern;
    expect(rules(bundle)).toContain('PATTERN_MISMATCH');
  });

  it('BLOCKED_WORD', () => {
    const bundle = clone();
    bundle.words.push({
      word: 'kak',
      graphemes: ['k', 'a', 'k'],
      phonemes: ['k', 'ɑ', 'k'],
      pattern: 'CVC',
      phase: 5,
      block: 1,
      kidFriendly: true,
    });
    expect(rules(bundle)).toContain('BLOCKED_WORD');
  });

  it('DUPLICATE_ID', () => {
    const bundle = clone();
    bundle.words.push({ ...(bundle.words[0] as (typeof bundle.words)[number]) });
    expect(rules(bundle)).toContain('DUPLICATE_ID');
  });

  it('EXAMPLE_ORDER (voorbeeldwoord met later grafeem)', () => {
    const bundle = clone();
    const a = bundle.graphemes.find((g) => g.id === 'a');
    if (a) a.exampleWord = 'kaas';
    expect(rules(bundle)).toContain('EXAMPLE_ORDER');
  });

  it('SENTENCE_WORD_UNKNOWN', () => {
    const bundle = clone();
    bundle.sentences[0]?.words.push('xyz');
    expect(rules(bundle)).toContain('SENTENCE_WORD_UNKNOWN');
  });

  it('SENTENCE_SIGHT_UNKNOWN', () => {
    const bundle = clone();
    bundle.sentences[0]?.requiresSightWords.push('SW.nope');
    expect(rules(bundle)).toContain('SENTENCE_SIGHT_UNKNOWN');
  });

  it('SENTENCE_BLOCK_MISSING', () => {
    const bundle = clone();
    const rat = bundle.sentences.find((s) => s.id === 'ZI.SIMPLE.de-rat-zit-in-de-tas');
    if (rat) rat.requiresBlocks = [1];
    expect(rules(bundle)).toContain('SENTENCE_BLOCK_MISSING');
  });

  it('COMPREHENSION_INDEX', () => {
    const bundle = clone();
    const text = bundle.sentences.find((s) => s.id === 'TX.SHORT.1');
    if (text?.comprehension) text.comprehension.correctIndex = 99;
    expect(rules(bundle)).toContain('COMPREHENSION_INDEX');
  });

  it('MISSING_FEEDBACK_KEY', () => {
    const bundle = clone();
    delete bundle.feedback['fb.correct.1'];
    expect(rules(bundle)).toContain('MISSING_FEEDBACK_KEY');
  });

  it('SIGHT_CHAIN', () => {
    const bundle = clone();
    const sw = bundle.sightWords.find((s) => s.id === 'SW.een');
    if (sw) sw.introducedAfter = 'SW.nope';
    expect(rules(bundle)).toContain('SIGHT_CHAIN');
  });

  it('MVP_TOO_FEW', () => {
    const bundle = clone();
    bundle.words.forEach((w, i) => {
      if (i < 7) w.isMvp = true;
      else delete w.isMvp;
    });
    expect(rules(bundle)).toContain('MVP_TOO_FEW');
  });

  it('AUDIO_DUPLICATE_KEY (zelfde key, ander pad)', () => {
    const bundle = clone();
    bundle.audioManifest.push({
      key: 'lk.m.sound',
      src: 'audio/graphemes/andere_m.mp3',
      text: 'mmm',
      kind: 'grapheme-sound',
    });
    expect(rules(bundle)).toContain('AUDIO_DUPLICATE_KEY');
  });

  it('de echte content is foutloos terwijl elke fixture precies één regel breekt', () => {
    expect(errors(clone())).toHaveLength(0);
  });
});
