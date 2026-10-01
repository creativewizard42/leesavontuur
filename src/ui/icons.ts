/**
 * Inline SVG-iconen en Ploef (eigen ontwerp, UX_DESIGN.md §7).
 * Decoratieve iconen zijn `aria-hidden`; betekenis draagt de knoptekst.
 */
import { svgFromString } from './dom';

function wrap(inner: string, viewBox = '0 0 64 64'): SVGElement {
  return svgFromString(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" class="la-svg" aria-hidden="true" focusable="false">${inner}</svg>`,
  );
}

export function iconHome(): SVGElement {
  return wrap(
    '<path d="M8 30 L32 10 L56 30" fill="none" stroke="#14342a" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<path d="M14 30 V54 H50 V30" fill="#4caf6d" stroke="#14342a" stroke-width="5" stroke-linejoin="round"/>' +
      '<rect x="27" y="38" width="10" height="16" fill="#fffdf5" stroke="#14342a" stroke-width="4"/>',
  );
}

export function iconEar(): SVGElement {
  return wrap(
    '<path d="M38 12 C22 12 14 24 16 38 C17 48 24 54 32 52 C38 51 40 46 38 40" fill="#a9d6b0" stroke="#14342a" stroke-width="5" stroke-linecap="round"/>' +
      '<path d="M34 20 C26 20 22 28 24 36 C25 42 31 44 34 40" fill="none" stroke="#14342a" stroke-width="4" stroke-linecap="round"/>',
  );
}

export function iconNext(): SVGElement {
  return wrap(
    '<path d="M22 12 L44 32 L22 52" fill="none" stroke="currentColor" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>',
  );
}

export function iconCheck(): SVGElement {
  return wrap(
    '<path d="M10 34 L26 48 L54 16" fill="none" stroke="currentColor" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>',
  );
}

export function iconStar(): SVGElement {
  return wrap(
    '<path d="M32 6 L40 24 L60 26 L45 40 L49 60 L32 50 L15 60 L19 40 L4 26 L24 24 Z" fill="currentColor" stroke="#14342a" stroke-width="4" stroke-linejoin="round"/>',
  );
}

export function iconLeaf(filled = true): SVGElement {
  return wrap(
    `<path d="M16 52 C16 24 34 8 56 8 C56 32 40 52 16 52 Z" fill="${filled ? '#4caf6d' : '#d7e3d9'}" stroke="#14342a" stroke-width="5" stroke-linejoin="round"/>` +
      '<path d="M16 52 C28 42 40 30 50 18" fill="none" stroke="#14342a" stroke-width="4" stroke-linecap="round"/>',
  );
}

export function iconSpark(): SVGElement {
  return wrap(
    '<path d="M32 4 C34 22 42 30 60 32 C42 34 34 42 32 60 C30 42 22 34 4 32 C22 30 30 22 32 4 Z" fill="currentColor" stroke="#14342a" stroke-width="4" stroke-linejoin="round"/>',
  );
}

export function iconSpeaker(): SVGElement {
  return wrap(
    '<path d="M10 24 H22 L38 10 V54 L22 40 H10 Z" fill="#2e7daf" stroke="#1b4f70" stroke-width="4" stroke-linejoin="round"/>' +
      '<path d="M44 24 C50 28 50 36 44 40" fill="none" stroke="#1b4f70" stroke-width="4" stroke-linecap="round"/>',
  );
}

