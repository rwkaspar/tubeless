/* Tubeless — Popup: Presets, Einzelschalter und eine kleine Suche als
   Ersatz für die ausgeblendete YouTube-Kopfzeile. */
(() => {
  'use strict';

  const { GROUPS, FEATURES, DEFAULTS, PRESETS } = window.TUBELESS;

  const els = {
    master: document.getElementById('master'),
    groups: document.getElementById('groups'),
    count: document.getElementById('count'),
    reset: document.getElementById('reset'),
    searchForm: document.getElementById('search-form'),
    searchInput: document.getElementById('search-input')
  };

  let settings = Object.assign({}, DEFAULTS);
  const inputs = new Map();

  // --- Aufbau -------------------------------------------------------------

  for (const group of GROUPS) {
    const features = FEATURES.filter((f) => f.group === group.id);
    if (!features.length) continue;

    const section = document.createElement('section');
    section.className = 'group';

    const title = document.createElement('h2');
    title.className = 'group__title';
    title.textContent = group.label;
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

      const label = document.createElement('span');
      label.className = 'row__label';
      label.textContent = feature.label;
      text.appendChild(label);

      if (feature.hint) {
        const hint = document.createElement('span');
        hint.className = 'row__hint';
        hint.textContent = feature.hint;
        text.appendChild(hint);
      }

      row.append(input, text);
      section.appendChild(row);
    }

    els.groups.appendChild(section);
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
      ? `${hidden} von ${FEATURES.length} Ablenkungen gefiltert`
      : 'Pausiert — YouTube unverändert';

    for (const button of document.querySelectorAll('.presets button')) {
      const preset = PRESETS[button.dataset.preset];
      button.dataset.active = String(matches(preset));
    }
  }

  function matches(preset) {
    return FEATURES.every((f) => settings[f.key] === preset[f.key]);
  }

  function save(patch) {
    Object.assign(settings, patch);
    chrome.storage.sync.set(patch, render);
    render();
  }

  chrome.storage.sync.get(DEFAULTS, (stored) => {
    settings = Object.assign({}, DEFAULTS, stored);
    render();
  });

  // --- Bedienung ----------------------------------------------------------

  els.master.addEventListener('change', () => {
    save({ _enabled: els.master.checked });
  });

  els.reset.addEventListener('click', () => save(Object.assign({}, DEFAULTS)));

  for (const button of document.querySelectorAll('.presets button')) {
    button.addEventListener('click', () => {
      save(Object.assign({}, PRESETS[button.dataset.preset]));
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
})();
