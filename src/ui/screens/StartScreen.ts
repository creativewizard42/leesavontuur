/**
 * Startscherm (GD §3.1 start, UX §3.1): geen naam/PII, optioneel dierenicoon,
 * grote speelknop met audio-instructie.
 */
import type { Profile } from '../../types';
import type { AudioService } from '../../audio/AudioService';
import { ui } from '../../content';
import { instructionClip } from '../../learning/util';
import { getProperName } from '../../content';
import { el } from '../dom';
import { iconAvatar, iconPloef, AVATAR_IDS } from '../icons';
import { createButton } from '../components/Button';

export interface StartScreenOptions {
  profile: Profile;
  audio: AudioService;
  onStart: () => void;
  onAvatarChange: (id: string) => void;
  onParent: () => void;
  onToggleAudio: (enabled: boolean) => void;
}

export function createStartScreen(options: StartScreenOptions): HTMLElement {
  const screen = el('div', { class: 'la-screen', 'data-screen': 'start' });

  const topbar = el('div', { class: 'la-topbar' });
  topbar.append(el('span', {}));
  const parentButton = createButton({
    label: ui('ui.parent.title'),
    ariaLabel: ui('ui.parent.title'),
    variant: 'default',
    onClick: options.onParent,
  });
  topbar.append(parentButton);

  const stage = el('div', { class: 'la-stage' });
  stage.append(iconPloef('is-celebrate'));
  stage.append(el('h1', { class: 'la-title', text: ui('ui.app.title') }));

  const avatarGroup = el('div', { class: 'la-avatars', role: 'group', 'aria-label': ui('ui.avatar.group') });
  for (const id of AVATAR_IDS) {
    const active = options.profile.avatarIcon === id;
    const button = el('button', {
      type: 'button',
      class: 'la-avatar',
      'data-avatar': id,
      'aria-pressed': active ? 'true' : 'false',
      'aria-label': id,
    });
    button.append(iconAvatar(id));
    button.addEventListener('click', () => {
      options.onAvatarChange(id);
      for (const child of avatarGroup.querySelectorAll('.la-avatar')) {
        child.setAttribute('aria-pressed', child === button ? 'true' : 'false');
      }
      const proper = getProperName(id);
      if (proper) void options.audio.playClip(proper.audio);
    });
    avatarGroup.append(button);
  }
  stage.append(avatarGroup);

  const playButton = createButton({
    label: ui('ui.start'),
    ariaLabel: ui('ui.play'),
    variant: 'play',
    icon: iconPloef('la-ploef--small'),
    onClick: () => {
      void options.audio.playClip(
        instructionClip('instr.start', 'We gaan lezen! Tik op de groene knop.'),
      );
      options.onStart();
    },
  });
  playButton.dataset['action'] = 'start';
  playButton.setAttribute('data-autofocus', '');
  stage.append(playButton);

  const audioToggle = el('label', { class: 'la-hint-text' });
  const checkbox = el('input', { type: 'checkbox', 'data-setting': 'audio' });
  checkbox.checked = options.profile.settings.audioEnabled;
  checkbox.addEventListener('change', () => options.onToggleAudio(checkbox.checked));
  audioToggle.append(checkbox);
  audioToggle.append(document.createTextNode(` ${ui('ui.settings.audio')}`));
  stage.append(audioToggle);

  screen.append(topbar, stage);
  return screen;
}
