/**
 * Introductie van een nieuwe klank (GD §1.4, §4b): letter groot, knoppen
 * letternaam / klank / voorbeeldwoord. Duidelijk onderscheid letternaam vs
 * klank; de instructie gebruikt de KLANK (niet de letternaam).
 */
import type { Grapheme } from '../../types';
import type { AudioService } from '../../audio/AudioService';
import { fbText, ui } from '../../content';
import { el } from '../dom';
import { iconEar, iconLetter, iconPicture, iconPloef } from '../icons';

export interface LetterIntroOptions {
  grapheme: Grapheme;
  audio: AudioService;
  onContinue: () => void;
  /** Automatische instructie afspelen bij tonen (default true). */
  autoPlay?: boolean;
}

export function createLetterIntro(options: LetterIntroOptions): HTMLElement {
  const { grapheme, audio } = options;
  const root = el('div', { class: 'la-activity la-letter-intro', 'data-kind': 'letterintro' });

  const sortClip = grapheme.audio?.sound;

  root.append(iconPloef('is-celebrate'));
  root.append(el('p', { class: 'la-letter-groot', text: grapheme.letters }));
  root.append(el('p', { class: 'la-hint-text', text: ui('ui.letter.intro.title') }));

  const buttons = el('div', { class: 'la-options' });
  const make = (
    label: string,
    clipKey: 'name' | 'sound' | 'example',
    icon: SVGElement,
  ): HTMLButtonElement => {
    const button = el('button', {
      type: 'button',
      class: 'la-option la-option--word',
      'data-letter-action': clipKey,
      'aria-label': label,
    });
    button.append(icon);
    button.append(document.createTextNode(` ${label}`));
    const clip = grapheme.audio?.[clipKey];
    button.addEventListener('click', () => {
      if (clip) void audio.playClip(clip);
    });
    return button;
  };
  buttons.append(make(ui('ui.letter.name'), 'name', iconLetter()));
  buttons.append(make(ui('ui.letter.sound'), 'sound', iconEar()));
  if (grapheme.audio?.example) buttons.append(make(ui('ui.letter.example'), 'example', iconPicture()));
  root.append(buttons);

  const hint = el('p', { class: 'la-hint-text', text: fbText('fb.letterarrive.1') });
  root.append(hint);

  const footer = el('div', { class: 'la-footer la-footer--center' });
  const next = el('button', {
    type: 'button',
    class: 'la-btn la-btn--primary',
    'aria-label': ui('ui.next'),
    'data-action': 'intro-next',
    'data-autofocus': '',
  });
  next.append(document.createTextNode(ui('ui.next')));
  next.addEventListener('click', () => options.onContinue());
  footer.append(next);
  root.append(footer);

  if (options.autoPlay !== false && sortClip) void audio.playClip(sortClip);
  return root;
}
