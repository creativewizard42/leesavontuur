/**
 * Content-specifieke types. De canonieke datamodel-interfaces staan in
 * `src/types.ts` (bron van waarheid); hier alleen re-export + bundeltypes.
 */
export * from '../types';

import type { AudioClip, ContentBundle } from '../types';
import type { ProperName } from './properNames';

/** Volledige, gevalideerde content van LEESAVONTUUR. */
export type { ContentBundle };

export type { ProperName };

/**
 * Uitgebreide bundel met content die (nog) geen plek heeft in het bevroren
 * `ContentBundle` van `src/types.ts`: eigen namen (ED §8.1) en de centrale
 * instructie-/promptteksten. `index.ts` exporteert de bundel als `ContentBundle`
 * (publieke API), maar de validator kan de extra velden meelezen.
 */
export interface ContentBundleExt extends ContentBundle {
  properNames: ProperName[];
  instructions: Record<string, string>;
  audioManifest: AudioClip[];
}

/** Opties voor `validateContent`. */
export interface ValidateOptions {
  /**
   * Set van bestaande asset-paden (posix, t.o.v. `public/`), bv.
   * `"assets/images/words/kat.svg"`. Alleen als dit gegeven is, worden
   * beeld-/audiobestanden op bestaan gecontroleerd; ontbrekende audio is dan
   * een **waarschuwing**, ontbrekend beeld een fout.
   */
  existingAssets?: ReadonlySet<string>;
  /** Eis dat alle feedback-IDs uit GD §5 bestaan (default: true). */
  requireFeedbackKeys?: boolean;
}

/** Snelle lookup-structuren die de validator/query's intern opbouwen. */
export interface ContentIndex {
  graphemeById: Map<string, import('../types').Grapheme>;
  wordByWord: Map<string, import('../types').Word>;
  sightWordById: Map<string, import('../types').SightWord>;
  sentenceById: Map<string, import('../types').Sentence>;
  /** letters -> grafeem-id (voor segmentatie, langste match eerst). */
  graphemeByLetters: Map<string, import('../types').Grapheme>;
}
