/**
 * Beloningsscherm (GD §3.1 stap 8, §6.1): klein, deterministisch, ná leeswerk.
 * QA-012/QA-022: icoon + audio, geen leesbare instructie nodig, vaste hoeken.
 */
import type { AudioService } from '../../audio/AudioService';
import { ui } from '../../content';
import { el } from '../dom';
import { iconEar, iconHome, iconLeaf, iconNext, iconPloef, iconSpark } from '../icons';

export interface RewardScreenOptions {
  sparks: number;
  leaves: number;
  audio?: AudioService;
  onContinue: () => void;
}

export function createRewardScreen(options: RewardScreenOptions): HTMLElement {
  const screen = el('div', { class: 'la-screen', 'data-screen': 'reward' });

  const topbar = el('div', { class: 'la-topbar' });
  const home = el('button', {
    type: 'button',
    class: 'la-btn la-btn--icon',
    'aria-label': ui('ui.home'),
    'data-action': 'reward-home',
  });
  home.append(iconHome());
  home.addEventListener('click', options.onContinue);

  const repeat = el('button', {
    type: 'button',
    class: 'la-btn la-btn--icon',
    'aria-label': ui('ui.repeat'),
    'data-action': 'reward-repeat',
  });
  repeat.append(iconEar());
  repeat.addEventListener('click', () => {
    void options.audio?.play('fb.nav.done.1');
  });
  const rightSide = el('div', { class: 'la-topbar__side' });
  rightSide.append(repeat);
  topbar.append(home, rightSide);

  const stage = el('div', { class: 'la-stage la-reward' });
  stage.append(iconPloef('is-celebrate'));

  const sparks = el('div', { class: 'la-reward__sparks la-spark' });
  for (let i = 0; i < 5; i++) sparks.append(iconSpark());
  stage.append(sparks);

  stage.append(
    el('p', { class: 'la-reward__count', text: ui('ui.reward.sparks').replace('{n}', String(options.sparks)) }),
  );

  const leafRow = el('div', { class: 'la-reward__count' });
  leafRow.append(iconLeaf(true));
  leafRow.append(document.createTextNode(` ${options.leaves}`));
  stage.append(leafRow);

  const footer = el('div', { class: 'la-footer la-footer--center' });
  const next = el('button', {
    type: 'button',
    class: 'la-btn la-btn--primary',
    'aria-label': ui('ui.next'),
    'data-action': 'reward-next',
    'data-autofocus': '',
  });
  next.append(iconNext());
  next.append(document.createTextNode(` ${ui('ui.next')}`));
  next.addEventListener('click', options.onContinue);
  footer.append(next);

  screen.append(topbar, stage, footer);
  void options.audio?.play('fb.nav.done.1');
  return screen;
}