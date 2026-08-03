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
    { key: 'skipAds', group: 'behavior', default: true, css: false },
    { key: 'redirectShorts', group: 'behavior', default: true, css: false },
    { key: 'homeNotice', group: 'behavior', default: true, css: false },
    // Opt-in: einzige Features mit Netzwerkzugriff (SponsorBlock, anonymisiert)
    { key: 'sponsorMark', group: 'behavior', default: false, css: false },
    { key: 'sponsorSkip', group: 'behavior', default: false, css: false },
    { key: 'sponsorIntros', group: 'behavior', default: false, css: false }
  ];

  /** Storage-Key, unter dem die selbst gespeicherte Auswahl liegt. */
  const CUSTOM_KEY = '_custom';
  /** Storage-Key des Bewertungs-Hinweises (siehe popup.js). */
  const RATE_KEY = '_rate';
  /**
   * Was „Standard“ nicht anfassen darf. Beides sind Gedächtnis, keine
   * Einstellung: die eigene Auswahl soll einen Reset überleben, und der
   * Bewertungs-Zähler darf sich nicht durch einen Klick auf „Standard“
   * zurücksetzen lassen — sonst fragt die Extension wieder von vorn.
   */
  const KEEP_ON_RESET = [CUSTOM_KEY, RATE_KEY];

  const DEFAULTS = { _enabled: true, [CUSTOM_KEY]: null, [RATE_KEY]: null };
  for (const f of FEATURES) DEFAULTS[f.key] = f.default;

  /*
   * Presets enthalten ausschließlich Filterwerte — niemals _enabled, _custom
   * oder _rate. Würden sie aus DEFAULTS gebaut, schleppten sie diese Schlüssel
   * mit und ein Klick auf ein Preset würde die gespeicherte Auswahl und den
   * Bewertungs-Zähler überschreiben.
   */
  function selectionFromDefaults(overrides) {
    const selection = {};
    for (const f of FEATURES) selection[f.key] = f.default;
    return Object.assign(selection, overrides);
  }

  const PRESETS = {
    fokus: selectionFromDefaults({
      masthead: false,
      search: false,
      logo: false,
      accountMenu: false,
      // Fokus heißt auch: Sponsor-Segmente und Intros werden markiert und
      // übersprungen. Das ist ein bewusster Klick des Nutzers, kein stilles
      // Opt-in — die Auslieferungs-Defaults bleiben aus.
      sponsorMark: true,
      sponsorSkip: true,
      sponsorIntros: true
    }),
    aus: (() => {
      const p = {};
      for (const f of FEATURES) p[f.key] = false;
      return p;
    })()
  };

  /** Nur die Filterwerte — ohne _enabled, _custom und sonstige Metaschlüssel. */
  function selectionOf(settings) {
    const selection = {};
    for (const f of FEATURES) selection[f.key] = settings[f.key] === true;
    return selection;
  }

  /** Stimmen zwei Auswahlen in allen Filtern überein? */
  function sameSelection(a, b) {
    if (!a || !b) return false;
    return FEATURES.every((f) => (a[f.key] === true) === (b[f.key] === true));
  }

  const { t, ready } = root.TL_I18N;
  const upper = (key) => key[0].toUpperCase() + key.slice(1);

  /** Beschriftung eines Filters in der Browsersprache. */
  const label = (key) => t('feature' + upper(key));

  /** Erklaerung eines Filters — leerer String, wenn keine hinterlegt ist. */
  const hint = (key) => {
    const name = 'feature' + upper(key) + 'Hint';
    const message = t(name);
    return message === name ? '' : message;
  };

  /** Titel einer Gruppe in der Browsersprache. */
  const groupLabel = (id) => t('group' + upper(id));

  /** DEFAULTS ohne die Schlüssel, die ein Reset stehen lassen muss. */
  function resetPatch() {
    const patch = Object.assign({}, DEFAULTS);
    for (const key of KEEP_ON_RESET) delete patch[key];
    return patch;
  }

  root.TUBELESS = {
    GROUPS, FEATURES, DEFAULTS, PRESETS, CUSTOM_KEY, RATE_KEY,
    selectionOf, sameSelection, resetPatch,
    t, ready, label, hint, groupLabel
  };
})(typeof window !== 'undefined' ? window : globalThis);
