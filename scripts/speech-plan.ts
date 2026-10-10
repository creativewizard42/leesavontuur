import { writeFileSync } from 'node:fs';
import { AUDIO_MANIFEST } from '../src/content/audioManifest';
import { GRAPHEMES, PHONEME_BY_ID } from '../src/content/graphemes';
import { WORDS } from '../src/content/words';

writeFileSync('docs/audio/speech-plan.json', JSON.stringify({
  schemaVersion: 1, clips: AUDIO_MANIFEST,
  graphemes: GRAPHEMES.map(g => ({ id: g.id, name: g.audio?.name?.text, hint: g.soundHint, ipa: PHONEME_BY_ID[g.id], type: g.type })),
  words: WORDS.map(w => ({ word: w.word, graphemes: w.graphemes })),
}, null, 2) + '\n');

const escape = (value: string): string => value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]!));
const rows = GRAPHEMES.map(g => {
  if (!g.audio?.name) throw new Error(`Missing audio references: ${g.id}`);
  return `<tr><th scope="row">${escape(g.letters)}</th><td>Klank <audio controls preload="none" src="${escape(g.audio.sound.src)}"></audio></td><td>Letternaam <audio controls preload="none" src="${escape(g.audio.name.src)}"></audio></td></tr>`;
}).join('\n');
writeFileSync('public/audio-review.html', `<!doctype html>
<html lang="nl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; style-src 'self'; media-src 'self'; object-src 'none'; base-uri 'none'">
<title>Leesavontuur — luistercontrole</title><script src="./audio-review.js" defer></script></head>
<body><h1>Luistercontrole voor volwassenen</h1>
<p>Deze Nederlandse computerstem heeft nog geen menselijke luistergoedkeuring.
Luister vooral of korte en lange klinkers duidelijk verschillen en of medeklinkers geen extra klinker krijgen.
De klank is iets anders dan de letternaam. Geef bij een probleem de letter en wat je hoort door.</p>
<p><a href="./">Terug naar Leesavontuur</a></p><table><caption>Alle 41 letters en lettercombinaties</caption>
<thead><tr><th>Letter</th><th>Klank</th><th>Letternaam</th></tr></thead><tbody>${rows}</tbody></table></body></html>\n`);
