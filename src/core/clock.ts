/**
 * Injecteerbare klok (ARCHITECTURE §2: geen niet-injecteerbare timers).
 * Zo blijven responstijd-berekeningen deterministisch testbaar.
 */
export interface Clock {
  now(): number;
}

/** Echte klok (Date.now). */
export const systemClock: Clock = { now: () => Date.now() };

/** Klok die altijd hetzelfde tijdstip teruggeeft. */
export function fixedClock(time: number): Clock {
  return { now: () => time };
}

/** Klok die bij elke aanroep met `step` ms vooruitloopt. */
export function advancingClock(start: number, step = 1000): Clock {
  let current = start;
  return {
    now: () => {
      const value = current;
      current += step;
      return value;
    },
  };
}
