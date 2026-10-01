/**
 * UX-flow tests op appniveau (ARCHITECTURE §9.3): kind start zonder ouder,
 * antwoordt (klik + toetsenbord), voortgang blijft bewaard, ouder-gate
 * blokkeert het kind.
 *
 * F3-aanvullingen: focus na schermwissel (QA-011), hervatten na herladen
 * (QA-007), geen dubbele sessie-afronding (QA-005) en reset wist alle sleutels
 * (SEC-005).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp, type App } from '../App';
import { createMemoryStorage, createFreshProfile, SAVE_KEY } from '../../core/SaveSystem';
import { createMockAudioService } from '../../audio/AudioService';
import { createSeededRng } from '../../core/rng';
import { createSessionQueue, planSession, saveSessionState, SESSION_RESUME_KEY } from '../../core/SessionPlanner';
import { createInitialState } from '../../core/GameState';
import { createSessionScreen } from '../screens/SessionScreen';
import { CONFUSION_KEY } from '../../parent/confusions';
import type { ActivityItem } from '../../types';

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

  it('zet na een schermwissel de focus binnen het nieuwe scherm (QA-011)', () => {
    root.querySelector<HTMLButtonElement>('[data-action="start"]')?.click();
    expect(root.querySelector('[data-screen="session"]')).not.toBeNull();
    expect(document.activeElement).not.toBe(document.body);
    expect(root.contains(document.activeElement)).toBe(true);
  });

  it('hervat een onderbroken sessie na herladen (QA-007)', () => {
    const profile = createFreshProfile(0, () => 0.5);
    const queue = createSessionQueue(planSession(profile, createSeededRng(3)), {
      sessionNumber: 1,
      profile,
    });
    queue.next();
    queue.next();
    const expected = queue.current()?.id;
    expect(expected).toBeDefined();
    saveSessionState(queue, storage, 5000);

    app?.destroy();
    app = null;
    root.remove();
    root = document.createElement('div');
    document.body.append(root);
    tick = 5000;
    app = createApp({
      root,
      storage,
      audio: createMockAudioService(),
      rng: createSeededRng(7),
      now: () => (tick += 1000),
    });

    app.startSession();
    expect(root.querySelector('[data-screen="session"]')).not.toBeNull();
    expect(root.querySelector('[data-item-id]')?.getAttribute('data-item-id')).toBe(expected);
  });

  it('wist na reset alle opslagsleutels (SEC-005)', () => {
    storage.write(CONFUSION_KEY, JSON.stringify([{ target: 'm', chosen: 'n', kind: 'letterklank', count: 2 }]));
    storage.write(SESSION_RESUME_KEY, '{}');
    app?.showParentDashboard();
    root.querySelector<HTMLButtonElement>('[data-action="reset"]')?.click();
    root.querySelector<HTMLButtonElement>('[data-action="reset-confirm"]')?.click();

    expect(storage.read(CONFUSION_KEY)).toBeNull();
    expect(storage.read(SESSION_RESUME_KEY)).toBeNull();
    const fresh = JSON.parse(storage.read(SAVE_KEY) ?? '{}') as { sessionCount?: number };
    expect(fresh.sessionCount).toBe(0);
  });
});

describe('SessionScreen – geen dubbele afronding (QA-005)', () => {
  let host: HTMLElement;

  beforeEach(() => {
    host = document.createElement('div');
    document.body.append(host);
  });
  afterEach(() => host.remove());

  it('roept onFinished maar één keer aan bij dubbel doorklikken', () => {
    const reward: ActivityItem = {
      id: 'reward.test',
      skillId: 'REWARD',
      kind: 'beloning',
      prompt: { showText: false },
      options: [],
      targetId: '',
      difficulty: 'A',
      isRetry: false,
    };
    const queue = createSessionQueue({ sessionNumber: 1, sections: [{ step: 8, name: 'Beloning', items: [reward] }] }, {
      sessionNumber: 1,
    });
    const onFinished = vi.fn();
    const handle = createSessionScreen({
      state: createInitialState(createFreshProfile()),
      queue,
      audio: createMockAudioService(),
      now: () => 1000,
      onEvent: vi.fn(),
      onIntroduce: vi.fn(),
      onExit: vi.fn(),
      onFinished,
    });
    host.append(handle.element);
    const next = handle.element.querySelector<HTMLButtonElement>('[data-action="next"]');
    next?.click();
    next?.click();
    expect(onFinished).toHaveBeenCalledTimes(1);
    handle.destroy();
  });
});