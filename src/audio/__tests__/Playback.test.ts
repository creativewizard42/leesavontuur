import { describe, expect, it } from 'vitest';
import type { AudioClip } from '../../types';
import { createAudioService } from '../AudioService';

const clip = (key: string): AudioClip => ({ key, src: `audio/words/${key}.mp3`, text: key, kind: 'word' });
function controlledMedia() {
  const element = new EventTarget() as EventTarget & { play(): Promise<void>; pause(): void; currentTime: number };
  element.currentTime = 0;
  element.play = () => Promise.resolve();
  element.pause = () => {};
  return element;
}
const flush = async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); };

describe('Complete playback and cancellation', () => {
  it('waits for ended before starting the next recording', async () => {
    const media: ReturnType<typeof controlledMedia>[] = [];
    const service = createAudioService({ speech: null, createElement: () => {
      const element = controlledMedia(); media.push(element); return element as unknown as HTMLAudioElement;
    } });
    const playback = service.playSequence([clip('kat'), clip('tas')]);
    await flush();
    media[0]!.dispatchEvent(new Event('loadeddata'));
    media[0]!.dispatchEvent(new Event('playing'));
    await flush();
    expect(media).toHaveLength(1);
    media[0]!.dispatchEvent(new Event('ended'));
    await flush();
    expect(media).toHaveLength(2);
    media[1]!.dispatchEvent(new Event('ended'));
    expect((await playback).result).toBe('file');
  });

  it('stop cancels the sequence and never starts a stale next fragment', async () => {
    const media: ReturnType<typeof controlledMedia>[] = [];
    const service = createAudioService({ speech: null, createElement: () => {
      const element = controlledMedia(); media.push(element); return element as unknown as HTMLAudioElement;
    } });
    const playback = service.playSequence([clip('kat'), clip('tas')]);
    service.stop();
    expect((await playback).reason).toBe('cancelled');
    expect(media).toHaveLength(1);
  });

  it('uses genuine recorded phonemes in order as blend fallback', async () => {
    const played: string[] = [];
    const service = createAudioService({ speech: null, hintPauseMs: 0, clipCapable: true,
      source: { getClip: key => key.startsWith('lk.') ? { key, src: `audio/graphemes/${key.split('.')[1]}_sound.mp3`, kind: 'grapheme-sound' } :
        { key, src: '', text: 'k … a … mmm', kind: 'blend' } },
      createElement: src => {
        played.push(src); const element = controlledMedia();
        element.play = () => { queueMicrotask(() => element.dispatchEvent(new Event('ended'))); return Promise.resolve(); };
        return element as unknown as HTMLAudioElement;
      },
    });
    expect((await service.playStretched('kam')).result).toBe('file');
    expect(played).toEqual(['audio/graphemes/k_sound.mp3', 'audio/graphemes/a_sound.mp3', 'audio/graphemes/m_sound.mp3']);
  });

  it('does not synthesize embedded teaching sounds', async () => {
    let spoke = false;
    const service = createAudioService({ clipCapable: false,
      speech: { getVoices: () => [{ lang: 'nl-NL', localService: true }], cancel() {}, speak() { spoke = true; } },
    });
    const result = await service.playClip({ key: 'instr.fn.first_sound.m', src: '', kind: 'instruction', text: 'Welk woord begint met mmm?' });
    expect(result.result).toBe('unavailable');
    expect(spoke).toBe(false);
  });
});
