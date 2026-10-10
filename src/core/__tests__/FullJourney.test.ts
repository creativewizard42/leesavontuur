import { expect, it } from 'vitest';
import { graphemes } from '../../content';
import { createFreshProfile, createMemoryStorage } from '../SaveSystem';
import { completeSession, createInitialState, introduceGrapheme, recordItemAnswer } from '../GameState';
import { createSessionQueue, loadSessionState, planSession, saveSessionState } from '../SessionPlanner';
import { buildAnswerEvent } from '../../learning/answer';
import { createSeededRng } from '../rng';

it('can reach sentence and story comprehension from a fresh profile through the real engine', () => {
  let state = createInitialState(createFreshProfile(0, () => .5));
  const rng = createSeededRng(731);
  let storySeen = false;
  let sentenceSeen = false;
  const storage = createMemoryStorage();
  for (let session = 1; session <= 240 && !storySeen; session++) {
    const plan = planSession(state.profile, rng);
    const queue = createSessionQueue(plan, { sessionNumber: state.sessionNumber, profile: state.profile, learned: new Set(state.profile.unlockedGraphemes), rng });
    saveSessionState(queue, storage, session * 1000);
    expect(loadSessionState(storage, session * 1000 + 1)).toBeDefined();
    let count = 0;
    for (let item = queue.current(); item && count++ < 300; item = queue.current()) {
      if (item.metadata?.['introduction'] === true) {
        state = introduceGrapheme(state, String(item.metadata['targetGrapheme']));
      }
      if (item.kind === 'verhaallezen' && item.skillId === 'ZI.SIMPLE') sentenceSeen = true;
      if (item.skillId === 'TX.SHORT') storySeen = true;
      const event = buildAnswerEvent(item, { optionId: item.targetId, attempt: 1 },
        { sessionNumber: state.sessionNumber, timestamp: session * 1000, responseMs: 1200 });
      state = recordItemAnswer(state, event, item);
      queue.reportOutcome(event, item);
      queue.next();
    }
    expect(count).toBeLessThan(300);
    state = completeSession(state);
  }
  expect(sentenceSeen).toBe(true);
  expect(storySeen).toBe(true);
  expect(state.profile.unlockedGraphemes.length).toBeGreaterThan(6);
  expect(state.profile.unlockedGraphemes.length).toBeLessThanOrEqual(graphemes.length);
  // Ideal answers check route reachability; they do not prove teaching effectiveness.
});
