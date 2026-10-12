import { describe, expect, it } from 'vitest';
import { buildRecordingList } from '../../../scripts/recording-list';
import { audioManifest, feedback, instructionClips, instructions, requiredFeedbackKeys } from '../index';
import { INSTRUCTIONS } from '../instructions';

describe('opnamelijst (EDU-009)', () => {
  it('bevat een regel per clip met pad, tekst en uitspraakaanwijzing', () => {
    const markdown = buildRecordingList();
    expect(markdown).toContain('| Pad | Sleutel | Te spreken tekst | Uitspraakaanwijzing |');
    expect(markdown).toContain('`audio/blends/kam.mp3`');
    expect(markdown).toContain('`audio/feedback/instr.klim.kam.mp3`');
    expect(markdown).toContain('KLANK, geen letternaam');
    expect(markdown).toContain(`Totaal: **${audioManifest.length}** clips.`);
  });

  it('vermeldt gerekte reeksen met pauzes en losse klanken als opname', () => {
    const markdown = buildRecordingList();
    expect(markdown).toMatch(/blend\.kam.*k … a … mmm/);
  });

  it('bevat geen letterlijke {placeholders} meer (EDU-R2-002)', () => {
    for (const clip of audioManifest) {
      expect(clip.text ?? '', `${clip.key} mag geen placeholder bevatten`).not.toMatch(/\{[a-zA-Z]+\}/);
    }
    expect(buildRecordingList()).not.toMatch(/\{[a-zA-Z]+\}/);
  });

  it('geeft plosieven een korte-plof-aanwijzing en klinkers kort/lang (EDU-R2-003)', () => {
    const markdown = buildRecordingList();
    expect(markdown).toMatch(/lk\.k\.sound.*Korte, stemloze plof/);
    expect(markdown).toMatch(/lk\.a\.sound.*Korte klinker/);
    expect(markdown).toMatch(/lk\.aa\.sound.*Lange klinker/);
    expect(markdown).toMatch(/lk\.m\.sound.*Houd de continuant aan/);
    // Losse klanken tonen de canonieke klankhint, niet de TTS-benadering.
    expect(markdown).toContain('| `audio/graphemes/k_sound.mp3` | `lk.k.sound` | k |');
  });

  it('genereert per variabele een concrete instructieclip', () => {
    const manifestKeys = new Set(audioManifest.map((c) => c.key));
    expect(manifestKeys.has('instr.fn.first_sound.m')).toBe(true);
    expect(manifestKeys.has('instr.lk.sound_to_grapheme.m')).toBe(true);
    expect(manifestKeys.has('instr.lk.intro.m')).toBe(true);
    expect(manifestKeys.has('instr.ph.rhyme.raam')).toBe(true);
    expect(manifestKeys.has('instr.ph.syllable.maan')).toBe(true);
    expect(manifestKeys.has('fb.specific.count.3')).toBe(true);
    // Geen generieke placeholder-varianten in de manifest.
    expect(manifestKeys.has('instr.fn.first_sound')).toBe(false);
    expect(manifestKeys.has('instr.lk.intro')).toBe(false);
    expect(manifestKeys.has('fb.specific.count')).toBe(false);
  });

  it('laat ongebruikte feedbackvarianten weg uit content en opnamelijst (reviewfix set B)', () => {
    const removed = ['fb.try1.5', 'fb.try1.6', 'fb.try1.7', 'fb.hint.3'];
    const manifestKeys = new Set(audioManifest.map((c) => c.key));
    for (const key of removed) {
      expect(feedback[key], key).toBeUndefined();
      expect(requiredFeedbackKeys, key).not.toContain(key);
      expect(manifestKeys.has(key), key).toBe(false);
    }
  });
});

describe('instructionClips (EDU-R2-002)', () => {
  const varsByKey: Record<string, Record<string, string>> = {
    'instr.fn.first_sound': { sound: 'm' },
    'instr.fn.last_sound': { sound: 't' },
    'instr.lk.sound_to_grapheme': { sound: 'm' },
    'instr.lk.intro': { letter: 'm', sound: 'mmm' },
    'instr.ph.rhyme': { word: 'raam' },
    'instr.ph.syllable': { word: 'maan' },
    'instr.klim.kam': { word: 'kam' },
  };

  it('levert voor elke gebruikte dynamische key een niet-lege semantische sequentie', () => {
    for (const [key, vars] of Object.entries(varsByKey)) {
      const clips = instructionClips(key, vars);
      expect(clips.length, key).toBeGreaterThanOrEqual(1);
      for (const clip of clips) {
        expect(clip.key.length, key).toBeGreaterThan(0);
        expect(clip.text ?? '', key).not.toMatch(/\{[a-zA-Z]+\}/);
      }
    }
  });

  it('kiest de concrete variant per grafeem/woord', () => {
    expect(instructionClips('instr.fn.first_sound', { sound: 'm' })[0]?.key).toBe('instr.fn.first_sound.m');
    expect(instructionClips('instr.fn.first_sound', { sound: 'mmm' })[0]?.key).toBe('instr.fn.first_sound.m');
    expect(instructionClips('instr.lk.intro', { letter: 'm', sound: 'mmm' })[0]?.text).toContain('mmm');
    expect(instructionClips('instr.ph.rhyme', { word: 'raam' })[0]?.key).toBe('instr.ph.rhyme.raam');
    expect(instructionClips('instr.klim.kam')[0]?.key).toBe('instr.klim.kam');
  });

  it('valt voor onbekende keys terug op een lege sequentie', () => {
    expect(instructionClips('instr.bestaat.niet')).toEqual([]);
  });

  it('dekt alle dynamische templates met placeholders', () => {
    for (const [key, text] of Object.entries(INSTRUCTIONS)) {
      if (!/\{[a-zA-Z]+\}/.test(text)) continue;
      expect(instructions[key], key).toBe(text);
      const clips = instructionClips(key, { sound: 'm', klank: 'm', letter: 'm', word: 'kam', woord: 'kam', woorden: 'kam', beeld: 'kat', count: '3' });
      expect(clips.length, key).toBeGreaterThanOrEqual(1);
      expect(clips[0]?.text ?? '', key).not.toMatch(/\{[a-zA-Z]+\}/);
    }
  });
});
