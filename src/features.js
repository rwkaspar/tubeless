/*
 * Tubeless — zentrale Feature-Definition.
 * Wird sowohl vom Content-Script als auch vom Popup geladen (klassisches Script,
 * kein Modul, damit es als erstes content_script laufen kann).
 *
 * key      -> Storage-Key + CSS-Klasse `tl-<key>` auf <html>
 * css      -> false, wenn das Feature per JS statt per Stylesheet umgesetzt wird
 */
(function (root) {
  'use strict';

  const GROUPS = [
    { id: 'chrome', label: 'Kopfzeile & Navigation' },
    { id: 'feeds', label: 'Startseite & Feeds' },
    { id: 'watch', label: 'Videoseite' },
    { id: 'player', label: 'Player' },
    { id: 'global', label: 'Überall' },
    { id: 'behavior', label: 'Verhalten' }
  ];

  // hidden: true  == Element wird ausgeblendet (Ablenkung weg)
  const FEATURES = [
    // --- Kopfzeile & Navigation -------------------------------------------
    { key: 'masthead', group: 'chrome', label: 'Kopfzeile komplett', hint: 'Die gesamte obere Leiste inkl. Suche', default: true },
    { key: 'search', group: 'chrome', label: 'Suchleiste', hint: 'Suchfeld in der Kopfzeile', default: true },
    { key: 'logo', group: 'chrome', label: 'YouTube-Logo', default: true },
    { key: 'notifications', group: 'chrome', label: 'Glocke / Benachrichtigungen', default: true },
    { key: 'createButton', group: 'chrome', label: 'Erstellen-Button', default: true },
    { key: 'accountMenu', group: 'chrome', label: 'Konto-Avatar', default: true },
    { key: 'voiceSearch', group: 'chrome', label: 'Sprachsuche', default: true },
    { key: 'sidebar', group: 'chrome', label: 'Seitenleiste', hint: 'Guide inkl. Abos, Verlauf, Explore', default: true },
    { key: 'miniSidebar', group: 'chrome', label: 'Mini-Seitenleiste', hint: 'Die schmale Icon-Leiste links', default: true },

    // --- Startseite & Feeds ------------------------------------------------
    { key: 'homeFeed', group: 'feeds', label: 'Startseiten-Feed', hint: 'Empfehlungsraster auf youtube.com', default: true },
    { key: 'filterChips', group: 'feeds', label: 'Filter-Chips', hint: '„Alle / Gaming / Musik …“-Leiste', default: true },
    { key: 'shorts', group: 'feeds', label: 'Shorts', hint: 'Shelfs, Grid-Items, Menüeintrag', default: true },
    { key: 'trending', group: 'feeds', label: 'Trends & Explore', default: true },
    { key: 'searchAds', group: 'feeds', label: 'Promoted / Werbe-Einblendungen', default: true },

    // --- Videoseite --------------------------------------------------------
    { key: 'related', group: 'watch', label: 'Empfohlene Videos', hint: 'Rechte Spalte / „Als Nächstes“', default: true },
    { key: 'comments', group: 'watch', label: 'Kommentare', default: true },
    { key: 'liveChat', group: 'watch', label: 'Live-Chat', default: true },
    { key: 'playlistPanel', group: 'watch', label: 'Playlist-Panel', default: true },
    { key: 'merch', group: 'watch', label: 'Merch, Tickets, Spenden', default: true },
    { key: 'engagement', group: 'watch', label: 'Like / Teilen / Speichern', default: true },
    { key: 'description', group: 'watch', label: 'Videobeschreibung', default: false },
    { key: 'channelInfo', group: 'watch', label: 'Kanal & Abonnieren', default: false },
    { key: 'videoTitle', group: 'watch', label: 'Videotitel', default: false },

    // --- Player ------------------------------------------------------------
    { key: 'endScreen', group: 'player', label: 'Endcards & Video-Wand', hint: 'Kacheln am Videoende', default: true },
    { key: 'pauseOverlay', group: 'player', label: 'Pause-Overlay', hint: '„Weitere Videos“ beim Pausieren', default: true },
    { key: 'infoCards', group: 'player', label: 'Infokarten & Annotationen', default: true },
    { key: 'heatmap', group: 'player', label: 'Heatmap („Meistgesehen“)', default: true },
    { key: 'autonavToggle', group: 'player', label: 'Autoplay-Schalter', default: true },
    { key: 'nextButton', group: 'player', label: 'Weiter-Button', default: true },
    { key: 'miniplayerButton', group: 'player', label: 'Miniplayer-Button', default: true },
    { key: 'ambientMode', group: 'player', label: 'Ambient-Modus', hint: 'Farbschimmer hinter dem Player', default: true },

    // --- Überall -----------------------------------------------------------
    { key: 'notificationBadges', group: 'global', label: 'Rote Zähler-Badges', default: true },
    { key: 'thumbnails', group: 'global', label: 'Vorschaubilder', hint: 'Thumbnails werden neutral grau', default: false },
    { key: 'viewCounts', group: 'global', label: 'Aufrufe & Zahlen', default: false },
    { key: 'hoverPreview', group: 'global', label: 'Hover-Vorschau', hint: 'Video-Autoplay beim Drüberfahren', default: true },

    // --- Verhalten (JS) ----------------------------------------------------
    { key: 'disableAutoplay', group: 'behavior', label: 'Autoplay abschalten', hint: 'Schaltet „Automatisch abspielen“ dauerhaft aus', default: true, css: false },
    { key: 'redirectShorts', group: 'behavior', label: 'Shorts umleiten', hint: '/shorts/… öffnet als normales Video', default: true, css: false },
    { key: 'homeNotice', group: 'behavior', label: 'Hinweis auf leerer Startseite', hint: 'Zeigt statt des Feeds einen ruhigen Platzhalter', default: true, css: false }
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

  root.TUBELESS = { GROUPS, FEATURES, DEFAULTS, PRESETS };
})(typeof window !== 'undefined' ? window : globalThis);
