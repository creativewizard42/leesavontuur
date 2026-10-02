/**
 * EDU-R2-006: hak-/plakinstructie wordt vóór de stimulus gesproken; de
 * letter-introductie speelt de intro-instructie (indien aanwezig).
 * EDU-R2-007: `observeApproximate` meldt TTS-benaderingen (ouderzone).
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ActivityItem } from '../../types';
import { createMockAudioService, playResult } from '../../audio/AudioService';
import * as Segmenting from '../../learning/Segmenting';
import * as Blending from '../../learning/Blending';
import { createSeededRng } from '../../core/rng';
import { getGrapheme, wordsForBlock } from '../../content';
import { createActivityView, type ActivityViewHandle } from '../components/ActivityView';
import { createLetterIntro } from '../components/LetterIntro';
import { observeApproximate } from '../App';

const MVP = new Set(['m', 'a', 's', 't', 'k', 'r']);
const WORD_NAMES = wordsForBlock(1).map((w) => w.word);

let view: ActivityViewHandle | null = null;
afterEach(() => {
  view?.destroy();
  view = null;
  document.body.replaceChildren();
});

function segItem(): ActivityItem {
  return Segmenting.generate({
    skillId: 'AN.CVC',
    word: 'kam',
    difficulty: 'A',
    rng: createSeededRng(4),
    learned: MVP,
    availableWords: WORD_NAMES,
  });
}

describe('ActivityView – instructie vóór stimulus (EDU-R2-006)', () => {
  it('speelt bij hakken eerst de instructie en dan het woord', async () => {
    const audio = createMockAudioService();
    view = createActivityView({
      item: segItem(),
      audio,
      sessionNumber: 1,
      now: () => 1000,
      onEvent: vi.fn(),
      onDone: vi.fn(),
    });
    document.body.append(view.element);
    await Promise.resolve();
    await Promise.resolve();
    expect(audio.played).toContain('instr.hakken.count');
    expect(audio.played.indexOf('instr.hakken.count')).toBeLessThan(audio.played.indexOf('de.kam'));
  });

  it('herhaalt de instructie + stimulus bij H', async () => {
    const audio = createMockAudioService();
    view = createActivityView({
      item: segItem(),
      audio,
      sessionNumber: 1,
      now: () => 1000,
      onEvent: vi.fn(),
      onDone: vi.fn(),
    });
    document.body.append(view.element);
    await Promise.resolve();
    const before = audio.played.filter((k) => k === 'instr.hakken.count').length;
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'h', bubbles: true }));
    await Promise.resolve();
    const after = audio.played.filter((k) => k === 'instr.hakken.count').length;
    expect(after).toBeGreaterThan(before);
  });

  it('speelt bij plakken eerst de plakinstructie', async () => {
    const item = Blending.generate({
      skillId: 'SY.CVC',
      targetWord: 'kat',
      availableWords: WORD_NAMES,
      difficulty: 'A',
      rng: createSeededRng(7),
      learned: MVP,
    });
    const audio = createMockAudioService();
    view = createActivityView({
      item,
      audio,
      sessionNumber: 1,
      now: () => 1000,
      onEvent: vi.fn(),
      onDone: vi.fn(),
    });
    document.body.append(view.element);
    await Promise.resolve();
    expect(audio.played).toContain('instr.plakken.r1');
  });
});

describe('LetterIntro – audio (EDU-R2-006)', () => {
  it('speelt de klank bij het tonen', () => {
    const grapheme = getGrapheme('m');
    expect(grapheme).toBeDefined();
    const audio = createMockAudioService();
    const intro = createLetterIntro({
      grapheme: grapheme as NonNullable<typeof grapheme>,
      audio,
      onContinue: vi.fn(),
    });
    document.body.append(intro);
    expect(audio.played.length).toBeGreaterThanOrEqual(1);
  });
});

describe('observeApproximate (EDU-R2-007)', () => {
  it('meldt approximate-resultaten en niet-exacte resultaten niet', async () => {
    const audio = createMockAudioService({ result: playResult('tts', true) });
    let hits = 0;
    const observed = observeApproximate(audio, () => {
      hits += 1;
    });
    await observed.playClip({ key: 'lk.m.sound', src: 'audio/graphemes/m_sound.mp3', kind: 'grapheme-sound' });
    expect(hits).toBe(1);

    audio.setResult(playResult('file', false));
    await observed.playClip({ key: 'de.kat', src: 'audio/words/kat.mp3', kind: 'word' });
    expect(hits).toBe(1);
  });
});
