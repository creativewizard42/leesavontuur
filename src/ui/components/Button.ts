/**
 * UI-componenten (DOM). Alleen hier en in screens/ mag DOM gebruikt worden.
 * TODO(Builder): implementeer componenten conform UX_DESIGN.md (niet aanraken).
 */
export interface ButtonOptions {
  label: string;
  ariaLabel?: string;
  onClick: () => void;
}

export function createButton(_options: ButtonOptions): HTMLButtonElement {
  throw new Error('TODO(Builder): ui.createButton');
}
