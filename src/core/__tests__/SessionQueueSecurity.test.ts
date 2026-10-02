/**
 * SEC-R2-001/002: strikte schema- en omvangvalidatie van hervat-JSON.
 * Corrupte of opgeblazen data moet veilig `null`/`undefined` opleveren zonder
 * te crashen (alleen bereikbaar via lokale opslagmanipulatie).
 */
import { describe, expect, it } from 'vitest';
import type { ActivityItem } from '../../types';
import { createMemoryStorage } from '../SaveSystem';
import {
  createSessionQueue,
  loadSessionState,
  MAX_RESUME_BYTES,
  saveSessionState,
  SESSION_RESUME_KEY,
  SessionQueue,
  type SessionPlan,
} from '../SessionPlanner';

function makeItem(id: string): ActivityItem {
  return {
    id,
    skillId: 'DE.CVC',
    kind: 'woordlezen',
    prompt: { text: 'kam', showText: true },
    options: [
      { id: `${id}.o0`, label: 'kam', correct: true },
      { id: `${id}.o1`, label: 'kat', correct: false },
    ],
    targetId: `${id}.o0`,
    difficulty: 'C',
    isRetry: false,
    itemKey: id,
    metadata: {},
  };
}

function plan(): SessionPlan {
  return {
    sessionNumber: 1,
    sections: [
      { step: 5, name: 'Woorden lezen', items: [makeItem('a'), makeItem('b')] },
      { step: 8, name: 'Beloning', items: [makeItem('reward')] },
    ],
  };
}

describe('SessionQueue.fromJSON – strikte schema-validatie (SEC-R2-001)', () => {
  it('weigert niet-objecten en verkeerde versies', () => {
    expect(SessionQueue.fromJSON(null)).toBeNull();
    expect(SessionQueue.fromJSON('x')).toBeNull();
    expect(SessionQueue.fromJSON({ version: 2, sections: [] })).toBeNull();
    expect(SessionQueue.fromJSON({ version: 1, sections: 'nope' })).toBeNull();
  });

  it('weigert items met een ongeldig schema', () => {
    const broken = {
      version: 1,
      sessionNumber: 1,
      sections: [{ step: 5, name: 'x', items: [{ id: 1 }] }],
      sectionIndex: 0,
      itemIndex: 0,
    };
    expect(SessionQueue.fromJSON(broken)).toBeNull();
  });

  it('begrenst het aantal secties', () => {
    const sections = Array.from({ length: 40 }, (_v, i) => ({ step: i + 1, name: `s${i}`, items: [] }));
    expect(SessionQueue.fromJSON({ version: 1, sessionNumber: 1, sections })).toBeNull();
  });

  it('accepteert een geldige roundtrip', () => {
    const queue = createSessionQueue(plan(), { sessionNumber: 1 });
    const restored = SessionQueue.fromJSON(queue.toJSON(1000));
    expect(restored).not.toBeNull();
    expect(restored!.current()?.id).toBe('a');
  });

  it('negeert __proto__/constructor-keys zonder prototype-pollution', () => {
    const queue = createSessionQueue(plan(), { sessionNumber: 1 });
    const data = queue.toJSON(1000) as unknown as Record<string, unknown>;
    // Simuleer gemanipuleerde localStorage met een gevaarlijke key.
    data['skillStates'] = JSON.parse('{"__proto__":{"mastery":1},"DE.CVC":{"mastery":0.5}}');
    data['recentEvents'] = JSON.parse('{"__proto__":[{"bogus":true}]}');
    const restored = SessionQueue.fromJSON(data);
    expect(restored).not.toBeNull();
    // Geen globale prototype-mutatie.
    expect(({} as Record<string, unknown>)['mastery']).toBeUndefined();
    // Ongeldige events zijn gefilterd.
    const json = restored!.toJSON(1000);
    expect(Object.keys(json.recentEvents)).not.toContain('__proto__');
  });
});

describe('loadSessionState – omvang- en corruptiecap (SEC-R2-002)', () => {
  it('negeert een opgeblazen resume-sleutel', () => {
    const storage = createMemoryStorage();
    storage.write(SESSION_RESUME_KEY, 'x'.repeat(MAX_RESUME_BYTES + 1));
    expect(loadSessionState(storage, 1000)).toBeUndefined();
  });

  it('verwijdert een verlopen resume-sleutel actief (SEC-R3-002)', () => {
    const storage = createMemoryStorage();
    const queue = createSessionQueue(plan(), { sessionNumber: 1 });
    const ttl = 60_000;
    expect(saveSessionState(queue, storage, 1000)).toEqual({ ok: true });
    expect(loadSessionState(storage, 1000 + ttl + 1, ttl)).toBeUndefined();
    expect(storage.read(SESSION_RESUME_KEY)).toBeNull();
  });

  it('negeert corrupte JSON zonder crash', () => {
    const storage = createMemoryStorage();
    storage.write(SESSION_RESUME_KEY, '{niet-json');
    expect(loadSessionState(storage, 1000)).toBeUndefined();
    // SEC-R3-002: ook ongeldige data wordt actief opgeruimd.
    expect(storage.read(SESSION_RESUME_KEY)).toBeNull();
  });

  it('hervat nog steeds een geldige sleutel', () => {
    const storage = createMemoryStorage();
    const queue = createSessionQueue(plan(), { sessionNumber: 1 });
    expect(saveSessionState(queue, storage, 1000)).toEqual({ ok: true });
    expect(loadSessionState(storage, 2000)?.current()?.id).toBe('a');
  });
});

describe('SessionQueue – audio-key-whitelist (SEC-R3-005)', () => {
  it('laat alleen audio-keys uit manifest/instructies/feedback toe', () => {
    const queue = createSessionQueue(plan(), { sessionNumber: 1 });
    const data = queue.toJSON(1000) as unknown as {
      sections: { items: ActivityItem[] }[];
    };
    const item = data.sections[0]?.items[0];
    expect(item).toBeDefined();
    // Gemanipuleerde, onbekende keys moeten sneuvelen; bekende blijven.
    (item as unknown as { prompt: { audio?: unknown } }).prompt.audio = {
      key: '../../evil',
      src: '../evil.mp3',
      kind: 'word',
    };
    (item!.options[0] as unknown as { audio?: unknown }).audio = {
      key: 'lk.m.sound',
      src: 'audio/graphemes/m_sound.mp3',
      kind: 'grapheme-sound',
    };

    const restored = SessionQueue.fromJSON(data);
    expect(restored).not.toBeNull();
    const current = restored!.current();
    expect(current?.prompt.audio).toBeUndefined();
    expect(current?.options[0]?.audio?.key).toBe('lk.m.sound');
  });
});
