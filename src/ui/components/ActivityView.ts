/**
 * Rendert één ActivityItem en regelt de feedback-escalatie
 * (correct / 1e fout retry / 2e fout hint / 3e fout modeling) volgens
 * GD §4–§5 en ED §9. Alle teksten komen uit content (fbText/ui).
 *
 * UI-koppeling met de nieuwe engine/audio-API (F3):
 *  - `checkAnswer` levert `feedbackVars`; tekst via `fbText(key, vars)`.
 *  - hakken toont NOOIT het gesegmenteerde antwoord (EDU-003); de 'tap'-modus
 *    laat het kind klanken tikken (elke tegel speelt zijn klank en springt los).
 *  - klankjager: eerst alle kandidaten afspelen, daarna kiezen; aparte
 *    luisterknop per tegel (EDU-005).
 *  - herhalen gebeurt alleen na een tik op een luisterknop.
 *  - audio 'unavailable' → rustige visuele fallback (QA-002), nooit crash.
 */
import type { ActivityItem, ActivityOption, AnswerEvent, AudioClip } from '../../types';
import type { AudioService, PlayResult } from '../../audio/AudioService';
import { buildAnswerEvent, checkAnswer, type AnswerCheckResult } from '../../learning/answer';
import { blendClip, graphemeSoundClip, wordClip } from '../../learning/util';
import { fbText, getGrapheme, getWord, ui } from '../../content';
import { el, clear } from '../dom';
import { iconCheck, iconEar, iconNoSound, iconPloef, iconSpark, iconStar, iconTap } from '../icons';
import { feedbackSequence, instructionSequence } from '../audioPrompts';
import { uiText } from '../text';
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
  chooseCompliment?: (specific: string) => string;
  onFeedback?: (info: FeedbackInfo) => void;
}

export interface ActivityViewHandle {
  element: HTMLElement;
  repeat(): void;
  isDone(): boolean;
  attempts(): number;
  destroy(): void;
}

const UNAVAILABLE: PlayResult = { result: 'unavailable', approximate: false };

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

function tapUnitsOf(item: ActivityItem): string[] {
  const raw = item.metadata?.['tapUnits'];
  if (!Array.isArray(raw)) return [];
  return raw.filter((v): v is string => typeof v === 'string');
}

function metaString(item: ActivityItem, key: string): string | undefined {
  const value = item.metadata?.[key];
  return typeof value === 'string' ? value : undefined;
}

function metaStringArray(item: ActivityItem, key: string): string[] | undefined {
  const raw = item.metadata?.[key];
  if (!Array.isArray(raw)) return undefined;
  return raw.filter((v): v is string => typeof v === 'string');
}

/** Placeholders voor dynamische (per-variabele) instructieclips (EDU-R2-002). */
function promptVars(item: ActivityItem): Record<string, string> {
  const vars: Record<string, string> = {};
  const word = wordFromItem(item);
  if (word) {
    vars['word'] = word;
    vars['woord'] = word;
  }
  const targetGrapheme = metaString(item, 'targetGrapheme');
  if (targetGrapheme) {
    vars['sound'] = targetGrapheme;
    vars['klank'] = targetGrapheme;
    vars['letter'] = targetGrapheme;
  }
  return vars;
}

