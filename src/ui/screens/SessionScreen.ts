/**
 * Sessiescherm: rendert de vaste sessie-loop (GD §3.1) met vaste hoeken
 * (huis linksboven, oor rechtsboven, verder rechtsonder) en pauze (UX §3.10).
 */
import type { ActivityItem, AnswerEvent } from '../../types';
import type { AudioService } from '../../audio/AudioService';
import type { GameState } from '../../core/GameState';
import { createSessionQueue, type SessionPlan } from '../../core/SessionPlanner';
import { fbText, getGrapheme, ui } from '../../content';
import { el, clear } from '../dom';
import { iconEar, iconHome, iconNext, iconPloef, iconSpark } from '../icons';
import { createActivityView, type ActivityViewHandle } from '../components/ActivityView';
import { createLetterIntro } from '../components/LetterIntro';
import { instructionClip } from '../../learning/util';

export interface SessionScreenDeps {
  state: GameState;
  plan: SessionPlan;
  audio: AudioService;
  now: () => number;
  free?: boolean;
  onEvent: (event: AnswerEvent, item: ActivityItem) => void;
  onIntroduce: (graphemeId: string) => void;
  onExit: () => void;
  onFinished: () => void;
}

export function createSessionScreen(deps: SessionScreenDeps): HTMLElement {
  const queue = createSessionQueue(deps.plan);
  let activity: ActivityViewHandle | null = null;
  let activityDone = false;
  let introShown = false;

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

  screen.append(topbar, stage, progress, footer);

  function updateProgress(): void {
    const current = deps.plan.sections.flatMap((s) => s.items).length - queue.remaining() + 1;
    const total = deps.plan.sections.flatMap((s) => s.items).length;
    progress.textContent = ui('ui.nav.progress').replace('{index}', String(current)).replace('{total}', String(total));
  }

  function playPrompt(item: ActivityItem): void {
    if (item.prompt.audio) void deps.audio.playClip(item.prompt.audio);
  }

  function mountActivity(): void {
    const item = queue.current();
    if (!item) {
      deps.onFinished();
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
      if (item.prompt.audio) void deps.audio.playClip(item.prompt.audio);
      activityDone = true;
      nextBtn.disabled = false;
      nextBtn.focus();
      return;
    }

    activity = createActivityView({
      item,
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
    playPrompt(item);
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
    stage.append(
      createLetterIntro({
        grapheme,
        audio: deps.audio,
        onContinue: () => renderCurrent(),
      }),
    );
    progress.textContent = '';
    return true;
  }

  function renderCurrent(): void {
    if (maybeIntro()) return;
    updateProgress();
    mountActivity();
  }

  function advance(): void {
    if (!activityDone) return;
    queue.next();
    renderCurrent();
  }

  // ---- pauze-overlay ----
  let overlay: HTMLElement | null = null;
  function openPause(): void {
    if (overlay) return;
    overlay = el('div', { class: 'la-overlay', role: 'dialog', 'aria-modal': 'true', 'data-overlay': 'pause' });
    const card = el('div', { class: 'la-overlay__card' });
    card.append(iconPloef('la-ploef--small'));
    card.append(el('p', { class: 'la-title', style: 'font-size:24px', text: ui('ui.pause.title') }));
    card.append(el('p', { class: 'la-hint-text', text: fbText('fb.nav.stop.1') }));
    const resume = el('button', {
      type: 'button',
      class: 'la-btn la-btn--primary la-btn--wide',
      'aria-label': ui('ui.pause.continue'),
      text: ui('ui.pause.continue'),
    });
    resume.addEventListener('click', () => {
      overlay?.remove();
      overlay = null;
      repeat.focus();
    });
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
      event.preventDefault();
      openPause();
    } else if (event.key === 'Home') {
      event.preventDefault();
      void deps.audio.play('fb.nav.stop.1');
      deps.onExit();
    }
  };
  document.addEventListener('keydown', onKeyDown);

  // Opruimen wanneer het scherm uit de DOM verdwijnt.
  const observer = new MutationObserver(() => {
    if (!screen.isConnected) {
      document.removeEventListener('keydown', onKeyDown);
      activity?.destroy();
      observer.disconnect();
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });

  renderCurrent();
  return screen;
}
