#!/usr/bin/env python3
"""Prueft das Popup in einem echten Chromium mit geladener Extension.

    python3 -m venv .venv && .venv/bin/pip install websocket-client
    .venv/bin/python tools/verify-popup.py

Abgedeckt:
  1. Sprachauswahl aus navigator.languages (inkl. Rueckfall)
  2. Preset „Eigene": speichern, wiederherstellen, Reset ueberlebt
  3. Bewertungs-Hinweis: Frist, „Spaeter", „Bewerten"
  4. Kurzpause und Fokuszeit: Popup-Zustand und Wirkung auf YouTube

Gegenstueck zu tools/verify.py, das die CSS-Selektoren gegen das echte
YouTube prueft. Beide zusammen decken ab, was beim Umbauen kaputtgehen kann.
"""
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
EID = ''.join(chr(ord('a') + int(c, 16))
              for c in hashlib.sha256(EXT.encode()).hexdigest()[:32])
POPUP = f'chrome-extension://{EID}/popup/popup.html'
WATCH = 'https://www.youtube.com/watch?v=aqz-KE-bpKQ'
CHROME_CANDIDATES = ['/snap/bin/chromium', '/usr/bin/chromium',
                     '/usr/bin/chromium-browser', '/usr/bin/google-chrome']

failures = []


def check(label, ok, detail=''):
    if not ok:
        failures.append(label)
    print(f"  {'ok  ' if ok else 'FAIL'}  {label}{(' — ' + str(detail)) if detail else ''}")


def find_chrome():
    for path in CHROME_CANDIDATES:
        if os.path.exists(path):
            return path
    sys.exit('Kein Chromium/Chrome gefunden.')