export function createActivityView(options: ActivityViewOptions): ActivityViewHandle {
  const { item, audio } = options;
  // Adaptieve/review-metadata (G1): de queue markeert items voor rustige
  // modeling (modelFirst), een kalmer scherm (simplified), rustig afronden
  // (windDown) en audio-only klankafleiders (auditoryDistractors).
  const modelFirst = item.metadata?.['modelFirst'] === true;
  const simplified = item.metadata?.['simplified'] === true;
  const windDown = item.metadata?.['windDown'] === true;
  const auditoryDistractors = item.metadata?.['auditoryDistractors'] === true;
  let attempt = 1;
  let done = false;
  let disposed = false;
  let audioBlocked = false;
  let readingConfirmed = item.kind !== 'verhaallezen';
  let usedHint = false;
  const itemStart = options.now();
  const timers = new Set<ReturnType<typeof setTimeout>>();
  let audioFallbackShown = false;
  let retryPlayback: (() => Promise<PlayResult>) | undefined;

  const root = el('div', { class: 'la-activity', 'data-kind': item.kind, 'data-item-id': item.id });
  if (simplified) root.classList.add('la-activity--simplified');
  if (windDown) root.classList.add('la-activity--winddown');
  if (modelFirst) root.setAttribute('data-model-first', 'true');

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

  function later(fn: () => void, ms: number): void {
    const id = setTimeout(() => {
      timers.delete(id);
      fn();
    }, ms);
    timers.add(id);
  }

  // ----- audio met visuele fallback (QA-002) -----
  function playClipSafe(clip: AudioClip | undefined): Promise<PlayResult> {
    if (!clip) return Promise.resolve(UNAVAILABLE);
    return audio.playClip(clip).then((result) => {
      if (!disposed && result.result === 'unavailable' && result.reason !== 'cancelled') {
        retryPlayback = () => audio.playClip(clip);
        showAudioFallback();
      }
      return result;
    });
  }

  function playSequenceSafe(clips: readonly AudioClip[]): Promise<PlayResult> {
    if (clips.length === 0) return Promise.resolve(UNAVAILABLE);
    if (clips.length === 1) return playClipSafe(clips[0]);
    return audio.playSequence(clips).then((result) => {
      if (!disposed && result.result === 'unavailable' && result.reason !== 'cancelled') {
        retryPlayback = () => audio.playSequence(clips);
        showAudioFallback();
      }
      return result;
    });
  }

  /**
   * EDU-R2-006: de hak-/plakinstructie wordt vóór de stimulus gesproken. De
   * instructie-sequentie komt (indien beschikbaar) uit `instructionClips`
   * (dragers + variabelen); anders valt ze terug op één `instructionClip`.
   */
  function promptClips(): AudioClip[] {
    const clips: AudioClip[] = [];
    if (item.kind === 'hakken') {
      const key = metaString(item, 'responseMode') === 'tap' ? 'instr.hakken.start' : 'instr.hakken.count';
      clips.push(...instructionSequence(key));
    } else if (item.kind === 'plakken') {
      clips.push(...instructionSequence('instr.plakken.r1'));
    }
    if (item.prompt.audio) {
      // EDU-R2-002: gebruik de concrete per-variabele clip (`instr.fn...m`) via
      // de content-API `instructionClips`; val terug op de prompt-clip zelf.
      const resolved = instructionSequence(item.prompt.audio.key, promptVars(item));
      clips.push(...(resolved.length > 0 ? resolved : [item.prompt.audio]));
    }
    return clips;
  }

  function stretchedRow(letters: readonly string[]): HTMLElement {
    const row = el('div', { class: 'la-word-row' });
    letters.forEach((letter, index) => {
      const block = el('span', { class: 'la-letterblock', text: letter, 'aria-hidden': 'true' });
      row.append(block);
      later(() => block.classList.add('is-lit'), 160 * index);
    });
    return row;
  }

  /**
   * QA-R3-004: de audio-fallback is niet langer tekst-afhankelijk voor het kind.
   * Het kind ziet een groot oor-/geen-geluid-icoon en de letters die oplichten;
   * de uitleg staat alleen nog onzichtbaar (sr-only) voor ouders/AT.
   */
  function showAudioFallback(): void {
    if (audioFallbackShown) return;
    audioFallbackShown = true;
    const needsAudio = item.kind !== 'verhaallezen';
    if (needsAudio) { audioBlocked = true; grid?.setDisabled(true); }
    const wrap = el('div', { class: 'la-audio-fallback', 'data-audio-fallback': 'true' });
    const icon = iconNoSound();
    icon.classList.add('la-audio-fallback__icon');
    wrap.append(icon);
    // Alleen voor ouders/AT; niet leesbaar voor de doelgroep in beeld.
    wrap.append(el('p', { class: 'la-sr-only', text: ui('ui.audio.unavailable') }));
    wrap.append(el('p', { class: 'la-hint-text', text: 'Tik op het oor om het geluid opnieuw te starten.' }));
    const retry = el('button', { type: 'button', class: 'la-btn la-btn--icon la-btn--primary',
      'data-action': 'audio-retry', 'aria-label': 'Start het oefengeluid opnieuw' });
    retry.append(iconEar());
    retry.addEventListener('click', () => {
      if (retry.disabled || disposed) return;
      // Start within the tap itself: Safari needs this user gesture.
      const playback = retryPlayback?.();
      if (!playback) { repeat(); return; }
      retry.disabled = true;
      void playback.then(result => {
        if (disposed) return;
        retry.disabled = false;
        if (result.result === 'unavailable') return;
        audioBlocked = false;
        audioFallbackShown = false;
        wrap.remove();
        if (!done && listenFirst) void playListenFirst();
        else if (!done) grid?.setDisabled(false);
      });
    });
    wrap.append(retry);

    const targetGrapheme = metaString(item, 'targetGrapheme');
    const word = wordFromItem(item);
    if (targetGrapheme) {
      const g = getGrapheme(targetGrapheme);
      wrap.append(stretchedRow(g ? [...g.letters] : [targetGrapheme]));
    } else if (word) {
      const graphemes = getWord(word)?.graphemes ?? [...word];
      wrap.append(stretchedRow(graphemes.map((id) => getGrapheme(id)?.letters ?? id)));
    } else {
      // Geen letters beschikbaar: toon een grote luister-/oor-ondersteuning.
      const ear = iconEar();
      ear.classList.add('la-audio-fallback__ear');
      wrap.append(ear);
    }
    playfield.append(wrap);
  }

  // ----- prompt / speelveld per soort -----
  const playfield = el('div', { class: 'la-playfield' });

  // windDown (QA-R2-003): rond rustig af met Ploef als visueel anker.
  if (windDown) {
    const calm = el('div', { class: 'la-winddown', 'data-winddown': 'true' });
    calm.append(iconPloef('la-ploef--small'));
    const calmText = uiText('ui.winddown');
    if (calmText) calm.append(el('span', { class: 'la-winddown__text', text: calmText }));
    playfield.append(calm);
  }

  function renderPromptAudioButton(): HTMLElement {
    const button = el('button', {
      type: 'button',
      class: 'la-btn la-btn--icon la-playing',
      'aria-label': ui('ui.repeat'),
      'data-action': 'prompt-repeat',
    });
    button.append(iconPloef('la-ploef--small'));
    button.addEventListener('click', () => repeat());
    return button;
  }

  function renderTapArea(): HTMLElement {
    const units = tapUnitsOf(item);
    const wrap = el('div', { class: 'la-tap', 'data-response-mode': 'tap' });
    const pops = el('div', { class: 'la-tap__pops' });
    const live = el('p', { class: 'la-sr-only', 'aria-live': 'polite' });
    const tapBtn = el('button', {
      type: 'button',
      class: 'la-tap__btn',
      'data-action': 'tap',
      'aria-label': ui('ui.tap.start'),
    });
    tapBtn.append(iconTap());
    const doneBtn = el('button', {
      type: 'button',
      class: 'la-btn la-btn--primary',
      'data-action': 'tap-done',
      text: ui('ui.tap.done'),
    });
    let taps = 0;
    tapBtn.addEventListener('click', () => {
      if (done) return;
      const graphemeId = units[Math.min(taps, units.length - 1)];
      if (graphemeId) void playClipSafe(graphemeSoundClip(graphemeId));
      taps += 1;
      pops.append(el('span', { class: 'la-tap__pop la-spark' }));
      live.textContent = ui('ui.tap.count').replace('{n}', String(taps));
      wrap.dataset['taps'] = String(taps);
    });
    doneBtn.addEventListener('click', () => {
      if (done || taps === 0) return;
      handleSelect(`n:${taps}`);
    });
    wrap.append(live, pops, tapBtn, doneBtn);
    return wrap;
  }

  const isIntroduction = item.metadata?.['introduction'] === true;

  if (isIntroduction) {
    // Ongescoord (scored:false): toon de klank groot en laat meteen verder gaan.
    playfield.append(el('p', { class: 'la-letter-groot', text: item.prompt.text ?? '' }));
    later(() => {
      done = true;
      options.onDone('modeled');
    }, 0);
  } else {
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
      case 'verhaallezen': {
        const passage = el('div', { class: 'la-reading', 'data-reading': 'passage' });
        passage.append(el('p', { class: 'la-reading__text', text: item.prompt.text ?? '' }));
        const listen = el('button', { type: 'button', class: 'la-btn',
          'data-action': 'reading-listen', 'aria-label': 'Lees samen met Ploef' });
        listen.append(iconEar(), document.createTextNode(' Lees samen'));
        listen.addEventListener('click', () => {
          usedHint = true;
          const clip = item.metadata?.['readingAudio'] as AudioClip | undefined;
          void playClipSafe(clip);
        });
        const ready = el('button', { type: 'button', class: 'la-btn la-btn--primary',
          'data-action': 'reading-ready', 'aria-label': 'Ik heb gelezen. Toon de vraag.' });
        ready.append(iconCheck(), document.createTextNode(' Klaar'));
        ready.addEventListener('click', () => {
          if (readingConfirmed) return;
          readingConfirmed = true;
          ready.hidden = true;
          const question = el('p', { class: 'la-reading__question', text: metaString(item, 'question') ?? '' });
          passage.append(question);
          if (grid) { grid.element.hidden = false; grid.focusIndex(0); }
          const clip = item.metadata?.['questionAudio'] as AudioClip | undefined;
          void playClipSafe(clip);
        });
        passage.append(listen, ready);
        playfield.append(passage);
        break;
      }
      case 'woordlezen': {
        playfield.append(el('p', { class: 'la-prompt', text: item.prompt.text ?? '' }));
        break;
      }
      case 'hakken': {
        // EDU-003: nooit het gesegmenteerde antwoord tonen. Alleen de tap-modus
        // biedt een (ongelabeld) tik-oppervlak; de keuze blijft het aantal klanken.
        if (metaString(item, 'responseMode') === 'tap' && tapUnitsOf(item).length > 0) {
          playfield.append(renderTapArea());
        } else {
          playfield.append(renderPromptAudioButton());
        }
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
  }

  // ----- opties -----
  const isAudioOptions = item.options.every((o) => !o.label);
  const gridMode: 'auto' | 'word' | 'audio' = isAudioOptions ? 'audio' : 'auto';
  const listenFirst = item.kind === 'klankjager' && item.metadata?.['interaction'] === 'listen-then-choose';
  let grid: OptionGridHandle | null = null;

  if (!isIntroduction && item.kind !== 'beloning' && item.options.length > 0) {
    grid = createOptionGrid({
      options: item.options,
      mode: gridMode,
      ...(auditoryDistractors ? { auditory: true } : {}),
      onSelect: (optionId) => handleSelect(optionId),
      ...(isAudioOptions || listenFirst ? { onListen: (option: ActivityOption) => void playClipSafe(option.audio) } : {}),
    });
    if (!readingConfirmed) grid.element.hidden = true;
  }

  /** Letters van het doel (woord of grafeem) voor rustige modeling. */
  function modelLetters(): string[] {
    const word = wordFromItem(item);
    if (word) {
      const ids = getWord(word)?.graphemes ?? [...word];
      return ids.map((id) => getGrapheme(id)?.letters ?? id);
    }
    const graphemeId = metaString(item, 'targetGrapheme');
    if (graphemeId) return [...(getGrapheme(graphemeId)?.letters ?? graphemeId)];
    return [];
  }

  /**
   * modelFirst (QA-R2-003): doe de klank/het woord rustig voor met oplichtende
   * letters vóór de keuze. De opties blijven even uit tot het model klaar is.
   */
  function runModelFirst(): void {
    grid?.setDisabled(true);
    const letters = modelLetters();
    if (letters.length > 0) {
      const row = stretchedRow(letters);
      row.classList.add('la-model-row');
      row.setAttribute('data-model-row', 'true');
      playfield.prepend(row);
      litBlocks = Array.from(row.querySelectorAll<HTMLElement>('.la-letterblock'));
    }
    const word = wordFromItem(item);
    const graphemeId = metaString(item, 'targetGrapheme');
    const clip = word ? wordClip(word) : graphemeId ? graphemeSoundClip(graphemeId) : undefined;
    const finished = clip ? playClipSafe(clip) : Promise.resolve(UNAVAILABLE);
    void finished.then(() => {
      if (done || disposed || audioBlocked) return;
      grid?.setDisabled(false);
      litBlocks = [];
    });
  }

  function markListening(optionId: string, listening: boolean): void {
    const button = grid?.element.querySelector<HTMLElement>(`.la-option[data-option-id="${cssEscape(optionId)}"]`);
    const wrapper = button?.parentElement;
    if (wrapper?.classList.contains('la-option-item')) wrapper.classList.toggle('is-listening', listening);
  }

  /** EDU-005: speel eerst alle kandidaten, markeer ze, en pas daarna kiezen. */
  async function playListenFirst(): Promise<void> {
    if (!grid) return;
    const ids = metaStringArray(item, 'candidateIds') ?? item.options.map((o) => o.id);
    grid.setDisabled(true);
    for (const id of ids) {
      if (disposed || done) return;
      const option = item.options.find((o) => o.id === id);
      if (!option?.audio) continue;
      markListening(id, true);
      const result = await playClipSafe(option.audio);
      markListening(id, false);
      if (result.reason === 'cancelled') break;
    }
    if (!done && !audioBlocked && !disposed) grid.setDisabled(false);
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

  /**
   * Toont feedback (icoon + kleur) en **spreekt de feedbackzin uit** (EDU-R3-002,
   * GD §5/regel 498). `preceding` is de audio die eerst moet klinken (b.v. de
   * zojuist gekozen klank of de modeling), zodat feedback de stimulus niet
   * onderbreekt.
   */
  function setFeedback(
    kind: FeedbackKind,
    key: string,
    vars?: Record<string, string>,
    preceding?: Promise<PlayResult>,
  ): Promise<PlayResult> {
    const text = fbText(key, vars ?? {});
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
    const playFeedback = (): Promise<PlayResult> => {
      if (disposed) return Promise.resolve(UNAVAILABLE);
      const clips = feedbackSequence(key, vars ?? {});
      return clips.length > 0 ? playSequenceSafe(clips) : Promise.resolve(UNAVAILABLE);
    };
    const completed = preceding ? preceding.then(result => result.reason === 'cancelled' ? result : playFeedback(), () => UNAVAILABLE) : playFeedback();
    options.onFeedback?.({ key, kind, text });
    return completed;
  }

  function clearMarks(): void {
    grid?.mark('', null);
    for (const block of litBlocks) block.classList.remove('is-lit');
  }

  function applyHint(): Promise<PlayResult> | undefined {
    // Rhymes and syllables are whole-word listening tasks, not phoneme blends.
    if (item.kind === 'klapbrug') return playClipSafe(wordClip(wordFromItem(item)!));
    if (item.kind === 'rijmpoort') return playSequenceSafe([
      wordClip(wordFromItem(item)!), wordClip(metaString(item, 'rhyme')!),
    ]);
    if (item.kind === 'verhaallezen') {
      usedHint = true;
      return playClipSafe(item.metadata?.['readingAudio'] as AudioClip | undefined);
    }
    const graphemeId = metaString(item, 'targetGrapheme');
    // Auditieve/letter-taken: laat de doelklank horen (geen woord verklappen).
    if (graphemeId && getGrapheme(graphemeId) && litBlocks.length === 0) {
      return playClipSafe(graphemeSoundClip(graphemeId));
    }
    const word = wordFromItem(item);
    if (word) {
      const playing = playClipSafe(blendClip(word));
      litBlocks.forEach((block, index) => {
        later(() => block.classList.add('is-lit'), index * 180);
      });
      return playing;
    }
    if (graphemeId && getGrapheme(graphemeId)) {
      return playClipSafe(graphemeSoundClip(graphemeId));
    }
    return playSequenceSafe(promptClips());
  }

  function markCorrectOption(includeAudio = true): Promise<PlayResult> | undefined {
    const correctOption = item.options.find((o) => o.id === item.targetId);
    grid?.mark(item.targetId, 'correct');
    if (!reveal) {
      reveal = buildReveal();
      if (reveal) root.append(reveal);
    }
    if (reveal) reveal.classList.add('la-spark');
    if (!includeAudio) return undefined;
    if (correctOption?.audio) return playClipSafe(correctOption.audio);
    const word = wordFromItem(item);
    if (word) return playClipSafe(wordClip(word));
    return undefined;
  }

  function handleSelect(optionId: string): void {
    if (done || disposed || audioBlocked || !readingConfirmed || grid?.buttons.some(button => button.disabled)) return;
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
      grid?.mark(optionId, 'retry');
      setFeedback('guess', result.feedbackKey, result.feedbackVars);
      return;
    }

    if (result.correct) {
      done = true;
      grid?.setDisabled(true);
      const optionAudio = markCorrectOption();
      void setFeedback('correct', options.chooseCompliment?.(result.feedbackKey) ?? result.feedbackKey, result.feedbackVars, optionAudio).then(() => {
        if (!disposed) options.onDone('correct');
      });
      return;
    }

    // Fout.
    grid?.mark(optionId, attempt === 1 ? 'retry' : 'hint');
    if (attempt >= 3 || result.modeled) {
      done = true;
      grid?.setDisabled(true);
      const modeling = applyHint();
      // Alleen visueel markeren; de modeling-audio is al gestart door applyHint.
      markCorrectOption(false);
      void setFeedback('model', result.feedbackKey, result.feedbackVars, modeling).then(() => {
        if (!disposed) options.onDone('modeled');
      });
      return;
    }

    if (attempt === 2) {
      usedHint = true;
      const hintAudio = applyHint();
      setFeedback('hint', result.feedbackKey, result.feedbackVars, hintAudio);
    } else {
      setFeedback('retry', result.feedbackKey, result.feedbackVars);
    }
    attempt += 1;
  }

  function repeat(): void {
    if (disposed) return;
    if (item.kind === 'verhaallezen' && readingConfirmed) {
      void playClipSafe(item.metadata?.['questionAudio'] as AudioClip | undefined);
      return;
    }
    const clips = promptClips();
    if (clips.length > 0) {
      void playSequenceSafe(clips);
      return;
    }
    if (wordFromItem(item)) {
      void audio.playStretched(wordFromItem(item) as string).then((result) => {
        if (!disposed && result.result === 'unavailable' && result.reason !== 'cancelled') showAudioFallback();
      });
    }
  }

  root.append(playfield);
  if (grid) root.append(grid.element);
  root.append(feedback);

  // Cijfertoetsen 1-4 als directe keuze; H = herhalen (UX §6.1).
  const onKeyDown = (event: KeyboardEvent): void => {
    if (done || root.closest('[inert]')) return;
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

  // Prompt afspelen (instructie + stimulus) + optionele herhaling/adaptieve extra audio.
  const initialClips = promptClips();
  let initialPlayback = Promise.resolve(UNAVAILABLE);
  if (initialClips.length > 0) {
    initialPlayback = playSequenceSafe(initialClips);
  } else if (wordFromItem(item) && item.kind === 'hakken') {
    // Auditieve hakopdracht zonder opname: laat de gerekte reeks horen.
    void audio.playStretched(wordFromItem(item) as string).then((result) => {
      if (!disposed && result.result === 'unavailable' && result.reason !== 'cancelled') showAudioFallback();
    });
  }
  if (modelFirst && !isIntroduction && item.kind !== 'beloning') {
    grid?.setDisabled(true);
    void initialPlayback.then(() => { if (!disposed && !done && !audioBlocked) runModelFirst(); });
  }
  if (listenFirst) {
    grid?.setDisabled(true);
    void initialPlayback.then(() => { if (!disposed && !done && !audioBlocked) void playListenFirst(); });
  }

  return {
    element: root,
    repeat,
    isDone: () => done,
    attempts: () => attempt,
    destroy: () => {
      disposed = true;
      audio.stop();
      document.removeEventListener('keydown', onKeyDown);
      for (const id of timers) clearTimeout(id);
      timers.clear();
    },
  };
}

/** Escape voor een id in een querySelector (optie-ids bevatten ':' e.d.). */
function cssEscape(value: string): string {
  if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') return CSS.escape(value);
  return value.replace(/["\\]/g, '\\$&');
}
