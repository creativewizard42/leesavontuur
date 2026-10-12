import { createComplimentPicker } from '../compliments';
/**
 * Sessiescherm: rendert de vaste sessie-loop (GD §3.1) met vaste hoeken
 * (huis linksboven, oor rechtsboven, verder rechtsonder) en pauze (UX §3.10).
 *
 * F3: gebruikt de adaptieve, hervatbare `SessionQueue` (QA-007/QA-008/QA-010),
 * blokkeert dubbel afronden (QA-005), zet focus na schermwissel (QA-011),
 * vangt focus in de pauzedialoog (QA-014) en ruimt expliciet op (QA-017).
 */
import type { ActivityItem, AnswerEvent } from '../../types';
import type { AudioService } from '../../audio/AudioService';
import type { GameState } from '../../core/GameState';
import type { SessionQueue } from '../../core/SessionPlanner';
import { fbText, getGrapheme, ui } from '../../content';
import { el, clear, focusFirstInteractive } from '../dom';
import { iconEar, iconHome, iconNext, iconPloef, iconSpark } from '../icons';
import { createActivityView, type ActivityViewHandle } from '../components/ActivityView';
import { createLetterIntro } from '../components/LetterIntro';
import { instructionClip } from '../../learning/util';

export interface SessionScreenDeps {
  state: GameState;
  queue: SessionQueue;
  audio: AudioService;
  now: () => number;
  free?: boolean;
  onEvent: (event: AnswerEvent, item: ActivityItem) => void;
  onIntroduce: (graphemeId: string) => void;
  /** Aangeroepen ná `queue.next()` zodat de sessiepositie bewaard kan worden. */
  onAdvance?: () => void;
  onExit: () => void;
  onFinished: () => void;
}

export interface SessionScreenHandle {
  element: HTMLElement;
  destroy(): void;
}

