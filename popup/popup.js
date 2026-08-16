/* Tubeless — Popup: Presets, Einzelschalter und eine kleine Suche als
   Ersatz für die ausgeblendete YouTube-Kopfzeile.

   Alle Texte kommen aus _locales/<sprache>/messages.json — statische über
   data-i18n-Attribute im HTML, dynamische über TUBELESS.t()/label()/hint().
   Gerendert wird erst, wenn die Kataloge geladen sind. */
(() => {
  'use strict';

  const {
    GROUPS, FEATURES, DEFAULTS, PRESETS,
    CUSTOM_KEY, RATE_KEY, BREAK_KEY, SCHEDULE_KEY,
    selectionOf, sameSelection, resetPatch, isActive, inactiveReason, parseTime,
    ready, t, label, hint, groupLabel
  } = window.TUBELESS;

  const els = {
    master: document.getElementById('master'),
    groups: document.getElementById('groups'),
    count: document.getElementById('count'),
    reset: document.getElementById('reset'),
    customSave: document.getElementById('custom-save'),
    rate: document.getElementById('rate'),
    rateYes: document.getElementById('rate-yes'),
    rateLater: document.getElementById('rate-later'),
    searchForm: document.getElementById('search-form'),
    searchInput: document.getElementById('search-input'),
    breakIdle: document.getElementById('break-idle'),
    breakRunning: document.getElementById('break-running'),
    breakRemaining: document.getElementById('break-remaining'),
    breakEnd: document.getElementById('break-end'),
    breakCustom: document.getElementById('break-custom'),
    scheduleEnabled: document.getElementById('schedule-enabled'),
    scheduleStart: document.getElementById('schedule-start'),
    scheduleEnd: document.getElementById('schedule-end')
  };

  let settings = Object.assign({}, DEFAULTS);
  const inputs = new Map();

  /*
   * Bewertungs-Hinweis: taucht frühestens 30 Tage nach der Installation auf und
   * danach höchstens alle 30 Tage. „Später“ verschiebt um dieselbe Frist.
   *
   * Ob wirklich bewertet wurde, kann eine Extension nicht erfahren — Chrome
   * verrät das nicht. Wer auf „Bewerten“ klickt, gilt deshalb als erledigt und
   * wird nicht wieder gefragt, auch wenn er den Store gleich wieder zumacht.
   */
  const RATE_INTERVAL = 30 * 24 * 60 * 60 * 1000;
  // Firefox-Build erkennt man am Protokoll der eigenen Ressourcen. Der
  // AMO-Slug ist NICHT „tubeless“ — den hat ein fremdes Add-on
  // (tubeless@steve.scot); AMO hat uns tubeless-distractionfree-yt vergeben.
  // Die Chrome-Store-ID ist fest verdrahtet: chrome.runtime.id stimmt nur für
  // die Store-Installation — entpackte Kopien und das signierte .crx haben
  // eigene IDs und liefen damit auf eine leere Store-Seite.
  const reviewUrl = () =>
    chrome.runtime.getURL('').startsWith('moz-extension:')
      ? 'https://addons.mozilla.org/firefox/addon/tubeless-distractionfree-yt/reviews/'
      : 'https://chromewebstore.google.com/detail/ibabglinmoklbdpplofmoicgbknbejee/reviews';

  // --- Aufbau -------------------------------------------------------------

  function translateStatic() {
    for (const [attribute, apply] of [
      ['data-i18n', (el, text) => (el.textContent = text)],
      ['data-i18n-placeholder', (el, text) => (el.placeholder = text)],
      ['data-i18n-aria-label', (el, text) => el.setAttribute('aria-label', text)]
    ]) {
      for (const el of document.querySelectorAll('[' + attribute + ']')) {
        apply(el, t(el.getAttribute(attribute)));
      }
    }
  }

  function labelBreakButtons() {
    for (const button of document.querySelectorAll('.break-btn')) {
      button.textContent = t('breakMinutes', [button.dataset.minutes]);
    }
  }

  function buildRows() {
    for (const group of GROUPS) {
      const features = FEATURES.filter((f) => f.group === group.id);
      if (!features.length) continue;

      const section = document.createElement('section');
      section.className = 'group';

      const title = document.createElement('h2');
      title.className = 'group__title';
      title.textContent = groupLabel(group.id);
      section.appendChild(title);

      for (const feature of features) {
        const row = document.createElement('label');
        row.className = 'row';

        const input = document.createElement('input');
        input.type = 'checkbox';
        input.dataset.key = feature.key;
        input.addEventListener('change', () => {
          save({ [feature.key]: input.checked });
        });
        inputs.set(feature.key, input);

        const text = document.createElement('span');
        text.className = 'row__text';

        const name = document.createElement('span');
        name.className = 'row__label';
        name.textContent = label(feature.key);
        text.appendChild(name);

        const explanation = hint(feature.key);
        if (explanation) {
          const el = document.createElement('span');
          el.className = 'row__hint';
          el.textContent = explanation;
          text.appendChild(el);
        }

        row.append(input, text);
        section.appendChild(row);
      }

      els.groups.appendChild(section);
    }
  }

  // --- Zustand ------------------------------------------------------------

  /** mm:ss für die Restzeit der Pause. */
  function formatRemaining(ms) {
    const total = Math.max(0, Math.ceil(ms / 1000));
    const minutes = Math.floor(total / 60);
    const seconds = total % 60;
    return minutes + ':' + String(seconds).padStart(2, '0');
  }

  function renderTiming() {
    const state = settings[BREAK_KEY];
    const left = state && typeof state.until === 'number' ? state.until - Date.now() : 0;
    const running = left > 0;

    els.breakIdle.hidden = running;
    els.breakRunning.hidden = !running;
    if (running) {
      els.breakRemaining.textContent = t('breakRunning', [formatRemaining(left)]);
    }

    const schedule = settings[SCHEDULE_KEY] || DEFAULTS[SCHEDULE_KEY];
    els.scheduleEnabled.checked = schedule.enabled === true;
    // Nicht überschreiben, während der Nutzer gerade tippt
    if (document.activeElement !== els.scheduleStart) els.scheduleStart.value = schedule.start;
    if (document.activeElement !== els.scheduleEnd) els.scheduleEnd.value = schedule.end;
  }

  function render() {
    const on = settings._enabled !== false;
    const active = isActive(settings);
    els.master.checked = on;
    document.body.dataset.off = String(!on);
    // Pause oder Fokuszeit machen die Filter genauso wirkungslos wie der
    // Master-Schalter — das muss man dem Popup ansehen.
    document.body.dataset.idle = String(!active);
    renderTiming();

    let hidden = 0;
    for (const feature of FEATURES) {
      const input = inputs.get(feature.key);
      input.checked = settings[feature.key] === true;
      if (input.checked) hidden++;
    }

    const reason = inactiveReason(settings);
    els.count.textContent =
      reason === 'paused' ? t('statusPaused')
      : reason === 'break' ? t('statusBreak')
      : reason === 'schedule' ? t('statusOutsideSchedule')
      : t('statusFiltered', [String(hidden), String(FEATURES.length)]);

    const custom = settings[CUSTOM_KEY];
    const current = selectionOf(settings);

    for (const button of document.querySelectorAll('.presets button')) {
      const name = button.dataset.preset;
      const preset = name === 'custom' ? custom : PRESETS[name];
      button.dataset.active = String(sameSelection(current, preset));
      // „Eigene" ohne gespeicherte Auswahl gibt es noch nichts anzuwenden.
      if (name === 'custom') {
        button.disabled = !custom;
        button.title = custom ? '' : t('presetCustomEmpty');
      }
    }

    // Speichern anbieten, solange die aktuelle Auswahl nicht die gespeicherte ist.
    const savable = active && !sameSelection(current, custom);
    els.customSave.hidden = !savable;
    els.customSave.textContent = custom ? t('customUpdate') : t('customSave');

    const rate = settings[RATE_KEY];
    els.rate.hidden = !rate || rate.rated === true || Date.now() < rate.nextAt;
  }

  function save(patch) {
    Object.assign(settings, patch);
    chrome.storage.sync.set(patch);
    render();
  }

  // --- Bedienung ----------------------------------------------------------

  function wire() {
    els.master.addEventListener('change', () => {
      const patch = { _enabled: els.master.checked };
      // Einschalten heißt: jetzt wieder filtern. Eine noch laufende Pause
      // würde das sonst stillschweigend aushebeln.
      if (els.master.checked) patch[BREAK_KEY] = null;
      save(patch);
    });

    els.reset.addEventListener('click', () => save(resetPatch()));

    els.customSave.addEventListener('click', () => {
      save({ [CUSTOM_KEY]: selectionOf(settings) });
    });

    els.rateYes.addEventListener('click', () => {
      save({ [RATE_KEY]: { rated: true, nextAt: 0 } });
      if (chrome.tabs && chrome.tabs.create) chrome.tabs.create({ url: reviewUrl() });
      else window.open(reviewUrl(), '_blank');
      window.close();
    });

    els.rateLater.addEventListener('click', () => {
      save({ [RATE_KEY]: { rated: false, nextAt: Date.now() + RATE_INTERVAL } });
    });

    // Fußzeilen-Link: gleicher Effekt wie der „Bewerten“-Button im Hinweis —
    // Store-Seite öffnen und den 30-Tage-Hinweis dauerhaft abschalten.
    document.getElementById('rate-link').addEventListener('click', (event) => {
      event.preventDefault();
      save({ [RATE_KEY]: { rated: true, nextAt: 0 } });
      if (chrome.tabs && chrome.tabs.create) chrome.tabs.create({ url: reviewUrl() });
      else window.open(reviewUrl(), '_blank');
      window.close();
    });

    for (const button of document.querySelectorAll('.presets button')) {
      button.addEventListener('click', () => {
        const name = button.dataset.preset;
        const preset = name === 'custom' ? settings[CUSTOM_KEY] : PRESETS[name];
        if (preset) save(Object.assign({}, preset));
      });
    }

    // --- Kurzpause --------------------------------------------------------
    function startBreak(minutes) {
      const value = Math.min(720, Math.max(1, Math.round(minutes)));
      if (!Number.isFinite(value)) return;
      save({ [BREAK_KEY]: { until: Date.now() + value * 60000 } });
    }

    for (const button of document.querySelectorAll('.break-btn')) {
      button.addEventListener('click', () => startBreak(Number(button.dataset.minutes)));
    }

    els.breakCustom.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter') return;
      const minutes = Number(els.breakCustom.value);
      if (!minutes) return;
      els.breakCustom.value = '';
      startBreak(minutes);
    });

    els.breakEnd.addEventListener('click', () => save({ [BREAK_KEY]: null }));

    // --- Fokuszeit ---------------------------------------------------------
    function saveSchedule(patch) {
      const current = settings[SCHEDULE_KEY] || DEFAULTS[SCHEDULE_KEY];
      save({ [SCHEDULE_KEY]: Object.assign({}, current, patch) });
    }

    els.scheduleEnabled.addEventListener('change', () => {
      saveSchedule({ enabled: els.scheduleEnabled.checked });
    });
    for (const [el, key] of [[els.scheduleStart, 'start'], [els.scheduleEnd, 'end']]) {
      el.addEventListener('change', () => {
        // Leere oder unsinnige Eingabe nicht speichern — sonst stünde die
        // Fokuszeit auf einem Wert, den isActive() ignorieren muss.
        if (parseTime(el.value) === null) {
          renderTiming();
          return;
        }
        saveSchedule({ [key]: el.value });
      });
    }

    els.searchForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const query = els.searchInput.value.trim();
      if (!query) return;
      const url =
        'https://www.youtube.com/results?search_query=' + encodeURIComponent(query);
      if (chrome.tabs && chrome.tabs.create) chrome.tabs.create({ url });
      else window.open(url, '_blank');
      window.close();
    });
  }

  // --- Start --------------------------------------------------------------

  /*
   * Solange eine Pause läuft, tickt die Restzeit — und beim Ablauf wechselt
   * der Wirkzustand, ohne dass jemand klickt. Ein Sekundentakt reicht; er
   * läuft nur, solange das Popup offen ist.
   */
  function startTicker() {
    setInterval(() => {
      const state = settings[BREAK_KEY];
      if (state && typeof state.until === 'number' && state.until > Date.now() - 1500) {
        render();
      }
    }, 1000);
  }

  ready.then(() => {
    translateStatic();
    labelBreakButtons();
    buildRows();
    wire();
    chrome.storage.sync.get(DEFAULTS, (stored) => {
      settings = Object.assign({}, DEFAULTS, stored);
      // Erster Start: die Frist läuft ab jetzt, nicht ab dem ersten Popup-Klick.
      if (!settings[RATE_KEY]) {
        save({ [RATE_KEY]: { rated: false, nextAt: Date.now() + RATE_INTERVAL } });
      } else {
        render();
      }
      startTicker();
    });
  });
})();
