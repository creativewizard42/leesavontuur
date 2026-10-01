/**
 * Ouderzone-tests: gate blokkeert het kind, dashboard toont neutrale
 * statuslabels en geen diagnose-taal (ED §12.3).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createParentGate } from '../ParentGate';
import { createParentDashboard } from '../ParentDashboard';
import { createSkillState } from '../../core/Mastery';
import { createFreshProfile, createMemoryStorage } from '../../core/SaveSystem';

describe('ParentGate', () => {
  let host: HTMLElement;
  beforeEach(() => {
    host = document.createElement('div');
    document.body.append(host);
  });
  afterEach(() => host.remove());

  it('laat een kind er niet in zonder vasthouden en juiste som', () => {
    const onPass = vi.fn();
    const onFail = vi.fn();
    const gate = createParentGate({ onPass, onFail, sum: { a: 7, b: 6 } });
    host.append(gate);
    gate.querySelector<HTMLButtonElement>('[data-action="verify"]')?.click();
    expect(onPass).not.toHaveBeenCalled();
  });

  it('gaat pas verder na 5 s vasthouden én de juiste som', () => {
    const onPass = vi.fn();
    const onFail = vi.fn();
    const gate = createParentGate({ onPass, onFail, holdMs: 0, sum: { a: 7, b: 6 } });
    host.append(gate);
    const hold = gate.querySelector<HTMLElement>('[data-action="hold"]');
    hold?.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    expect(gate.querySelector('[data-section="sum"]')?.hasAttribute('hidden')).toBe(false);
    const input = gate.querySelector<HTMLInputElement>('[data-action="answer"]');
    if (input) input.value = '13';
    gate.querySelector<HTMLButtonElement>('[data-action="verify"]')?.click();
    expect(onPass).toHaveBeenCalledTimes(1);
    expect(onFail).not.toHaveBeenCalled();
  });

  it('meldt een foutsom zonder door te laten', () => {
    const onPass = vi.fn();
    const onFail = vi.fn();
    const gate = createParentGate({ onPass, onFail, holdMs: 0, sum: { a: 7, b: 6 } });
    host.append(gate);
    gate.querySelector<HTMLElement>('[data-action="hold"]')?.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    const input = gate.querySelector<HTMLInputElement>('[data-action="answer"]');
    if (input) input.value = '12';
    gate.querySelector<HTMLButtonElement>('[data-action="verify"]')?.click();
    expect(onPass).not.toHaveBeenCalled();
    expect(onFail).toHaveBeenCalledTimes(1);
  });
});

describe('ParentDashboard', () => {
  let host: HTMLElement;
  beforeEach(() => {
    host = document.createElement('div');
    document.body.append(host);
  });
  afterEach(() => host.remove());

  it('toont neutrale statuslabels en geen diagnose-woorden', () => {
    const profile = createFreshProfile(0, () => 0.5);
    profile.skills['LK.m.SOUND'] = { ...createSkillState(), mastery: 0.9, attempts: 14 };
    profile.skills['LK.a.SOUND'] = { ...createSkillState(), mastery: 0.4, attempts: 14 };
    profile.skills['AN.CVC'] = { ...createSkillState(), mastery: 0.55, attempts: 12 };

    const dashboard = createParentDashboard({
      profile,
      storage: createMemoryStorage(),
      onBack: vi.fn(),
      onReset: vi.fn(),
    });
    host.append(dashboard);
    const text = (dashboard.textContent ?? '').toLowerCase();

    expect(text).toContain('beheerst');
    expect(text).toContain('in ontwikkeling');
    expect(text).toContain('nog niet begonnen');

    for (const forbidden of ['dyslexie', 'leesstoornis', 'stoornis', 'achterstand', 'risicokind', 'percentiel', 'avi', 'dmt']) {
      expect(text).not.toContain(forbidden);
    }
  });
});
