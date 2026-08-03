/*
 * Tubeless — SponsorBlock-Integration (opt-in).
 *
 * Markiert von der Community gemeldete Segmente in der Fortschrittsleiste und
 * überspringt sie auf Wunsch — mit kurzem Toast als Rückmeldung, wie man es
 * von SmartTube kennt. Datenquelle ist die SponsorBlock-API
 * (sponsor.ajay.app), abgefragt über deren k-Anonymitäts-Endpunkt: gesendet
 * werden nur die ersten 4 Hex-Zeichen des SHA-256 der Video-ID — der Server
 * erfährt nicht, welches Video läuft, gefiltert wird lokal.
 *
 * Kategorien: 'sponsor' immer, 'intro' zusätzlich, wenn der Filter
 * sponsorIntros aktiv ist. Alle Filter sind standardmäßig AUS; solange keiner
 * aktiv ist, verlässt keine einzige Anfrage den Browser — tick() kehrt
 * vorher um.
 */
(function (root) {
  'use strict';

  const API = 'https://sponsor.ajay.app/api/skipSegments/';
  const MARKER_HOST = 'tl-sponsor-markers';
  const TOAST_MESSAGES = {
    sponsor: 'toastSkippedSponsor',
    intro: 'toastSkippedIntro'
  };

  let currentKey = null;   // Video-ID + Kategorien der aktuellen Abfrage
  let currentVideo = null;
  let segments = [];       // [{start, end, category}]
  const cache = new Map(); // key -> Segmente; Fehlschläge als [] (kein Retry)

  async function sha256Prefix(videoId) {
    const data = new TextEncoder().encode(videoId);
    const digest = await crypto.subtle.digest('SHA-256', data);
    return [...new Uint8Array(digest)]
      .slice(0, 2)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  async function fetchSegments(videoId, categories, key) {
    let result = [];
    try {
      const prefix = await sha256Prefix(videoId);
      const url =
        API + prefix + '?categories=' + encodeURIComponent(JSON.stringify(categories));
      const response = await fetch(url);
      if (response.ok) {
        const list = await response.json();
        const entry = list.find((v) => v.videoID === videoId);
        result = ((entry && entry.segments) || [])
          .filter((s) => s.actionType === 'skip' && Array.isArray(s.segment))
          .map((s) => ({ start: s.segment[0], end: s.segment[1], category: s.category }))
          .sort((a, b) => a.start - b.start);
      }
      // 404 heißt schlicht: niemand hat Segmente gemeldet.
    } catch (_) {
      /* Netzfehler: leer cachen statt Retry-Gewitter */
    }
    cache.set(key, result);
    return result;
  }

  function removeMarkers() {
    const host = document.querySelector('.' + MARKER_HOST);
    if (host) host.remove();
  }

  function renderMarkers(video) {
    const bar = document.querySelector('.ytp-progress-bar');
    if (!bar || !video) return;
    const duration = video.duration;
    if (!Number.isFinite(duration) || duration <= 0) return;

    let host = bar.querySelector('.' + MARKER_HOST);
    if (
      host &&
      host.dataset.key === currentKey &&
      host.childElementCount === segments.length
    ) {
      return; // steht schon
    }
    if (!host) {
      host = document.createElement('div');
      host.className = MARKER_HOST;
      bar.appendChild(host);
    }
    host.dataset.key = currentKey;
    host.textContent = '';
    for (const { start, end, category } of segments) {
      const marker = document.createElement('div');
      marker.className = 'tl-sponsor-marker';
      marker.dataset.category = category;
      marker.style.left = (start / duration) * 100 + '%';
      marker.style.width = (Math.max(end - start, 1) / duration) * 100 + '%';
      host.appendChild(marker);
    }
  }

  /** Kurze Einblendung unten links im Player — Rückmeldung wie bei SmartTube. */
  let lastToastAt = 0;
  function showToast(category) {
    // Global entprellt: bei Ketten-Sprüngen (Sponsor direkt gefolgt von Intro)
    // und beim Seek-Race des Players gibt es genau einen Toast, kein Gewitter.
    const now = Date.now();
    if (now - lastToastAt < 4000) return;
    lastToastAt = now;

    const player = document.querySelector('.html5-video-player');
    if (!player) return;
    const old = player.querySelector('.tl-skip-toast');
    if (old) old.remove();
    const toast = document.createElement('div');
    toast.className = 'tl-skip-toast';
    toast.textContent = root.TL_I18N.t(TOAST_MESSAGES[category] || TOAST_MESSAGES.sponsor);
    player.appendChild(toast);
    setTimeout(() => toast.remove(), 2600);
  }

  function maybeSkip(video) {
    if (!video || video.paused) return;
    const now = video.currentTime;
    for (const { start, end, category } of segments) {
      // 0,3 s Puffer, damit wir nach dem Sprung nicht sofort wieder „drin“ sind
      if (now >= start && now < end - 0.3) {
        video.currentTime = end;
        showToast(category);
        break;
      }
    }
  }

  function teardown() {
    currentKey = null;
    currentVideo = null;
    segments = [];
    removeMarkers();
  }

  /**
   * Wird vom Content-Script bei Navigation und im 400-ms-Takt aufgerufen.
   * mark/skip false -> kompletter Rückbau, garantiert keine Requests.
   */
  function tick(mark, skip, intros) {
    if (!mark && !skip) {
      if (currentKey) teardown();
      return;
    }

    const videoId =
      location.pathname === '/watch'
        ? new URLSearchParams(location.search).get('v')
        : null;
    if (!videoId) {
      if (currentKey) teardown();
      return;
    }

    const categories = intros ? ['sponsor', 'intro'] : ['sponsor'];
    const key = videoId + ':' + categories.join(',');
    if (key !== currentKey) {
      currentKey = key;
      currentVideo = videoId;
      removeMarkers();
      segments = cache.get(key) || [];
      if (!cache.has(key)) {
        fetchSegments(videoId, categories, key).then((s) => {
          if (currentKey === key) segments = s;
        });
      }
    }
    if (!segments.length) return;

    const player = document.querySelector('.html5-video-player');
    if (!player || player.classList.contains('ad-showing')) return;
    const video = player.querySelector('video');

    if (mark) renderMarkers(video);
    else removeMarkers();
    if (skip) maybeSkip(video);
  }

  root.TL_SPONSOR = { tick };
})(typeof window !== 'undefined' ? window : globalThis);
