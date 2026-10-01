/**
 * Content-specifieke types. De canonieke datamodel-interfaces staan in
 * `src/types.ts` (bron van waarheid); hier alleen re-export + bundeltypes.
 */
export * from '../types';

import type {
  ContentBundle,
  Grapheme,
  Sentence,
  SightWord,
  Word,
} from '../types';

/** Volledige, gevalideerde content van LEESAVONTUUR. */
export type { ContentBundle };

/** Snelle lookup-structuren die de validator/query's intern opbouwen. */
export interface ContentIndex {
  graphemeById: Map<string, Grapheme>;
  wordByWord: Map<string, Word>;
  sightWordById: Map<string, SightWord>;
  sentenceById: Map<string, Sentence>;
  /** letters -> grafeem-id (voor segmentatie, langste match eerst). */
  graphemeByLetters: Map<string, Grapheme>;
}
