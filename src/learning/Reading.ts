import type { ActivityItem, Profile, Rng, Sentence } from '../types';
import { graphemes, isWordAllowed, properNames, sentences, sightWords, words } from '../content';
import { isMastered } from '../core/Mastery';
import { phaseUnlocked } from '../core/Progression';
import { feedbackMeta, instructionClip, itemId, placeOptions } from './util';

function blockLearned(profile: Profile, block: number): boolean {
  return graphemes.filter(g => g.introducedInPhase <= block)
    .every(g => profile.unlockedGraphemes.includes(g.id));
}

export function sightWordReady(profile: Profile, id: string): boolean {
  const word = sightWords.find(sw => sw.id === id);
  return !!word && phaseUnlocked(profile, 7) && blockLearned(profile, word.requiresBlock ?? 1) &&
    (!word.introducedAfter || isMastered(profile.skills[word.introducedAfter], 10));
}

export function sentenceReady(profile: Profile, sentence: Sentence): boolean {
  const learned = new Set(profile.unlockedGraphemes);
  const wordReady = (word: string): boolean => {
    const lower = word.toLowerCase();
    return isWordAllowed(lower, learned) ||
      sightWords.some(sw => sw.word === lower && isMastered(profile.skills[sw.id], 10)) ||
      properNames.some(name => name.word === lower && isWordAllowed(lower, learned));
  };
  return phaseUnlocked(profile, sentence.level === 'text' ? 8 : 7) &&
    sentence.requiresBlocks.every(block => blockLearned(profile, block)) &&
    sentence.requiresSightWords.every(id => isMastered(profile.skills[id], 10)) &&
    sentence.words.every(wordReady) &&
    (sentence.comprehension?.options.every(option => option.split(/\s+/).every(wordReady)) ?? true);
}

const readingFeedback = (comprehension = false) => feedbackMeta({ correct: 'fb.correct.1', try1: 'fb.try1.2',
  hint: comprehension ? 'fb.hint.reading' : 'fb.hint.2',
  model: comprehension ? 'fb.model.reading' : 'fb.model.4' });

/** Recognition is recorded separately from independent oral reading. */
export function generateSightWord(profile: Profile, id: string, rng: Rng): ActivityItem {
  const target = sightWords.find(sw => sw.id === id);
  if (!target || !sightWordReady(profile, id)) throw new Error('Sight word prerequisites not met');
  const learned = new Set(profile.unlockedGraphemes);
  const distractors = words.filter(word => word.word !== target.word && isWordAllowed(word.word, learned));
  if (!distractors.length) throw new Error('No learned sight word distractors');
  const offset = Math.floor(rng() * distractors.length);
  const chosen = [...new Set([distractors[offset]!, distractors[(offset + 1) % distractors.length]!])];
  const placed = placeOptions({ id: target.word, label: target.word },
    chosen.map(word => ({ id: word.word, label: word.word })), rng, []);
  return {
    id: itemId('leeswoord', id, rng), skillId: id, kind: 'leeswoord',
    prompt: { audio: target.audio, showText: false },
    ...placed, difficulty: 'A', isRetry: false, itemKey: target.word,
    metadata: { ...readingFeedback(), scored: true },
  };
}

export function generateReading(profile: Profile, sentence: Sentence, rng: Rng): ActivityItem {
  if (!sentenceReady(profile, sentence) || !sentence.comprehension) throw new Error('Reading prerequisites not met');
  const question = sentence.comprehension;
  if (question.options.length < 2 || new Set(question.options).size !== question.options.length ||
      question.correctIndex < 0 || question.correctIndex >= question.options.length) throw new Error('Invalid comprehension question');
  const correct = question.options[question.correctIndex]!;
  const placed = placeOptions({ id: correct, label: correct },
    question.options.filter(option => option !== correct).map(option => ({ id: option, label: option })), rng, []);
  // These skills measure comprehension, not fluency or oral accuracy.
  const skillId = sentence.level === 'text' ? 'TX.SHORT' : sentence.level === 'capital' ? 'ZI.CAPITAL' : 'ZI.SIMPLE';
  return {
    id: itemId('lezen', sentence.id, rng), skillId, kind: 'verhaallezen',
    prompt: { audio: instructionClip('instr.reading.start', 'Lees rustig. Ben je klaar? Tik op het vinkje.'), text: sentence.text, showText: true },
    ...placed, difficulty: 'A', isRetry: false, itemKey: sentence.id,
    metadata: { ...readingFeedback(true), scored: true, question: question.questionAudio?.text ?? '',
      questionAudio: question.questionAudio, readingAudio: sentence.audio, assessment: 'comprehension' },
  };
}

export function readingPractice(profile: Profile, phase: number, rng: Rng): ActivityItem[] {
  if (phase === 7) {
    const next = sightWords.find(sw => sightWordReady(profile, sw.id) && !isMastered(profile.skills[sw.id], 10));
    if (next) return Array.from({ length: 6 }, () => generateSightWord(profile, next.id, rng));
  }
  return sentences.filter(sentence => sentence.comprehension &&
    (phase === 8 ? sentence.level === 'text' : sentence.level !== 'text') && sentenceReady(profile, sentence))
    .map(sentence => generateReading(profile, sentence, rng));
}
