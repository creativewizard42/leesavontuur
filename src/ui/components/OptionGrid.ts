/**
 * Optiegrid voor antwoorden (2 -> 3 -> 4 opties). Identieke knoppen
 * (GD §4), tikdoelen >= 64 px, toetsenbord/cijfer 1-4 (GD §8.4).
 * TODO(Builder): implementeer.
 */
import type { ActivityOption } from '../../types';

export interface OptionGridOptions {
  options: readonly ActivityOption[];
  onSelect: (optionId: string) => void;
}

export function createOptionGrid(_options: OptionGridOptions): HTMLElement {
  throw new Error('TODO(Builder): ui.createOptionGrid');
}
