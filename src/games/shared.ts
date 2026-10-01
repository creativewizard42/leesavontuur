/**
 * Gedeelde helpers voor de games-laag (activiteit-schermen). Gebruikt de
 * content-API; nooit niet-geleerde grafemen of geblokkeerde woorden.
 */
import type { Word } from '../types';
import { graphemes, wordsForBlock } from '../content';

/** MVP-grafemen (blok 1, ED §5.2). */
export function mvpLearned(): ReadonlySet<string> {
  return new Set(graphemes.filter((g) => g.introducedInPhase <= 1).map((g) => g.id));
}

/** MVP-woorden (ED §6.5). */
export function mvpWords(): Word[] {
  return wordsForBlock(1);
}

export function mvpWordNames(): string[] {
  return mvpWords().map((w) => w.word);
}
