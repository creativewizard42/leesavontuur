/**
 * SEC-R2-004 / SEC-R2-005 / SEC-R2-003:
 *  - geen `innerHTML` met variabelen in de UI (de `html`-optie is verwijderd);
 *  - CSP beperkt img/media tot 'self' en preview stuurt hardening-headers;
 *  - deploy/hostconfig levert frame-ancestors + hardening-headers.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import viteConfig from '../../../vite.config';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '..', '..', '..');

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

describe('geen innerHTML-sink met variabelen (SEC-R2-004)', () => {
  it('beperkt innerHTML tot de statische svg-helper in ui/dom.ts', () => {
    const files = walk(join(REPO_ROOT, 'src')).filter((f) => f.endsWith('.ts') && !f.includes('__tests__'));
    const offenders = files.filter((file) => {
      if (file.replace(/\\/g, '/').endsWith('src/ui/dom.ts')) return false;
      return /innerHTML/.test(readFileSync(file, 'utf8'));
    });
    expect(offenders).toEqual([]);

    const dom = readFileSync(join(REPO_ROOT, 'src', 'ui', 'dom.ts'), 'utf8');
    expect(dom).not.toMatch(/key === 'html'/);
    const occurrences = dom.match(/innerHTML/g) ?? [];
    expect(occurrences.length).toBe(1);
  });
});

describe('CSP-hardening (SEC-R2-005 / SEC-R2-003)', () => {
  it('beperkt img-src/media-src tot self en gebruikt geen data:/blob:', () => {
    const plugin = (viteConfig.plugins as unknown as { transformIndexHtml?: (html: string) => string }[])[0];
    const html = plugin?.transformIndexHtml?.('<html><head></head></html>') ?? '';
    expect(html).toContain("img-src 'self'");
    expect(html).toContain("media-src 'self'");
    expect(html).not.toMatch(/data:|blob:/);
  });

  it('stuurt hardening-headers via vite preview', () => {
    const headers = (viteConfig.preview as { headers?: Record<string, string> } | undefined)?.headers ?? {};
    expect(headers['Content-Security-Policy']).toMatch(/frame-ancestors 'none'/);
    expect(headers['X-Content-Type-Options']).toBe('nosniff');
    expect(headers['Referrer-Policy']).toBe('no-referrer');
    expect(headers['Permissions-Policy']).toMatch(/camera=\(\).*microphone=\(\).*geolocation=\(\)/);
  });

  it('levert hostconfig-voorbeelden met dezelfde hardening-headers', () => {
    const files = [
      'public/_headers',
      'deploy/netlify/_headers',
      'deploy/nginx/leesavontuur-headers.conf',
      'deploy/apache/.htaccess',
    ];
    for (const rel of files) {
      const full = join(REPO_ROOT, rel);
      expect(existsSync(full), rel).toBe(true);
      const content = readFileSync(full, 'utf8');
      expect(content, rel).toMatch(/frame-ancestors 'none'/i);
      expect(content, rel).toMatch(/nosniff/i);
      expect(content, rel).toMatch(/no-referrer/i);
      expect(content, rel).toMatch(/camera=\(\).*microphone=\(\).*geolocation=\(\)/i);
    }
  });
});
