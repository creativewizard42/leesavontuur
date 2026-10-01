/**
 * Genereert de opnamelijst voor audio (EDU-009/§D, ARCHITECTURE §6.2).
 *
 * `npm run recordings` schrijft `docs/RECORDINGS.md` met per clip:
 * pad, type, te spreken tekst en een uitspraakaanwijzing voor de
 * (native, Standaardnederlandse) inspreker.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { AudioClip, Grapheme } from '../src/types';
import { audioManifest } from '../src/content';
import { GRAPHEMES } from '../src/content/graphemes';

const repoRoot = (): string => {
  try {
    return fileURLToPath(new URL('..', import.meta.url));
  } catch {
    return process.cwd();
  }
};

const KIND_LABEL: Readonly<Record<AudioClip['kind'], string>> = {
  'grapheme-sound': 'Losse klank',
  'grapheme-name': 'Letternaam',
  'grapheme-example': 'Voorbeeldwoord (auditief)',
  word: 'Heel woord',
  sightword: 'Sight word',
  feedback: 'Feedback',
  instruction: 'Instructie',
  sentence: 'Zin/tekst',
  blend: 'Gerekte/gehakte reeks',
};

function graphemeForClip(clip: AudioClip): Grapheme | undefined {
  if (
    clip.kind !== 'grapheme-sound' &&
    clip.kind !== 'grapheme-name' &&
    clip.kind !== 'grapheme-example'
  ) {
    return undefined;
  }
  const id = clip.key.split('.')[1];
  return id ? GRAPHEMES.find((x) => x.id === id) : undefined;
}

/**
 * Uitspraakaanwijzing per klanktype (EDU-R2-003): continuanten aanhouden,
 * plosieven kort zonder sjwa, korte vs. lange klinkers onderscheiden.
 */
function graphemeSoundHint(clip: AudioClip, g: Grapheme | undefined): string {
  const notation = g?.soundHint ?? clip.text ?? '';
  switch (g?.type) {
    case 'continuant':
      return `KLANK, geen letternaam. Houd de continuant aan, zonder sjwa ("${notation}").`;
    case 'plosive':
      return `KLANK, geen letternaam. Korte, stemloze plof; geen naklinkende "uh" ("${notation}").`;
    case 'vowel-short':
      return `KLANK, geen letternaam. Korte klinker ("${notation}"), niet de letternaam.`;
    case 'vowel-long':
      return `KLANK, geen letternaam. Lange klinker aanhouden ("${notation}").`;
    case 'diphthong':
      return `KLANK, geen letternaam. Tweeklank in één beweging ("${notation}").`;
    default:
      return `KLANK, geen letternaam. Zonder sjwa/uh ("${notation}").`;
  }
}

function pronunciationHint(clip: AudioClip, g: Grapheme | undefined): string {
  switch (clip.kind) {
    case 'grapheme-sound':
      return graphemeSoundHint(clip, g);
    case 'grapheme-name':
      return 'Letternaam (alleen ouderzone/alfabetliedje).';
    case 'grapheme-example':
      return 'Voorbeeldwoord, auditief; duidelijk articuleren.';
    case 'blend':
      return 'Gerekte/gehakte reeks: elke klank los, korte pauze ertussen, geen letternamen.';
    case 'word':
      return 'Heel woord, Standaardnederlands, rustig tempo.';
    case 'sightword':
      return 'Sight word: als geheel woord inspreken (niet uitgespeld).';
    case 'instruction':
      return 'Instructiezin: vriendelijk, rustig, gelijk volume bij goed en fout.';
    case 'feedback':
      return 'Feedbackzin: kort, positief, gelijk volume bij goed en fout.';
    case 'sentence':
      return 'Zin/tekst: vloeiend en rustig voorlezen.';
    default:
      return '';
  }
}

function graphemeNote(g: Grapheme | undefined): string {
  if (!g) return '';
  const tts = g.ttsHint && g.ttsHint !== g.soundHint ? ` TTS-benadering: "${g.ttsHint}".` : '';
  return ` Grafeem "${g.letters}" (${g.type}), blok ${g.introducedInPhase}, letternaam "${g.name}".${tts}`;
}

export function buildRecordingList(): string {
  const lines: string[] = [];
  lines.push('# LEESAVONTUUR – opnamelijst');
  lines.push('');
  lines.push('> Automatisch gegenereerd met `npm run recordings` (bron: `src/content/audioManifest.ts`).');
  lines.push('> Alle clips: 44,1 kHz, mono, genormaliseerd, gelijk volume bij goed en fout (ED §9.1).');
  lines.push('> **Losse klanken, gerekte reeksen en feedback zijn altijd echte opnames** (ED §13.1);');
  lines.push('> TTS is alleen een tijdelijke, gemarkeerde fallback.');
  lines.push('');

  const byKind = new Map<AudioClip['kind'], AudioClip[]>();
  for (const clip of audioManifest) {
    const list = byKind.get(clip.kind) ?? [];
    list.push(clip);
    byKind.set(clip.kind, list);
  }

  lines.push(`Totaal: **${audioManifest.length}** clips.`);
  lines.push('');
  lines.push('| Type | Aantal |');
  lines.push('|---|---|');
  for (const [kind, list] of [...byKind.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    lines.push(`| ${KIND_LABEL[kind] ?? kind} | ${list.length} |`);
  }
  lines.push('');

  for (const [kind, list] of [...byKind.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    lines.push(`## ${KIND_LABEL[kind] ?? kind} (${kind})`);
    lines.push('');
    lines.push('| Pad | Sleutel | Te spreken tekst | Uitspraakaanwijzing |');
    lines.push('|---|---|---|---|');
    for (const clip of [...list].sort((a, b) => a.key.localeCompare(b.key))) {
      const g = graphemeForClip(clip);
      // "Te spreken tekst" is de opnamenotatie; voor losse klanken de canonieke
      // klankhint (niet de TTS-benadering), zie EDU-R2-003.
      const spoken = clip.kind === 'grapheme-sound' && g ? g.soundHint : (clip.text ?? '');
      const text = spoken.replace(/\|/g, '\\|');
      const hint = `${pronunciationHint(clip, g)}${graphemeNote(g)}`.trim().replace(/\|/g, '\\|');
      lines.push(`| \`${clip.src}\` | \`${clip.key}\` | ${text} | ${hint} |`);
    }
    lines.push('');
  }

  return `${lines.join('\n')}\n`;
}

export function writeRecordingList(outPath = join(repoRoot(), 'docs', 'RECORDINGS.md')): string {
  const markdown = buildRecordingList();
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, markdown, 'utf8');
  return outPath;
}

const invokedDirectly =
  process.env['npm_lifecycle_event'] === 'recordings' ||
  (process.argv[1]?.replace(/\\/g, '/').includes('recording-list') ?? false);
if (invokedDirectly) {
  const path = writeRecordingList();
  console.log(`Opnamelijst geschreven: ${path}`);
}
