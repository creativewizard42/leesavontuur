import { afterEach, describe, expect, it, vi } from 'vitest';
import { graphemes, sentences, sightWords } from '../../content';
import { createFreshProfile } from '../../core/SaveSystem';
import { createSkillState } from '../../core/Mastery';
import { createSeededRng } from '../../core/rng';
import { generateReading, readingPractice, sentenceReady, sightWordReady } from '../Reading';
import { planPractice } from '../../core/PracticePlanner';
import { createSessionQueue, loadSessionState, saveSessionState } from '../../core/SessionPlanner';
import { createMemoryStorage } from '../../core/SaveSystem';
import { createActivityView, type ActivityViewHandle } from '../../ui/components/ActivityView';
import { createMockAudioService } from '../../audio/AudioService';

const mastered = () => createSkillState({ mastery: .95, accuracy: .95, attempts: 20, correct: 20, consecutiveCorrect: 6, sessionsSeen: 3 });
function advancedProfile() {
  const profile = createFreshProfile();
  profile.unlockedGraphemes = graphemes.map(g => g.id);
  profile.skills['DE.CVC'] = mastered();
  profile.skills['ZI.SIMPLE'] = mastered();
  for (const sw of sightWords) profile.skills[sw.id] = mastered();
  return profile;
}
let view: ActivityViewHandle | undefined;
afterEach(() => { view?.destroy(); view = undefined; document.body.replaceChildren(); });

describe('Reading prerequisites and assessment', () => {
  it('locks advanced reading for beginners and selects actual area content', () => {
    const beginner = createFreshProfile();
    expect(planPractice(beginner, 7, createSeededRng(1))).toBeUndefined();
    expect(planPractice(beginner, 1, createSeededRng(1))?.sections.every(section => section.step <= 2)).toBe(true);
    const advanced = advancedProfile();
    expect(readingPractice(advanced, 7, createSeededRng(1)).every(item => item.kind === 'verhaallezen')).toBe(true);
    expect(planPractice(advanced, 8, createSeededRng(1))?.sections[0]?.items.every(item => item.skillId === 'TX.SHORT')).toBe(true);
    expect(planPractice(advanced, 9, createSeededRng(1))).toBeUndefined();
  });
  it('requires learned graphemes and mastered sight words including the introduction chain', () => {
    const profile = advancedProfile();
    const sentence = sentences.find(s => s.id === 'ZI.SIMPLE.de-kat-is-nat')!;
    expect(sentenceReady(profile, sentence)).toBe(true);
    delete profile.skills['SW.de'];
    expect(sentenceReady(profile, sentence)).toBe(false);
    expect(sightWordReady(profile, 'SW.een')).toBe(false);
    profile.skills['SW.de'] = mastered();
    profile.unlockedGraphemes = profile.unlockedGraphemes.filter(id => id !== 'a');
    expect(sentenceReady(profile, sentence)).toBe(false);
  });
  it('does not show written comprehension distractors with unlearned graphemes', () => {
    const profile = advancedProfile();
    const sentence = sentences.find(s => s.id === 'ZI.SIMPLE.ik-eet-kaas')!;
    profile.unlockedGraphemes = graphemes.filter(g => g.introducedInPhase <= 3).map(g => g.id);
    // Sentence itself is readable in block 3; soep/vis distractors are not.
    expect(sentenceReady(profile, sentence)).toBe(false);
  });
  it('hides questions until reading is confirmed and cannot score by shortcut before that', async () => {
    const profile = advancedProfile();
    const item = generateReading(profile, sentences.find(s => s.id === 'ZI.SIMPLE.ik-eet-kaas')!, createSeededRng(1));
    const onEvent = vi.fn();
    view = createActivityView({ item, audio: createMockAudioService(), sessionNumber: 1, now: () => 5000, onEvent, onDone: vi.fn() });
    document.body.append(view.element);
    expect(view.element.querySelector('.la-options')?.hasAttribute('hidden')).toBe(true);
    expect(view.element.querySelector('.la-reading__question')).toBeNull();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: '1' }));
    expect(onEvent).not.toHaveBeenCalled();
    view.element.querySelector<HTMLButtonElement>('[data-action="reading-listen"]')!.click();
    view.element.querySelector<HTMLButtonElement>('[data-action="reading-ready"]')!.click();
    expect(view.element.querySelector('.la-reading__question')?.textContent).toBe('Wat eet ik?');
    const correct = [...view.element.querySelectorAll<HTMLButtonElement>('.la-option')].find(button => button.dataset['optionId'] === item.targetId)!;
    correct.click();
    expect(onEvent).toHaveBeenCalledOnce();
    expect(onEvent.mock.calls[0]![0].usedHint).toBe(true);
    expect(onEvent.mock.calls[0]![0].skillId).toBe('ZI.SIMPLE');
    expect(onEvent.mock.calls[0]![0].itemScore).toBeLessThan(1);
  });
  it('preserves question and reading audio safely across resume', () => {
    const profile = advancedProfile();
    const plan = planPractice(profile, 8, createSeededRng(1))!;
    const queue = createSessionQueue(plan, { sessionNumber: 1, profile });
    const storage = createMemoryStorage();
    saveSessionState(queue, storage, 1000);
    const restored = loadSessionState(storage, 2000, undefined, { sessionNumber: 1, profile });
    expect(restored?.current()?.metadata?.['readingAudio']).toEqual(queue.current()?.metadata?.['readingAudio']);
    expect(restored?.current()?.metadata?.['questionAudio']).toEqual(queue.current()?.metadata?.['questionAudio']);
  });
  it('does not score a task when its auditory stimulus is unavailable', async () => {
    const item = readingPractice({ ...advancedProfile(), skills: { 'DE.CVC': mastered() } }, 7, createSeededRng(3))[0]!;
    const onEvent = vi.fn();
    view = createActivityView({ item, audio: createMockAudioService({ result: { result: 'unavailable', approximate: false } }), sessionNumber: 1, now: () => 1000, onEvent, onDone: vi.fn() });
    document.body.append(view.element);
    await Promise.resolve(); await Promise.resolve();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: '1' }));
    expect(onEvent).not.toHaveBeenCalled();
    expect([...view.element.querySelectorAll<HTMLButtonElement>('.la-option')].every(button => button.disabled)).toBe(true);
  });
});
