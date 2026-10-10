"""Check real PWA update isolation across windows, on a temporary build copy."""
import argparse
from pathlib import Path
from tempfile import TemporaryDirectory
from shutil import copytree
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from threading import Thread
from playwright.sync_api import sync_playwright

parser = argparse.ArgumentParser()
parser.add_argument('--chromium', default='/usr/bin/chromium')
args = parser.parse_args()
root = Path(__file__).resolve().parents[1]
with TemporaryDirectory() as temporary:
    output = Path(temporary) / 'site'
    copytree(root / 'dist', output)
    class Handler(SimpleHTTPRequestHandler):
        def __init__(self, *a, **kw):
            super().__init__(*a, directory=str(output), **kw)
        def end_headers(self):
            self.send_header('Cache-Control', 'no-store')
            super().end_headers()
        def log_message(self, *a):
            pass
    server = ThreadingHTTPServer(('127.0.0.1', 0), Handler)
    Thread(target=server.serve_forever, daemon=True).start()
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(executable_path=args.chromium, args=['--no-sandbox'])
            context = browser.new_context()
            origin = f'http://127.0.0.1:{server.server_port}/'
            page = context.new_page()
            page.goto(origin)
            page.wait_for_function('() => document.documentElement.dataset.offlineReady === "true"')
            page.reload()
            page.wait_for_function('() => navigator.serviceWorker.controller !== null')
            other = context.new_page()
            other.goto(origin)
            other.wait_for_selector('[data-screen="start"]')
            worker = output / 'sw.js'
            worker.write_text(worker.read_text().replace("const CACHE = PREFIX + '", "const CACHE = PREFIX + 'update-smoke-", 1))
            page.evaluate('''async () => {
                window.changed = false;
                navigator.serviceWorker.addEventListener('controllerchange', () => window.changed = true);
                navigator.serviceWorker.addEventListener('message', e => window.updateMessage = e.data.type);
                await (await navigator.serviceWorker.getRegistration()).update();
            }''')
            page.evaluate('''async () => {
                const registration = await navigator.serviceWorker.getRegistration();
                for (let i = 0; i < 300; i++) {
                    if (registration.waiting) { window.pendingWorker = registration.waiting; return; }
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
                throw new Error('Update did not install');
            }''')
            assert not page.evaluate('window.changed'), 'Update activated without parent action'
            page.evaluate('window.pendingWorker.postMessage({type:"PARENT_APPLY_UPDATE"})')
            page.wait_for_function('() => window.updateMessage === "UPDATE_OTHER_WINDOWS"')
            assert not page.evaluate('window.changed'), 'Update replaced another open session'
            other.close()
            page.evaluate('window.pendingWorker.postMessage({type:"PARENT_APPLY_UPDATE"})')
            page.wait_for_function('() => window.changed === true')
            context.set_offline(True)
            page.reload()
            page.wait_for_selector('[data-screen="start"]')
            assert page.evaluate('caches.keys().then(keys => keys.some(k => k.includes("update-smoke-")))')
            browser.close()
            print('PASS: update waits for parent action, protects other windows, and works offline after activation')
    finally:
        server.shutdown()
        server.server_close()
