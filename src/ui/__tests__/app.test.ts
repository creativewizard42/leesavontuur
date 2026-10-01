/**
 * UX-flow tests op appniveau (ARCHITECTURE §9.3): kind start zonder ouder,
 * antwoordt (klik + toetsenbord), voortgang blijft bewaard, ouder-gate
 * blokkeert het kind.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createApp, type App } from '../App';
import { createMemoryStorage, SAVE_KEY } from '../../core/SaveSystem';
import { createMockAudioService } from '../../audio/AudioService';
import { createSeededRng } from '../../core/rng';

describe('App – kindflow', () => {
  let root: HTMLElement;
  let storage: ReturnType<typeof createMemoryStorage>;
  let app: App | null = null;
  let tick = 0;

  beforeEach(() => {
    root = document.createElement('div');
    document.body.append(root);
    storage = createMemoryStorage();
    tick = 0;
    app = createApp({
      root,
      storage,
      audio: createMockAudioService(),
      rng: createSeededRng(7),
      now: () => (tick += 1000),
    });
  });

  afterEach(() => {
    app?.destroy();
    app = null;
    root.remove();
  });

  it('laat het kind zonder ouder een activiteit starten en een antwoord geven', () => {
    expect(root.querySelector('[data-screen="start"]')).not.toBeNull();
    expect(root.querySelector('[data-screen="parent-gate"]')).toBeNull();

    root.querySelector<HTMLButtonElement>('[data-action="start"]')?.click();
    expect(root.querySelector('[data-screen="session"]')).not.toBeNull();

    // Fase 1: de sessie start met een auditieve klankwarming-up met keuzes.
    const option = root.querySelector<HTMLButtonElement>('.la-option');
    expect(option).not.toBeNull();
    option?.click();

    const feedback = root.querySelector('[role="status"]');
    expect((feedback?.textContent ?? '').length).toBeGreaterThan(0);

    const parsed = JSON.parse(storage.read(SAVE_KEY) ?? '{}') as {
      unlockedGraphemes?: string[];
      skills?: Record<string, { attempts: number }>;
    };
    expect(Object.keys(parsed.skills ?? {}).length).toBeGreaterThan(0);
  });

  it('slaat voortgang op en laat de sessie stoppen via de huisknop', () => {
    root.querySelector<HTMLButtonElement>('[data-action="start"]')?.click();
    root.querySelector<HTMLButtonElement>('[data-action="intro-next"]')?.click();
    root.querySelector<HTMLButtonElement>('.la-option')?.click();
    expect(storage.read(SAVE_KEY)).not.toBeNull();

    root.querySelector<HTMLButtonElement>('[data-action="home"]')?.click();
    expect(root.querySelector('[data-overlay="pause"]')).not.toBeNull();
  });

  it('ondersteunt antwoorden met het toetsenbord', () => {
    root.querySelector<HTMLButtonElement>('[data-action="start"]')?.click();
    root.querySelector<HTMLButtonElement>('[data-action="intro-next"]')?.click();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: '1', bubbles: true }));
    const parsed = JSON.parse(storage.read(SAVE_KEY) ?? '{}') as { skills?: Record<string, unknown> };
    expect(Object.keys(parsed.skills ?? {}).length).toBeGreaterThan(0);
  });

  it('blokkeert de ouderzone voor het kind', () => {
    app?.showParentGate();
    expect(root.querySelector('[data-screen="parent-gate"]')).not.toBeNull();
    // Zonder 5 s vasthouden + juiste som geen dashboard.
    root.querySelector<HTMLButtonElement>('[data-action="verify"]')?.click();
    expect(root.querySelector('[data-screen="parent-dashboard"]')).toBeNull();
  });
});
