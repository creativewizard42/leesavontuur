/**
 * Kleine DOM-helper voor de UI-laag (alleen hier e.a. ui/games/parent mogen
 * `document` gebruiken). Geen framework, geen runtime-dependency.
 */

export type Attrs = Record<string, string | number | boolean | undefined>;

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Attrs = {},
  children: (Node | string | null | undefined)[] = [],
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  applyAttrs(node, attrs);
  append(node, children);
  return node;
}

export function applyAttrs(node: HTMLElement, attrs: Attrs): void {
  for (const [key, value] of Object.entries(attrs)) {
    if (value === undefined || value === false) continue;
    if (key === 'class') {
      node.className = String(value);
    } else if (key === 'text') {
      node.textContent = String(value);
    } else if (value === true) {
      node.setAttribute(key, '');
    } else {
      node.setAttribute(key, String(value));
    }
  }
}

export function append(node: HTMLElement, children: (Node | string | null | undefined)[]): void {
  for (const child of children) {
    if (child === null || child === undefined) continue;
    node.append(typeof child === 'string' ? document.createTextNode(child) : child);
  }
}

/** Maakt een SVG-element met attributen (namespace-correct). */
export function svgEl(tag: string, attrs: Attrs = {}): SVGElement {
  const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === undefined || value === false) continue;
    if (value === true) node.setAttribute(key, '');
    else node.setAttribute(key, String(value));
  }
  return node;
}

/** Parseert een SVG-string naar een echt SVG-element. */
export function svgFromString(markup: string): SVGElement {
  const wrapper = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  wrapper.innerHTML = markup;
  const child = wrapper.firstElementChild;
  if (child instanceof SVGElement) return child;
  return wrapper;
}

export function clear(node: HTMLElement): void {
  while (node.firstChild) node.removeChild(node.firstChild);
}

export function setText(node: HTMLElement, text: string): void {
  node.textContent = text;
}

/**
 * Zet de focus op het eerste zinvolle interactieve element (QA-011). Volgorde:
 * expliciete `data-autofocus`, dan een optie, dan een gebied, dan de eerste knop.
 * Lukt niets, focus dan het scherm zelf (met tabindex -1).
 */
export function focusFirstInteractive(root: HTMLElement): void {
  const selectors = [
    '[data-autofocus]',
    '.la-option:not(:disabled)',
    '.la-area:not(:disabled)',
    '.la-avatar:not(:disabled)',
    'button:not(:disabled)',
  ];
  for (const selector of selectors) {
    const target = root.querySelector<HTMLElement>(selector);
    if (target) {
      target.focus();
      return;
    }
  }
  if (!root.hasAttribute('tabindex')) root.setAttribute('tabindex', '-1');
  root.focus();
}
