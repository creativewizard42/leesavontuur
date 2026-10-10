/**
 * Wereldkaart-scherm (GD §1.3, §6.3). Gebieden gaan open op mastery.
 * Geen percentages tonen aan het kind; blaadjes als voortgang.
 */
import type { Profile } from '../../types';
import type { AudioService } from '../../audio/AudioService';
import { areas, ui } from '../../content';
import { masteredGraphemeCount } from '../../core/Progression';
import { practiceAvailable } from '../../core/PracticePlanner';
import { instructionClip } from '../../learning/util';
import { el } from '../dom';
import { iconEar, iconHome, iconLeaf, iconLetter, iconPicture, iconPloef, iconSpark } from '../icons';
import { createButton } from '../components/Button';

export interface MapScreenOptions {
  profile: Profile;
  audio: AudioService;
  onSelectArea: (phase: number) => void;
  onStartFree: () => void;
  onStart?: () => void;
  onHome?: () => void;
  onParent: () => void;
}

export function createMapScreen(options: MapScreenOptions): HTMLElement {
  const screen = el('div', { class: 'la-screen', 'data-screen': 'map' });

  const topbar = el('div', { class: 'la-topbar' });
  topbar.append(
    createButton({
      label: ui('ui.home'),
      ariaLabel: ui('ui.home'),
      icon: iconHome(),
      iconOnly: true,
      onClick: () => { options.audio.stop(); options.onHome?.(); },
    }),
  );
  topbar.append(
    createButton({
      label: ui('ui.parent.title'),
      ariaLabel: ui('ui.parent.title'),
      onClick: options.onParent,
    }),
  );

  const stage = el('div', { class: 'la-stage' });
  stage.append(el('img', { class: 'la-forest', src: 'assets/images/klankwoud.svg', alt: '', 'aria-hidden': 'true' }));
  stage.append(el('h1', { class: 'la-title', text: ui('ui.world.title') }));

  const mastered = masteredGraphemeCount(options.profile);
  const boom = el('p', { class: 'la-hint-text' });
  boom.append(iconLeaf(true));
  boom.append(
    document.createTextNode(` ${ui('ui.klankboom.title')} · ${mastered} blaadjes`),
  );
  boom.classList.add('la-map-progress');
  stage.append(boom);

  if (options.onStart) {
    const adventure = createButton({ label: 'Mijn avontuur', ariaLabel: 'Ga verder met mijn leesavontuur',
      icon: iconPloef('la-ploef--small'), variant: 'primary', className: 'la-adventure', onClick: options.onStart });
    adventure.dataset['action'] = 'continue-adventure';
    adventure.setAttribute('data-autofocus', '');
    stage.append(adventure);
  }
  const grid = el('div', { class: 'la-map-grid', 'aria-label': 'Kies een oefenplek' });
  for (const area of areas) {
    const isFree = area.phase === 0;
    const unlocked = isFree || practiceAvailable(options.profile, area.phase);
    const button = el('button', {
      type: 'button',
      class: 'la-area',
      'data-area': String(area.phase),
      'aria-label': `${area.name}. ${unlocked ? ui('ui.area.open') : ui('ui.area.locked')}`,
      ...(unlocked ? {} : { disabled: true }),
    });
    const symbols = [iconSpark, iconEar, iconLetter, iconEar, iconLeaf, iconPicture, iconLeaf, iconPicture, iconPicture, iconSpark];
    const badge = el('span', { class: 'la-area__badge', 'aria-hidden': 'true' });
    badge.append((symbols[area.phase] ?? iconLeaf)());
    button.append(badge);
    button.append(el('span', { class: 'la-area__name', text: area.name }));
    button.append(el('span', { class: 'la-sr-only', text: area.description }));
    const status = el('span', { class: 'la-area__status' });
    if (unlocked) {
      status.append(iconLeaf(true));
      status.append(document.createTextNode(` ${isFree ? ui('ui.area.open') : ui('ui.area.practicing')}`));
    } else {
      status.append(iconLeaf(false));
      status.append(document.createTextNode(` ${ui('ui.area.locked')}`));
    }
    button.append(status);
    if (unlocked) {
      button.addEventListener('click', () => {
        if (isFree) {
          void options.audio.playClip(instructionClip('instr.map', 'Kies een plek in het Klankwoud.'));
          options.onStartFree();
        } else {
          options.onSelectArea(area.phase);
        }
      });
    }
    grid.append(button);
  }
  stage.append(grid);

  screen.append(topbar, stage);
  return screen;
}