class Chrome:
    def __init__(self, port, accept_lang='de-DE,de', width=1280, height=900):
        self.profile = os.path.join(EXT, f'.popup-profile-{port}')
        self.proc = subprocess.Popen([
            find_chrome(), '--headless=new', '--disable-gpu', '--no-sandbox',
            f'--remote-debugging-port={port}', f'--user-data-dir={self.profile}',
            f'--load-extension={EXT}', f'--disable-extensions-except={EXT}',
            f'--accept-lang={accept_lang}', '--remote-allow-origins=*',
            f'--window-size={width},{height}', '--mute-audio', 'about:blank',
        ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        page = None
        for _ in range(60):
            try:
                tabs = json.load(urllib.request.urlopen(f'http://127.0.0.1:{port}/json'))
                page = next(t for t in tabs if t['type'] == 'page')
                break
            except Exception:
                time.sleep(0.5)
        if not page:
            sys.exit('Chromium hat den Debug-Port nicht geoeffnet.')
        self.ws = websocket.create_connection(page['webSocketDebuggerUrl'], timeout=90)
        self.n = 0
        for domain in ('Page', 'Runtime', 'Network'):
            self.send(domain + '.enable')
        # Consent-Dialog (EU) ueberspringen
        for domain in ('.youtube.com', '.google.com'):
            self.send('Network.setCookie', name='SOCS', domain=domain, path='/',
                      secure=True, value='CAESEwgDEgk0ODE3Nzk3MjQaAmRlIAEaBgiA_LyaBg')

    def send(self, method, **params):
        self.n += 1
        self.ws.send(json.dumps({'id': self.n, 'method': method, 'params': params}))
        while True:
            msg = json.loads(self.ws.recv())
            if msg.get('id') == self.n:
                return msg.get('result', {})

    def ev(self, expr):
        r = self.send('Runtime.evaluate', expression=expr,
                      returnByValue=True, awaitPromise=True)
        if 'exceptionDetails' in r:
            return {'JSERROR': str(r['exceptionDetails'])[:200]}
        return r.get('result', {}).get('value')

    def go(self, url, wait=2.5):
        self.send('Page.navigate', url=url)
        time.sleep(wait)

    def close(self):
        self.proc.terminate()
        time.sleep(0.5)
        subprocess.run(['rm', '-rf', self.profile], check=False)


# --- 1. Sprachauswahl -------------------------------------------------------
print('Sprachauswahl (navigator.languages -> Katalog)')
CASES = [
    ('fr-FR,fr', 'fr', 'Focus'),
    ('ja', 'ja', 'フォーカス'),
    ('pt-PT,pt', 'pt_BR', 'Foco'),   # keine pt_PT-Uebersetzung -> pt_BR
    ('de-AT,de', 'de', 'Fokus'),     # Regionalvariante -> Basissprache
    ('sv-SE,sv', 'en', 'Focus'),     # nicht uebersetzt -> Englisch
]
port = 9801
for accept, expected, focus_label in CASES:
    c = Chrome(port, accept)
    port += 1
    c.go(POPUP, 3)
    out = c.ev("""({
      locale: window.TL_I18N.locale,
      rows: document.querySelectorAll('.row').length,
      presets: [...document.querySelectorAll('.presets button')].map(b => b.textContent),
      offen: [...document.querySelectorAll(
          '.row__label,.group__title,.presets button,.timing__label,[data-i18n]')]
        .map(e => e.textContent)
        .filter(x => /^(feature|group|preset|custom|rate|status|break|schedule|colophon|footer)[A-Z]/.test(x))
    })""")
    if not isinstance(out, dict) or 'JSERROR' in out:
        check(accept, False, out)
    else:
        check(f'{accept:12} -> {out["locale"]}', out['locale'] == expected, out['locale'])
        check(f'{accept:12}    vollstaendig uebersetzt',
              out['presets'][1] == focus_label and not out['offen'],
              f'Fokus="{out["presets"][1]}" offen={out["offen"]}')
    c.close()

c = Chrome(9820)

# --- 2. Preset „Eigene" -----------------------------------------------------
print('\nPreset „Eigene"')
c.go(POPUP, 3)
check('„Eigene" ohne gespeicherte Auswahl deaktiviert',
      c.ev("document.querySelector('[data-preset=custom]').disabled") is True)
c.ev("""(() => {
  document.querySelector('[data-key=comments]').click();
  document.querySelector('[data-key=description]').click();
  document.getElementById('custom-save').click();
})()""")
time.sleep(0.6)
saved = c.ev("new Promise(r => chrome.storage.sync.get('_custom', v => r(v._custom)))")
check('Auswahl unter _custom gespeichert',
      isinstance(saved, dict) and saved.get('comments') is False
      and saved.get('description') is True, saved and list(saved)[:3])
c.ev("document.querySelector('[data-preset=fokus]').click()")
time.sleep(0.4)
c.ev("document.querySelector('[data-preset=custom]').click()")
time.sleep(0.4)
restored = c.ev("""({
  comments: document.querySelector('[data-key=comments]').checked,
  description: document.querySelector('[data-key=description]').checked,
  aktiv: document.querySelector('[data-preset=custom]').dataset.active })""")
check('„Eigene" stellt die Auswahl wieder her',
      restored['comments'] is False and restored['description'] is True
      and restored['aktiv'] == 'true', restored)
c.ev("document.getElementById('reset').click()")
time.sleep(0.5)
check('„Standard" laesst _custom und _rate stehen',
      c.ev("""new Promise(r => chrome.storage.sync.get(['_custom','_rate'],
           v => r(!!v._custom && !!v._rate)))""") is True)

# --- 3. Bewertungs-Hinweis --------------------------------------------------
print('\nBewertungs-Hinweis')
check('Direkt nach der Installation ausgeblendet',
      c.ev("document.getElementById('rate').hidden") is True)
state = c.ev("new Promise(r => chrome.storage.sync.get('_rate', v => r(v._rate)))")
days = round((state['nextAt'] - time.time() * 1000) / 86400000) if state else None
check('Erste Erinnerung in ~30 Tagen', days in (29, 30), f'{days} Tage')
c.ev("""new Promise(r => chrome.storage.sync.set(
  {_rate: {rated: false, nextAt: Date.now() - 1000}}, r))""")
c.go(POPUP, 3)
check('Nach Ablauf der Frist sichtbar',
      c.ev("!document.getElementById('rate').hidden") is True)
c.ev("document.getElementById('rate-later').click()")
time.sleep(0.5)
later = c.ev("new Promise(r => chrome.storage.sync.get('_rate', v => r(v._rate)))")
check('„Spaeter" verschiebt um 30 Tage',
      round((later['nextAt'] - time.time() * 1000) / 86400000) in (29, 30))
store_url = c.ev("""new Promise(res => {
  let captured = null;
  chrome.tabs.create = (o) => { captured = o.url; };
  window.close = () => {};
  document.getElementById('rate-link').click();
  setTimeout(() => res(captured), 300);
})""")
check('Bewerten-Link zeigt auf den Chrome Web Store',
      store_url == 'https://chromewebstore.google.com/detail/'
                   'ibabglinmoklbdpplofmoicgbknbejee/reviews', store_url)

# --- 4. Kurzpause -----------------------------------------------------------
print('\nKurzpause')
c.go(POPUP, 3)
c.ev("document.querySelector('.break-btn[data-minutes=\"15\"]').click()")
time.sleep(0.7)
brk = c.ev("""new Promise(r => chrome.storage.sync.get('_break', v => setTimeout(() => r({
  minuten: v._break ? Math.round((v._break.until - Date.now()) / 60000) : None_,
  laufend: !document.getElementById('break-running').hidden,
  status: document.getElementById('count').textContent,
  idle: document.body.dataset.idle }), 200)))""".replace('None_', 'null'))
check('15 Minuten gespeichert', brk['minuten'] == 15, brk['minuten'])
check('Laufend-Zeile ersetzt die Knoepfe', brk['laufend'] is True)
check('Popup meldet Pause', 'Pause' in brk['status'] and brk['idle'] == 'true', brk['status'])

c.go(WATCH, 11)
paused = c.ev("""(() => { const vis = s => [...document.querySelectorAll(s)]
  .filter(e => e.getClientRects().length > 0).length;
  return { aktiv: document.documentElement.classList.contains('tl-active'),
           masthead: vis('ytd-masthead'), related: vis('#secondary') }; })()""")
check('Pause: YouTube unveraendert',
      paused['aktiv'] is False and paused['masthead'] >= 1 and paused['related'] >= 1, paused)

c.go(POPUP, 3)
c.ev("document.getElementById('break-end').click()")
time.sleep(0.6)
check('„Beenden" loescht die Pause',
      c.ev("new Promise(r => chrome.storage.sync.get('_break', v => r(v._break)))") is None)
c.go(WATCH, 11)
check('Filter greifen sofort wieder',
      c.ev("document.documentElement.classList.contains('tl-active')") is True)

# --- 5. Fokuszeit -----------------------------------------------------------
print('\nFokuszeit')
SET_WINDOW = """new Promise(async res => {
  const pad = n => String(n).padStart(2, '0');
  const at = m => { const x = new Date(Date.now() + m*60000);
                    return pad(x.getHours()) + ':' + pad(x.getMinutes()); };
  const set = (el, v) => new Promise(r => {
    el.focus(); el.value = v; el.dispatchEvent(new Event('change'));
    setTimeout(() => { el.blur(); r(); }, 250);
  });
  await set(document.getElementById('schedule-start'), at(FROM));
  await set(document.getElementById('schedule-end'), at(TO));
  if (ENABLE) document.getElementById('schedule-enabled').click();
  setTimeout(res, 300);
})"""

c.go(POPUP, 3)
c.ev(SET_WINDOW.replace('FROM', '60').replace('TO', '120').replace('ENABLE', 'true'))
time.sleep(0.5)
outside = c.ev("""({ status: document.getElementById('count').textContent,
                     idle: document.body.dataset.idle })""")
check('Ausserhalb: Popup meldet es',
      'Fokuszeit' in outside['status'] and outside['idle'] == 'true', outside['status'])
c.go(WATCH, 11)
check('Ausserhalb der Fokuszeit: YouTube unveraendert',
      c.ev("document.documentElement.classList.contains('tl-active')") is False)

c.go(POPUP, 3)
c.ev(SET_WINDOW.replace('FROM', '-60').replace('TO', '60').replace('ENABLE', 'false'))
time.sleep(0.5)
c.go(WATCH, 11)
check('Innerhalb der Fokuszeit: Filter greifen',
      c.ev("document.documentElement.classList.contains('tl-active')") is True)

c.close()
print(f"\n{'Alles gruen.' if not failures else str(len(failures)) + ' FAIL: ' + str(failures)}")
sys.exit(1 if failures else 0)
