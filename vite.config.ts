import { defineConfig, type Plugin } from 'vitest/config';

/**
 * Productie-CSP (SEC-002/SEC-003/SEC-004).
 *
 * - Alleen in de build geïnjecteerd, zodat Vite dev-HMR (`ws://`) blijft werken.
 * - `style-src 'self'` zonder `'unsafe-inline'`: de build levert CSS als extern
 *   bestand en de UI zet geen `style`-attributen meer (alleen CSSOM via JS, wat
 *   niet onder CSP valt).
 * - `frame-ancestors` ontbreekt bewust: die directive wordt in een meta-CSP
 *   genegeerd en hoort als HTTP-header op de hostingserver (docs/SECURITY_HEADERS.md).
 */
const PRODUCTION_CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' data: blob:",
  "media-src 'self' data: blob:",
  "font-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
].join('; ');

function productionCspPlugin(): Plugin {
  return {
    name: 'leesavontuur-production-csp',
    apply: 'build',
    transformIndexHtml(html: string): string {
      const meta = `<meta http-equiv="Content-Security-Policy" content="${PRODUCTION_CSP}" />`;
      return html.includes('</head>')
        ? html.replace('</head>', `    ${meta}\n  </head>`)
        : html;
    },
  };
}

export default defineConfig({
  plugins: [productionCspPlugin()],
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.ts'],
    globals: false,
  },
});