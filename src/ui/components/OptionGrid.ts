/**
 * Optiegrid voor antwoorden (2 -> 3 -> 4 opties). Identieke knoppen (GD §4),
 * tikdoelen >= 64 px, toetsenbord/cijfer 1-4 (GD §8.4 / UX §6.1).
 */
import type { ActivityOption } from '../../types';
import { el } from '../dom';
import { iconSpeaker } from '../icons';
import { ui } from '../../content';

export interface OptionGridOptions {
  options: readonly ActivityOption[];
  onSelect: (optionId: string) => void;
  /** Speel de audio van deze optie (hover/focus). */
  onPreview?: (option: ActivityOption) => void;
  /** Hoe de optie getoond wordt. */
  mode?: 'auto' | 'word' | 'audio' | 'letters';
  disabled?: boolean;
}

export interface OptionGridHandle {
  element: HTMLElement;
  buttons: HTMLButtonElement[];
  setDisabled(disabled: boolean): void;
  /** Markeer een gekozen optie (blijft zichtbaar tijdens feedback). */
  mark(optionId: string, state: 'correct' | 'retry' | 'hint' | null): void;
  focusIndex(index: number): void;
}

function optionMode(mode: OptionGridOptions['mode'], option: ActivityOption): 'word' | 'audio' | 'letters' {
  if (mode === 'word' || mode === 'audio' || mode === 'letters') return mode;
  if (option.label && option.label.length > 3) return 'word';
  if (option.label) return 'letters';
  return 'audio';
}

function optionAriaLabel(option: ActivityOption, index: number, resolved: 'word' | 'audio' | 'letters'): string {
  if (option.label) {
    return resolved === 'word'
      ? ui('ui.option.word.n').replace('{woord}', option.label)
      : ui('ui.option.letter.n').replace('{letter}', option.label);
  }
  return ui('ui.option.audio.n').replace('{n}', String(index + 1));
}

export function createOptionGrid(options: OptionGridOptions): OptionGridHandle {
  const container = el('div', {
    class: `la-options${options.options.length > 3 ? ' la-options--grid' : ''}`,
    role: 'group',
  });

  const buttons: HTMLButtonElement[] = [];
  options.options.forEach((option, index) => {
    const resolved = optionMode(options.mode, option);
    const button = el('button', {
      type: 'button',
      class: `la-option la-option--${resolved}`,
      'data-option-id': option.id,
      'data-option-index': index,
      'aria-posinset': index + 1,
      'aria-setsize': options.options.length,
      'aria-pressed': 'false',
      'aria-label': optionAriaLabel(option, index, resolved),
    });
    if (resolved === 'audio') {
      button.append(iconSpeaker());
    } else if (option.label) {
      button.append(document.createTextNode(option.label));
    }

    button.addEventListener('click', () => {
      if (button.disabled) return;
      options.onSelect(option.id);
    });
    if (options.onPreview) {
      const preview = (): void => {
        if (!button.disabled) options.onPreview?.(option);
      };
      button.addEventListener('pointerenter', preview);
      button.addEventListener('focus', preview);
    }
    buttons.push(button);
    container.append(button);
  });

  // Pijltjesnavigatie binnen de groep.
  container.addEventListener('keydown', (event) => {
    if (!(event instanceof KeyboardEvent)) return;
    const active = document.activeElement;
    const current = buttons.findIndex((b) => b === active);
    if (current < 0) return;
    const cols = options.options.length > 3 ? 2 : options.options.length;
    let next = current;
    if (event.key === 'ArrowRight') next = Math.min(buttons.length - 1, current + 1);
    else if (event.key === 'ArrowLeft') next = Math.max(0, current - 1);
    else if (event.key === 'ArrowDown') next = Math.min(buttons.length - 1, current + cols);
    else if (event.key === 'ArrowUp') next = Math.max(0, current - cols);
    else return;
    event.preventDefault();
    const target = buttons[next];
    target?.focus();
  });

  const handle: OptionGridHandle = {
    element: container,
    buttons,
    setDisabled(disabled: boolean) {
      for (const button of buttons) button.disabled = disabled;
    },
    mark(optionId: string, state) {
      for (const button of buttons) {
        button.classList.remove('is-correct', 'is-retry', 'is-hint', 'is-lit');
        const selected = button.dataset['optionId'] === optionId;
        button.setAttribute('aria-pressed', selected ? 'true' : 'false');
        if (selected && state === 'correct') button.classList.add('is-correct');
        if (selected && state === 'retry') button.classList.add('is-retry');
        if (selected && state === 'hint') button.classList.add('is-hint');
      }
    },
    focusIndex(index: number) {
      buttons[index]?.focus();
    },
  };
  if (options.disabled) handle.setDisabled(true);
  return handle;
}