/** Ploef, het donzige boswezentje met grote flaporen (UX §7). */
export function iconPloef(extraClass = ''): SVGElement {
  const el = svgFromString(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" role="img" aria-label="Ploef, een donzig boswezentje met grote oren" class="la-svg la-ploef ${extraClass}">` +
      '<ellipse cx="60" cy="55" rx="22" ry="40" fill="#a9d6b0" stroke="#14342a" stroke-width="4"/>' +
      '<ellipse cx="140" cy="55" rx="22" ry="40" fill="#a9d6b0" stroke="#14342a" stroke-width="4"/>' +
      '<ellipse cx="100" cy="125" rx="62" ry="58" fill="#4caf6d" stroke="#14342a" stroke-width="5"/>' +
      '<ellipse cx="100" cy="140" rx="34" ry="30" fill="#eaf7ef" stroke="#14342a" stroke-width="3"/>' +
      '<circle cx="80" cy="112" r="7" fill="#14342a"/>' +
      '<circle cx="120" cy="112" r="7" fill="#14342a"/>' +
      '<ellipse cx="100" cy="130" rx="7" ry="5" fill="#f2b705" stroke="#14342a" stroke-width="2"/>' +
      '<path d="M150 130 q28 6 34 26" fill="none" stroke="#14342a" stroke-width="6" stroke-linecap="round"/>' +
      '<circle cx="186" cy="158" r="8" fill="#f2b705" stroke="#14342a" stroke-width="3"/>' +
      '</svg>',
  );
  return el;
}

export type AvatarId = 'eekhoorn' | 'uil' | 'vos' | 'konijn';

const AVATARS: Record<AvatarId, string> = {
  eekhoorn:
    '<circle cx="32" cy="34" r="20" fill="#c98a4b" stroke="#14342a" stroke-width="4"/>' +
    '<path d="M14 18 L22 6 L30 18 Z" fill="#c98a4b" stroke="#14342a" stroke-width="4" stroke-linejoin="round"/>' +
    '<path d="M50 18 L42 6 L34 18 Z" fill="#c98a4b" stroke="#14342a" stroke-width="4" stroke-linejoin="round"/>' +
    '<circle cx="24" cy="32" r="3" fill="#14342a"/><circle cx="40" cy="32" r="3" fill="#14342a"/>' +
    '<ellipse cx="32" cy="44" rx="14" ry="12" fill="#f3dcc0" stroke="#14342a" stroke-width="3"/>',
  uil:
    '<circle cx="32" cy="34" r="20" fill="#8d7fb5" stroke="#14342a" stroke-width="4"/>' +
    '<circle cx="24" cy="30" r="8" fill="#fffdf5" stroke="#14342a" stroke-width="3"/><circle cx="24" cy="30" r="3" fill="#14342a"/>' +
    '<circle cx="40" cy="30" r="8" fill="#fffdf5" stroke="#14342a" stroke-width="3"/><circle cx="40" cy="30" r="3" fill="#14342a"/>' +
    '<path d="M32 40 L27 46 L37 46 Z" fill="#f2b705" stroke="#14342a" stroke-width="3" stroke-linejoin="round"/>',
  vos:
    '<path d="M12 22 L20 8 L30 20 L34 20 L44 8 L52 22 C56 36 48 52 32 52 C16 52 8 36 12 22 Z" fill="#e0843f" stroke="#14342a" stroke-width="4" stroke-linejoin="round"/>' +
    '<circle cx="24" cy="32" r="3" fill="#14342a"/><circle cx="40" cy="32" r="3" fill="#14342a"/>' +
    '<ellipse cx="32" cy="44" rx="7" ry="5" fill="#fffdf5" stroke="#14342a" stroke-width="3"/>',
  konijn:
    '<ellipse cx="22" cy="16" rx="6" ry="16" fill="#e7e2ea" stroke="#14342a" stroke-width="4"/>' +
    '<ellipse cx="42" cy="16" rx="6" ry="16" fill="#e7e2ea" stroke="#14342a" stroke-width="4"/>' +
    '<circle cx="32" cy="38" r="18" fill="#e7e2ea" stroke="#14342a" stroke-width="4"/>' +
    '<circle cx="25" cy="36" r="3" fill="#14342a"/><circle cx="39" cy="36" r="3" fill="#14342a"/>' +
    '<ellipse cx="32" cy="45" rx="5" ry="4" fill="#f2b705" stroke="#14342a" stroke-width="3"/>',
};

export function iconAvatar(id: string): SVGElement {
  const inner = AVATARS[id as AvatarId] ?? AVATARS.eekhoorn;
  return wrap(inner);
}

export const AVATAR_IDS: readonly AvatarId[] = ['eekhoorn', 'uil', 'vos', 'konijn'];
