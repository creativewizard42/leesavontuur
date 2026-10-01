import { describe, expect, it } from 'vitest';
import { buildRecordingList } from '../../../scripts/recording-list';
import { audioManifest } from '../index';

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
});
