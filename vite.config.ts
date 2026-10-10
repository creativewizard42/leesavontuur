import { defineConfig, type Plugin } from 'vitest/config';
import { offlinePlugin } from './scripts/offline-plugin.ts';

/**
 * Productie-CSP (SEC-002/SEC-003/SEC-004, SEC-R2-005).
 *
 * - Alleen in de build geïnjecteerd, zodat Vite dev-HMR (`ws://`) blijft werken.
 * - `style-src 'self'` zonder `'unsafe-inline'`: de build levert CSS als extern
 *   bestand en de UI zet geen `style`-attributen meer (alleen CSSOM via JS, wat
 *   niet onder CSP valt).
 * - `img-src`/`media-src 'self'`: alle assets zijn same-origin; `data:`/`blob:`
 *   zijn niet nodig (de export-download via een blob-URL is een navigatie en
 *   valt niet onder `img-src`/`media-src`).
 * - `frame-ancestors` ontbreekt bewust: die directive wordt in een meta-CSP
 *   genegeerd en hoort als HTTP-header op de hostingserver (zie `deploy/` en
 *   `docs/SECURITY_HEADERS.md`).
 */
const PRODUCTION_CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self'",
  "media-src 'self'",
  "font-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
].join('; ');

/** Volledige CSP als HTTP-header: identiek + `frame-ancestors 'none'` (SEC-R2-003). */
const HEADER_CSP = `${PRODUCTION_CSP}; frame-ancestors 'none'`;

const HARDENING_HEADERS: Record<string, string> = {
  'Content-Security-Policy': HEADER_CSP,
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};

function productionCspPlugin(): Plugin {
  return {
    name: 'leesavontuur-production-csp',
    apply: 'build',
    transformIndexHtml(html: string): string {
      // SEC-R3-001: zet de meta-CSP **vóór** alle andere <head>-elementen, zodat
      // ook Vite's module-script en stylesheet binnen de meta-CSP vallen. De
      // HTTP-header blijft daarnaast leidend (zie deploy/).
      const meta = `<meta http-equiv="Content-Security-Policy" content="${PRODUCTION_CSP}" />`;
      return html.includes('<head>') ? html.replace('<head>', `<head>\n    ${meta}`) : html;
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [productionCspPlugin(), offlinePlugin()],
  // SEC-R2-003: laat `vite preview` dezelfde hardening-headers sturen, zodat
  // lokaal testen van de productiebuild het echte hostgedrag benadert.
  preview: {
    headers: HARDENING_HEADERS,
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.ts'],
    globals: false,
  },
});
