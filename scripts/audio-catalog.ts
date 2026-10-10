import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { createHash } from 'node:crypto';
import { AUDIO_MANIFEST } from '../src/content/audioManifest';

import { needsHumanRecording } from '../src/audio/recordingPolicy';

const provenancePath = 'public/audio/provenance.json';
const provenance = existsSync(provenancePath) ? JSON.parse(readFileSync(provenancePath, 'utf8')) as { clips: { src: string }[] } : { clips: [] };
const generated = new Set(provenance.clips.map(clip => clip.src));
const reviewPath = 'docs/audio/review.json';
const reviews = existsSync(reviewPath) ? JSON.parse(readFileSync(reviewPath, 'utf8')) as
  { src: string; sha256: string; approved: boolean; reviewer: string }[] : [];
const reviewed = (src: string): boolean => {
  const file = join('public', src);
  if (!existsSync(file)) return false;
  const digest = createHash('sha256').update(readFileSync(file)).digest('hex');
  return reviews.some(review => review.src === src && review.approved === true &&
    review.reviewer.length > 0 && review.sha256 === digest);
};
const entries = AUDIO_MANIFEST.map(clip => ({
  ...clip, delivery: needsHumanRecording(clip.key, clip.kind) ? 'human-required' : 'speech',
  status: !existsSync(join('public', clip.src)) ? 'missing' : generated.has(clip.src) ? 'synthetic-draft' : reviewed(clip.src) ? 'human-reviewed' : 'present-unreviewed',
}));
mkdirSync('docs/audio', { recursive: true });
writeFileSync('docs/audio/recording-script.json', JSON.stringify(entries, null, 2) + '\n');
const report = { total: entries.length, present: entries.filter(entry => entry.status !== 'missing').length,
  synthetic: entries.filter(entry => entry.status === 'synthetic-draft').length,
  humanRequired: entries.filter(entry => entry.delivery === 'human-required').length,
  humanMissing: entries.filter(entry => entry.delivery === 'human-required' && entry.status === 'missing').length };
mkdirSync(dirname('src/audio/coverage.json'), { recursive: true });
writeFileSync('src/audio/coverage.json', JSON.stringify(report, null, 2) + '\n');
writeFileSync('src/audio/syntheticSources.json', JSON.stringify(entries.filter(entry => entry.status === 'synthetic-draft').map(entry => entry.src).sort(), null, 2) + '\n');
console.log(JSON.stringify(report));
if (process.argv.includes('--release') && entries.some(entry => entry.status !== 'human-reviewed')) {
  console.error('Release blocked: missing or synthetic recordings. Human recordings also require documented listening review.');
  process.exitCode = 1;
}
