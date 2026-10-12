import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const beta = process.argv.includes('--beta');
if (beta !== /-beta\.\d+$/.test(pkg.version)) throw new Error('Het releasekanaal moet overeenkomen met de pakketversie.');
const run = script => execFileSync('npm', ['run', script], { stdio: 'inherit' });
run('test');
run('validate');
run('audio:catalog');
if (!beta) run('audio:release');
run('build');
run('check:dist');
mkdirSync('releases', { recursive: true });
const filename = `leesavontuur-${pkg.version}.tar.gz`;
execFileSync('tar', ['-czf', `releases/${filename}`, '-C', 'dist', '.']);
const sha256 = createHash('sha256').update(readFileSync(`releases/${filename}`)).digest('hex');
writeFileSync(`releases/${filename}.sha256`, `${sha256}  ${filename}\n`);
writeFileSync(`releases/${filename}.json`, JSON.stringify({
  version: pkg.version, channel: beta ? 'beta' : 'stable',
  sourceCommit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  dirty: Boolean(execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).trim()),
  sha256, audio: JSON.parse(readFileSync('src/audio/coverage.json', 'utf8')),
  limitations: beta ? ['Begeleide bèta; synthetische uitspraak nog niet luistergoedgekeurd.', 'Geen bewijs van zelfstandig lezen of volledige leesmethode.', 'Fysieke iPhone en didactische pilot nog niet gevalideerd.'] : [],
}, null, 2) + '\n');
console.log(`Releasepakket: releases/${filename}`);
