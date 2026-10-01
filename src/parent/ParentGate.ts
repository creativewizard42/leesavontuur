/**
 * Oudercheck (GD §9.1): 5 s ingedrukt houden + geschreven rekensom.
 * Fout -> stil terug naar het spel zonder uitleg (ParentGateOptions.onFail).
 * Kind ziet alleen de zachte hulptekst (fb.help.parent.1).
 */
import { fbText, ui } from '../content';
import { el } from '../ui/dom';
import { iconPloef } from '../ui/icons';

export interface ParentGateOptions {
  onPass: () => void;
  onFail: () => void;
  /** Hoe lang vasthouden (ms); default 5000. Injecteerbaar voor tests. */
  holdMs?: number;
  /** Vaste som voor tests; anders willekeurig. */
  sum?: { a: number; b: number };
  now?: () => number;
}

export function createParentGate(options: ParentGateOptions): HTMLElement {
  const holdMs = options.holdMs ?? 5000;
  const now = options.now ?? (() => Date.now());
  const a = options.sum?.a ?? 5 + Math.floor(Math.random() * 5);
  const b = options.sum?.b ?? 4 + Math.floor(Math.random() * 6);

  const root = el('div', { class: 'la-screen la-screen--ouder', 'data-screen': 'parent-gate' });
  const card = el('div', { class: 'la-overlay__card' });
  card.append(iconPloef('la-ploef--small'));
  card.append(el('p', { class: 'la-hint-text', text: ui('ui.parent.gate.hold') }));

  let startTime: number | null = null;
  let interval: number | null = null;
  let unlocked = false;

  const hold = el('button', {
    type: 'button',
    class: 'la-gate-hold',
    'data-action': 'hold',
    'aria-label': ui('ui.parent.gate.hold'),
  });
  const fill = el('span', { class: 'la-gate-hold__fill' });
  const holdLabel = el('span', { text: ui('ui.parent.gate.hold') });
  hold.append(fill, holdLabel);

  const sumSection = el('div', { 'data-section': 'sum', hidden: true });
  sumSection.append(el('p', { class: 'la-hint-text', text: ui('ui.parent.gate.sum') }));
  const sumLine = el('p', { class: 'la-title la-sum', text: `${a} + ${b} =` });
  const input = el('input', {
    type: 'text',
    inputmode: 'numeric',
    class: 'la-gate-input',
    'data-action': 'answer',
    'aria-label': ui('ui.parent.gate.sum'),
  });
  const verify = el('button', {
    type: 'button',
    class: 'la-btn la-btn--primary',
    'data-action': 'verify',
    text: ui('ui.parent.gate.sum'),
  });

  function stopHold(): void {
    if (interval !== null) {
      window.clearInterval(interval);
      interval = null;
    }
    if (!unlocked) {
      fill.style.height = '0%';
      startTime = null;
    }
  }

  function successHold(): void {
    unlocked = true;
    stopHold();
    fill.style.height = '100%';
    sumSection.hidden = false;
    input.focus();
  }

  function tick(): void {
    if (startTime === null) return;
    // QA-024: ruim het interval op zodra het scherm is verwijderd.
    if (!root.isConnected) {
      stopHold();
      return;
    }
    const elapsed = now() - startTime;
    const pct = Math.min(100, (elapsed / holdMs) * 100);
    fill.style.height = `${pct}%`;
    if (elapsed >= holdMs) successHold();
  }

  function beginHold(event: Event): void {
    if (unlocked) return;
    const pointerInit = typeof PointerEvent !== 'undefined' && event instanceof PointerEvent ? event.pointerId : undefined;
    if (pointerInit !== undefined && typeof hold.setPointerCapture === 'function') {
      try {
        hold.setPointerCapture(pointerInit);
      } catch {
        /* negeren */
      }
    }
    startTime = now();
    if (interval === null) interval = window.setInterval(tick, 50);
    tick();
  }

  hold.addEventListener('pointerdown', beginHold);
  hold.addEventListener('pointerup', stopHold);
  hold.addEventListener('pointercancel', stopHold);
  hold.addEventListener('pointerleave', stopHold);
  hold.addEventListener('keydown', (event) => {
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      if (startTime === null && !unlocked) beginHold(event);
    }
  });
  hold.addEventListener('keyup', (event) => {
    if (event.key === ' ' || event.key === 'Enter') stopHold();
  });

  function verifySum(): void {
    if (!unlocked) return;
    const value = Number(input.value.trim());
    if (Number.isInteger(value) && value === a + b) {
      options.onPass();
    } else {
      // QA-R2-008: bewust stil terug naar het spel (anti-kind). Er wordt géén
      // melding gezet die door de directe navigatie toch onzichtbaar zou zijn.
      options.onFail();
    }
  }
  verify.addEventListener('click', verifySum);
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      verifySum();
    }
  });

  sumSection.append(sumLine, input, verify);
  card.append(hold, sumSection);
  card.append(el('p', { class: 'la-hint-text', text: fbText('fb.help.parent.1') }));

  const stage = el('div', { class: 'la-stage' });
  stage.append(card);
  root.append(stage);
  return root;
}
