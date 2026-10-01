/**
 * UX-flow tests voor de activiteitweergave (ARCHITECTURE §9.3):
 * plaatje pas na correct, feedback via aria-live zonder "fout"/rood, retry,
 * en antwoorden met klik én toetsenbord.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ActivityItem } from '../../types';
import { createMockAudioService } from '../../audio/AudioService';
import * as WordReading from '../../learning/WordReading';
import { wordsForBlock } from '../../content';
import { createSeededRng } from '../../core/rng';
import { createActivityView, type ActivityViewHandle } from '../components/ActivityView';

const MVP = new Set(['m', 'a', 's', 't', 'k', 'r']);

function wordItem(): ActivityItem {
  return WordReading.generate({
    skillId: 'DE.CVC',
    targetWord: 'kat',
    availableWords: wordsForBlock(1).map((w) => w.word),
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
  ): void {
    view = createActivityView({
      item,
      audio: createMockAudioService(),
      sessionNumber: 1,
      now: () => 1000,
      onEvent: handlers.onEvent ?? vi.fn(),
      onDone: handlers.onDone ?? vi.fn(),
    });
    container.append(view.element);
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

  it('laat het kind na een fout opnieuw proberen en daarna verdergaan', () => {
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
});
