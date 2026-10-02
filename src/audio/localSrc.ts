/**
 * Gedeelde validatie van lokale audio-`src` (privacy, ARCHITECTURE §6/§8).
 *
 * Eén bron van waarheid voor zowel de runtime-audio (`AudioService`) als de
 * hervat-JSON-validatie (`SessionPlanner`), zodat beide lagen exact dezelfde
 * paden accepteren (SEC-R3-005). Bewust DOM-vrij op moduleniveau: `location`
 * wordt alleen binnen `isLocalAudioSrc` en alleen indien beschikbaar gebruikt.
 */

/**
 * Valideert/schoon een audio-`src` op en geeft het opgeschoonde pad terug, of
 * `undefined` wanneer het geen lokaal, relatief pad is.
 *
 * We strippen eerst leading/trailing whitespace en C0-controltekens, zodat een
 * aanvallende bron geen `"//evil"`, `"\\evil"` of `"https://evil"` kan verbergen
 * achter een spatie of controleteken. Daarna weigeren we lege waarden, een
 * protocol-relatief (`//`) of Windows-pad (`\`) begin, elk scheme
 * (`https:`, `data:`, `javascript:`, …) en `..`-segmenten (path traversal).
 */
export function sanitizeLocalAudioSrc(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.replace(/^[\u0000-\u0020]+|[\u0000-\u0020]+$/g, '');
  if (trimmed.length === 0) return undefined;
  if (trimmed.startsWith('//')) return undefined;
  if (trimmed.startsWith('\\')) return undefined;
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return undefined;
  if (trimmed.split(/[\\/]+/).includes('..')) return undefined;
  return trimmed;
}

/**
 * True als `src` een lokaal, same-origin pad is. Bovenop `sanitizeLocalAudioSrc`
 * toetsen we — wanneer `location` bestaat — dat het pad naar dezelfde origin
 * resolvet (defense-in-depth).
 */
export function isLocalAudioSrc(src: string): boolean {
  const trimmed = sanitizeLocalAudioSrc(src);
  if (trimmed === undefined) return false;
  if (typeof location !== 'undefined' && location.href) {
    try {
      if (new URL(trimmed, location.href).origin !== location.origin) return false;
    } catch {
      return false;
    }
  }
  return true;
}
