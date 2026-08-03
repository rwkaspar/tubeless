# Tubeless — Datenschutzerklärung / Privacy Policy

*Stand / last updated: 2026-08-03*

## Deutsch

Tubeless erhebt, speichert und überträgt **keine personenbezogenen Daten**.

- **Keine Netzwerkzugriffe in der Standardeinstellung.** Die Erweiterung kontaktiert keine Server — weder
  eigene noch fremde. Es gibt kein Analytics, keine Fehlerberichte, keine
  Update-Pings über den Chrome Web Store hinaus.
- **Was gespeichert wird:** ausschließlich deine Einstellungen — welche der
  Filter aktiv sind, deine selbst gesicherte Auswahl und wann der
  Bewertungs-Hinweis zuletzt gezeigt wurde. Diese Daten liegen in
  `chrome.storage.sync`, also in deinem eigenen Chrome-Profil, und werden
  allenfalls durch Chromes eigene Profilsynchronisierung zwischen deinen
  Geräten abgeglichen. Tubeless hat darauf keinen Zugriff von außen.
- **Was gelesen wird:** Tubeless läuft ausschließlich auf `youtube.com` und
  verändert dort die Darstellung der Seite. Es liest keine Inhalte aus, die
  über das Ausblenden von Oberflächenelementen hinausgehen — keine
  Watch-History, keine Suchanfragen, keine Kontodaten.
- **Keine Weitergabe.** Es gibt nichts, was weitergegeben werden könnte, und
  keinen Dritten, an den etwas ginge.

### Optional: SponsorBlock

Zwei Filter — „Sponsor-Segmente markieren“ und „Sponsor-Segmente überspringen“ —
sind standardmäßig **ausgeschaltet**. Erst wenn du einen davon aktivierst, fragt
Tubeless die Community-Datenbank SponsorBlock (sponsor.ajay.app) nach
gemeldeten Sponsor-Abschnitten (optional auch Intros). Dabei werden **nicht** die Video-ID oder andere
Daten übertragen, sondern nur die ersten vier Zeichen eines SHA-256-Hashes der
Video-ID (k-Anonymität) — der Betreiber kann daraus nicht ablesen, welches
Video du ansiehst. Es gilt die Datenschutzerklärung von SponsorBlock
(https://sponsor.ajay.app/privacy). Schaltest du beide Filter aus, finden
keinerlei Anfragen mehr statt.

Deinstallieren entfernt die Erweiterung vollständig; die gespeicherten
Einstellungen räumt Chrome dabei selbst ab.

Fragen: [github.com/rwkaspar/tubeless](https://github.com/rwkaspar/tubeless)

## English

Tubeless collects, stores and transmits **no personal data**.

- **No network access by default.** The extension contacts no servers — neither its own
  nor anyone else's. There is no analytics, no crash reporting, no update ping
  beyond the Chrome Web Store itself.
- **What is stored:** only your settings — which filters are active, the
  selection you saved yourself, and when the review prompt was last shown.
  This data lives in `chrome.storage.sync`, i.e. inside your own Chrome
  profile, and is at most synchronised between your devices by Chrome's own
  profile sync. Tubeless has no outside access to it.
- **What is read:** Tubeless runs exclusively on `youtube.com` and changes how
  that page is displayed. It reads nothing beyond what is needed to hide
  interface elements — no watch history, no search queries, no account data.
- **No sharing.** There is nothing that could be shared and no third party to
  share it with.

### Optional: SponsorBlock

Two filters — “Mark sponsor segments” and “Skip sponsor segments” — are
**off by default**. Only when you enable one of them does Tubeless query the
community database SponsorBlock (sponsor.ajay.app) for reported sponsor
sections (optionally intros too). This does **not** transmit the video ID or any other data — only the
first four characters of a SHA-256 hash of the video ID (k-anonymity), from
which the operator cannot tell which video you are watching. SponsorBlock's
privacy policy applies (https://sponsor.ajay.app/privacy). Turn both filters
off and no requests are made at all.

Uninstalling removes the extension completely; Chrome cleans up the stored
settings itself.

Questions: [github.com/rwkaspar/tubeless](https://github.com/rwkaspar/tubeless)
