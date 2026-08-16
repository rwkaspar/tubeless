/*
 * Tubeless — Zähler für ungefilterte Zeit innerhalb der Fokuszeit.
 *
 * Gezählt wird nur, was der Nutzer selbst an den Filtern vorbeigeschleust hat:
 * Zeit auf YouTube, während die Fokuszeit läuft, Tubeless aber nicht filtert
 * (Kurzpause oder Master-Schalter aus). Normale, gefilterte Nutzung zählt
 * nicht — sonst wäre es ein Nutzungsprotokoll statt einer Rückmeldung.
 *
 * Alles bleibt lokal in chrome.storage.local. Bewusst NICHT storage.sync:
 * Zähler von mehreren Geräten liessen sich nicht sinnvoll zusammenführen, und
 * eine Nutzungshistorie hat auf fremden Geräten nichts verloren. Gespeichert
 * wird ausschliesslich der laufende Tag; beim Datumswechsel faengt es bei
 * null an.
 */
(function (root) {
  'use strict';

  const KEY = 'usage';
  /* Ein Schreibvorgang pro Takt wäre Unfug — im Speicher sammeln und selten
     wegschreiben. Beim Verlassen der Seite wird ausserdem sofort geflusht. */
  const FLUSH_MS = 10000;
  /* Grössere Lücken (Rechner im Standby, Tab lange weg) nicht als Nutzung
     verbuchen — sonst zählt eine Nacht als Konsum. */
  const MAX_GAP_MS = 5000;

  let state = null;      // { date, seconds, wasInside, reported }
  let pendingMs = 0;
  let lastTick = 0;
  let lastFlush = 0;
  let reportShown = false;

  function today() {
    const d = new Date();
    return d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
  }

  function fresh() {
    return { date: today(), seconds: 0, wasInside: null, reported: null };
  }

  function ensureToday() {
    if (!state || state.date !== today()) state = fresh();
  }

  chrome.storage.local.get(KEY, (data) => {
    state = (data && data[KEY]) || fresh();
    ensureToday();
  });

  function flush(force) {
    if (!state) return;
    const now = Date.now();
    if (!force && now - lastFlush < FLUSH_MS) return;
    lastFlush = now;
    if (pendingMs >= 1000) {
      state.seconds += Math.floor(pendingMs / 1000);
      pendingMs %= 1000;
    }
    chrome.storage.local.set({ [KEY]: state });
  }

  /**
   * Zählt nur, was wirklich Konsum ist:
   * - der Tab muss sichtbar sein (kein Hintergrund-Tab),
   * - und entweder hat das Fenster den Fokus (der Nutzer sitzt davor)
   *   oder es läuft ein Video (Ton im Nebenfenster ist auch Konsum).
   *
   * Nur „sichtbar" würde einen offen gelassenen Tab den ganzen Arbeitstag
   * mitzählen; nur „fokussiert" würde ein nebenher laufendes Video übersehen.
   */
  function counting() {
    if (document.visibilityState !== 'visible') return false;
    if (typeof document.hasFocus !== 'function' || document.hasFocus()) return true;
    const video = document.querySelector('.html5-video-player video');
    return !!(video && !video.paused && !video.ended && video.currentTime > 0);
  }

  function showReport(seconds) {
    if (reportShown || document.querySelector('.tl-report')) return;
    reportShown = true;

    const card = document.createElement('div');
    card.className = 'tl-report';

    const title = document.createElement('div');
    title.className = 'tl-report__title';
    title.textContent = root.TL_I18N.t('reportTitle');

    const text = document.createElement('div');
    text.className = 'tl-report__text';
    text.textContent = seconds >= 60
      ? root.TL_I18N.t('reportSpent', [root.TUBELESS.formatDuration(seconds)])
      : root.TL_I18N.t('reportClean');

    const close = document.createElement('button');
    close.className = 'tl-report__close';
    close.type = 'button';
    close.setAttribute('aria-label', root.TL_I18N.t('reportDismiss'));
    close.textContent = '×';
    close.addEventListener('click', () => card.remove());

    card.append(title, text, close);
    (document.body || document.documentElement).appendChild(card);
    setTimeout(() => card.remove(), 20000);
  }

  /**
   * Wird vom Content-Script im Takt aufgerufen.
   * `inside`   — läuft gerade die Fokuszeit?
   * `filtering`— filtert Tubeless gerade?
   */
  function tick(inside, filtering) {
    const now = Date.now();
    const gap = lastTick ? now - lastTick : 0;
    lastTick = now;
    if (!state) return;
    ensureToday();

    if (inside) {
      if (state.wasInside !== state.date) {
        state.wasInside = state.date;
        flush(true);
      }
      // Der eigentliche Zähler: Fokuszeit läuft, Filter aber nicht.
      if (!filtering && counting() && gap > 0 && gap <= MAX_GAP_MS) {
        pendingMs += gap;
      }
      flush(false);
      return;
    }

    // Fokuszeit vorbei — Bilanz einmal am Tag, und nur wenn wir den Nutzer
    // heute überhaupt innerhalb der Fokuszeit gesehen haben.
    if (state.wasInside === state.date && state.reported !== state.date) {
      flush(true);
      state.reported = state.date;
      chrome.storage.local.set({ [KEY]: state });
      showReport(state.seconds);
    }
  }

  for (const event of ['pagehide', 'visibilitychange']) {
    window.addEventListener(event, () => flush(true));
  }

  root.TL_USAGE = { tick, STORAGE_KEY: KEY };
})(typeof window !== 'undefined' ? window : globalThis);
