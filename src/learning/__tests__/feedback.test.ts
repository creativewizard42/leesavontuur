/**
 * Foutspecifieke feedback (EDU-006 / ED §9.3): checkAnswer leidt het fouttype af
 * uit de gekozen afleider en levert de fb.specific.*-key + variabelen.
 */
import { describe, expect, it } from 'vitest';
import type { ActivityItem, ActivityOption } from '../../types';
import { checkAnswer } from '../answer';
import { applyFeedbackVars, feedbackMeta } from '../util';

function wordOption(id: string): ActivityOption {
  return { id, label: id, correct: false };
}

function wordItem(kind: string, target: string, optionIds: string[], skillId = 'DE.CVC'): ActivityItem {
  const options = [wordOption(target), ...optionIds.map(wordOption)];
  return {
    id: `t.${kind}.${target}`,
    skillId,
    kind,
    prompt: { text: target, showText: true },
    options,
    targetId: target,
    difficulty: 'C',
    isRetry: false,
    itemKey: target,
    metadata: {
      ...feedbackMeta({ correct: 'fb.correct.4', try1: 'fb.try1.3', hint: 'fb.hint.1', model: 'fb.model.1' }),
      word: target,
    },
  };
}

describe('checkAnswer – foutspecifieke feedback (EDU-006)', () => {
  it('detecteert een foute eerste klank', () => {
    const item = wordItem('woordlezen', 'kam', ['ram']);
    const result = checkAnswer(item, { optionId: 'ram', attempt: 1 });
    expect(result.feedbackKey).toBe('fb.specific.first_sound');
    expect(result.feedbackVars?.['sound']).toBe('k');
    expect(result.feedbackVars?.['word']).toBe('kam');
  });

  it('detecteert een foute laatste klank', () => {
    const result = checkAnswer(wordItem('woordlezen', 'kam', ['kat']), { optionId: 'kat', attempt: 1 });
    expect(result.feedbackKey).toBe('fb.specific.last_sound');
    expect(result.feedbackVars?.['sound']).toBe('mmm');
  });

  it('detecteert een foute middelste klank', () => {
    const result = checkAnswer(wordItem('woordlezen', 'mus', ['mes']), { optionId: 'mes', attempt: 1 });
    expect(result.feedbackKey).toBe('fb.specific.middle_sound');
    expect(result.feedbackVars?.['sounds']).toBeDefined();
  });

  it('detecteert een omkering (volgorde)', () => {
    const result = checkAnswer(wordItem('woordlezen', 'tak', ['kat']), { optionId: 'kat', attempt: 1 });
    expect(result.feedbackKey).toBe('fb.specific.order');
  });

  it('detecteert een klassieke letterverwarring', () => {
    const result = checkAnswer(wordItem('woordlezen', 'mat', ['nat']), { optionId: 'nat', attempt: 1 });
    expect(result.feedbackKey).toBe('fb.specific.letter_confusion');
    expect(result.feedbackVars?.['letter']).toBe('n');
  });

  it('gebruikt blend_retry bij plakken', () => {
    const result = checkAnswer(wordItem('plakken', 'kam', ['kat'], 'SY.CVC'), { optionId: 'kat', attempt: 1 });
    expect(result.feedbackKey).toBe('fb.specific.blend_retry');
  });

  it('vult de gerekte klankreeks bij plak-feedback (EDU-R2-004)', () => {
    const item = wordItem('plakken', 'kam', ['kat'], 'SY.CVC');
    item.metadata = { ...(item.metadata ?? {}), sequence: ['k', 'a', 'mmm'] };
    const result = checkAnswer(item, { optionId: 'kat', attempt: 1 });
    expect(result.feedbackKey).toBe('fb.specific.blend_retry');
    expect(result.feedbackVars?.['sounds']).toBe('k - a - mmm');
    expect(result.feedbackVars?.['sounds']).not.toBe('');
  });

  it('gebruikt tel-feedback bij een hakfout (EDU-R2-005)', () => {
    const item: ActivityItem = {
      id: 'hak1',
      skillId: 'AN.CVC',
      kind: 'hakken',
      prompt: { text: 'Hoeveel klanken hoor je in kam?', showText: false },
      options: [
        { id: 'n:3', label: '3', correct: true },
        { id: 'n:2', label: '2', correct: false },
      ],
      targetId: 'n:3',
      difficulty: 'A',
      isRetry: false,
      itemKey: 'kam',
      metadata: { ...feedbackMeta({ correct: 'fb.correct.7', try1: 'fb.try1.4', hint: 'fb.hint.5', model: 'fb.model.1' }), phonemeCount: 3 },
    };
    const result = checkAnswer(item, { optionId: 'n:2', attempt: 1 });
    expect(result.feedbackKey).toBe('fb.specific.count');
    expect(result.feedbackVars?.['count']).toBe('2');
    expect(result.feedbackKey).not.toBe('fb.try1.4');
  });

  it('detecteert een foute eerste klank bij klankjager', () => {
    const item: ActivityItem = {
      id: 'k1',
      skillId: 'FN.FIRST_SOUND',
      kind: 'klankjager',
      prompt: { text: '', showText: false },
      options: [wordOption('mat'), wordOption('tas')],
      targetId: 'mat',
      difficulty: 'A',
      isRetry: false,
      itemKey: 'mat',
      metadata: { targetGrapheme: 'm' },
    };
    const result = checkAnswer(item, { optionId: 'tas', attempt: 1 });
    expect(result.feedbackKey).toBe('fb.specific.first_sound');
    expect(result.feedbackVars?.['sound']).toBe('mmm');
  });

  it('laat de escalatieladder intact na de foutspecifieke eerste poging', () => {
    const item = wordItem('woordlezen', 'kam', ['kat']);
    expect(checkAnswer(item, { optionId: 'kat', attempt: 2 }).feedbackKey).toBe('fb.hint.1');
    expect(checkAnswer(item, { optionId: 'kat', attempt: 3 }).modeled).toBe(true);
  });

  it('gebruikt nooit een onware generieke tekst als het fouttype bekend is', () => {
    const result = checkAnswer(wordItem('woordlezen', 'kam', ['kat']), { optionId: 'kat', attempt: 1 });
    expect(result.feedbackKey).not.toBe('fb.try1.3');
  });
});

describe('applyFeedbackVars', () => {
  it('vervangt {placeholder}s uit de variabelen', () => {
    expect(applyFeedbackVars('De klank is {sound}!', { sound: 'k' })).toBe('De klank is k!');
    expect(applyFeedbackVars('De klank is {sound}!', { sound: 'k' })).not.toContain('{sound}');
    expect(applyFeedbackVars('Geen variabelen', {})).toBe('Geen variabelen');
  });
});
