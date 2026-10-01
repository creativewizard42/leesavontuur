/**
 * Ouderdashboard (ED §12 / GD §9.2). Geen diagnose, geen percentielen,
 * geen vergelijking, geen rood label (ED §12.3). Alles lokaal.
 */
import type { Profile, SkillState } from '../types';
import { graphemes, ui } from '../content';
import { soundSkillFor } from '../core/Progression';
import { median } from '../core/Mastery';
import { exportProfile, defaultStorage, type SaveStorage } from '../core/SaveSystem';
import { loadConfusions, type ConfusionEntry } from './confusions';
import { el } from '../ui/dom';

export interface ParentDashboardOptions {
  profile: Profile;
  storage?: SaveStorage;
  onBack: () => void;
  onReset: () => void;
}

type Status = 'zeker' | 'oefent' | 'nog';

const STATUS_UI: Record<Status, string> = {
  zeker: 'ui.parent.status.zeker',
  oefent: 'ui.parent.status.oefent',
  nog: 'ui.parent.status.nog',
};

function statusFor(state: SkillState | undefined): Status {
  if (!state || state.attempts === 0) return 'nog';
  if (state.mastery >= 0.8) return 'zeker';
  return 'oefent';
}

function statusBadge(status: Status): HTMLElement {
  const wrap = el('span', { class: `la-status la-status--${status}` });
  wrap.append(el('span', { class: `la-dot la-dot--${status}` }));
  wrap.append(document.createTextNode(ui(STATUS_UI[status])));
  return wrap;
}

function meter(status: Status): HTMLElement {
  const pct = status === 'zeker' ? 100 : status === 'oefent' ? 55 : 8;
  const bar = el('div', { class: 'la-meter' });
  const fill = el('div', { class: 'la-meter__fill' });
  fill.style.width = `${pct}%`;
  fill.style.background =
    status === 'zeker' ? 'var(--la-ouder-zeker)' : status === 'oefent' ? 'var(--la-ouder-oefen)' : 'var(--la-ouder-nog)';
  bar.append(fill);
  return bar;
}

