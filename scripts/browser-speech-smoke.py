"""Complete a fresh session with real MP3 ended events at accelerated test speed.
This exercises controls and progression, never pronunciation quality.
"""
import argparse
import json
from pathlib import Path
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from threading import Thread
from playwright.sync_api import sync_playwright

parser = argparse.ArgumentParser()
parser.add_argument('--chromium', default='/usr/bin/chromium')
args = parser.parse_args()
root = Path(__file__).resolve().parents[1]
class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=str(root / 'dist'), **kw)
    def log_message(self, *a):
        pass
server = ThreadingHTTPServer(('127.0.0.1', 0), Handler)
Thread(target=server.serve_forever, daemon=True).start()
try:
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=args.chromium, args=['--no-sandbox'])
        context = browser.new_context()
        context.add_init_script('''
          window.audioStarts = [];
          const original = HTMLMediaElement.prototype.play;
          HTMLMediaElement.prototype.play = function() {
            this.playbackRate = 4;
            window.audioStarts.push(this.src);
            return original.call(this);
          };
        ''')
        page = context.new_page()
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.goto(f'http://127.0.0.1:{server.server_port}/')
        page.locator('[data-action="start"]').click()
        page.wait_for_selector('[data-screen="session"]')
        count = 0
        while page.locator('[data-screen="session"]').count() and count < 250:
            count += 1
            intro = page.locator('[data-action="intro-next"]')
            if intro.count():
                intro.click()
                continue
            saved = json.loads(page.evaluate('localStorage.getItem("leesavontuur.session.v1")'))
            item = saved['sections'][saved['sectionIndex']]['items'][saved['itemIndex']]
            if item['kind'] != 'beloning':
                target = page.locator('[data-option-id=' + json.dumps(item['targetId']) + ']')
                target.click(timeout=20000)
                page.locator('[data-action="next"]').click(timeout=20000)
            else:
                page.locator('[data-action="next"]').click()
            assert not page.locator('[data-audio-fallback]').count(), 'Missing audio blocks this session'
            if count % 10 == 0:
                print(f'{count} real-browser activities completed', flush=True)
        assert count < 250, 'Session did not finish'
        assert page.locator('[data-screen="reward"]').count(), 'No successful session ending'
        page.locator('[data-action="reward-next"]').click()
        page.wait_for_selector('[data-screen="map"]')
        saved = json.loads(page.evaluate('localStorage.getItem("leesavontuur.save.v1")'))
        assert saved['sessionCount'] == 1
        page.goto(f'http://127.0.0.1:{server.server_port}/audio-review.html')
        assert page.locator('audio').count() == 82
        page.locator('h1').click()
        page.locator('audio').nth(0).evaluate('(media) => media.play()')
        page.locator('audio').nth(2).evaluate('(media) => media.play()')
        assert page.locator('audio').nth(0).evaluate('(media) => media.paused'), 'Review clips overlap'
        page.locator('audio').nth(2).evaluate('media => media.ended ? Promise.resolve() : new Promise(resolve => media.addEventListener("ended", resolve, { once: true }))')
        assert not errors, errors
        print(f'PASS: fresh session completed ({count} steps), real audio ended events, no blocked clips, saved progress; 82 adult-review clips and single playback. Playback accelerated 4x for control testing.', flush=True)
        browser.close()
finally:
    server.shutdown()
    server.server_close()
