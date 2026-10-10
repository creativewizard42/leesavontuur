import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import type { Plugin } from 'vite';

/** Generate an atomic, versioned offline snapshot from the actual build. */
export function offlinePlugin(): Plugin {
  let output = 'dist';
  return {
    name: 'leesavontuur-offline',
    apply: 'build',
    configResolved(config) { output = config.build.outDir; },
    closeBundle() {
      function walk(dir: string): string[] {
        return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
          const path = join(dir, entry.name);
          return entry.isDirectory() ? walk(path) : [path];
        });
      }
      const files = walk(output).filter(path => !['sw.js', '_headers'].includes(relative(output, path))).sort();
      const hash = createHash('sha256');
      for (const path of files) { hash.update(relative(output, path)); hash.update(readFileSync(path)); }
      const version = hash.digest('hex').slice(0, 16);
      const paths = files.map(path => relative(output, path).split('\\').join('/'));
      writeFileSync(join(output, 'sw.js'), `/* Generated offline snapshot ${version}. */
const PREFIX = 'leesavontuur:' + self.registration.scope + '|';
const CACHE = PREFIX + '${version}';
const FILES = ${JSON.stringify(paths)};
const url = path => new URL(path, self.registration.scope).href;
self.addEventListener('message', event => {
  if (event.data?.type !== 'PARENT_APPLY_UPDATE') return;
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
    const open = clients.filter(client => client.url.startsWith(self.registration.scope));
    if (open.length > 1) { event.source?.postMessage({ type: 'UPDATE_OTHER_WINDOWS' }); return; }
    return self.skipWaiting();
  }));
});
self.addEventListener('install', event => {
  // No skipWaiting: never replace the running child's version mid-session.
  event.waitUntil(caches.open(CACHE).then(async cache => {
    try { await cache.addAll(FILES.map(url)); }
    catch (error) { await caches.delete(CACHE); throw error; }
  }));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(
    keys.filter(key => key.startsWith(PREFIX) && key !== CACHE).map(key => caches.delete(key))
  )));
});
self.addEventListener('fetch', event => {
  const request = event.request;
  const target = new URL(request.url);
  if (request.method !== 'GET' || target.origin !== self.location.origin ||
      !target.href.startsWith(self.registration.scope)) return;
  // Unknown paths (including missing MP3s) must keep their real HTTP outcome.
  const isHome = request.mode === 'navigate' &&
    (target.pathname === new URL(self.registration.scope).pathname || target.href === url('index.html'));
  if (!isHome && !FILES.some(path => target.href === url(path))) return;
  event.respondWith(caches.open(CACHE).then(async cache => {
    const response = await cache.match(isHome ? url('index.html') : target.href);
    if (!response) return fetch(request);
    const range = request.headers.get('range');
    if (!range) return response;
    // Safari requests byte ranges for audio, including while offline.
    const match = /^bytes=(\\d*)-(\\d*)$/.exec(range);
    const body = await response.arrayBuffer();
    const length = body.byteLength;
    if (!match || (!match[1] && !match[2])) return new Response(null, { status: 416,
      headers: { 'Content-Range': 'bytes */' + length } });
    const start = match[1] ? Number(match[1]) : Math.max(0, length - Number(match[2]));
    const end = match[1] ? Math.min(length - 1, match[2] ? Number(match[2]) : length - 1) : length - 1;
    if (start > end || start >= length) return new Response(null, { status: 416,
      headers: { 'Content-Range': 'bytes */' + length } });
    const headers = new Headers(response.headers);
    headers.delete('Content-Encoding');
    headers.set('Content-Range', 'bytes ' + start + '-' + end + '/' + length);
    headers.set('Content-Length', String(end - start + 1));
    headers.set('Accept-Ranges', 'bytes');
    return new Response(body.slice(start, end + 1), { status: 206, headers });
  }));
});
`);
    },
  };
}
