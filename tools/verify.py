#!/usr/bin/env python3
"""Prueft gegen das echte YouTube, ob Tubeless noch greift.

YouTube benennt seine Custom-Elements gelegentlich um — dann blenden einzelne
Selektoren nichts mehr aus, ohne dass irgendwo ein Fehler auftaucht. Dieses
Skript laedt die Extension in ein headless Chromium, ruft ein paar Seiten auf
und zaehlt, wie viele der Elemente noch sichtbar sind.

    python3 -m venv .venv && .venv/bin/pip install websocket-client
    .venv/bin/python tools/verify.py [--shots]

Alles, was als FAIL gemeldet wird, ist ein Selektor, der nachgezogen werden
muss (src/tubeless.css).
"""
import argparse
import base64
import hashlib
import json
import os
import subprocess
import sys
import time
import urllib.request

try:
    import websocket  # websocket-client
except ImportError:
    sys.exit('Bitte zuerst "pip install websocket-client" ausfuehren.')

EXT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROFILE = os.path.join(EXT, '.verify-profile')
PORT = 9339
CHROME_CANDIDATES = [
    '/snap/bin/chromium', '/usr/bin/chromium', '/usr/bin/chromium-browser',
    '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable',
]

# Zaehl-Ausdruck -> erwartete Anzahl sichtbarer Elemente (0 = ausgeblendet)
CHECKS = [
    ('https://www.youtube.com/', [
        ('Kopfzeile weg', 'ytd-masthead, #masthead-container', 0),
        ('Seitenleiste weg', '#guide, ytd-mini-guide-renderer', 0),
        ('Feed weg', 'ytd-rich-item-renderer', 0),
        ('Shorts-Shelf weg', 'ytd-rich-shelf-renderer[is-shorts], ytd-reel-shelf-renderer', 0),
        ('Filter-Chips weg', 'ytd-feed-filter-chip-bar-renderer', 0),
        ('Platzhalter da', '.tl-notice', 1),
    ]),
    ('https://www.youtube.com/watch?v=aqz-KE-bpKQ', [
        ('Empfehlungen weg', '#secondary, ytd-compact-video-renderer', 0),
        ('Kommentare weg', '#comments', 0),
        ('Like/Teilen weg', '#top-level-buttons-computed, segmented-like-dislike-button-view-model', 0),
        ('Weiter-Button weg', '.ytp-next-button', 0),
        ('Autoplay-Schalter weg', '.ytp-autonav-toggle-button-container', 0),
        ('Player da', '#movie_player', 1),
        ('Titel da', 'ytd-watch-metadata h1', 1),
    ]),
    ('https://www.youtube.com/results?search_query=blender+open+movie', [
        ('Werbung weg', 'ytd-promoted-video-renderer, ytd-ad-slot-renderer, ytd-search-pyv-renderer', 0),
        ('Shorts-Regal weg', 'ytd-reel-shelf-renderer, grid-shelf-view-model', 0),
        ('Ergebnisse da', 'ytd-video-renderer', None),  # None = mindestens eins
    ]),
]


class CDP:
    def __init__(self, ws_url):
        self.ws = websocket.create_connection(ws_url, timeout=90)
        self.n = 0

    def send(self, method, **params):
        self.n += 1
        self.ws.send(json.dumps({'id': self.n, 'method': method, 'params': params}))
        while True:
            msg = json.loads(self.ws.recv())
            if msg.get('id') == self.n:
                if 'error' in msg:
                    raise RuntimeError(f"{method}: {msg['error']}")
                return msg.get('result', {})

    def eval(self, expr):
        r = self.send('Runtime.evaluate', expression=expr, returnByValue=True)
        return r.get('result', {}).get('value')


def find_chrome():
    for path in CHROME_CANDIDATES:
        if os.path.exists(path):
            return path
    sys.exit('Kein Chromium/Chrome gefunden — Pfad in CHROME_CANDIDATES ergaenzen.')


def extension_id(path):
    """Chrome leitet die ID einer entpackten Extension aus dem Pfad ab."""
    digest = hashlib.sha256(path.encode()).hexdigest()[:32]
    return ''.join(chr(ord('a') + int(c, 16)) for c in digest)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--shots', action='store_true', help='Screenshots nach .verify-shots/')
    ap.add_argument('--wait', type=float, default=12, help='Sekunden pro Seite')
    args = ap.parse_args()

    proc = subprocess.Popen([
        find_chrome(), '--headless=new', '--disable-gpu', '--no-sandbox',
        f'--remote-debugging-port={PORT}', f'--user-data-dir={PROFILE}',
        f'--load-extension={EXT}', f'--disable-extensions-except={EXT}',
        '--remote-allow-origins=*', '--window-size=1400,1000', '--mute-audio',
        'about:blank',
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    failures = 0
    try:
        page = None
        for _ in range(60):
            try:
                tabs = json.load(urllib.request.urlopen(f'http://127.0.0.1:{PORT}/json'))
                page = next(t for t in tabs if t['type'] == 'page')
                break
            except Exception:
                time.sleep(0.5)
        if not page:
            sys.exit('Chromium hat den Debug-Port nicht geoeffnet.')

        cdp = CDP(page['webSocketDebuggerUrl'])
        for domain in ('Page', 'Runtime', 'Network'):
            cdp.send(domain + '.enable')

        # Consent-Dialog (EU) ueberspringen
        for domain in ('.youtube.com', '.google.com'):
            cdp.send('Network.setCookie', name='SOCS', domain=domain, path='/',
                     secure=True, value='CAESEwgDEgk0ODE3Nzk3MjQaAmRlIAEaBgiA_LyaBg')
            cdp.send('Network.setCookie', name='CONSENT', value='YES+cb',
                     domain=domain, path='/', secure=True)

        if args.shots:
            os.makedirs(os.path.join(EXT, '.verify-shots'), exist_ok=True)

        print(f'Extension-ID: {extension_id(EXT)}\n')

        for url, checks in CHECKS:
            cdp.send('Page.navigate', url=url)
            time.sleep(args.wait)
            print(url)
            active = cdp.eval("document.documentElement.classList.contains('tl-active')")
            if not active:
                print('  FAIL  Content-Script nicht aktiv')
                failures += 1
            for label, selector, expected in checks:
                count = cdp.eval(
                    "[...document.querySelectorAll(%s)]"
                    ".filter(e => e.getClientRects().length > 0).length"
                    % json.dumps(selector))
                ok = count > 0 if expected is None else count == expected
                failures += 0 if ok else 1
                print(f"  {'ok  ' if ok else 'FAIL'}  {label} (sichtbar: {count})")
            if args.shots:
                name = (url.split('//')[1].replace('/', '_')[:60] or 'home') + '.png'
                data = cdp.send('Page.captureScreenshot', format='png')['data']
                with open(os.path.join(EXT, '.verify-shots', name), 'wb') as fh:
                    fh.write(base64.b64decode(data))
                print(f'  -> .verify-shots/{name}')
            print()

        # Shorts-Umleitung
        cdp.send('Page.navigate', url='https://www.youtube.com/shorts/aqz-KE-bpKQ')
        time.sleep(args.wait)
        path = cdp.eval('location.pathname')
        ok = path == '/watch'
        failures += 0 if ok else 1
        print(f"{'ok  ' if ok else 'FAIL'}  Shorts-Umleitung (Pfad: {path})")
    finally:
        proc.terminate()

    print(f"\n{'Alles gruen.' if not failures else str(failures) + ' Pruefung(en) fehlgeschlagen.'}")
    return 1 if failures else 0


if __name__ == '__main__':
    sys.exit(main())
