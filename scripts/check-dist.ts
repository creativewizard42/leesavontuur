/**
 * Build-controle (SEC-002/SEC-003/SEC-014): verifieert de productie-output.
 * Draai ná `npm run build` met `npm run check:dist`.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const DIST = 'dist';
const failures: string[] = [];

function fail(message: string): void {
  failures.push(message);
}

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

if (!existsSync(DIST)) {
  fail(`Geen ${DIST}/ gevonden; draai eerst \`npm run build\`.`);
} else {
  const indexPath = join(DIST, 'index.html');
  if (!existsSync(indexPath)) {
    fail('dist/index.html ontbreekt.');
  } else {
    const html = readFileSync(indexPath, 'utf8');
    const cspMatch = html.match(
      /<meta[^>]*http-equiv=["']Content-Security-Policy["'][^>]*content="([^"]*)"/i,
    );
    if (!cspMatch) fail('Geen CSP-meta in dist/index.html (SEC-003).');
    const csp = cspMatch?.[1] ?? '';
    if (/frame-ancestors/i.test(csp)) {
      fail('frame-ancestors staat in de meta-CSP maar wordt daar genegeerd (SEC-002).');
    }
    if (/unsafe-inline/i.test(csp)) fail("CSP bevat 'unsafe-inline' (SEC-004).");
    if (!/script-src 'self'/.test(csp)) fail("CSP mist een strikte script-src 'self'.");
    if (!/style-src 'self'/.test(csp)) fail("CSP mist een strikte style-src 'self' (SEC-004).");
    if (/<script(?![^>]*\bsrc=)[^>]*>\s*[^<\s]/i.test(html)) fail('Inline script in dist/index.html.');
  }

  // Geen externe URL's in de meeleverde HTML/CSS/JS (licentieteksten uitgezonderd).
  const files = walk(DIST).filter((f) => /\.(html|js|css)$/i.test(f));
  for (const file of files) {
    const content = readFileSync(file, 'utf8');
    const urls = content.match(/https?:\/\/[^\s"'`)]+|wss?:\/\/[^\s"'`)]+/gi) ?? [];
    for (const url of urls) {
      if (url.startsWith('http://www.w3.org/')) continue; // SVG-namespace
      fail(`Externe URL "${url}" in ${file}.`);
    }
  }

  const licenseDir = join(DIST, 'licenses');
  const licenses = existsSync(licenseDir) ? readdirSync(licenseDir) : [];
  if (!licenses.some((f) => f.toLowerCase().includes('andika'))) {
    fail('dist/licenses mist de Andika-OFL-licentie (SEC-014).');
  }
  if (!licenses.some((f) => f.toLowerCase().includes('atkinson'))) {
    fail('dist/licenses mist de Atkinson-Hyperlegible-OFL-licentie (SEC-014).');
  }
}

if (failures.length > 0) {
  console.error('check:dist FAILED');
  for (const message of failures) console.error(` - ${message}`);
  process.exit(1);
}
console.log('check:dist OK: CSP-meta aanwezig, geen externe URL\'s, OFL-licenties meegeleverd.');