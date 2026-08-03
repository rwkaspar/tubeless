/*
 * Tubeless — Sprachauflösung.
 *
 * `chrome.i18n` richtet sich nach der Anzeigesprache von Chrome, die unter Linux
 * an der Systemlocale hängt. Gemeint ist aber die Spracheinstellung des
 * Browsers (chrome://settings/languages) — die steht in `navigator.languages`.
 * Deshalb laden wir die Kataloge aus `_locales/` selbst.
 *
 * Die Kataloge sind dieselben Dateien, die auch Chrome für Name und
 * Beschreibung im Manifest liest — eine einzige Quelle, kein Build-Schritt.
 * Damit das Content-Script sie lesen darf, stehen sie unter
 * `web_accessible_resources` (nur für youtube.com).
 */
(function (root) {
  'use strict';

  // Muss zu den Verzeichnissen unter _locales/ passen.
  const AVAILABLE = [
    'de', 'en', 'es', 'fr', 'it', 'ja', 'nl', 'pl', 'pt_BR', 'ru', 'tr', 'zh_CN'
  ];
  const FALLBACK = 'en';

  const normalize = (tag) => String(tag).replace(/-/g, '_');
  const baseOf = (tag) => normalize(tag).split('_')[0].toLowerCase();

  /**
   * Beste Übereinstimmung zwischen den Wunschsprachen des Browsers und dem,
   * was übersetzt vorliegt. `de-AT` → `de`, `pt-PT` → `pt_BR`, sonst Englisch.
   */
  function pick(preferred) {
    for (const wish of preferred) {
      if (!wish) continue;
      const tag = normalize(wish);
      const exact = AVAILABLE.find((a) => a.toLowerCase() === tag.toLowerCase());
      if (exact) return exact;

      const base = baseOf(tag);
      const sameBase = AVAILABLE.find((a) => baseOf(a) === base);
      if (sameBase) return sameBase;
    }
    return FALLBACK;
  }

  const wishes = []
    .concat(navigator.languages || [], navigator.language || [])
    .filter(Boolean);
  const locale = pick(wishes);

  let primary = null;
  let fallback = null;

  async function load(code) {
    const response = await fetch(
      chrome.runtime.getURL('_locales/' + code + '/messages.json')
    );
    if (!response.ok) throw new Error('HTTP ' + response.status);
    return response.json();
  }

  const ready = (async () => {
    const wanted = [load(locale).catch(() => null)];
    if (locale !== FALLBACK) wanted.push(load(FALLBACK).catch(() => null));
    const [first, second] = await Promise.all(wanted);
    primary = first || second || {};
    fallback = second || first || {};
    return locale;
  })();

  /**
   * Übersetzung nachschlagen. Fehlt der Schlüssel in der gewählten Sprache,
   * greift Englisch; fehlt er auch dort, bleibt der Schlüssel stehen — dann
   * sieht man im Popup sofort, was zu übersetzen ist.
   *
   * `substitutions` füllt Platzhalter wie $COUNT$ in der Reihenfolge $1, $2 …
   */
  function t(key, substitutions) {
    const entry = (primary && primary[key]) || (fallback && fallback[key]);
    if (!entry || !entry.message) return key;

    const values = substitutions == null ? [] : [].concat(substitutions);
    let message = entry.message;

    for (const [name, definition] of Object.entries(entry.placeholders || {})) {
      const index = Number(String(definition.content).replace(/\D/g, '')) - 1;
      message = message.replace(
        new RegExp('\\$' + name + '\\$', 'gi'),
        values[index] == null ? '' : values[index]
      );
    }
    return message.replace(/\$(\d)/g, (match, digit) => {
      const value = values[Number(digit) - 1];
      return value == null ? match : value;
    });
  }

  root.TL_I18N = {
    t,
    ready,
    locale,
    available: AVAILABLE.slice(),
    /** Nur für Diagnose: was der Browser gemeldet hat. */
    wishes
  };
})(typeof window !== 'undefined' ? window : globalThis);
