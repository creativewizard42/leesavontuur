/**
 * Blokkeerlijst (ED §6.4). Nooit tonen, ook niet als afleider of gegenereerd
 * item. Elke generator van woorden/afleiders MOET hiertegen controleren.
 */

/** Basisblokkeerlijst uit ED §6.4 (lowercase, zonder leestekens). */
export const BLOCKLIST: readonly string[] = [
  'kak',
  'pik',
  'kut',
  'lul',
  'tiet',
  'tet',
  'pis',
  'poep',
  'kont',
  'neuk',
  'seks',
  'lijk',
  'dood',
  'moord',
  'dom',
  'gek',
  'dik',
  'ras',
];

/** Normaliseert een woord naar alleen kleine letters (a-z). */
export function normalizeWord(word: string): string {
  return word.toLowerCase().replace(/[^a-z]/g, '');
}

const BLOCKLIST_SET: ReadonlySet<string> = new Set(BLOCKLIST);

/**
 * True als het woord (of een genormaliseerde vorm) geblokkeerd is.
 * Werkt ook op afleiders die toevallig ontstaan (ED §6.4).
 */
export function isBlockedWord(word: string): boolean {
  const normalized = normalizeWord(word);
  if (normalized.length === 0) return false;
  if (BLOCKLIST_SET.has(normalized)) return true;
  // Vangvarianten: meervoud/verkleining-achtige toevoegingen vangen we breed.
  for (const blocked of BLOCKLIST) {
    if (normalized.startsWith(blocked) && normalized.length <= blocked.length + 2) {
      return true;
    }
  }
  return false;
}
