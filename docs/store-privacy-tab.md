# Chrome Web Store — Ausfüllhilfe für den Tab „Datenschutz"

Copy-paste-Vorlagen für die Pflichtfelder im Developer Dashboard. Die
Begründungen sind auf Englisch — die Prüfer sitzen international, das
vermeidet Rückfragen. Deutsche Fassungen der Texte stehen in
`store-listing.de.md`.

## Einziger Zweck (Single purpose description)

```
Tubeless hides distracting interface elements on youtube.com — feed,
recommendations, comments, Shorts, end cards — turns off autoplay and
(opt-in) skips community-marked sponsor segments. That is the extension's
only purpose.
```

## Begründung: Berechtigung `storage`

```
Stores which of the 41 filters the user has enabled, the selection they saved
themselves, and when the review prompt was last shown. Without this permission
the settings would be lost on every tab switch. Only these switch states are
stored — no usage data, no browsing data.
```

## Begründung: Host-Berechtigung `*://*.youtube.com/*`

```
The extension needs to run a content script on YouTube pages to set CSS
classes that hide interface elements, turn off autoplay, mark/skip
community-reported sponsor segments (opt-in), and redirect /shorts/ URLs to
the regular player. It touches no other domain.
```

## Remote-Code

Frage „Are you using remote code?" → **No, I am not using remote code**.

Falls ein Freitextfeld erscheint:

```
All code ships inside the extension package. No external scripts are loaded,
no eval or dynamic code execution is used. The only network access is an
optional, off-by-default feature that fetches JSON data (not code) from the
SponsorBlock API.
```

## Datennutzung (Data usage)

**Alle Kategorien-Checkboxen leer lassen** — die Extension erhebt nichts:
keine persönlich identifizierbaren Informationen, keine Gesundheits-/
Finanzdaten, keine Authentifizierungsdaten, keine Kommunikation, kein
Standort, **kein Webverlauf**, keine Nutzeraktivität, keine Website-Inhalte.

Zur Einordnung des opt-in SponsorBlock-Features (falls eine Rückfrage kommt):
Bei aktiviertem Filter geht eine Anfrage mit den ersten 4 Hex-Zeichen eines
SHA-256-Hashes der Video-ID an sponsor.ajay.app (k-Anonymität). Es werden
weder Video-ID noch Verlauf, Kennungen oder sonstige Nutzerdaten übertragen,
und der Entwickler erhebt oder empfängt nichts. Standardmäßig ist das Feature
aus; dann finden keinerlei Anfragen statt.

**Alle drei Zusicherungen ankreuzen** — sie treffen zu:

- [x] I do not sell or transfer user data to third parties, outside of the
      approved use cases
- [x] I do not use or transfer user data for purposes that are unrelated to
      my item's single purpose
- [x] I do not use or transfer user data to determine creditworthiness or
      for lending purposes

## URL der Datenschutzerklärung

Die Erklärung liegt in diesem Repo: `docs/privacy.md` (deutsch + englisch).

```
https://github.com/rwkaspar/tubeless/blob/main/docs/privacy.md
```

**Voraussetzung: das Repo muss public sein**, sonst sehen Prüfer und Nutzer
einen 404. Alternative: die Datei auf neotactiq.ai legen (z. B.
`https://neotactiq.ai/tubeless/privacy`) und diese URL eintragen — dann kann
das Repo privat bleiben.
