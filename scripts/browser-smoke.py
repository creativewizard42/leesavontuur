"""Real Chromium smoke: responsive UI, reading, persistence, PWA and audio ranges.
Requires Python Playwright and Chromium. Run after npm run build.
No external services or browser downloads; serves dist on an ephemeral local port.
"""
import argparse
import json
from pathlib import Path
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from threading import Thread
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright

root = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser()
parser.add_argument('--chromium', default='/usr/bin/chromium')
parser.add_argument('--screenshots', type=Path, default=Path('/tmp/leesavontuur-audit'))
args = parser.parse_args()
args.screenshots.mkdir(parents=True, exist_ok=True)
assert (root / 'dist/sw.js').is_file(), 'Run npm run build first'

class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=str(root / 'dist'), **kw)
    def do_GET(self):
        if self.path.startswith('/spel/'):
            self.path = '/' + self.path[len('/spel/'):]
        super().do_GET()
    def end_headers(self):
        self.send_header('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; media-src 'self'; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'")
        self.send_header('X-Content-Type-Options', 'nosniff')
        super().end_headers()
    def log_message(self, *a):
        pass

server = ThreadingHTTPServer(('127.0.0.1', 0), Handler)
Thread(target=server.serve_forever, daemon=True).start()
origin = f'http://127.0.0.1:{server.server_port}'
script = json.loads((root / 'docs/audio/recording-script.json').read_text())
graphemes = [entry['key'].split('.')[1] for entry in script if entry['kind'] == 'grapheme-sound']
mastered = dict(mastery=.95, accuracy=.95, attempts=20, correct=20, avgResponseMs=1000,
    hintsUsed=0, consecutiveCorrect=6, leitnerBox=3, lastSeenSession=4, sessionsSeen=3)
profile = dict(schemaVersion=1, profileId='browser-smoke', avatarIcon='vos', createdAt='2026-10-10T00:00:00.000Z',
    unlockedGraphemes=graphemes, skills={key: mastered for key in ['DE.CVC','ZI.SIMPLE','SW.de','SW.een','SW.het','SW.ze','SW.we','SW.je']},
    items={}, rewards=dict(klankvonkjes=2, vriendjeskaarten=[], leaves=[]),
    settings=dict(audioEnabled=True, reducedMotion=True, highContrast=False, autoRepeatPrompt=False), sessionCount=4)

try:
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=args.chromium, args=['--no-sandbox'])
        for scope in ['/', '/spel/']:
            context = browser.new_context(viewport={'width':390,'height':844}, is_mobile=True, has_touch=True)
            page = context.new_page()
            errors, external = [], []
            page.on('pageerror', lambda error: errors.append(str(error)))
            page.on('request', lambda request: external.append(request.url) if urlparse(request.url).netloc != urlparse(origin).netloc else None)
            page.goto(origin + scope)
            page.wait_for_selector('[data-screen="start"]')
            for width, height in [(320,740),(390,844),(844,390),(1280,900)]:
                page.set_viewport_size({'width':width,'height':height})
                assert not page.evaluate('document.documentElement.scrollWidth > innerWidth'), f'Horizontal overflow at {width}'
            page.set_viewport_size({'width':390,'height':844})
            page.screenshot(path=str(args.screenshots / ('start-after' + ('-subpath' if scope != '/' else '') + '.png')), full_page=True)
            page.locator('[data-action="start"]').click()
            page.wait_for_selector('[data-screen="session"]')
            page.locator('[data-action="home"]').click()
            page.keyboard.press('1')
            assert page.locator('[data-overlay="pause"]').is_visible()
            assert not page.locator('.la-feedback:not(.is-hidden)').count(), 'Keyboard answered under pause dialog'
            page.locator('[data-overlay="pause"] button').nth(1).click()
            page.wait_for_selector('[data-screen="map"]')
            assert page.locator('.la-map-progress svg').bounding_box()['height'] <= 32, 'Oversized map progress icon'
            page.evaluate('(profile) => localStorage.setItem("leesavontuur.save.v1", JSON.stringify(profile))', profile)
            page.evaluate('localStorage.removeItem("leesavontuur.session.v1")')
            page.reload()
            page.screenshot(path=str(args.screenshots / ('map-after' + ('-subpath' if scope != '/' else '') + '.png')), full_page=True)
            page.locator('[data-area="8"]').click()
            page.wait_for_selector('[data-reading="passage"]')
            assert not page.locator('.la-options').is_visible()
            page.keyboard.press('1')
            assert not page.locator('.la-feedback:not(.is-hidden)').count()
            page.screenshot(path=str(args.screenshots / ('reading-after' + ('-subpath' if scope != '/' else '') + '.png')), full_page=True)
            page.locator('[data-action="reading-ready"]').click()
            assert page.locator('.la-reading__question').is_visible()
            assert page.locator('.la-options').is_visible()
            # Reading state and audio survive a normal session interruption.
            page.locator('[data-action="home"]').click()
            page.locator('[data-overlay="pause"] button').nth(1).click()
            page.reload()
            page.locator('[data-area="8"]').click()
            assert page.locator('[data-reading="passage"]').is_visible()
            # Atomic offline snapshot is ready; take control by reloading.
            page.wait_for_function('() => document.documentElement.dataset.offlineReady === "true"', timeout=60000)
            page.reload()
            page.wait_for_function('() => navigator.serviceWorker.controller !== null')
            context.set_offline(True)
            page.reload()
            page.wait_for_selector('[data-screen="map"]')
            page.locator('[data-area="8"]').click()
            page.wait_for_selector('[data-reading="passage"]')
            response = page.evaluate('''async () => {
              const response = await fetch('audio/words/kat.mp3', { headers: { Range: 'bytes=0-1' } });
              return { status: response.status, bytes: (await response.arrayBuffer()).byteLength, range: response.headers.get('Content-Range') };
            }''')
            assert response['status'] == 206 and response['bytes'] == 2 and response['range'].startswith('bytes 0-1/'), response
            played = page.evaluate('''() => new Promise(resolve => {
              const audio = new Audio('audio/words/kat.mp3');
              audio.onended = () => resolve(true);
              audio.onerror = () => resolve(false);
              audio.play().catch(() => resolve(false));
            })''')
            assert played, 'Offline MP3 did not play to completion'
            assert not errors, errors
            assert not external, external
            print(f'PASS {scope}: responsive layouts, reading gate, pause, resume, offline reload, range audio and MP3 playback')
            context.close()
        browser.close()
finally:
    server.shutdown()
    server.server_close()
