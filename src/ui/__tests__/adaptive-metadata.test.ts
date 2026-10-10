/**
 * Integratie van de G1-adaptiviteitsmetadata in de UI (QA-R2-003 / EDU-R2-002):
 * modelFirst (rustig model vóór de keuze), simplified (rustiger layout),
 * windDown (rustig afronden met Ploef), auditoryDistractors (audio-only
 * klankknoppen) en de concrete per-variabele instructieclips.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ActivityItem } from '../../types';
import { createMockAudioService } from '../../audio/AudioService';
import { createSeededRng } from '../../core/rng';
import { wordsForBlock, ui } from '../../content';
import * as WordReading from '../../learning/WordReading';
import * as Segmenting from '../../learning/Segmenting';
import * as LetterSound from '../../learning/LetterSound';
import * as FirstSound from '../../learning/FirstSound';
import { createActivityView, type ActivityViewHandle } from '../components/ActivityView';

const MVP = new Set(['m', 'a', 's', 't', 'k', 'r']);
const WORD_NAMES = wordsForBlock(1).map((w) => w.word);

let view: ActivityViewHandle | null = null;
afterEach(() => {
  view?.destroy();
  view = null;
  document.body.replaceChildren();
});

function wordItem(): ActivityItem {
  return WordReading.generate({
    skillId: 'DE.CVC',
    targetWord: 'kat',
    availableWords: WORD_NAMES,
    difficulty: 'B',
    rng: createSeededRng(42),
    learned: MVP,
  });
}

function mount(item: ActivityItem, audio = createMockAudioService()): ReturnType<typeof createMockAudioService> {
  let clock = 1000;
  view = createActivityView({
    item,
    audio,
    sessionNumber: 1,
    now: () => (clock += 1000),
    onEvent: vi.fn(),
    onDone: vi.fn(),
  });
  document.body.append(view.element);
  return audio;
}

function tick(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

describe('ActivityView – G1-metadata', () => {
  it('modelFirst: toont modelletters vóór de keuze en houdt opties even dicht', async () => {
    const base = wordItem();
    const item: ActivityItem = {
      ...base,
      metadata: { ...(base.metadata ?? {}), modelFirst: true, simplified: true },
    };
    mount(item);
    expect(document.querySelector('[data-model-first="true"]')).not.toBeNull();
    // Modeling waits for the complete instruction rather than interrupting it.
    expect(document.querySelector('[data-model-row="true"]')).toBeNull();
    expect(document.querySelector('.la-activity--simplified')).not.toBeNull();
    const firstOption = document.querySelector<HTMLButtonElement>('.la-option');
    expect(firstOption?.disabled).toBe(true);

    await tick();
    await tick();
    expect(document.querySelector('[data-model-row="true"]')).not.toBeNull();
    expect(document.querySelector<HTMLButtonElement>('.la-option')?.disabled).toBe(false);
  });

  it('windDown: toont een rustig Ploef-anker', () => {
    const base = wordItem();
    const item: ActivityItem = { ...base, metadata: { ...(base.metadata ?? {}), windDown: true } };
    mount(item);
    expect(document.querySelector('.la-activity--winddown')).not.toBeNull();
    const calm = document.querySelector('[data-winddown="true"]');
    expect(calm).not.toBeNull();
    expect(calm?.querySelector('svg')).not.toBeNull();
  });

  it('auditoryDistractors: audio-only klankknoppen met nummer + oor en ui.option.sound-aria', () => {
    const item = LetterSound.generate({
      skillId: 'LK.m.SOUND',
      direction: 'grapheme-to-sound',
      targetGrapheme: 'm',
      learnedGraphemes: new Set(['m']),
      difficulty: 'A',
      rng: createSeededRng(3),
      allowUnlearnedAuditoryDistractors: true,
    });
    expect(item.metadata?.['auditoryDistractors']).toBe(true);
    mount(item);
    const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>('.la-option'));
    expect(buttons.length).toBeGreaterThanOrEqual(2);
    const expected = ui('ui.option.sound');
    buttons.forEach((button, index) => {
      expect(button.classList.contains('la-option--audio')).toBe(true);
      expect(button.querySelector('svg')).not.toBeNull();
      expect(button.querySelector('.la-option__number')?.textContent).toBe(String(index + 1));
      const label = button.getAttribute('aria-label') ?? '';
      expect(label).not.toContain('ui.option');
      expect(label).toContain(String(index + 1));
      expect(expected).not.toBe('ui.option.sound');
    });
  });

  it('toont fb.specific.count als tekst met het getelde aantal (geen key)', () => {
    const item = Segmenting.generate({
      skillId: 'AN.CVC',
      word: 'kam',
      difficulty: 'A',
      rng: createSeededRng(4),
      learned: MVP,
      availableWords: WORD_NAMES,
    });
    mount(item);
    const wrong = item.options.find((o) => o.id !== item.targetId);
    expect(wrong).toBeDefined();
    document.querySelector<HTMLButtonElement>(`.la-option[data-option-id="${wrong?.id}"]`)?.click();
    const text = document.querySelector('[role="status"]')?.textContent ?? '';
    expect(text).toContain(`Je telde ${wrong?.label}`);
    expect(text).not.toContain('fb.specific.count');
  });

  it('gebruikt de concrete per-variabele instructieclip (EDU-R2-002)', async () => {
    const item = FirstSound.generate({
      skillId: 'FN.FIRST_SOUND',
      difficulty: 'A',
      count: 1,
      availableWords: WORD_NAMES,
      rng: createSeededRng(11),
      learned: MVP,
    })[0] as ActivityItem;
    const target = item.metadata?.['targetGrapheme'];
    expect(typeof target).toBe('string');
    const audio = mount(item);
    await tick();
    expect(audio.played).toContain(`instr.fn.first_sound.${target as string}`);
  });
});