export function createSessionScreen(deps: SessionScreenDeps): SessionScreenHandle {
  const chooseCompliment = createComplimentPicker();
  const queue = deps.queue;
  let activity: ActivityViewHandle | null = null;
  let activityDone = false;
  let introShown = false;
  let finished = false;

  const screen = el('div', { class: 'la-screen', 'data-screen': 'session' });

  // ---- vaste hoeken ----
  const topbar = el('div', { class: 'la-topbar' });
  const home = el('button', {
    type: 'button',
    class: 'la-btn la-btn--icon',
    'aria-label': ui('ui.home'),
    'data-action': 'home',
  });
  home.append(iconHome());

  const repeat = el('button', {
    type: 'button',
    class: 'la-btn la-btn--icon',
    'aria-label': ui('ui.repeat'),
    'data-action': 'repeat',
  });
  repeat.append(iconEar());

  const rightSide = el('div', { class: 'la-topbar__side' });
  rightSide.append(repeat);
  topbar.append(home, rightSide);

  const stage = el('div', { class: 'la-stage' });
  const progress = el('p', { class: 'la-sr-only', 'aria-live': 'off' });

  const stones = el('div', { class: 'la-step-stones', 'aria-hidden': 'true' });
  const footer = el('div', { class: 'la-footer' });
  const nextBtn = el('button', {
    type: 'button',
    class: 'la-btn la-btn--icon la-btn--primary',
    'aria-label': ui('ui.next'),
    'data-action': 'next',
    disabled: true,
  });
  nextBtn.append(iconNext());
  footer.append(nextBtn);

  screen.append(topbar, stones, stage, progress, footer);

  const totalItems = queue.toJSON(deps.now()).sections.reduce((n, section) => n + section.items.length, 0);

  function updateProgress(): void {
    const current = Math.min(totalItems, totalItems - queue.remaining() + 1);
    clear(stones);
    const count = Math.min(8, totalItems);
    const currentStone = Math.min(count - 1, Math.floor((current - 1) / Math.max(1, totalItems) * count));
    for (let i = 0; i < count; i++) stones.append(el('span', { class: `la-step-stone${i < currentStone ? ' is-complete' : i === currentStone ? ' is-current' : ''}` }));
    progress.textContent = ui('ui.nav.progress').replace('{index}', String(current)).replace('{total}', String(totalItems));
  }

  function playPrompt(item: ActivityItem): void {
    if (item.prompt.audio) void deps.audio.playClip(item.prompt.audio);
  }

  function finish(): void {
    if (finished) return;
    finished = true;
    nextBtn.disabled = true;
    deps.onFinished();
  }

  function mountActivity(): void {
    const item = queue.current();
    if (!item) {
      finish();
      return;
    }
    activity?.destroy();
    activity = null;
    activityDone = false;
    nextBtn.disabled = true;
    clear(stage);

    if (item.kind === 'beloning') {
      const reward = el('div', { class: 'la-reward' });
      reward.append(iconPloef('is-celebrate'));
      const sparks = el('div', { class: 'la-reward__sparks la-spark' });
      for (let i = 0; i < 5; i++) sparks.append(iconSpark());
      reward.append(sparks);
      reward.append(el('p', { class: 'la-reward__count', text: fbText('fb.reward.1') }));
      stage.append(reward);
      playPrompt(item);
      activityDone = true;
      nextBtn.disabled = false;
      nextBtn.focus();
      return;
    }

    activity = createActivityView({
      item,
      chooseCompliment,
      audio: deps.audio,
      sessionNumber: deps.state.sessionNumber,
      now: deps.now,
      onEvent: (event) => deps.onEvent(event, item),
      onDone: () => {
        activityDone = true;
        nextBtn.disabled = false;
        nextBtn.focus();
      },
    });
    stage.append(activity.element);
    focusFirstInteractive(stage);
  }

  function maybeIntro(): boolean {
    const section = queue.currentSection();
    if (!section || deps.free || introShown || section.step !== 3) return false;
    const target = section.items.find((i) => typeof i.metadata?.['targetGrapheme'] === 'string');
    const graphemeId = target?.metadata?.['targetGrapheme'];
    if (typeof graphemeId !== 'string') return false;
    const grapheme = getGrapheme(graphemeId);
    if (!grapheme) return false;
    introShown = true;
    deps.onIntroduce(graphemeId);
    clear(stage);
    const intro = createLetterIntro({
      grapheme,
      audio: deps.audio,
      onContinue: () => {
        // De introductie-item is ongescoord (metadata.introduction): sla het
        // over zodat het niet nog eens als activiteit verschijnt.
        if (queue.current()?.metadata?.['introduction'] === true) {
          queue.next();
          deps.onAdvance?.();
        }
        renderCurrent();
      },
    });
    stage.append(intro);
    focusFirstInteractive(intro);
    progress.textContent = '';
    return true;
  }

  function renderCurrent(): void {
    if (maybeIntro()) return;
    updateProgress();
    mountActivity();
  }

  function advance(): void {
    if (!activityDone || finished) return;
    activityDone = false;
    nextBtn.disabled = true;
    queue.next();
    deps.onAdvance?.();
    renderCurrent();
  }

  // ---- pauze-overlay (QA-014) ----
  let overlay: HTMLElement | null = null;
  let trapCleanup: (() => void) | null = null;

  function closePause(returnFocus = true): void {
    if (!overlay) return;
    overlay.remove();
    overlay = null;
    topbar.removeAttribute('inert');
    stage.removeAttribute('inert');
    footer.removeAttribute('inert');
    trapCleanup?.();
    trapCleanup = null;
    if (returnFocus) home.focus();
  }

  function openPause(): void {
    if (overlay || finished) return;
    deps.audio.stop();
    overlay = el('div', { class: 'la-overlay', role: 'dialog', 'aria-modal': 'true', 'data-overlay': 'pause' });
    const card = el('div', { class: 'la-overlay__card' });
    card.append(iconPloef('la-ploef--small'));
    card.append(el('p', { class: 'la-title la-title--sm', text: ui('ui.pause.title') }));
    card.append(el('p', { class: 'la-hint-text', text: fbText('fb.nav.stop.1') }));
    const resume = el('button', {
      type: 'button',
      class: 'la-btn la-btn--primary la-btn--wide',
      'aria-label': ui('ui.pause.continue'),
      text: ui('ui.pause.continue'),
    });
    resume.addEventListener('click', () => closePause());
    const toMap = el('button', {
      type: 'button',
      class: 'la-btn la-btn--wide',
      'aria-label': ui('ui.pause.toMap'),
      text: ui('ui.pause.toMap'),
    });
    toMap.addEventListener('click', () => {
      void deps.audio.play('fb.nav.stop.1');
      deps.onExit();
    });
    card.append(resume, toMap);
    overlay.append(card);
    screen.append(overlay);

    // Focus-trap + Escape.
    topbar.setAttribute('inert', '');
    stage.setAttribute('inert', '');
    footer.setAttribute('inert', '');
    const onTrap = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        closePause();
        return;
      }
      if (event.key !== 'Tab' || !overlay) return;
      const focusables = Array.from(
        overlay.querySelectorAll<HTMLElement>('button, [href], input, [tabindex]:not([tabindex="-1"])'),
      ).filter((el) => !el.hasAttribute('disabled'));
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onTrap, true);
    trapCleanup = () => document.removeEventListener('keydown', onTrap, true);
    resume.focus();
  }

  // ---- events ----
  home.addEventListener('click', openPause);
  repeat.addEventListener('click', () => {
    if (activity) activity.repeat();
    else void deps.audio.playClip(instructionClip('instr.repeat', fbText('fb.audio.repeat.1')));
  });
  nextBtn.addEventListener('click', advance);

  const onKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') {
      if (overlay) return;
      event.preventDefault();
      openPause();
    } else if (event.key === 'Home') {
      event.preventDefault();
      void deps.audio.play('fb.nav.stop.1');
      deps.onExit();
    }
  };
  document.addEventListener('keydown', onKeyDown);

  renderCurrent();

  return {
    element: screen,
    destroy(): void {
      document.removeEventListener('keydown', onKeyDown);
      trapCleanup?.();
      activity?.destroy();
      activity = null;
    },
  };
}
