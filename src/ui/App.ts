/**
 * App-controller: laadt het profiel, kiest het scherm en verbindt de
 * sessie-loop met SaveSystem + AudioService (ARCHITECTURE §2/§7).
 *
 * F3: sluit aan op de nieuwe engine-API (`recordItemAnswer`, `completeSession`,
 * `SessionQueue.reportOutcome`, resume-opslag, `saveProfile → {ok}`).
 */
import type { ActivityItem, AnswerEvent, Profile, ProfileSettings, Rng } from '../types';
import type { AudioService, PlayResult } from '../audio/AudioService';
import {
  completeSession,
  createInitialState,
  introduceGrapheme,
  recordItemAnswer,
  type GameState,
} from '../core/GameState';
import {
  defaultStorage,
  loadProfile,
  resetProfile,
  saveProfile,
  SAVE_KEY,
  type SaveResult,
  type SaveStorage,
} from '../core/SaveSystem';
import {
  clearSessionState,
  createSessionQueue,
  loadSessionState,
  planSession,
  saveSessionState,
  type SessionQueue,
} from '../core/SessionPlanner';
import { graphemes } from '../content';
import { createAppAudio } from './audioClips';
import { clear, focusFirstInteractive } from './dom';
import { createStartScreen } from './screens/StartScreen';
import { createMapScreen } from './screens/MapScreen';
import { createSessionScreen } from './screens/SessionScreen';
import { createRewardScreen } from './screens/RewardScreen';
import { createParentGate } from '../parent/ParentGate';
import { createParentDashboard } from '../parent/ParentDashboard';
import { clearConfusions, recordConfusion } from '../parent/confusions';

export interface AppDeps {
  root: HTMLElement;
  profile?: Profile;
  storage?: SaveStorage;
  audio?: AudioService;
  rng?: Rng;
  now?: () => number;
}

export interface App {
  readonly state: GameState;
  destroy(): void;
  showStart(): void;
  showMap(): void;
  startSession(free?: boolean): void;
  showParentGate(): void;
  showParentDashboard(): void;
}

