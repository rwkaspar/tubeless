/*
 * Tubeless — Content-Script.
 * Läuft bei document_start, also bevor YouTube irgendetwas rendert.
 *
 * Ablauf:
 *   1. Klassen sofort aus dem localStorage-Cache setzen (kein Aufblitzen)
 *   2. Echte Einstellungen aus chrome.storage nachladen und korrigieren
 *   3. JS-Features (Autoplay, Shorts-Umleitung, Platzhalter) bei jeder
 *      SPA-Navigation neu anwenden
 */
(() => {
  'use strict';

  const { FEATURES, DEFAULTS, t, ready } = window.TUBELESS;
  let translationsReady = false;
  const CSS_KEYS = FEATURES.filter((f) => f.css !== false).map((f) => f.key);
  const CACHE_KEY = 'tubeless:settings';
  const root = document.documentElement;

  let settings = Object.assign({}, DEFAULTS);

  // --- Persistenz ---------------------------------------------------------

  function readCache() {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  }

  /*
   * In den Cache wandert nur, was dieses Script braucht: _enabled und die
   * Filterwerte. localStorage von youtube.com ist für jedes Seitenskript
   * lesbar — _custom und _rate gehen YouTube nichts an.
   */
  function writeCache(value) {
    const slim = { _enabled: value._enabled !== false };
    for (const f of FEATURES) slim[f.key] = value[f.key] === true;
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(slim));
    } catch (_) {
      /* Speicher voll oder blockiert — egal, ist nur ein Cache */
    }
  }

  // --- Anwenden -----------------------------------------------------------

  function applyClasses() {
    const on = settings._enabled !== false;
    root.classList.toggle('tl-active', on);
    for (const key of CSS_KEYS) {
      root.classList.toggle('tl-' + key, on && settings[key] === true);
    }
  }

  function isEnabled(key) {
    return settings._enabled !== false && settings[key] === true;
  }

  // --- Feature: Shorts umleiten ------------------------------------------

  function redirectShorts() {
    if (!isEnabled('redirectShorts')) return false;
    const match = location.pathname.match(/^\/shorts\/([\w-]+)/);
    if (!match) return false;
    const target = location.origin + '/watch?v=' + match[1];
    location.replace(target);
    return true;
  }

  // --- Feature: Autoplay aus ---------------------------------------------

  function disableAutoplay() {
    if (!isEnabled('disableAutoplay')) return;

    // YouTube merkt sich den Zustand im localStorage — direkt setzen, damit
    // schon der erste Start ohne Autoplay läuft.
    try {
      const existing = localStorage.getItem('yt-player-autonavstate');
      const parsed = existing ? JSON.parse(existing) : null;
      if (!parsed || parsed.data !== '0') {
        localStorage.setItem(
          'yt-player-autonavstate',
          JSON.stringify({ data: '0', creation: 0, expiration: 4102444800000 })
        );
      }
    } catch (_) {
      /* ignorieren */
    }

    // Und zur Sicherheit den sichtbaren Schalter umlegen, falls er an ist.
    const toggle = document.querySelector('.ytp-autonav-toggle-button');
    if (toggle && toggle.getAttribute('aria-checked') === 'true') {
      toggle.click();
    }
  }

  // --- Feature: Werbung überspringen --------------------------------------

  /*
   * Hier wird nichts blockiert — es wird geklickt. Sobald der
   * „Überspringen“-Button auftaucht, drücken wir ihn; bei unüberspringbaren
   * Anzeigen springen wir ans Ende des Anzeigen-Clips, was YouTube genauso
   * behandelt wie durchgesehene Werbung. Damit bleibt der Player im Reinen mit
   * sich selbst und es gibt keinen Streit mit YouTubes Adblock-Erkennung.
   */
  /*
   * Bewusst NICHT dabei: .ytp-ad-survey-answer-button. Den zu klicken würde
   * die Umfrage nicht überspringen, sondern im Namen des Nutzers beantworten.
   */
  const SKIP_BUTTONS = [
    '.ytp-skip-ad-button',
    '.ytp-ad-skip-button',
    '.ytp-ad-skip-button-modern',
    '.ytp-ad-skip-button-slot button'
  ].join(', ');

  function skipAds() {
    if (!isEnabled('skipAds')) return;

    const player = document.querySelector('.html5-video-player');
    if (!player || !player.classList.contains('ad-showing')) return;

    const button = document.querySelector(SKIP_BUTTONS);
    if (button && button.offsetParent !== null) {
      button.click();
      return;
    }

    // Kein Skip-Button: ans Ende der Anzeige springen.
    const video = player.querySelector('video');
    if (video && Number.isFinite(video.duration) && video.duration > 0) {
      if (video.currentTime < video.duration - 0.15) {
        video.currentTime = video.duration;
      }
      if (video.paused) video.play().catch(() => {});
    }
  }

  // --- Feature: Platzhalter auf leerer Startseite -------------------------

  function updateHomeNotice() {
    const wanted =
      isEnabled('homeNotice') &&
      isEnabled('homeFeed') &&
      (location.pathname === '/' || location.pathname === '/feed/explore');

    const existing = document.querySelector('.tl-notice');
    if (!wanted) {
      if (existing) existing.remove();
      return;
    }
    // Ohne geladene Kataloge stünde hier der Schlüsselname — dann lieber warten.
    if (existing || !document.body || !translationsReady) return;

    const notice = document.createElement('div');
    notice.className = 'tl-notice';
    for (const [cls, message] of [
      ['tl-notice__title', 'noticeTitle'],
      ['tl-notice__sub', 'noticeSub']
    ]) {
      const line = document.createElement('div');
      line.className = cls;
      line.textContent = t(message);
      notice.appendChild(line);
    }
    document.body.appendChild(notice);
  }

  // --- Zusammenspiel bei Navigation ---------------------------------------

  function sponsorTick() {
    window.TL_SPONSOR.tick(
      isEnabled('sponsorMark'),
      isEnabled('sponsorSkip'),
      isEnabled('sponsorIntros')
    );
  }

  let pendingFrame = 0;
  function applyBehaviors() {
    if (redirectShorts()) return;
    disableAutoplay();
    skipAds();
    sponsorTick();
    updateHomeNotice();
  }

  function scheduleBehaviors() {
    if (pendingFrame) return;
    pendingFrame = requestAnimationFrame(() => {
      pendingFrame = 0;
      applyBehaviors();
    });
  }

  function apply() {
    applyClasses();
    applyBehaviors();
  }

  // --- Start --------------------------------------------------------------

  const cached = readCache();
  if (cached) settings = Object.assign({}, DEFAULTS, cached);
  applyClasses();
  redirectShorts();

  chrome.storage.sync.get(DEFAULTS, (stored) => {
    if (chrome.runtime.lastError) return;
    settings = Object.assign({}, DEFAULTS, stored);
    writeCache(settings);
    apply();
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'sync') return;
    for (const [key, { newValue }] of Object.entries(changes)) {
      settings[key] = newValue;
    }
    writeCache(settings);
    apply();
  });

  // YouTube ist eine SPA: eigene Navigations-Events abgreifen …
  for (const evt of ['yt-navigate-finish', 'yt-page-data-updated', 'yt-player-updated']) {
    document.addEventListener(evt, scheduleBehaviors, true);
  }
  // … und als Netz darunter der klassische History-Wechsel.
  window.addEventListener('popstate', scheduleBehaviors);
  document.addEventListener('DOMContentLoaded', apply);
  window.addEventListener('load', scheduleBehaviors);

  // Der Autoplay-Schalter wird oft erst spät nachgereicht.
  const observer = new MutationObserver(() => scheduleBehaviors());
  const startObserving = () => observer.observe(document.body, { childList: true, subtree: false });
  if (document.body) startObserving();
  else document.addEventListener('DOMContentLoaded', startObserving, { once: true });

  // Sobald die Übersetzungen da sind, den Platzhalter nachziehen.
  ready.then(() => {
    translationsReady = true;
    updateHomeNotice();
  });

  /*
   * Werbung taucht mitten in der Wiedergabe auf, ohne Navigation und ohne
   * Änderung an <body> — davon bekommen die Handler oben nichts mit. Ein
   * kurzer Takt ist hier ehrlicher als ein MutationObserver über den halben
   * Player: eine Klassenabfrage alle 400 ms kostet nichts und greift auch,
   * wenn YouTube seine Ad-Elemente wieder umbaut.
   */
  setInterval(() => {
    skipAds();
    sponsorTick();
  }, 400);
})();
