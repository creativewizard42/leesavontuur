/**
 * Deterministische, injecteerbare RNG-hulpmiddelen (ARCHITECTURE §2).
 * Alle toevallige keuzes in core/learning gaan via `Rng` (`() => number`),
 * zodat tests met een vaste seed herhaalbaar zijn.
 */
import type { Rng } from '../types';

/** Mulberry32: kleine, snelle, deterministische PRNG. */
export function createSeededRng(seed: number): Rng {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Geheel getal in [0, maxExclusive). Veilig bij maxExclusive <= 0. */
export function randInt(rng: Rng, maxExclusive: number): number {
  if (!Number.isFinite(maxExclusive) || maxExclusive <= 0) return 0;
  const value = Math.floor(rng() * maxExclusive);
  return value < 0 ? 0 : value >= maxExclusive ? maxExclusive - 1 : value;
}

/** Willekeurig element, of undefined bij een lege lijst. */
export function pick<T>(rng: Rng, items: readonly T[]): T | undefined {
  if (items.length === 0) return undefined;
  return items[randInt(rng, items.length)];
}

/** `count` unieke elementen (zonder teruglegging), in willekeurige volgorde. */
export function pickMany<T>(rng: Rng, items: readonly T[], count: number): T[] {
  const copy = items.slice();
  const out: T[] = [];
  const n = Math.min(Math.max(0, count), copy.length);
  for (let i = 0; i < n; i++) {
    const index = randInt(rng, copy.length);
    const [value] = copy.splice(index, 1);
    if (value !== undefined) out.push(value);
  }
  return out;
}

/** Fisher-Yates op een kopie; muteert de invoer niet. */
export function shuffle<T>(rng: Rng, items: readonly T[]): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = randInt(rng, i + 1);
    const a = out[i];
    const b = out[j];
    if (a === undefined || b === undefined) continue;
    out[i] = b;
    out[j] = a;
  }
  return out;
}
