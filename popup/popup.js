/* Tubeless — Popup: Presets, Einzelschalter und eine kleine Suche als
   Ersatz für die ausgeblendete YouTube-Kopfzeile.

   Alle Texte kommen aus _locales/<sprache>/messages.json — statische über
   data-i18n-Attribute im HTML, dynamische über TUBELESS.t()/label()/hint().
   Gerendert wird erst, wenn die Kataloge geladen sind. */
(() => {
  'use strict';

  const {
    GROUPS, FEATURES, DEFAULTS, PRESETS, CUSTOM_KEY, RATE_KEY,
    selectionOf, sameSelection, resetPatch,
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
    searchInput: document.getElementById('search-input')
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
  // Firefox-Build erkennt man am Protokoll der eigenen Ressourcen; der
  // AMO-Slug „tubeless“ ist bei der Einreichung entsprechend zu wählen.
  const reviewUrl = () =>
    chrome.runtime.getURL('').startsWith('moz-extension:')
      ? 'https://addons.mozilla.org/firefox/addon/tubeless/reviews/'
      : 'https://chromewebstore.google.com/detail/' + chrome.runtime.id + '/reviews';

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

  function render() {
    const on = settings._enabled !== false;
    els.master.checked = on;
    document.body.dataset.off = String(!on);

    let hidden = 0;
    for (const feature of FEATURES) {
      const input = inputs.get(feature.key);
      input.checked = settings[feature.key] === true;
      if (input.checked) hidden++;
    }

    els.count.textContent = on
      ? t('statusFiltered', [String(hidden), String(FEATURES.length)])
      : t('statusPaused');

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
    const savable = on && !sameSelection(current, custom);
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
      save({ _enabled: els.master.checked });
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

    for (const button of document.querySelectorAll('.presets button')) {
      button.addEventListener('click', () => {
        const name = button.dataset.preset;
        const preset = name === 'custom' ? settings[CUSTOM_KEY] : PRESETS[name];
        if (preset) save(Object.assign({}, preset));
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

  ready.then(() => {
    translateStatic();
    buildRows();
    wire();
    chrome.storage.sync.get(DEFAULTS, (stored) => {
      settings = Object.assign({}, DEFAULTS, stored);
      // Erster Start: die Frist läuft ab jetzt, nicht ab dem ersten Popup-Klick.
      if (!settings[RATE_KEY]) {
        save({ [RATE_KEY]: { rated: false, nextAt: Date.now() + RATE_INTERVAL } });
        return;
      }
      render();
    });
  });
})();