export function createParentDashboard(options: ParentDashboardOptions): HTMLElement {
  const { profile } = options;
  const storage = options.storage ?? defaultStorage();
  const root = el('div', { class: 'la-screen la-screen--ouder', 'data-screen': 'parent-dashboard' });

  const container = el('div', { class: 'la-ouder' });

  // Header
  const header = el('div', { class: 'la-ouder__header' });
  header.append(el('h1', { class: 'la-ouder__title', text: ui('ui.parent.title') }));
  const back = el('button', {
    type: 'button',
    class: 'la-btn',
    'data-action': 'back',
    'aria-label': ui('ui.parent.back'),
    text: ui('ui.parent.back'),
  });
  back.addEventListener('click', options.onBack);
  header.append(back);
  container.append(header);

  // Geleerde klanken (MVP-grafemen, blok 1).
  const mvp = graphemes.filter((g) => g.introducedInPhase <= 1);
  const learned = mvp.filter((g) => statusFor(profile.skills[soundSkillFor(g.id)]) === 'zeker');
  const card = el('div', { class: 'la-card' });
  card.append(el('h3', { text: ui('ui.parent.learned.title') }));
  card.append(
    el('p', {
      text: ui('ui.parent.learnedCount').replace('{n}', String(learned.length)).replace('{total}', String(mvp.length)),
    }),
  );
  const chips = el('div', { class: 'la-chips' });
  for (const g of mvp) {
    const status = statusFor(profile.skills[soundSkillFor(g.id)]);
    const chip = el('span', { class: 'la-chip', 'data-grapheme': g.id, 'data-status': status });
    chip.append(el('span', { class: `la-dot la-dot--${status}` }));
    chip.append(document.createTextNode(` ${g.letters} · `));
    chip.append(statusBadge(status));
    chips.append(chip);
  }
  card.append(chips);

  const masteredNames = learned.map((g) => g.letters);
  if (masteredNames.length > 0) {
    card.append(
      el('p', {
        text: ui('ui.parent.report.knows').replace('{kind}', 'Uw kind').replace('{klanken}', masteredNames.join(', ')),
      }),
    );
  }
  container.append(card);

  // Hakken en plakken
  const blendCard = el('div', { class: 'la-card' });
  blendCard.append(el('h3', { text: ui('ui.parent.blend.title') }));
  for (const skillId of ['AN.CVC', 'SY.CVC'] as const) {
    const status = statusFor(profile.skills[skillId]);
    const row = el('div', { class: 'la-blend-row', 'data-skill': skillId });
    row.append(el('span', { text: skillId }));
    row.append(meter(status));
    row.append(statusBadge(status));
    blendCard.append(row);
  }
  container.append(blendCard);

  // Woorden lezen
  const wordsCard = el('div', { class: 'la-card' });
  wordsCard.append(el('h3', { text: ui('ui.parent.words.title') }));
  const wordsRead = Object.values(profile.items).filter((item) => item.skillId.startsWith('DE.')).length;
  wordsCard.append(el('p', { text: ui('ui.parent.wordsRead').replace('{n}', String(wordsRead)) }));
  const deStatus = statusFor(profile.skills['DE.CVC']);
  const deRow = el('div', { class: 'la-blend-row', 'data-skill': 'DE.CVC' });
  deRow.append(el('span', { text: 'DE.CVC' }));
  deRow.append(meter(deStatus));
  deRow.append(statusBadge(deStatus));
  wordsCard.append(deRow);
  const goodWords = Object.values(profile.items)
    .filter((item) => item.skillId.startsWith('DE.') && item.consecutiveCorrect >= 1)
    .map((item) => item.itemKey)
    .slice(0, 6);
  if (goodWords.length > 0) {
    wordsCard.append(el('p', { text: ui('ui.parent.report.canRead').replace('{kind}', 'Uw kind').replace('{woorden}', goodWords.join(', ')) }));
  }
  container.append(wordsCard);

  // Reactietijd (indicatie)
  const skillStates = Object.values(profile.skills).filter((s) => s.attempts > 0 && s.avgResponseMs > 0);
  const avg = median(skillStates.map((s) => s.avgResponseMs));
  const timeCard = el('div', { class: 'la-card' });
  timeCard.append(el('h3', { text: ui('ui.parent.time.title') }));
  timeCard.append(el('p', { text: `${profile.sessionCount} sessies` }));
  if (avg > 0) {
    const seconds = (avg / 1000).toFixed(1).replace('.', ',');
    timeCard.append(el('p', { text: ui('ui.parent.response').replace('{ms}', seconds) }));
  }
  container.append(timeCard);

  // Extra oefening + verwarringen
  const extraCard = el('div', { class: 'la-card' });
  extraCard.append(el('h3', { text: ui('ui.parent.attention.title') }));
  const extras: string[] = [];
  const weakLetters = mvp.filter((g) => {
    const state = profile.skills[soundSkillFor(g.id)];
    return state !== undefined && state.attempts >= 10 && state.mastery < 0.6;
  });
  if (weakLetters.length > 0) {
    extras.push(
      ui('ui.parent.report.needs')
        .replace('{kind}', 'Uw kind')
        .replace('{onderwerp}', `${ui('ui.parent.report.topic.sounds')} (${weakLetters.map((g) => g.letters).join(', ')})`),
    );
  }
  const blendState = profile.skills['SY.CVC'];
  if (blendState !== undefined && blendState.attempts >= 10 && blendState.mastery < 0.6) {
    extras.push(ui('ui.parent.report.needs').replace('{kind}', 'Uw kind').replace('{onderwerp}', ui('ui.parent.report.topic.blend')));
  }
  if (profile.skills['DE.CVC'] && profile.skills['DE.CVC'].hintsUsed >= 5) {
    extras.push(ui('ui.parent.report.hint.use').replace('{kind}', 'Uw kind'));
  }
  if (extras.length === 0) extras.push(ui('ui.parent.extra.none'));
  const extraList = el('ul', { class: 'la-list' });
  for (const line of extras) extraList.append(el('li', { text: line }));
  extraCard.append(extraList);

  const confusions: ConfusionEntry[] = loadConfusions(storage);
  const confusionWrap = el('div', { 'data-section': 'confusions' });
  confusionWrap.append(el('h3', { text: ui('ui.parent.confusions.title') }));
  if (confusions.length === 0) {
    confusionWrap.append(el('p', { text: ui('ui.parent.confusions.none') }));
  } else {
    const list = el('ul', { class: 'la-list' });
    for (const c of confusions.slice(0, 6)) {
      list.append(el('li', { text: `${c.target} ↔ ${c.chosen} (${c.count}×)`, 'data-confusion': `${c.target}-${c.chosen}` }));
    }
    confusionWrap.append(list);
  }
  extraCard.append(confusionWrap);
  container.append(extraCard);

  // Privacy + beheer
  const manage = el('div', { class: 'la-card' });
  manage.append(el('h3', { text: ui('ui.parent.manage.title') }));
  manage.append(el('p', { text: ui('ui.parent.privacy') }));

  const exportBtn = el('button', {
    type: 'button',
    class: 'la-btn la-btn--wide',
    'data-action': 'export',
    text: ui('ui.parent.export'),
  });
  exportBtn.addEventListener('click', () => {
    const json = exportProfile(profile);
    const blob = typeof Blob !== 'undefined' ? new Blob([json], { type: 'application/json' }) : null;
    if (blob && typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
      const url = URL.createObjectURL(blob);
      const anchor = el('a', { href: url, download: 'leesavontuur-profiel.json' });
      anchor.click();
      URL.revokeObjectURL(url);
    }
    root.dataset['exported'] = 'true';
  });

  const confirmRow = el('div', { class: 'la-manage-confirm', hidden: true, 'data-section': 'reset-confirm' });
  confirmRow.append(el('p', { text: ui('ui.parent.reset.confirm') }));
  const confirmYes = el('button', {
    type: 'button',
    class: 'la-btn la-btn--primary',
    'data-action': 'reset-confirm',
    text: ui('ui.parent.reset.confirm'),
  });
  confirmYes.addEventListener('click', options.onReset);
  const confirmNo = el('button', {
    type: 'button',
    class: 'la-btn',
    'data-action': 'reset-cancel',
    text: ui('ui.pause.continue'),
  });
  confirmNo.addEventListener('click', () => {
    confirmRow.hidden = true;
  });
  confirmRow.append(confirmYes, confirmNo);

  const resetBtn = el('button', {
    type: 'button',
    class: 'la-btn la-btn--wide',
    'data-action': 'reset',
    text: ui('ui.parent.reset'),
  });
  resetBtn.addEventListener('click', () => {
    confirmRow.hidden = false;
  });
  manage.append(exportBtn, resetBtn, confirmRow);
  container.append(manage);

  root.append(container);
  return root;
}

export { statusFor };
