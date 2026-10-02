/**
 * Optiegrid voor antwoorden (2 -> 3 -> 4 opties). Identieke knoppen (GD §4),
 * tikdoelen >= 64 px, toetsenbord/cijfer 1-4 (GD §8.4 / UX §6.1).
 *
 * Semantiek (QA-015): een `radiogroup` met `role="radio"` + `aria-checked`
 * (geen misleidende `aria-pressed` op antwoordknoppen).
 *
 * Klankjager (EDU-005 / QA-002): met `onListen` krijgt elke optie een aparte
 * luisterknop (oor) die de klank afspeelt zónder te kiezen.
 *
 * Audio-only / vorm (QA-R2-005, ronde 2): een optie zonder leesbaar label krijgt
 * een **oor-/speakericoon + zichtbaar nummer** en een aria-label via
 * `ui.option.sound`. Ontbrekende ui-keys tonen we nooit als key (fallback naar
 * nummer/icoon). Vorm-afleiders (`metadata.kind === 'shape'`) renderen als vorm.
 */
import type { ActivityOption } from '../../types';
import { el } from '../dom';
import { iconSpeaker, iconEar, iconShape } from '../icons';
import { uiText } from '../text';

export interface OptionGridOptions {
  options: readonly ActivityOption[];
  onSelect: (optionId: string) => void;
  /** Speel de audio van deze optie (hover/focus). */
  onPreview?: (option: ActivityOption) => void;
  /** Aparte luisterknop per optie (speelt audio, kiest niet). */
  onListen?: (option: ActivityOption) => void;
  /** Hoe de optie getoond wordt. */
  mode?: 'auto' | 'word' | 'audio' | 'letters';
  /** Auditieve discriminatie: toon audio-only opties met een oor-icoon. */
  auditory?: boolean;
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

type ResolvedMode = 'word' | 'audio' | 'letters' | 'shape';

/** Optie-metadata is additief (parallelle builders); defensief lezen. */
function optionMetadata(option: ActivityOption): Record<string, unknown> {
  const meta = (option as { metadata?: unknown }).metadata;
  return typeof meta === 'object' && meta !== null ? (meta as Record<string, unknown>) : {};
}

function optionKind(option: ActivityOption): 'sound' | 'shape' | undefined {
  const kind = optionMetadata(option)['kind'];
  return kind === 'sound' || kind === 'shape' ? kind : undefined;
}

function resolveMode(mode: OptionGridOptions['mode'], option: ActivityOption): ResolvedMode {
  const kind = optionKind(option);
  if (kind === 'shape') return 'shape';
  if (kind === 'sound') return 'audio';
  if (mode === 'word' || mode === 'audio' || mode === 'letters') return mode;
  if (option.label && option.label.length > 3) return 'word';
  if (option.label) return 'letters';
  return 'audio';
}

function optionAriaLabel(option: ActivityOption, index: number, resolved: ResolvedMode): string {
  const n = index + 1;
  if (resolved === 'shape') {
    const base = uiText('ui.option.shape', { n }) || 'vorm';
    return `${base} ${n}`;
  }
  if (resolved === 'audio') {
    return uiText('ui.option.sound', { n }) || uiText('ui.option.audio.n', { n }) || `klankknop ${n}`;
  }
  if (option.label) {
    return resolved === 'word'
      ? uiText('ui.option.word.n', { woord: option.label }) || option.label
      : uiText('ui.option.letter.n', { letter: option.label }) || option.label;
  }
  return uiText('ui.option.audio.n', { n }) || `klankknop ${n}`;
}

function shapeName(option: ActivityOption): string | undefined {
  const shape = optionMetadata(option)['shape'];
  if (typeof shape === 'string') return shape;
  const parts = option.id.split(/[.:_-]/);
  return parts[parts.length - 1];
}

export function createOptionGrid(options: OptionGridOptions): OptionGridHandle {
  const withListen = typeof options.onListen === 'function';
  const container = el('div', {
    class: `la-options${options.options.length > 3 ? ' la-options--grid' : ''}`,
    role: 'radiogroup',
  });

  const buttons: HTMLButtonElement[] = [];
  const listenButtons: HTMLButtonElement[] = [];

  options.options.forEach((option, index) => {
    const resolved = resolveMode(options.mode, option);
    const button = el('button', {
      type: 'button',
      class: `la-option la-option--${resolved}`,
      'data-option-id': option.id,
      'data-option-index': index,
      role: 'radio',
      'aria-checked': 'false',
      'aria-posinset': index + 1,
      'aria-setsize': options.options.length,
      'aria-label': optionAriaLabel(option, index, resolved),
    });
    if (resolved === 'audio') {
      const ear = options.auditory === true || kindIsSound(option);
      button.append(iconKind(ear ? 'ear' : 'speaker'));
      button.append(el('span', { class: 'la-option__number', 'aria-hidden': 'true', text: String(index + 1) }));
    } else if (resolved === 'shape') {
      const image = option.image;
      if (typeof image === 'string' && image.length > 0) {
        button.append(el('img', { class: 'la-option__shape-img', src: image, alt: '', 'aria-hidden': 'true' }));
      } else {
        button.append(iconShape(shapeName(option)));
      }
      button.append(el('span', { class: 'la-option__number', 'aria-hidden': 'true', text: String(index + 1) }));
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

    if (withListen) {
      const item = el('div', { class: 'la-option-item', role: 'presentation' });
      const listen = el('button', {
        type: 'button',
        class: 'la-option__listen',
        'data-listen-id': option.id,
        'aria-label': uiText('ui.listen') || 'Luister',
      });
      listen.append(iconEar());
      listen.addEventListener('click', (event) => {
        event.stopPropagation();
        if (listen.disabled) return;
        options.onListen?.(option);
      });
      item.append(button, listen);
      listenButtons.push(listen);
      container.append(item);
    } else {
      container.append(button);
    }
    buttons.push(button);
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
      for (const listenButton of listenButtons) listenButton.disabled = disabled;
    },
    mark(optionId: string, state) {
      for (const button of buttons) {
        button.classList.remove('is-correct', 'is-retry', 'is-hint', 'is-lit');
        const selected = button.dataset['optionId'] === optionId;
        button.setAttribute('aria-checked', selected ? 'true' : 'false');
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

function kindIsSound(option: ActivityOption): boolean {
  return optionKind(option) === 'sound';
}

function iconKind(kind: 'ear' | 'speaker'): SVGElement {
  return kind === 'ear' ? iconEar() : iconSpeaker();
}
