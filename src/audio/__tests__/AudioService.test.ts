import { describe, expect, it } from 'vitest';
import type { AudioClip } from '../../types';
import {
  createAudioService,
  createMockAudioService,
  isLocalAudioSrc,
  playResult,
  splitSoundHints,
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

type MediaMode = 'ok' | 'error' | 'reject' | 'hang';

function fakeMedia(mode: MediaMode): HTMLAudioElement {
  const listeners = new Map<string, Set<() => void>>();
  const emit = (type: string): void => {
    for (const fn of listeners.get(type) ?? []) fn();
  };
  const element = {
    currentTime: 0,
    pause(): void {
      /* niets */
    },
    addEventListener(type: string, fn: () => void): void {
      const set = listeners.get(type) ?? new Set<() => void>();
      set.add(fn);
      listeners.set(type, set);
    },
    removeEventListener(type: string, fn: () => void): void {
      listeners.get(type)?.delete(fn);
    },
    play(): Promise<void> {
      if (mode === 'reject') return Promise.reject(new Error('play-rejected'));
      if (mode === 'ok') {
        queueMicrotask(() => emit('canplaythrough'));
        return Promise.resolve();
      }
      if (mode === 'error') {
        queueMicrotask(() => emit('error'));
      }
      return new Promise<void>(() => {
        /* blijft hangen tot timeout */
      });
    },
  };
  return element as unknown as HTMLAudioElement;
}

function speechWith(voices: { lang: string; localService?: boolean; name?: string }[]): SpeechSynthesisLike & {
  spoke: unknown[];
} {
  const spoke: unknown[] = [];
  return {
    spoke,
    speak: (u) => {
      spoke.push(u);
    },
    cancel: () => undefined,
    getVoices: () => voices,
  };
}

/** Stemmenlijst die pas ná `voiceschanged` gevuld raakt (eerste aanroep leeg). */
function speechThatLoadsLater(
  voices: { lang: string; localService?: boolean; name?: string }[],
): SpeechSynthesisLike & { spoke: unknown[] } {
  let current: typeof voices = [];
  const listeners: (() => void)[] = [];
  const spoke: unknown[] = [];
  const speech: SpeechSynthesisLike & { spoke: unknown[] } = {
    spoke,
    speak: (u) => {
      spoke.push(u);
    },
    cancel: () => undefined,
    getVoices: () => current,
    addEventListener: (_type, fn) => {
      listeners.push(fn);
    },
    removeEventListener: (_type, fn) => {
      const index = listeners.indexOf(fn);
      if (index >= 0) listeners.splice(index, 1);
    },
  };
  setTimeout(() => {
    current = voices;
    for (const fn of listeners.slice()) fn();
  }, 0);
  return speech;
}

describe('AudioService – resolutie en fallbacks', () => {
  it('herkent alleen lokale (same-origin) audiobronnen', () => {
    expect(isLocalAudioSrc('audio/words/kam.mp3')).toBe(true);
    expect(isLocalAudioSrc('https://evil.example/x.mp3')).toBe(false);
    expect(isLocalAudioSrc('//evil.example/x.mp3')).toBe(false);
    expect(isLocalAudioSrc('data:audio/mp3;base64,AAAA')).toBe(false);
  });

  it('weigert bronnen met whitespace/controle-voorloop en backslash-paden', () => {
    expect(isLocalAudioSrc('\t//evil/x.mp3')).toBe(false);
    expect(isLocalAudioSrc(' https://x/y.mp3')).toBe(false);
    expect(isLocalAudioSrc('\\\\evil\\x')).toBe(false);
    expect(isLocalAudioSrc('\u0000//evil/x.mp3')).toBe(false);
    expect(isLocalAudioSrc('  data:text/html,<script>')).toBe(false);
    expect(isLocalAudioSrc('../audio/x.mp3')).toBe(false);
    expect(isLocalAudioSrc('audio/../secret.mp3')).toBe(false);
    expect(isLocalAudioSrc('')).toBe(false);
    expect(isLocalAudioSrc('   ')).toBe(false);
    // Geldige relatieve paden blijven toegestaan, ook met omringende whitespace.
    expect(isLocalAudioSrc('audio/ok.mp3')).toBe(true);
    expect(isLocalAudioSrc(' audio/ok.mp3 ')).toBe(true);
  });

  it('splitst hint-reeksen in losse klanken', () => {
    expect(splitSoundHints('k-a-mmm')).toEqual(['k', 'a', 'mmm']);
    expect(splitSoundHints('k … a … m')).toEqual(['k', 'a', 'm']);
    expect(splitSoundHints('kam')).toEqual(['kam']);
  });

  it('meldt succes pas als een clip echt laadt en afspeelt', async () => {
    const service = createAudioService({
      source: sourceFor({ 'de.kam': clip() }),
      createElement: () => fakeMedia('ok'),
      speech: null,
    });
    const result = await service.play('de.kam');
    expect(result).toEqual(playResult('file'));
  });

  it('valt bij een laadfout (error) terug op lokale TTS', async () => {
    const speech = speechWith([localVoice]);
    const service = createAudioService({
      source: sourceFor({ 'de.kam': clip() }),
      createElement: () => fakeMedia('error'),
      speech,
      createUtterance: (text, lang) => ({ text, lang }),
    });
    const result = await service.play('de.kam');
    expect(result.result).toBe('tts');
    expect(result.approximate).toBe(false);
    expect(speech.spoke).toHaveLength(1);
  });

  it('valt bij een play()-rejectie terug op TTS', async () => {
    const speech = speechWith([localVoice]);
    const service = createAudioService({
      source: sourceFor({ 'de.kam': clip() }),
      createElement: () => fakeMedia('reject'),
      speech,
      createUtterance: (text, lang) => ({ text, lang }),
    });
    expect((await service.play('de.kam')).result).toBe('tts');
  });

  it('geeft "unavailable" en meldt onFallback als bestand én stem ontbreken', async () => {
    const fallbacks: string[] = [];
    const service = createAudioService({
      source: sourceFor({ 'de.kam': clip() }),
      createElement: () => fakeMedia('error'),
      speech: null,
      onFallback: (key) => fallbacks.push(key),
    });
    const result = await service.play('de.kam');
    expect(result.result).toBe('unavailable');
    expect(result.reason).toBe('clip-missing');
    expect(fallbacks).toContain('de.kam');
  });

  it('gebruikt losse klanken via TTS als gemarkeerde benadering (approximate)', async () => {
    const service = createAudioService({
      source: sourceFor({
        'lk.m.sound': clip({
          key: 'lk.m.sound',
          kind: 'grapheme-sound',
          src: 'audio/graphemes/m_sound.mp3',
          text: 'mmm',
        }),
      }),
      createElement: () => fakeMedia('error'),
      speech: speechWith([localVoice]),
    });
    const result = await service.play('lk.m.sound');
    expect(result).toEqual(playResult('tts', true));
  });

  it('weigert cloud-stemmen (localService !== true)', async () => {
    const service = createAudioService({
      source: sourceFor({ 'de.kam': clip() }),
      createElement: () => null,
      clipCapable: false,
      speech: speechWith([remoteVoice]),
    });
    expect((await service.play('de.kam')).result).toBe('unavailable');
    expect(service.isAvailable()).toBe(false);
  });

  it('wacht kort op voiceschanged wanneer getVoices() nog leeg is', async () => {
    const speech = speechThatLoadsLater([localVoice]);
    const service = createAudioService({
      source: sourceFor({ 'de.kam': clip() }),
      createElement: () => null,
      clipCapable: false,
      speech,
      voiceWaitMs: 500,
      createUtterance: (text, lang) => ({ text, lang }),
    });
    const result = await service.play('de.kam');
    expect(result.result).toBe('tts');
    expect(speech.spoke).toHaveLength(1);
  });

  it('probeert een ontbrekende src niet telkens opnieuw (404-geheugen)', async () => {
    const created: string[] = [];
    const service = createAudioService({
      source: sourceFor({ 'de.kam': clip() }),
      createElement: (src) => {
        created.push(src);
        return fakeMedia('error');
      },
      speech: speechWith([localVoice]),
      createUtterance: (text, lang) => ({ text, lang }),
    });
    expect((await service.play('de.kam')).result).toBe('tts');
    expect((await service.play('de.kam')).result).toBe('tts');
    expect(created).toHaveLength(1);
  });

  it('speelt nooit een externe host af, ook niet als bron dat vraagt', async () => {
    const created: string[] = [];
    const service = createAudioService({
      source: sourceFor({ ext: clip({ key: 'ext', src: 'https://evil.example/x.mp3' }) }),
      createElement: (src) => {
        created.push(src);
        return fakeMedia('ok');
      },
      speech: null,
    });
    expect((await service.play('ext')).result).toBe('unavailable');
    expect(created).toHaveLength(0);
  });

  it('speelt gerekte woorden als reeks klank-hints met pauzes (approximate)', async () => {
    const speech = speechWith([localVoice]);
    const service = createAudioService({
      source: sourceFor({
        'blend.kam': clip({ key: 'blend.kam', src: 'audio/blends/kam.mp3', text: 'k-a-mmm', kind: 'blend' }),
      }),
      createElement: () => fakeMedia('error'),
      speech,
      createUtterance: (text, lang) => ({ text, lang }),
      hintPauseMs: 0,
    });
    const result = await service.playStretched('kam');
    expect(result.result).toBe('tts');
    expect(result.approximate).toBe(true);
    // k, a en mmm zijn los uitgesproken (drie losse TTS-utterances).
    expect(speech.spoke).toHaveLength(3);
  });

  it('prefereert een echte gerekte opname boven TTS', async () => {
    const played: string[] = [];
    const service = createAudioService({
      source: sourceFor({
        'blend.kam': clip({ key: 'blend.kam', src: 'audio/blends/kam.mp3', text: 'k-a-mmm', kind: 'blend' }),
      }),
      createElement: (src) => {
        played.push(src);
        return fakeMedia('ok');
      },
      speech: speechWith([localVoice]),
    });
    const result = await service.playStretched('kam');
    expect(result.result).toBe('file');
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
    const mock = createMockAudioService({ result: playResult('unavailable'), mode: 'silent' });
    const result = await mock.play('x');
    expect(result).toEqual(playResult('unavailable'));
    expect(mock.mode).toBe('silent');
    mock.setAvailable(false);
    expect(mock.isAvailable()).toBe(false);
  });
});
