/**
 * UI-componenten (DOM). Alleen hier en in screens mag DOM gebruikt worden.
 */
import { el } from '../dom';

export interface ButtonOptions {
  label: string;
  ariaLabel?: string;
  onClick: () => void;
  /** Optioneel icoon (SVG); verschijnt vóór het label. */
  icon?: Node;
  /** Alleen icoon; label wordt dan aria-label. */
  iconOnly?: boolean;
  variant?: 'default' | 'primary' | 'play' | 'wide';
  className?: string;
  disabled?: boolean;
}

export function createButton(options: ButtonOptions): HTMLButtonElement {
  const classes = ['la-btn'];
  if (options.variant === 'primary') classes.push('la-btn--primary');
  if (options.variant === 'play') classes.push('la-btn--play');
  if (options.variant === 'wide') classes.push('la-btn--wide');
  if (options.iconOnly) classes.push('la-btn--icon');
  if (options.className) classes.push(options.className);

  const button = el('button', {
    type: 'button',
    class: classes.join(' '),
    'aria-label': options.ariaLabel ?? options.label,
    ...(options.disabled === true ? { disabled: true } : {}),
  });

  if (options.icon) button.append(options.icon);
  if (!options.iconOnly || !options.icon) {
    if (options.icon && !options.iconOnly) button.append(document.createTextNode(' '));
    button.append(document.createTextNode(options.label));
  }

  button.addEventListener('click', (event) => {
    event.preventDefault();
    if (!button.disabled) options.onClick();
  });
  return button;
}
