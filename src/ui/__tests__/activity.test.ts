/**
 * UX-flow tests voor de activiteitweergave (ARCHITECTURE §9.3):
 * plaatje pas na correct, feedback via aria-live zonder "fout"/rood, retry,
 * en antwoorden met klik én toetsenbord.
 *
 * F3-aanvullingen: hakken toont geen gesegmenteerd antwoord, klankjager speelt
 * eerst alle kandidaten (luister-dan-kies), en ontbrekend geluid geeft een
 * rustige visuele fallback zonder crash.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ActivityItem } from '../../types';
import { createMockAudioService, type MockAudioService } from '../../audio/AudioService';
import * as WordReading from '../../learning/WordReading';
import * as Segmenting from '../../learning/Segmenting';
import * as FirstSound from '../../learning/FirstSound';
import { wordsForBlock } from '../../content';
import { createSeededRng } from '../../core/rng';
import { createActivityView, type ActivityViewHandle } from '../components/ActivityView';

const MVP = new Set(['m', 'a', 's', 't', 'k', 'r']);
const WORD_NAMES = wordsForBlock(1).map((w) => w.word);

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

const FORBIDDEN_CLASS = /(fout|wrong|error|incorrect|red|rood|cross|kruis)/i;

function allClasses(el: HTMLElement): string[] {
  return Array.from(el.querySelectorAll('*')).map((node) => (node as HTMLElement).className ?? '');
}

describe('ActivityView – Woord lezen', () => {
  let container: HTMLElement;
  let view: ActivityViewHandle | null = null;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.append(container);
  });

  afterEach(() => {
    view?.destroy();
    view = null;
    container.remove();
  });

  function mount(
    item: ActivityItem,
    handlers: { onEvent?: (event: import('../../types').AnswerEvent) => void; onDone?: (o: 'correct' | 'modeled') => void } = {},
    audio: MockAudioService = createMockAudioService(),
  ): MockAudioService {
    view = createActivityView({
      item,
      audio,
      sessionNumber: 1,
      now: () => 1000,
      onEvent: handlers.onEvent ?? vi.fn(),
      onDone: handlers.onDone ?? vi.fn(),
    });
    container.append(view.element);
    return audio;
  }

  it('toont het plaatje pas NA een correct antwoord', () => {
    const item = wordItem();
    mount(item);
    expect(container.querySelector('img[data-reveal-image]')).toBeNull();

    const correct = container.querySelector<HTMLButtonElement>(`.la-option[data-option-id="${item.targetId}"]`);
    expect(correct).not.toBeNull();
    correct?.click();
    const img = container.querySelector('img[data-reveal-image]');
    expect(img).not.toBeNull();
    expect(img?.getAttribute('src')).toBe('assets/images/words/kat.svg');
  });

  it('toont zachte feedback via aria-live zonder "fout" of rode/kruis-klasse', () => {
    const item = wordItem();
    mount(item);
    const wrong = item.options.find((o) => o.id !== item.targetId);
    expect(wrong).toBeDefined();
    const wrongButton = container.querySelector<HTMLButtonElement>(`.la-option[data-option-id="${wrong?.id}"]`);
    wrongButton?.click();

    const feedback = container.querySelector('[role="status"]');
    expect(feedback).not.toBeNull();
    expect(feedback?.getAttribute('aria-live')).toBe('polite');
    expect((feedback?.textContent ?? '').length).toBeGreaterThan(0);
    expect((feedback?.textContent ?? '').toLowerCase()).not.toContain('fout');
    expect(container.textContent?.toLowerCase()).not.toContain('fout');
    for (const cls of allClasses(container)) {
      expect(FORBIDDEN_CLASS.test(cls)).toBe(false);
    }
  });

  it('waits for the answer recording and feedback before enabling continuation', async () => {
    const item = wordItem();
    const audio = createMockAudioService();
    const onDone = vi.fn();
    let finishAnswer: (() => void) | undefined;
    let finishFeedback: (() => void) | undefined;
    const targetAudio = item.options.find(option => option.id === item.targetId)?.audio;
    expect(targetAudio).toBeDefined();
    const originalPlay = audio.playClip.bind(audio);
    vi.spyOn(audio, 'playClip').mockImplementation(clip => clip.key === targetAudio?.key
      ? new Promise(resolve => { finishAnswer = () => resolve({ result: 'file', approximate: true }); })
      : clip.kind === 'feedback' ? new Promise(resolve => { finishFeedback = () => resolve({ result: 'file', approximate: true }); }) : originalPlay(clip));
    vi.spyOn(audio, 'playSequence').mockImplementation(() => new Promise(resolve => {
      finishFeedback = () => resolve({ result: 'file', approximate: true });
    }));
    mount(item, { onDone }, audio);
    container.querySelector<HTMLButtonElement>(`.la-option[data-option-id="${item.targetId}"]`)!.click();
    expect(onDone).not.toHaveBeenCalled();
    finishAnswer!();
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(onDone).not.toHaveBeenCalled();
    finishFeedback!();
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(onDone).toHaveBeenCalledOnce();
  });

  it('laat het kind na een fout opnieuw proberen en daarna verdergaan', async () => {
    const item = wordItem();
    const onEvent = vi.fn();
    const onDone = vi.fn();
    mount(item, { onEvent, onDone });

    const wrong = item.options.find((o) => o.id !== item.targetId);
    container.querySelector<HTMLButtonElement>(`.la-option[data-option-id="${wrong?.id}"]`)?.click();
    expect(onDone).not.toHaveBeenCalled();
    expect(onEvent).toHaveBeenCalledTimes(1);

    const correct = container.querySelector<HTMLButtonElement>(`.la-option[data-option-id="${item.targetId}"]`);
    expect(correct?.disabled).toBe(false);
    correct?.click();
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(onDone).toHaveBeenCalledWith('correct');
    expect(onEvent).toHaveBeenCalledTimes(2);
  });

  it('ondersteunt toetsenbordkeuze met cijfertoetsen', () => {
    const item = wordItem();
    const onEvent = vi.fn();
    mount(item, { onEvent });
    document.dispatchEvent(new KeyboardEvent('keydown', { key: '1', bubbles: true }));
    expect(onEvent).toHaveBeenCalledTimes(1);
    const first = onEvent.mock.calls[0]?.[0];
    expect(first.selectedOptionId).toBe(item.options[0]?.id);
  });

  it('gebruikt radiogroep-semantiek (aria-checked), niet aria-pressed', () => {
    const item = wordItem();
    mount(item);
    const group = container.querySelector('.la-options');
    expect(group?.getAttribute('role')).toBe('radiogroup');
    const option = container.querySelector('.la-option');
    expect(option?.getAttribute('role')).toBe('radio');
    expect(option?.hasAttribute('aria-checked')).toBe(true);
    expect(option?.hasAttribute('aria-pressed')).toBe(false);
  });

  it('speelt een feedbackclip bij een correct antwoord (EDU-R3-002)', async () => {
    const item = wordItem();
    const audio = mount(item);
    container.querySelector<HTMLButtonElement>(`.la-option[data-option-id="${item.targetId}"]`)?.click();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(audio.played.some((key) => key.startsWith('fb.'))).toBe(true);
  });

  it('speelt een feedbackclip bij een fout antwoord (EDU-R3-002)', async () => {
    const item = wordItem();
    const audio = mount(item);
    const wrong = item.options.find((o) => o.id !== item.targetId);
    container.querySelector<HTMLButtonElement>(`.la-option[data-option-id="${wrong?.id}"]`)?.click();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(audio.played.some((key) => key.startsWith('fb.'))).toBe(true);
  });
});

describe('ActivityView – Hakken (EDU-003)', () => {
  let container: HTMLElement;
  let view: ActivityViewHandle | null = null;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.append(container);
  });
  afterEach(() => {
    view?.destroy();
    view = null;
    container.remove();
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

  function mount(item: ActivityItem): void {
    view = createActivityView({
      item,
      audio: createMockAudioService(),
      sessionNumber: 1,
      now: () => 1000,
      onEvent: vi.fn(),
      onDone: vi.fn(),
    });
    container.append(view.element);
  }

  it('toont het gesegmenteerde antwoord nooit (geen letterblokken of k-a-m)', () => {
    const item = segItem();
    expect(item.prompt.showText).toBe(false);
    mount(item);
    expect(container.querySelector('.la-word-row')).toBeNull();
    expect(container.querySelector('.la-letterblock')).toBeNull();
    expect(container.textContent ?? '').not.toContain('k-a-m');
  });

  it('biedt in tap-modus een tik-oppervlak zonder letters', () => {
    const item: ActivityItem = { ...segItem(), metadata: { ...(segItem().metadata ?? {}), responseMode: 'tap' } };
    mount(item);
    const tap = container.querySelector('[data-response-mode="tap"]');
    expect(tap).not.toBeNull();
    expect(container.querySelector('.la-letterblock')).toBeNull();
    const tapBtn = container.querySelector<HTMLButtonElement>('[data-action="tap"]');
    tapBtn?.click();
    tapBtn?.click();
    expect(tap?.getAttribute('data-taps')).toBe('2');
  });
});

describe('ActivityView – Klankjager luister-dan-kies (EDU-005)', () => {
  let container: HTMLElement;
  let view: ActivityViewHandle | null = null;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.append(container);
  });
  afterEach(() => {
    view?.destroy();
    view = null;
    container.remove();
  });

  it('speelt eerst alle kandidaten af en heeft een aparte luisterknop per tegel', async () => {
    const item = FirstSound.generate({
      skillId: 'FN.FIRST_SOUND',
      difficulty: 'A',
      count: 1,
      availableWords: WORD_NAMES,
      rng: createSeededRng(11),
      learned: MVP,
    })[0];
    expect(item).toBeDefined();
    const audio = createMockAudioService();
    view = createActivityView({
      item: item as ActivityItem,
      audio,
      sessionNumber: 1,
      now: () => 1000,
      onEvent: vi.fn(),
      onDone: vi.fn(),
    });
    container.append(view.element);

    // Aparte luisterknoppen (oor) op de tegels.
    expect(container.querySelectorAll('.la-option__listen').length).toBeGreaterThanOrEqual(1);

    // Alle kandidaten zijn automatisch afgespeeld.
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));
    for (const option of (item as ActivityItem).options) {
      if (option.audio) expect(audio.played).toContain(option.audio.key);
    }
  });
});

describe('ActivityView – ontbrekend geluid (QA-002)', () => {
  let container: HTMLElement;
  let view: ActivityViewHandle | null = null;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.append(container);
  });
  afterEach(() => {
    view?.destroy();
    view = null;
    container.remove();
  });

  it('herstart geblokkeerde audio na een tik en maakt antwoorden weer beschikbaar', async () => {
    const audio = createMockAudioService({ result: { result: 'unavailable', approximate: false, reason: 'gesture-required' } });
    const item = wordItem();
    const onDone = vi.fn();
    view = createActivityView({ item, audio, sessionNumber: 1, now: () => 1000, onEvent: vi.fn(), onDone });
    container.append(view.element);
    await vi.waitFor(() => expect(container.querySelector('[data-action="audio-retry"]')).not.toBeNull());
    expect(container.querySelector<HTMLButtonElement>('[data-option-id]')?.disabled).toBe(true);
    audio.setResult({ result: 'file', approximate: true });
    container.querySelector<HTMLButtonElement>('[data-action="audio-retry"]')?.click();
    await vi.waitFor(() => expect(container.querySelector('[data-audio-fallback]')).toBeNull());
    expect(container.querySelector<HTMLButtonElement>('[data-option-id]')?.disabled).toBe(false);
    container.querySelector<HTMLButtonElement>(`[data-option-id="${item.targetId}"]`)?.click();
    await vi.waitFor(() => expect(onDone).toHaveBeenCalledWith('correct'));
  });

  it('toont een rustige visuele fallback zonder crash', async () => {
    const audio = createMockAudioService({
      result: { result: 'unavailable', approximate: false, reason: 'clip-missing' },
    });
    view = createActivityView({
      item: wordItem(),
      audio,
      sessionNumber: 1,
      now: () => 1000,
      onEvent: vi.fn(),
      onDone: vi.fn(),
    });
    container.append(view.element);

    await Promise.resolve();
    await Promise.resolve();
    const fallback = container.querySelector('[data-audio-fallback="true"]');
    expect(fallback).not.toBeNull();
    expect(container.textContent ?? '').toContain('Geluid niet beschikbaar');
  });
});