export function createApp(deps: AppDeps): App {
  const root = deps.root;
  const storage = deps.storage ?? defaultStorage();
  const rng = deps.rng ?? Math.random;
  const now = deps.now ?? (() => Date.now());
  let audioFallbackSeen = false;
  let approximateSeen = false;
  const baseAudio =
    deps.audio ??
    createAppAudio({
      onFallback: () => {
        audioFallbackSeen = true;
      },
    });
  // EDU-R2-007: observeer of er ooit een benadering (TTS van losse klank) speelt,
  // zodat de ouderzone dat rustig kan melden.
  const observedAudio = observeApproximate(baseAudio, () => {
    approximateSeen = true;
  });

  let state: GameState = createInitialState(deps.profile ?? loadProfile(storage));
  let disposed = false;
  let currentDestroy: (() => void) | null = null;
  let saveFailed = false;

  function save(): SaveResult {
    const result = saveProfile(state.profile, storage);
    if (!result.ok) saveFailed = true;
    return result;
  }

  function applySettings(): void {
    if (typeof document === 'undefined' || !document.body) return;
    document.body.classList.toggle('la-high-contrast', state.profile.settings.highContrast);
    document.body.classList.toggle('la-reduced-motion', state.profile.settings.reducedMotion);
  }

  function updateSettings(patch: Partial<ProfileSettings>): void {
    state = {
      ...state,
      profile: { ...state.profile, settings: { ...state.profile.settings, ...patch } },
    };
    applySettings();
    save();
  }

  function mount(screen: HTMLElement, destroy?: () => void): void {
    if (disposed) return;
    currentDestroy?.();
    currentDestroy = destroy ?? null;
    clear(root);
    root.append(screen);
    focusFirstInteractive(screen);
  }

  function effectiveAudio(): AudioService {
    if (state.profile.settings.audioEnabled !== false) return observedAudio;
    return mutedAudio(observedAudio);
  }

  function audioUnavailable(): boolean {
    if (state.profile.settings.audioEnabled === false) return false;
    return audioFallbackSeen || !baseAudio.isAvailable();
  }

  function audioApproximate(): boolean {
    if (state.profile.settings.audioEnabled === false) return false;
    return approximateSeen;
  }

  const app: App = {
    get state() {
      return state;
    },
    destroy() {
      disposed = true;
      currentDestroy?.();
      currentDestroy = null;
      clear(root);
    },
    showStart() {
      applySettings();
      mount(
        createStartScreen({
          profile: state.profile,
          audio: effectiveAudio(),
          onStart: () => app.startSession(),
          onAvatarChange: (id) => {
            state = { ...state, profile: { ...state.profile, avatarIcon: id } };
            save();
          },
          onParent: () => app.showParentGate(),
          onToggleAudio: (enabled) => updateSettings({ audioEnabled: enabled }),
        }),
      );
    },
    showMap() {
      applySettings();
      mount(
        createMapScreen({
          profile: state.profile,
          audio: effectiveAudio(),
          onSelectArea: () => app.startSession(false),
          onStartFree: () => app.startSession(true),
          onParent: () => app.showParentGate(),
        }),
      );
    },
    startSession(free = false) {
      applySettings();
      const planProfile = free ? freeProfile(state.profile) : state.profile;
      const resumed = free ? undefined : loadSessionState(storage, now());
      let queue: SessionQueue;
      if (resumed) {
        queue = resumed;
      } else {
        const plan = planSession(planProfile, rng);
        queue = createSessionQueue(plan, {
          sessionNumber: state.sessionNumber,
          profile: planProfile,
          learned: new Set(planProfile.unlockedGraphemes),
          rng,
        });
      }
      const sessionId = queue.toJSON(now()).sessionNumber;
      const handle = createSessionScreen({
        state,
        queue,
        audio: effectiveAudio(),
        now,
        free,
        autoRepeat: state.profile.settings.autoRepeatPrompt,
        onEvent: (event: AnswerEvent, item: ActivityItem) => {
          if (!event.correct && !event.isGuess) {
            recordConfusion(item.targetId, event.selectedOptionId, item.kind, storage);
          }
          state = recordItemAnswer(state, event, item);
          queue.reportOutcome(event, item);
          save();
          saveSessionState(queue, storage, now());
        },
        onIntroduce: (graphemeId) => {
          state = introduceGrapheme(state, graphemeId);
          save();
        },
        onAdvance: () => {
          saveSessionState(queue, storage, now());
        },
        onExit: () => {
          saveSessionState(queue, storage, now());
          save();
          app.showMap();
        },
        onFinished: () => {
          state = completeSession(state, sessionId);
          clearSessionState(storage);
          save();
          showReward();
        },
      });
      mount(handle.element, handle.destroy);
    },
    showParentGate() {
      applySettings();
      mount(
        createParentGate({
          onPass: () => app.showParentDashboard(),
          onFail: () => app.showMap(),
        }),
      );
    },
    showParentDashboard() {
      applySettings();
      mount(
        createParentDashboard({
          profile: state.profile,
          storage,
          saveFailed,
          audioUnavailable: audioUnavailable(),
          audioApproximate: audioApproximate(),
          onSettingsChange: (patch) => updateSettings(patch),
          onBack: () => app.showMap(),
          onReset: () => {
            state = createInitialState(resetProfile(storage));
            clearConfusions(storage);
            clearSessionState(storage);
            saveFailed = false;
            save();
            app.showStart();
          },
        }),
      );
    },
  };

  function showReward(): void {
    applySettings();
    mount(
      createRewardScreen({
        sparks: state.profile.rewards.klankvonkjes,
        leaves: state.profile.rewards.leaves.length,
        audio: effectiveAudio(),
        onContinue: () => app.showMap(),
      }),
    );
  }

  applySettings();
  let hasSave = false;
  try {
    hasSave = storage.read(SAVE_KEY) !== null;
  } catch {
    hasSave = false;
  }
  if (deps.profile === undefined && !hasSave) {
    app.showStart();
  } else {
    app.showMap();
  }
  return app;
}

/** Profiel met alle grafemen vrijgegeven (voor De Speelwei, vrij oefenen). */
function freeProfile(profile: Profile): Profile {
  return { ...profile, unlockedGraphemes: graphemes.map((g) => g.id) };
}

/**
 * Omhult een AudioService en meldt wanneer een weergave een benadering was
 * (TTS van een losse klank/gerekte reeks, EDU-R2-007). Puur observerend.
 * Geëxporteerd zodat het gedrag los getest kan worden.
 */
export function observeApproximate(audio: AudioService, onApproximate: () => void): AudioService {
  const note = (result: PlayResult): PlayResult => {
    if (result.approximate) onApproximate();
    return result;
  };
  return {
    preload: (keys) => audio.preload(keys),
    play: (key) => audio.play(key).then(note),
    playClip: (clip) => audio.playClip(clip).then(note),
    playSequence: (clips) => audio.playSequence(clips).then(note),
    playStretched: (word) => audio.playStretched(word).then(note),
    stop: () => audio.stop(),
    isAvailable: () => audio.isAvailable(),
    get mode() {
      return audio.mode;
    },
  };
}

/** Audio die niets afspeelt wanneer het geluid uit staat. */
function mutedAudio(audio: AudioService): AudioService {
  return {
    preload: async () => {},
    play: async () => ({ result: 'unavailable', approximate: false }),
    playClip: async () => ({ result: 'unavailable', approximate: false }),
    playSequence: async () => ({ result: 'unavailable', approximate: false }),
    playStretched: async () => ({ result: 'unavailable', approximate: false }),
    stop: () => audio.stop(),
    isAvailable: () => false,
    get mode(): 'silent' {
      return 'silent';
    },
  };
}