/**
 * Rendert één ActivityItem en regelt de feedback-escalatie
 * (correct / 1e fout retry / 2e fout hint / 3e fout modeling) volgens
 * GD §4–§5 en ED §9. Alle teksten komen uit content (fbText/ui).
 */
import type { ActivityItem, ActivityOption, AnswerEvent } from '../../types';
import type { AudioService } from '../../audio/AudioService';
import { buildAnswerEvent, checkAnswer, type AnswerCheckResult } from '../../learning/answer';
import { graphemeSoundClip, wordClip } from '../../learning/util';
import { fbText, getGrapheme, getWord, ui } from '../../content';
import { el, clear } from '../dom';
import { iconCheck, iconPloef, iconSpark, iconStar } from '../icons';
import { createOptionGrid, type OptionGridHandle } from './OptionGrid';

export type FeedbackKind = 'correct' | 'retry' | 'hint' | 'model' | 'guess';

export interface FeedbackInfo {
  key: string;
  kind: FeedbackKind;
  text: string;
}

export interface ActivityViewOptions {
  item: ActivityItem;
  audio: AudioService;
  sessionNumber: number;
  now: () => number;
  onEvent: (event: AnswerEvent, result: AnswerCheckResult) => void;
  onDone: (outcome: 'correct' | 'modeled') => void;
  onFeedback?: (info: FeedbackInfo) => void;
}

export interface ActivityViewHandle {
  element: HTMLElement;
  repeat(): void;
  isDone(): boolean;
  attempts(): number;
  destroy(): void;
}

function wordFromItem(item: ActivityItem): string | undefined {
  const meta = item.metadata?.['word'];
  if (typeof meta === 'string') return meta;
  if (item.kind === 'woordlezen' || item.kind === 'hakken') return item.prompt.text;
  return undefined;
}

function revealImage(item: ActivityItem): string | undefined {
  const meta = item.metadata?.['revealImage'];
  return typeof meta === 'string' ? meta : undefined;
}

