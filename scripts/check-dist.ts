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
    if (!/img-src 'self'/.test(csp)) fail("CSP mist img-src 'self' (SEC-R2-005).");
    if (!/media-src 'self'/.test(csp)) fail("CSP mist media-src 'self' (SEC-R2-005).");
    if (/\b(data|blob):/i.test(csp)) fail('CSP bevat data:/blob: (SEC-R2-005).');
    if (/<script(?![^>]*\bsrc=)[^>]*>\s*[^<\s]/i.test(html)) fail('Inline script in dist/index.html.');

    // SEC-R3-001: de meta-CSP moet vóór het eerste script/stylesheet staan,
    // anders vallen die initiële loads formeel buiten de meta.
    const cspIndex = cspMatch ? html.indexOf(cspMatch[0]) : -1;
    const firstScript = html.search(/<script\b/i);
    const firstStyle = html.search(/<link\b[^>]*\brel=["']?stylesheet/i);
    if (cspIndex >= 0) {
      if (firstScript >= 0 && cspIndex > firstScript) {
        fail('CSP-meta staat niet vóór het eerste <script> (SEC-R3-001).');
      }
      if (firstStyle >= 0 && cspIndex > firstStyle) {
        fail('CSP-meta staat niet vóór de eerste stylesheet (SEC-R3-001).');
      }
    }
  }

  // SEC-R2-003: hardening-headers moeten met de build meekomen (Netlify _headers).
  const headersPath = join(DIST, '_headers');
  if (!existsSync(headersPath)) {
    fail("dist/_headers ontbreekt; lever hostconfig mee (SEC-R2-003).");
  } else {
    const headers = readFileSync(headersPath, 'utf8');
    const expected: readonly (readonly [string, RegExp])[] = [
      ["frame-ancestors 'none'", /frame-ancestors 'none'/i],
      ['X-Content-Type-Options nosniff', /x-content-type-options:\s*nosniff/i],
      ['Referrer-Policy no-referrer', /referrer-policy:\s*no-referrer/i],
      ['Permissions-Policy camera/microphone/geolocation', /permissions-policy:.*camera=\(\).*microphone=\(\).*geolocation=\(\)/i],
    ];
    for (const [label, pattern] of expected) {
      if (!pattern.test(headers)) fail(`dist/_headers mist ${label} (SEC-R2-003).`);
    }
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