/**
 * Integratietest: speelt een volledige sessie in jsdom met de echte UI
 * (`createSessionScreen` + echte generatoren) voor (1) een vers profiel en
 * (2) een profiel met m,a,s,t geleerd. Controleert de didactische kern:
 * woord-secties met ≥2 even lange opties, hakken zonder gesegmenteerd antwoord
 * en het plaatje pas na een correct antwoord (ED §11.1/§11 regel 6, EDU-003).
 *
 * Daarnaast: `SessionQueue.fromJSON` geeft `null` bij ongeldige JSON en de
 * loader/UI moet dat zonder crash afhandelen (SEC-R2-001).
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ActivityItem, AnswerEvent, Profile } from '../../types';
import { createMockAudioService } from '../../audio/AudioService';
import { createInitialState, introduceGrapheme, recordItemAnswer } from '../../core/GameState';
import { createFreshProfile, createMemoryStorage } from '../../core/SaveSystem';
import { createSeededRng } from '../../core/rng';
import {
  createSessionQueue,
  loadSessionState,
  planSession,
  SESSION_RESUME_KEY,
} from '../../core/SessionPlanner';
import { createSessionScreen } from '../screens/SessionScreen';
import { createApp } from '../App';
import { getWord } from '../../content';

function tick(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

function findOption(host: HTMLElement, optionId: string): HTMLButtonElement | null {
  const buttons = Array.from(host.querySelectorAll<HTMLButtonElement>('[data-option-id]'));
  return buttons.find((button) => button.dataset['optionId'] === optionId) ?? null;
}

interface WordObservation {
  id: string;
  kind: string;
  optionCount: number;
  lengths: number[];
}

interface Observations {
  word: WordObservation[];
  hakkenSegmented: number;
  hakkenHiddenText: number;
  imageBeforeCorrect: number;
  imageAfterCorrect: number;
  rewardSeen: boolean;
}

async function runFullSession(profile: Profile, seed: number) {
  const host = document.createElement('div');
  document.body.append(host);
  const rng = createSeededRng(seed);
  const queue = createSessionQueue(planSession(profile, rng), {
    sessionNumber: profile.sessionCount + 1,
    profile,
    learned: new Set(profile.unlockedGraphemes),
    rng,
  });
  let state = createInitialState(profile);
  const finished = vi.fn();
  const handle = createSessionScreen({
    state,
    queue,
    audio: createMockAudioService(),
    now: () => 1000,
    onEvent: (event: AnswerEvent, item: ActivityItem) => {
      state = recordItemAnswer(state, event, item);
      queue.reportOutcome(event, item);
    },
    onIntroduce: (id) => {
      state = introduceGrapheme(state, id);
    },
    onExit: vi.fn(),
    onFinished: finished,
  });
  host.append(handle.element);

  const observations: Observations = {
    word: [],
    hakkenSegmented: 0,
    hakkenHiddenText: 0,
    imageBeforeCorrect: 0,
    imageAfterCorrect: 0,
    rewardSeen: false,
  };

  let guard = 0;
  while (queue.current() && guard++ < 800) {
    const introNext = host.querySelector<HTMLButtonElement>('[data-action="intro-next"]');
    if (introNext) {
      introNext.click();
      await tick();
      continue;
    }
    const current = queue.current();
    if (!current) break;
    // Wacht tot luister-dan-kies / modelFirst de opties heeft vrijgegeven.
    await tick();

    if (current.kind === 'beloning') {
      observations.rewardSeen = true;
      host.querySelector<HTMLButtonElement>('[data-action="next"]')?.click();
      await tick();
      continue;
    }

    const activityRoot = host.querySelector<HTMLElement>('.la-activity');

    if (['woordlezen', 'plakken', 'klimboom'].includes(current.kind)) {
      observations.word.push({
        id: current.id,
        kind: current.kind,
        optionCount: current.options.length,
        lengths: current.options.map((o) => getWord(o.id)?.graphemes.length ?? -1),
      });
    }
    if (current.kind === 'hakken') {
      if (current.prompt.showText) observations.hakkenHiddenText += 1;
      const segmented =
        activityRoot?.querySelector('.la-letterblock') ?? activityRoot?.querySelector('.la-word-row');
      if (segmented) observations.hakkenSegmented += 1;
    }

    const hadImage = activityRoot?.querySelector('img[data-reveal-image]') !== null;
    if (hadImage) observations.imageBeforeCorrect += 1;

    const correct = findOption(host, current.targetId);
    const clickable = correct && !correct.disabled ? correct : host.querySelector<HTMLButtonElement>('.la-option:not(:disabled)');
    clickable?.click();
    await tick();

    const hasImage = host.querySelector('.la-activity img[data-reveal-image]') !== null;
    if (!hadImage && hasImage) observations.imageAfterCorrect += 1;

    const next = host.querySelector<HTMLButtonElement>('[data-action="next"]');
    if (next?.disabled) await tick();
    next?.click();
    await tick();
  }

  handle.destroy();
  host.remove();
  return { observations, finished, queue };
}

function learnedProfile(): Profile {
  const profile = createFreshProfile(0, () => 0.5);
  profile.unlockedGraphemes = ['m', 'a', 's', 't'];
  return profile;
}

afterEach(() => {
  document.body.replaceChildren();
});

describe('Volledige sessie met de echte UI (jsdom)', () => {
  it('(1) speelt een verse sessie uit tot de beloning', async () => {
    const { observations, finished, queue } = await runFullSession(createFreshProfile(0, () => 0.5), 7);
    expect(finished).toHaveBeenCalledTimes(1);
    expect(observations.rewardSeen).toBe(true);
    expect(queue.current()).toBeUndefined();
  });

  it('(2) speelt een sessie met m,a,s,t geleerd en respecteert de didactiek', async () => {
    const { observations, finished } = await runFullSession(learnedProfile(), 7);
    expect(finished).toHaveBeenCalledTimes(1);

    // Woord-secties: ≥2 opties, allemaal even lang (ED §11 regel 6).
    expect(observations.word.length).toBeGreaterThan(0);
    for (const obs of observations.word) {
      expect(obs.optionCount, obs.kind).toBeGreaterThanOrEqual(2);
      expect(new Set(obs.lengths).size, `${obs.id}: ${obs.lengths.join(',')}`).toBe(1);
      expect(obs.lengths[0]).toBeGreaterThan(0);
    }

    // Hakken toont nooit het gesegmenteerde antwoord (EDU-003).
    expect(observations.hakkenSegmented).toBe(0);
    expect(observations.hakkenHiddenText).toBe(0);

    // Plaatje pas ná een correct antwoord (ED §11.1).
    expect(observations.imageBeforeCorrect).toBe(0);
    expect(observations.imageAfterCorrect).toBeGreaterThan(0);
  });
});

describe('Ongeldige hervatsleutel (SEC-R2-001)', () => {
  it('geeft null/undefined terug en de UI start zonder crash', () => {
    const storage = createMemoryStorage();
    storage.write(SESSION_RESUME_KEY, JSON.stringify({ version: 1, savedAt: 5, sections: 'nope' }));
    expect(loadSessionState(storage, 1000)).toBeUndefined();

    storage.write(SESSION_RESUME_KEY, '{ geen geldige json');
    expect(loadSessionState(storage, 1000)).toBeUndefined();

    // De echte UI moet een corrupte hervatsleutel negeren en vers starten.
    const root = document.createElement('div');
    document.body.append(root);
    const app = createApp({
      root,
      storage,
      audio: createMockAudioService(),
      rng: createSeededRng(1),
      now: () => 2000,
    });
    expect(root.querySelector('[data-screen="start"]')).not.toBeNull();
    root.querySelector<HTMLButtonElement>('[data-action="start"]')?.click();
    expect(root.querySelector('[data-screen="session"]')).not.toBeNull();
    app.destroy();
    root.remove();
  });
});
