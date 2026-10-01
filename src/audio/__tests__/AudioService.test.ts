import { describe, expect, it } from 'vitest';
import type { AudioClip } from '../../types';
import {
  createAudioService,
  createMockAudioService,
  isLocalAudioSrc,
  type SpeechSynthesisLike,
} from '../AudioService';

function clip(overrides: Partial<AudioClip> = {}): AudioClip {
  return {
    key: 'de.kam',
    src: 'audio/words/kam.mp3',
    text: 'kam',
    kind: 'word',
    ...overrides,
  };
}

function sourceFor(map: Record<string, AudioClip>) {
  return { getClip: (key: string): AudioClip | undefined => map[key] };
}

const localVoice = { lang: 'nl-NL', localService: true, name: 'Lokaal' };
const remoteVoice = { lang: 'nl-NL', localService: false, name: 'Cloud' };

function speechWith(voices: { lang: string; localService?: boolean; name?: string }[]) {
  const spoke: unknown[] = [];
  const speech: SpeechSynthesisLike & { spoke: unknown[] } = {
    spoke,
    speak: (u) => {
      spoke.push(u);
    },
    cancel: () => undefined,
    getVoices: () => voices,
  };
  return speech;
}

describe('AudioService – resolutie en fallbacks', () => {
  it('herkent alleen lokale (same-origin) audiobronnen', () => {
    expect(isLocalAudioSrc('audio/words/kam.mp3')).toBe(true);
    expect(isLocalAudioSrc('https://evil.example/x.mp3')).toBe(false);
    expect(isLocalAudioSrc('//evil.example/x.mp3')).toBe(false);
    expect(isLocalAudioSrc('data:audio/mp3;base64,AAAA')).toBe(false);
  });

  it('gebruikt nooit TTS voor losse klanken (grapheme-sound)', async () => {
    const fallbacks: string[] = [];
    const service = createAudioService({
      source: sourceFor({ 'lk.m.sound': clip({ key: 'lk.m.sound', kind: 'grapheme-sound', src: 'audio/graphemes/m_sound.mp3', text: 'mmm' }) }),
      createElement: () => null,
      speech: speechWith([localVoice]),
      onFallback: (key) => fallbacks.push(key),
    });
    const result = await service.play('lk.m.sound');
    expect(result).toBe('silent');
    expect(fallbacks).toContain('lk.m.sound');
  });

  it('valt terug op lokale nl-NL TTS voor hele woorden', async () => {
    const speech = speechWith([localVoice]);
    const service = createAudioService({
      source: sourceFor({ 'de.kam': clip() }),
      createElement: () => null,
      speech,
      createUtterance: (text, lang) => ({ text, lang }),
    });
    const result = await service.play('de.kam');
    expect(result).toBe('played-tts');
    expect(speech.spoke).toHaveLength(1);
  });

  it('weigert cloud-stemmen (localService !== true)', async () => {
    const service = createAudioService({
      source: sourceFor({ 'de.kam': clip() }),
      createElement: () => null,
      clipCapable: false,
      speech: speechWith([remoteVoice]),
    });
    expect(await service.play('de.kam')).toBe('silent');
    expect(service.isAvailable()).toBe(false);
  });

  it('speelt nooit een externe host af, ook niet als bron dat vraagt', async () => {
    const created: string[] = [];
    const service = createAudioService({
      source: sourceFor({ ext: clip({ key: 'ext', src: 'https://evil.example/x.mp3' }) }),
      createElement: (src) => {
        created.push(src);
        return null;
      },
      speech: null,
    });
    expect(await service.play('ext')).toBe('silent');
    expect(created).toHaveLength(0);
  });

  it('speelt gerekte klanken via de blend-bron of een blend-clip', async () => {
    const played: string[] = [];
    const service = createAudioService({
      source: sourceFor({}),
      createElement: (src) => {
        played.push(src);
        return null;
      },
      speech: null,
    });
    const result = await service.playStretched('kam');
    expect(result).toBe('silent');
    expect(played).toContain('audio/blends/kam.mp3');
  });
});

describe('AudioService – mock', () => {
  it('registreert afgespeelde clips en sequenties', async () => {
    const mock = createMockAudioService();
    await mock.play('a');
    await mock.playClip(clip({ key: 'b' }));
    await mock.playSequence([clip({ key: 'c' }), clip({ key: 'd' })]);
    await mock.playStretched('kam');
    expect(mock.played).toEqual(['a', 'b', 'c', 'd', 'blend.kam']);
    expect(mock.sequences).toEqual([['c', 'd']]);
    expect(mock.mode).toBe('clip');
  });

  it('kan op niet-beschikbaar/silent worden gezet', async () => {
    const mock = createMockAudioService({ result: 'silent', mode: 'silent' });
    await mock.play('x');
    expect(mock.mode).toBe('silent');
    mock.setAvailable(false);
    expect(mock.isAvailable()).toBe(false);
  });
});
