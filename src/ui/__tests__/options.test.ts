/**
 * QA-R2-005: audio-only en vorm-opties zijn ook zonder leesbare tekst te
 * onderscheiden (nummer + icoon) en tonen nooit een ontbrekende ui-key.
 */
import { describe, expect, it, vi } from 'vitest';
import type { ActivityOption, AudioClip } from '../../types';
import { createOptionGrid } from '../components/OptionGrid';

function clip(key: string): AudioClip {
  return { key, src: `audio/words/${key}.mp3`, text: key, kind: 'word' };
}

function mount(options: ActivityOption[]) {
  const grid = createOptionGrid({ options, onSelect: vi.fn() });
  document.body.append(grid.element);
  return grid;
}

describe('OptionGrid – audio-only (QA-R2-005)', () => {
  it('geeft een optie zonder label een nummer + icoon + aria-label (geen key)', () => {
    const options: ActivityOption[] = [
      { id: 'a', audio: clip('rat'), correct: true },
      { id: 'b', audio: clip('mat'), correct: false },
    ];
    const grid = mount(options);
    const first = grid.buttons[0];
    expect(first?.classList.contains('la-option--audio')).toBe(true);
    expect(first?.querySelector('svg')).not.toBeNull();
    expect(first?.querySelector('.la-option__number')?.textContent).toBe('1');
    const label = first?.getAttribute('aria-label') ?? '';
    expect(label).not.toBe('');
    expect(label).not.toContain('ui.option');
    expect(label).toContain('1');
  });

  it('rendert metadata.kind === "sound" als klankknop, ook met label', () => {
    const option = {
      id: 's',
      label: 'm',
      audio: clip('m'),
      correct: true,
      metadata: { kind: 'sound' },
    } as unknown as ActivityOption;
    const grid = mount([option]);
    const button = grid.buttons[0];
    expect(button?.classList.contains('la-option--audio')).toBe(true);
    expect(button?.querySelector('.la-option__number')?.textContent).toBe('1');
    expect(button?.textContent ?? '').not.toBe('m');
  });

  it('rendert metadata.kind === "shape" als vorm', () => {
    const option = {
      id: 'shape.1',
      correct: true,
      metadata: { kind: 'shape', shape: 'triangle' },
    } as unknown as ActivityOption;
    const grid = mount([option]);
    const button = grid.buttons[0];
    expect(button?.classList.contains('la-option--shape')).toBe(true);
    expect(button?.querySelector('svg')).not.toBeNull();
  });
});
