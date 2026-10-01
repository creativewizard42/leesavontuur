/**
 * Wereldkaart-scherm (GD §1.3, §6.3). Gebieden gaan open op mastery.
 * Geen percentages tonen aan het kind; blaadjes als voortgang.
 */
import type { Profile } from '../../types';
import type { AudioService } from '../../audio/AudioService';
import { areas, ui } from '../../content';
import { phaseUnlocked, masteredGraphemeCount } from '../../core/Progression';
import { instructionClip } from '../../learning/util';
import { el } from '../dom';
import { iconLeaf, iconPloef } from '../icons';
import { createButton } from '../components/Button';

export interface MapScreenOptions {
  profile: Profile;
  audio: AudioService;
  onSelectArea: (phase: number) => void;
  onStartFree: () => void;
  onParent: () => void;
}

export function createMapScreen(options: MapScreenOptions): HTMLElement {
  const screen = el('div', { class: 'la-screen', 'data-screen': 'map' });

  const topbar = el('div', { class: 'la-topbar' });
  topbar.append(
    createButton({
      label: ui('ui.home'),
      ariaLabel: ui('ui.home'),
      onClick: () => options.audio.stop(),
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
  stage.append(iconPloef('la-ploef--small'));
  stage.append(el('h1', { class: 'la-title', text: ui('ui.world.title') }));

  const mastered = masteredGraphemeCount(options.profile);
  const total = options.profile.unlockedGraphemes.length;
  const boom = el('p', { class: 'la-hint-text' });
  boom.append(iconLeaf(true));
  boom.append(
    document.createTextNode(` ${ui('ui.klankboom.title')} · ${ui('ui.parent.learnedCount').replace('{n}', String(mastered)).replace('{total}', String(Math.max(total, mastered)))}`),
  );
  stage.append(boom);

  const grid = el('div', { class: 'la-map-grid' });
  for (const area of areas) {
    const isFree = area.phase === 0;
    const unlocked = isFree || phaseUnlocked(options.profile, area.phase);
    const button = el('button', {
      type: 'button',
      class: 'la-area',
      'data-area': String(area.phase),
      'aria-label': `${area.name}. ${unlocked ? ui('ui.area.open') : ui('ui.area.locked')}`,
      ...(unlocked ? {} : { disabled: true }),
    });
    button.append(el('span', { class: 'la-area__name', text: area.name }));
    button.append(el('span', { class: 'la-area__desc', text: area.description }));
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
