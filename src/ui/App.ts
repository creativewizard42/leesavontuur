/**
 * App-controller: laadt het profiel, kiest het scherm en verbindt de
 * sessie-loop met SaveSystem + AudioService (ARCHITECTURE §2/§7).
 */
import type { AnswerEvent, Profile, Rng } from '../types';
import type { AudioService } from '../audio/AudioService';
import {
  addSparks,
  createInitialState,
  introduceGrapheme,
  recordAnswer,
  startNewSession,
  type GameState,
} from '../core/GameState';
import {
  defaultStorage,
  loadProfile,
  resetProfile,
  saveProfile,
  SAVE_KEY,
  type SaveStorage,
} from '../core/SaveSystem';
import { planSession, type SessionPlan } from '../core/SessionPlanner';
import { graphemes } from '../content';
import { createAppAudio } from './audioClips';
import { clear } from './dom';
import { createStartScreen } from './screens/StartScreen';
import { createMapScreen } from './screens/MapScreen';
import { createSessionScreen } from './screens/SessionScreen';
import { createRewardScreen } from './screens/RewardScreen';
import { createParentGate } from '../parent/ParentGate';
import { createParentDashboard } from '../parent/ParentDashboard';
import { recordConfusion } from '../parent/confusions';

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
  const baseAudio = deps.audio ?? createAppAudio();

  let state: GameState = createInitialState(deps.profile ?? loadProfile(storage));
  let disposed = false;

  function save(): void {
    saveProfile(state.profile, storage);
  }

  function applySettings(): void {
    if (typeof document === 'undefined' || !document.body) return;
    document.body.classList.toggle('la-high-contrast', state.profile.settings.highContrast);
    document.body.classList.toggle('la-reduced-motion', state.profile.settings.reducedMotion);
  }

  function mount(screen: HTMLElement): void {
    if (disposed) return;
    clear(root);
    root.append(screen);
  }

  function effectiveAudio(): AudioService {
    if (state.profile.settings.audioEnabled !== false) return baseAudio;
    return mutedAudio(baseAudio);
  }

  const app: App = {
    get state() {
      return state;
    },
    destroy() {
      disposed = true;
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
          onToggleAudio: (enabled) => {
            state = {
              ...state,
              profile: { ...state.profile, settings: { ...state.profile.settings, audioEnabled: enabled } },
            };
            save();
          },
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
      const plan: SessionPlan = planSession(planProfile, rng);
      mount(
        createSessionScreen({
          state,
          plan,
          audio: effectiveAudio(),
          now,
          free,
          onEvent: (event: AnswerEvent, item) => {
            if (!event.correct && !event.isGuess) {
              recordConfusion(item.targetId, event.selectedOptionId, item.kind, storage);
            }
            state = recordAnswer(state, event);
            save();
          },
          onIntroduce: (graphemeId) => {
            state = introduceGrapheme(state, graphemeId);
            save();
          },
          onExit: () => {
            save();
            app.showMap();
          },
          onFinished: () => {
            state = { ...state, profile: addSparks(state.profile, 1) };
            state = startNewSession(state);
            save();
            showReward();
          },
        }),
      );
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
          onBack: () => app.showMap(),
          onReset: () => {
            state = createInitialState(resetProfile(storage));
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

/** Audio die niets afspeelt wanneer het geluid uit staat. */
function mutedAudio(audio: AudioService): AudioService {
  return {
    preload: async () => {},
    play: async () => 'silent',
    playClip: async () => 'silent',
    playSequence: async () => 'silent',
    playStretched: async () => 'silent',
    stop: () => audio.stop(),
    isAvailable: () => false,
    get mode(): 'silent' {
      return 'silent';
    },
  };
}
