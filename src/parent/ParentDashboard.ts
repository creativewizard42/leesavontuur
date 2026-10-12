/**
 * Ouderdashboard (ED §12 / GD §9.2). Geen diagnose, geen percentielen,
 * geen vergelijking, geen rood label (ED §12.3). Alles lokaal.
 *
 * F3: status "Beheerst" uitsluitend via `skillStatus` (EDU-029), reactietijd in
 * seconden (EDU-023), instellingen (rustige modus/contrast/auto-repeat, QA-018),
 * en rustige meldingen bij ontbrekend geluid (QA-002) of mislukte opslag (QA-004).
 */
import type { Profile, ProfileSettings } from '../types';
import { graphemes, ui } from '../content';
import { skillStatus, soundSkillFor, type SkillStatus } from '../core/Progression';
import { median } from '../core/Mastery';
import { exportProfile, parseProfileImport, defaultStorage, type SaveStorage } from '../core/SaveSystem';
import coverage from '../audio/coverage.json';
import { version } from '../../package.json';
import { applyUpdate, checkForUpdate } from '../platform/offline';
import { loadConfusions, type ConfusionEntry } from './confusions';
import { el } from '../ui/dom';
import { uiText } from '../ui/text';
import { iconSpeaker } from '../ui/icons';

export interface ParentDashboardOptions {
  profile: Profile;
  storage?: SaveStorage;
  onBack: () => void;
  onReset: () => void;
  onImport?: (profile: Profile) => boolean;
  /** Wijzig een instelling direct (QA-018). */
  onSettingsChange?: (patch: Partial<ProfileSettings>) => void;
  /** Toon een rustige melding als opslaan niet lukte (QA-004). */
  saveFailed?: boolean;
  /** Toon een rustige melding als er geen geluid/stem is (QA-002). */
  audioUnavailable?: boolean;
  /**
   * EDU-R2-007: er is minstens één losse klank via de tijdelijke computerstem
   * (benadering) gespeeld. Kleine, niet-alarmerende ouderindicatie.
   */
  audioApproximate?: boolean;
}

type Status = 'zeker' | 'oefent' | 'nog';

const STATUS_UI: Record<Status, string> = {
  zeker: 'ui.parent.status.zeker',
  oefent: 'ui.parent.status.oefent',
  nog: 'ui.parent.status.nog',
};

const STATUS_MAP: Record<SkillStatus, Status> = {
  mastered: 'zeker',
  developing: 'oefent',
  not_started: 'nog',
};

