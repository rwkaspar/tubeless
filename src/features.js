/*
 * Tubeless — zentrale Feature-Definition.
 * Wird sowohl vom Content-Script als auch vom Popup geladen (klassisches Script,
 * kein Modul, damit es als erstes content_script laufen kann).
 *
 * key      -> Storage-Key + CSS-Klasse `tl-<key>` auf <html>
 * css      -> false, wenn das Feature per JS statt per Stylesheet umgesetzt wird
 *
 * Beschriftungen stehen nicht hier, sondern in _locales/<sprache>/messages.json
 * unter `feature<Key>` und optional `feature<Key>Hint`. `label()` und `hint()`
 * loesen sie in der Sprache des Browsers auf.
 */
(function (root) {
  'use strict';

  const GROUPS = [
    { id: 'chrome' },
    { id: 'feeds' },
    { id: 'watch' },
    { id: 'player' },
    { id: 'global' },
    { id: 'behavior' }
  ];

  // hidden: true  == Element wird ausgeblendet (Ablenkung weg)
  const FEATURES = [
    // --- Kopfzeile & Navigation -------------------------------------------
    { key: 'masthead', group: 'chrome', default: true },
    { key: 'search', group: 'chrome', default: true },
    { key: 'logo', group: 'chrome', default: true },
    { key: 'notifications', group: 'chrome', default: true },
    { key: 'createButton', group: 'chrome', default: true },
    { key: 'accountMenu', group: 'chrome', default: true },
    { key: 'voiceSearch', group: 'chrome', default: true },
    { key: 'sidebar', group: 'chrome', default: true },
    { key: 'miniSidebar', group: 'chrome', default: true },

    // --- Startseite & Feeds ------------------------------------------------
    { key: 'homeFeed', group: 'feeds', default: true },
    { key: 'filterChips', group: 'feeds', default: true },
    { key: 'shorts', group: 'feeds', default: true },
    { key: 'trending', group: 'feeds', default: true },
    { key: 'searchAds', group: 'feeds', default: true },

    // --- Videoseite --------------------------------------------------------
    { key: 'related', group: 'watch', default: true },
    { key: 'comments', group: 'watch', default: true },
    { key: 'liveChat', group: 'watch', default: true },
    { key: 'playlistPanel', group: 'watch', default: true },
    { key: 'merch', group: 'watch', default: true },
    { key: 'engagement', group: 'watch', default: true },
    { key: 'description', group: 'watch', default: false },
    { key: 'channelInfo', group: 'watch', default: false },
    { key: 'videoTitle', group: 'watch', default: false },

    // --- Player ------------------------------------------------------------
    { key: 'endScreen', group: 'player', default: true },
    { key: 'pauseOverlay', group: 'player', default: true },
    { key: 'infoCards', group: 'player', default: true },
    { key: 'heatmap', group: 'player', default: true },
    { key: 'autonavToggle', group: 'player', default: true },
    { key: 'nextButton', group: 'player', default: true },
    { key: 'miniplayerButton', group: 'player', default: true },
    { key: 'ambientMode', group: 'player', default: true },

    // --- Überall -----------------------------------------------------------
    { key: 'notificationBadges', group: 'global', default: true },
    { key: 'thumbnails', group: 'global', default: false },
    { key: 'viewCounts', group: 'global', default: false },
    { key: 'hoverPreview', group: 'global', default: true },

    // --- Verhalten (JS) ----------------------------------------------------
    { key: 'disableAutoplay', group: 'behavior', default: true, css: false },
    { key: 'redirectShorts', group: 'behavior', default: true, css: false },
    { key: 'homeNotice', group: 'behavior', default: true, css: false }
  ];

  const DEFAULTS = { _enabled: true };
  for (const f of FEATURES) DEFAULTS[f.key] = f.default;

  const PRESETS = {
    radikal: (() => {
      const p = { _enabled: true };
      for (const f of FEATURES) p[f.key] = true;
      return p;
    })(),
    fokus: Object.assign({}, DEFAULTS, {
      masthead: false,
      search: false,
      logo: false,
      accountMenu: false
    }),
    aus: (() => {
      const p = { _enabled: true };
      for (const f of FEATURES) p[f.key] = false;
      return p;
    })()
  };

  /** Uebersetzung nachschlagen; fehlt sie, bleibt der Schluessel sichtbar. */
  function t(name, substitutions) {
    const message = chrome.i18n.getMessage(name, substitutions);
    return message || name;
  }

  const upper = (key) => key[0].toUpperCase() + key.slice(1);

  /** Beschriftung eines Filters in der Browsersprache. */
  const label = (key) => t('feature' + upper(key));

  /** Erklaerung eines Filters — leerer String, wenn keine hinterlegt ist. */
  const hint = (key) => chrome.i18n.getMessage('feature' + upper(key) + 'Hint');

  /** Titel einer Gruppe in der Browsersprache. */
  const groupLabel = (id) => t('group' + upper(id));

  root.TUBELESS = { GROUPS, FEATURES, DEFAULTS, PRESETS, t, label, hint, groupLabel };
})(typeof window !== 'undefined' ? window : globalThis);