export function createActivityView(options: ActivityViewOptions): ActivityViewHandle {
  const { item, audio } = options;
  let attempt = 1;
  let done = false;
  let usedHint = false;
  const itemStart = options.now();

  const root = el('div', { class: 'la-activity', 'data-kind': item.kind, 'data-item-id': item.id });

  const feedback = el('div', {
    class: 'la-feedback is-hidden',
    role: 'status',
    'aria-live': 'polite',
    'data-feedback-kind': '',
  });
  const feedbackIcon = el('span', { class: 'la-feedback__icon' });
  const feedbackText = el('span', { class: 'la-feedback__text' });
  feedback.append(feedbackIcon, feedbackText);

  let reveal: HTMLElement | null = null;
  let litBlocks: HTMLElement[] = [];

  // ----- prompt / speelveld per soort -----
  const playfield = el('div', { class: 'la-playfield' });

  const renderPromptAudioButton = (): HTMLElement =>
    (() => {
      const wrap = el('div', { class: 'la-playing' });
      wrap.append(iconPloef('la-ploef--small'));
      return wrap;
    })();

  switch (item.kind) {
    case 'letterklank': {
      const direction = item.metadata?.['direction'];
      if (direction === 'grapheme-to-sound') {
        playfield.append(el('p', { class: 'la-letter-groot', text: item.prompt.text ?? '' }));
      } else {
        playfield.append(renderPromptAudioButton());
      }
      break;
    }
    case 'woordlezen': {
      playfield.append(el('p', { class: 'la-prompt', text: item.prompt.text ?? '' }));
      break;
    }
    case 'hakken': {
      const word = wordFromItem(item) ?? '';
      const row = el('div', { class: 'la-word-row' });
      for (const graphemeId of getWord(word)?.graphemes ?? [...word]) {
        const block = el('span', { class: 'la-letterblock', text: getGrapheme(graphemeId)?.letters ?? graphemeId });
        litBlocks.push(block);
        row.append(block);
      }
      playfield.append(row);
      break;
    }
    case 'klankjager':
    case 'rijmpoort':
    case 'klapbrug':
    case 'plakken':
    case 'klimboom':
      playfield.append(renderPromptAudioButton());
      break;
    case 'beloning':
      playfield.append(el('div', { class: 'la-reward__sparks', text: '✦ ✦ ✦' }));
      break;
    default:
      if (item.prompt.showText && item.prompt.text) {
        playfield.append(el('p', { class: 'la-prompt', text: item.prompt.text }));
      }
  }

  // ----- opties -----
  const isAudioOptions = item.options.every((o) => !o.label);
  const gridMode: 'auto' | 'word' | 'audio' = isAudioOptions ? 'audio' : 'auto';
  let grid: OptionGridHandle | null = null;

  const onPreview = (option: ActivityOption): void => {
    if (done || !option.audio) return;
    void audio.playClip(option.audio);
  };

  if (item.kind !== 'beloning' && item.options.length > 0) {
    grid = createOptionGrid({
      options: item.options,
      mode: gridMode,
      onSelect: (optionId) => handleSelect(optionId),
      ...(isAudioOptions ? { onPreview } : {}),
    });
  }

  // ----- reveal (pas NA correct; element wordt pas dan toegevoegd) -----
  function buildReveal(): HTMLElement | null {
    const image = revealImage(item);
    if (!image) return null;
    const wrap = el('div', { class: 'la-reveal', 'data-reveal': 'image' });
    wrap.append(
      el('img', { class: 'la-reveal__img', src: image, alt: ui('ui.reveal.alt'), 'data-reveal-image': image }),
    );
    return wrap;
  }

  function setFeedback(kind: FeedbackKind, key: string): void {
    const text = fbText(key);
    feedback.classList.remove('is-hidden', 'la-feedback--correct', 'la-feedback--hint', 'la-feedback--retry');
    if (kind === 'correct') feedback.classList.add('la-feedback--correct');
    else if (kind === 'hint' || kind === 'model') feedback.classList.add('la-feedback--hint');
    else feedback.classList.add('la-feedback--retry');
    feedback.dataset['feedbackKind'] = kind;
    clear(feedbackIcon);
    if (kind === 'correct') {
      feedbackIcon.append(iconCheck());
      feedbackIcon.append(iconStar());
    } else if (kind === 'hint' || kind === 'model') {
      feedbackIcon.append(iconSpark());
    } else {
      feedbackIcon.append(iconPloef('la-ploef--small'));
    }
    feedbackText.textContent = text;
    options.onFeedback?.({ key, kind, text });
  }

  function clearMarks(): void {
    grid?.mark('', null);
    for (const block of litBlocks) block.classList.remove('is-lit');
  }

  function applyHint(): void {
    const graphemeId =
      typeof item.metadata?.['targetGrapheme'] === 'string' ? (item.metadata['targetGrapheme'] as string) : undefined;
    // Auditieve/letter-taken: laat de doelklank horen (geen woord verklappen).
    if (graphemeId && getGrapheme(graphemeId) && litBlocks.length === 0) {
      void audio.playClip(graphemeSoundClip(graphemeId));
      return;
    }
    const word = wordFromItem(item);
    if (word) {
      void audio.playStretched(word);
      litBlocks.forEach((block, index) => {
        window.setTimeout(() => block.classList.add('is-lit'), index * 180);
      });
      return;
    }
    if (graphemeId && getGrapheme(graphemeId)) {
      void audio.playClip(graphemeSoundClip(graphemeId));
    } else {
      repeat();
    }
  }

  function markCorrectOption(): void {
    const correctOption = item.options.find((o) => o.id === item.targetId);
    grid?.mark(item.targetId, 'correct');
    if (!reveal) {
      reveal = buildReveal();
      if (reveal) root.append(reveal);
    }
    if (reveal) reveal.classList.add('la-spark');
    if (correctOption?.audio) void audio.playClip(correctOption.audio);
    else if (wordFromItem(item)) void audio.playClip(wordClip(wordFromItem(item) as string));
  }

  function handleSelect(optionId: string): void {
    if (done) return;
    clearMarks();
    const elapsed = options.now() - itemStart;
    const preliminary = checkAnswer(item, { optionId, attempt });
    const isGuess = !preliminary.correct && elapsed < 500;
    const result = isGuess
      ? checkAnswer(item, { optionId, attempt, isGuess: true })
      : checkAnswer(item, { optionId, attempt, usedHint });
    const event = buildAnswerEvent(
      item,
      { optionId, attempt, usedHint, isGuess },
      { sessionNumber: options.sessionNumber, timestamp: options.now(), responseMs: elapsed },
    );
    options.onEvent(event, result);

    if (result.isGuess) {
      setFeedback('guess', result.feedbackKey);
      grid?.mark(optionId, 'retry');
      void audio.play('fb.guess.1');
      return;
    }

    if (result.correct) {
      done = true;
      grid?.setDisabled(true);
      markCorrectOption();
      setFeedback('correct', result.feedbackKey);
      options.onDone('correct');
      return;
    }

    // Fout.
    grid?.mark(optionId, attempt === 1 ? 'retry' : 'hint');
    if (attempt >= 3 || result.modeled) {
      done = true;
      grid?.setDisabled(true);
      applyHint();
      markCorrectOption();
      setFeedback('model', result.feedbackKey);
      options.onDone('modeled');
      return;
    }

    if (attempt === 2) {
      usedHint = true;
      applyHint();
      setFeedback('hint', result.feedbackKey);
    } else {
      setFeedback('retry', result.feedbackKey);
    }
    attempt += 1;
  }

  function repeat(): void {
    if (item.prompt.audio) void audio.playClip(item.prompt.audio);
    else if (wordFromItem(item)) void audio.playStretched(wordFromItem(item) as string);
  }

  root.append(playfield);
  if (grid) root.append(grid.element);
  root.append(feedback);

  // Cijfertoetsen 1-4 als directe keuze; H = herhalen (UX §6.1).
  const onKeyDown = (event: KeyboardEvent): void => {
    if (done) return;
    if (event.key === 'h' || event.key === 'H') {
      repeat();
      return;
    }
    const digit = Number(event.key);
    if (Number.isInteger(digit) && digit >= 1 && digit <= item.options.length) {
      const option = item.options[digit - 1];
      if (option) {
        event.preventDefault();
        handleSelect(option.id);
      }
    }
  };
  document.addEventListener('keydown', onKeyDown);

  return {
    element: root,
    repeat,
    isDone: () => done,
    attempts: () => attempt,
    destroy: () => document.removeEventListener('keydown', onKeyDown),
  };
}
