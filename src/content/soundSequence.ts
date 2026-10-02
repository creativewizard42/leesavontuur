/**
 * Canonieke opmaak van klankreeksen (één helper voor alle lagen).
 *
 * Een gerekte/gehakte klankreeks heeft twee verschijningsvormen:
 *
 * - `'speech'`: de vorm die gesproken wordt (TTS-fallback, opnamelijst en de
 *   `text` van een `blend.<woord>`-clip). Klanken worden met een expliciete
 *   pauze (`" … "`) gescheiden, zodat de opname-instructie en de TTS dezelfde
 *   tekst delen (ED §13.1).
 * - `'display'`: de vorm die op het scherm komt (feedbackvariabelen zoals
 *   `{sounds}`). Klanken worden met een koppelteken (`" - "`) gescheiden.
 *
 * Beide modi gebruiken dezelfde klank-hints in dezelfde volgorde, zodat de
 * gesproken clip en de getoonde tekst nooit uit elkaar lopen.
 */
import { getGraphemeById } from './graphemes';

export type SoundSequenceMode = 'speech' | 'display';

const SEPARATOR: Readonly<Record<SoundSequenceMode, string>> = {
  speech: ' … ',
  display: ' - ',
};

/**
 * Formatteert een reeks grafeem-IDs tot een spreekbare/leesbare klankreeks.
 *
 * Onbekende IDs (bv. al vooraf opgeloste klank-hints uit item-metadata) blijven
 * ongewijzigd staan, zodat de helper ook bestaande reeksen aankan.
 */
export function formatSoundSequence(
  graphemeIds: readonly string[],
  mode: SoundSequenceMode = 'speech',
): string {
  return graphemeIds
    .map((id) => getGraphemeById(id)?.soundHint ?? id)
    .join(SEPARATOR[mode]);
}
