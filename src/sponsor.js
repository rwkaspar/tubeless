/*
 * Tubeless — SponsorBlock-Integration (opt-in).
 *
 * Markiert von der Community gemeldete Sponsor-Segmente in der
 * Fortschrittsleiste und überspringt sie auf Wunsch. Datenquelle ist die
 * SponsorBlock-API (sponsor.ajay.app), abgefragt über deren
 * k-Anonymitäts-Endpunkt: gesendet werden nur die ersten 4 Hex-Zeichen des
 * SHA-256 der Video-ID — der Server erfährt nicht, welches Video läuft, und
 * die Antwort wird lokal auf die exakte ID gefiltert.
 *
 * Beide Filter (sponsorMark, sponsorSkip) sind standardmäßig AUS. Solange
 * keiner aktiv ist, verlässt keine einzige Anfrage den Browser — tick()
 * kehrt vorher um.
 */
(function (root) {
  'use strict';

  const API = 'https://sponsor.ajay.app/api/skipSegments/';
  const CATEGORIES = '?categories=%5B%22sponsor%22%5D';
  const MARKER_HOST = 'tl-sponsor-markers';

  let currentVideo = null; // Video-ID der aktuellen Watch-Seite
  let segments = [];       // [{start, end}] für currentVideo
  const cache = new Map(); // Video-ID -> Segmente; Fehlschläge als [] (kein Retry)

  async function sha256Prefix(videoId) {
    const data = new TextEncoder().encode(videoId);
    const digest = await crypto.subtle.digest('SHA-256', data);
    return [...new Uint8Array(digest)]
      .slice(0, 2)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  async function fetchSegments(videoId) {
    let result = [];
    try {
      const prefix = await sha256Prefix(videoId);
      const response = await fetch(API + prefix + CATEGORIES);
      if (response.ok) {
        const list = await response.json();
        const entry = list.find((v) => v.videoID === videoId);
        result = ((entry && entry.segments) || [])
          .filter((s) => s.actionType === 'skip' && Array.isArray(s.segment))
          .map((s) => ({ start: s.segment[0], end: s.segment[1] }))
          .sort((a, b) => a.start - b.start);
      }
      // 404 heißt schlicht: niemand hat Segmente gemeldet.
    } catch (_) {
      /* Netzfehler: leer cachen statt Retry-Gewitter */
    }
    cache.set(videoId, result);
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
      host.dataset.video === currentVideo &&
      host.childElementCount === segments.length
    ) {
      return; // steht schon
    }
    if (!host) {
      host = document.createElement('div');
      host.className = MARKER_HOST;
      bar.appendChild(host);
    }
    host.dataset.video = currentVideo;
    host.textContent = '';
    for (const { start, end } of segments) {
      const marker = document.createElement('div');
      marker.className = 'tl-sponsor-marker';
      marker.style.left = (start / duration) * 100 + '%';
      marker.style.width = (Math.max(end - start, 1) / duration) * 100 + '%';
      host.appendChild(marker);
    }
  }

  function maybeSkip(video) {
    if (!video || video.paused) return;
    const now = video.currentTime;
    for (const { start, end } of segments) {
      // 0,3 s Puffer, damit wir nach dem Sprung nicht sofort wieder „drin“ sind
      if (now >= start && now < end - 0.3) {
        video.currentTime = end;
        break;
      }
    }
  }

  function teardown() {
    currentVideo = null;
    segments = [];
    removeMarkers();
  }

  /**
   * Wird vom Content-Script bei Navigation und im 400-ms-Takt aufgerufen.
   * Beide Argumente false -> kompletter Rückbau, garantiert keine Requests.
   */
  function tick(mark, skip) {
    if (!mark && !skip) {
      if (currentVideo) teardown();
      return;
    }

    const videoId =
      location.pathname === '/watch'
        ? new URLSearchParams(location.search).get('v')
        : null;
    if (!videoId) {
      if (currentVideo) teardown();
      return;
    }

    if (videoId !== currentVideo) {
      currentVideo = videoId;
      removeMarkers();
      segments = cache.get(videoId) || [];
      if (!cache.has(videoId)) {
        fetchSegments(videoId).then((s) => {
          if (currentVideo === videoId) segments = s;
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