function statusFor(profile: Profile, skillId: string): Status {
  return STATUS_MAP[skillStatus(profile, skillId)];
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

  // Rustige meldingen (geen crash, QA-002/QA-004).
  if (options.saveFailed === true) {
    const warn = el('div', { class: 'la-card', 'data-notice': 'save-failed' });
    warn.append(el('p', { class: 'la-hint-text', text: ui('ui.parent.save.failed') }));
    container.append(warn);
  }
  if (options.audioUnavailable === true) {
    const warn = el('div', { class: 'la-card', 'data-notice': 'audio-unavailable' });
    warn.append(el('p', { class: 'la-hint-text', text: ui('ui.parent.audio.missing') }));
    container.append(warn);
  }
  if (options.audioApproximate === true) {
    // EDU-R2-007: niet-alarmerend, alleen voor de ouder. Het kind ziet dit niet.
    const note = el('p', { class: 'la-hint-text la-approximate', 'data-notice': 'audio-approximate' });
    note.append(iconSpeaker());
    note.append(
      document.createTextNode(
        ` ${uiText('ui.audio.approximate') || 'Klanken via benadering (tijdelijke computerstem).'}`,
      ),
    );
    container.append(note);
  }

  // Geleerde klanken (MVP-grafemen, blok 1).
  const mvp = graphemes;
  const learned = mvp.filter((g) => statusFor(profile, soundSkillFor(g.id)) === 'zeker');
  const card = el('div', { class: 'la-card' });
  card.append(el('h3', { text: ui('ui.parent.learned.title') }));
  card.append(
    el('p', {
      text: ui('ui.parent.learnedCount').replace('{n}', String(learned.length)).replace('{total}', String(mvp.length)),
    }),
  );
  const chips = el('div', { class: 'la-chips' });
  for (const g of mvp) {
    const status = statusFor(profile, soundSkillFor(g.id));
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
    const status = statusFor(profile, skillId);
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
  const deStatus = statusFor(profile, 'DE.CVC');
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

  // Reactietijd (indicatie) – EDU-023: seconden met de juiste eenheid.
  const skillStates = Object.values(profile.skills).filter((s) => s.attempts > 0 && s.avgResponseMs > 0);
  const avg = median(skillStates.map((s) => s.avgResponseMs));
  const timeCard = el('div', { class: 'la-card' });
  timeCard.append(el('h3', { text: ui('ui.parent.time.title') }));
  timeCard.append(el('p', { text: `${profile.sessionCount} sessies` }));
  if (avg > 0) {
    const seconds = (avg / 1000).toFixed(1).replace('.', ',');
    timeCard.append(el('p', { text: ui('ui.parent.response').replace('{s}', seconds) }));
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

  // Instellingen (QA-018)
  if (options.onSettingsChange) {
    const settingsCard = el('div', { class: 'la-card', 'data-section': 'settings' });
    settingsCard.append(el('h3', { text: ui('ui.parent.settings.title') }));
    settingsCard.append(el('p', { class: 'la-hint-text', text: ui('ui.parent.settings.hint') }));
    const settings = profile.settings;
    const rows: { key: keyof ProfileSettings; label: string; checked: boolean }[] = [
      { key: 'audioEnabled', label: ui('ui.settings.audio'), checked: settings.audioEnabled },
      { key: 'reducedMotion', label: ui('ui.settings.motion'), checked: settings.reducedMotion },
      { key: 'highContrast', label: ui('ui.settings.contrast'), checked: settings.highContrast },
    ];
    for (const row of rows) {
      const label = el('label', { class: 'la-hint-text la-setting-row' });
      const input = el('input', { type: 'checkbox', 'data-setting': row.key });
      input.checked = row.checked;
      input.addEventListener('change', () => options.onSettingsChange?.({ [row.key]: input.checked }));
      label.append(input);
      label.append(document.createTextNode(` ${row.label}`));
      settingsCard.append(label);
    }
    container.append(settingsCard);
  }

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
  if (options.onImport) {
    const label = el('label', { class: 'la-setting-row', text: 'Voortgang terugzetten uit een exportbestand' });
    const input = el('input', { type: 'file', accept: '.json,application/json', 'data-action': 'import-file' });
    const status = el('p', { role: 'status', 'aria-live': 'polite', 'data-notice': 'import-status' });
    const confirm = el('button', { type: 'button', class: 'la-btn', text: 'Dit profiel terugzetten', hidden: true, 'data-action': 'import-confirm' });
    let candidate: Profile | undefined;
    input.addEventListener('change', () => {
      candidate = undefined;
      confirm.hidden = true;
      const file = input.files?.[0];
      if (!file) return;
      if (file.size > 1024 * 1024) { status.textContent = 'Het bestand is te groot (maximaal 1 MB).'; return; }
      const reader = new FileReader();
      reader.onload = () => {
        try {
          candidate = parseProfileImport(String(reader.result));
          status.textContent = `Profiel met ${candidate.sessionCount} sessies. Terugzetten vervangt de huidige voortgang. Exporteer die eerst als je haar wilt bewaren.`;
          confirm.hidden = false;
        } catch (error) { status.textContent = error instanceof Error ? error.message : 'Importeren is niet gelukt.'; }
      };
      reader.onerror = () => { status.textContent = 'Het bestand kon niet worden gelezen.'; };
      reader.readAsText(file);
    });
    confirm.addEventListener('click', () => {
      if (candidate && !options.onImport?.(candidate)) status.textContent = 'Opslaan is niet gelukt. De huidige voortgang is behouden.';
    });
    label.append(input);
    manage.append(label, status, confirm);
  }
  container.append(manage);

  const appCard = el('div', { class: 'la-card', 'data-section': 'app-readiness' });
  appCard.append(el('h3', { text: 'App en geluid' }));
  appCard.append(el('p', { text: `Versie ${version} — begeleide bèta. De volledige leesroute is nog in ontwikkeling. Ontbrekende klankopnames kunnen oefeningen blokkeren; gebruik deze versie samen met een volwassene.` }));
  appCard.append(el('p', { text: `${coverage.present} van ${coverage.total} audiofragmenten aanwezig. ${coverage.synthetic} fragmenten zijn met een Nederlandse computerstem gemaakt. ${coverage.total - coverage.present} audiobestanden ontbreken. De spraak heeft nog geen menselijke luistergoedkeuring; controleer vooral de losse klanken samen met een volwassene.` }));
  appCard.append(el('p', { text: 'De spreekstem is Jessica: AI-audio gemaakt met ElevenLabs (elevenlabs.io). Complimenten klinken levendig; opdrachten worden rustiger uitgesproken. Losse leesklanken en hakreeksen gebruiken voorlopig de eerdere klankstem.' }));
  appCard.append(el('a', { class: 'la-btn la-btn--wide', href: `${import.meta.env.BASE_URL}speech-review.html`, text: 'Beluister de nieuwe spreekstem' }));
  appCard.append(el('p', { text: 'Geluid wordt niet automatisch herhaald. Tik op het oor om zelf opnieuw te luisteren. De vervolgknop komt beschikbaar als antwoordgeluid en feedback klaar zijn.' }));
  appCard.append(el('a', { class: 'la-btn la-btn--wide', href: `${import.meta.env.BASE_URL}audio-review.html`, text: 'Beluister alle klanken en letternamen' }));
  appCard.append(el('p', { text: 'Luisterkeuzes en begripsvragen geven oefensignalen. Ze bewijzen geen zelfstandig hardop lezen. Lees geregeld samen en bespreek wat je kind leest.' }));
  appCard.append(el('p', { text: 'iPhone: open de app via HTTPS in Safari, kies Deel → Zet op beginscherm. Laat de app eerst volledig laden. Offlinegebruik werkt na het downloaden van de appbestanden. Voortgang blijft op dit apparaat; maak regelmatig een export.' }));
  const offline = document.documentElement.dataset['offlineReady'];
  appCard.append(el('p', { text: offline === 'true' ? 'De offline-appbestanden zijn opgeslagen. Heropen de app om offline te spelen.' : 'Offlineopslag is nog niet bevestigd. Gebruik een beveiligde webverbinding of een lokale server.' }));
  const updateStatus = el('p', { role: 'status' });
  const updateButton = el('button', { type: 'button', class: 'la-btn la-btn--wide', text: 'Controleer op een update' });
  let updateReady = false;
  updateButton.addEventListener('click', async () => {
    updateButton.disabled = true;
    try {
      if (updateReady) {
        if (!await applyUpdate()) updateStatus.textContent = 'Sluit andere vensters van Leesavontuur en probeer opnieuw. Sluit eventueel de hele app en open haar opnieuw.';
      } else {
        updateReady = await checkForUpdate();
        updateStatus.textContent = updateReady ? 'De nieuwe versie is opgeslagen. Maak eventueel eerst een voortgangsexport. Klik om opnieuw te openen.' : 'Nog geen update klaar. Bij een download kun je later opnieuw controleren.';
        if (updateReady) updateButton.textContent = 'Open de nieuwe versie';
      }
    } catch { updateStatus.textContent = 'Controleren lukt nu niet. Probeer het later met internet.'; }
    finally { updateButton.disabled = false; }
  });
  appCard.append(updateButton, updateStatus);
  container.append(appCard);

  root.append(container);
  return root;
}

export { statusFor };
