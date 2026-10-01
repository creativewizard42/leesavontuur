/**
 * Beloningsscherm (GD §3.1 stap 8, §6.1): klein, deterministisch, ná leeswerk.
 */
import { ui } from '../../content';
import { el } from '../dom';
import { iconLeaf, iconPloef, iconSpark } from '../icons';

export interface RewardScreenOptions {
  sparks: number;
  leaves: number;
  onContinue: () => void;
}

export function createRewardScreen(options: RewardScreenOptions): HTMLElement {
  const screen = el('div', { class: 'la-screen', 'data-screen': 'reward' });
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
    text: ui('ui.next'),
  });
  next.addEventListener('click', options.onContinue);
  footer.append(next);

  screen.append(stage, footer);
  return screen;
}
