/**
 * Lokale verwarringslog voor het ouderdashboard (ED §12.1 "veelgemaakte
 * verwarringen"). Geen PII, geen netwerk; alleen tellers van verwisselingen.
 */
import { defaultStorage, type SaveStorage } from '../core/SaveSystem';

export const CONFUSION_KEY = 'leesavontuur.confusions.v1';

export interface ConfusionEntry {
  /** Het juiste item (grafeem of woord). */
  target: string;
  /** Wat het kind koos. */
  chosen: string;
  kind: string;
  count: number;
}

function clean(value: string | null): string | null {
  if (value === null) return null;
  let out = value;
  if (out.startsWith('g:')) out = out.slice(2);
  if (out.startsWith('ans:')) out = out.slice(4);
  return out.length > 0 && out.length <= 24 ? out : null;
}

export function loadConfusions(storage: SaveStorage = defaultStorage()): ConfusionEntry[] {
  let raw: string | null = null;
  try {
    raw = storage.read(CONFUSION_KEY);
  } catch {
    return [];
  }
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((entry): entry is ConfusionEntry => {
        if (typeof entry !== 'object' || entry === null) return false;
        const e = entry as Record<string, unknown>;
        return typeof e['target'] === 'string' && typeof e['chosen'] === 'string' && typeof e['count'] === 'number';
      })
      .slice(0, 50);
  } catch {
    return [];
  }
}

export function recordConfusion(
  target: string | null,
  chosen: string | null,
  kind: string,
  storage: SaveStorage = defaultStorage(),
): void {
  const t = clean(target);
  const c = clean(chosen);
  if (!t || !c || t === c) return;
  const entries = loadConfusions(storage);
  const found = entries.find((e) => e.target === t && e.chosen === c && e.kind === kind);
  if (found) found.count += 1;
  else entries.push({ target: t, chosen: c, kind, count: 1 });
  entries.sort((a, b) => b.count - a.count);
  try {
    storage.write(CONFUSION_KEY, JSON.stringify(entries.slice(0, 50)));
  } catch {
    /* opslag mag stil falen */
  }
}

export function clearConfusions(storage: SaveStorage = defaultStorage()): void {
  try {
    storage.remove(CONFUSION_KEY);
  } catch {
    /* negeren */
  }
}
