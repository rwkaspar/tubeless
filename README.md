# Tubeless

Chrome-Extension, die YouTube auf das reduziert, weswegen du hingegangen bist:
das Video. Kein Feed, keine Empfehlungen, keine Shorts, keine Kommentare, keine
Endcards, kein Autoplay.

38 einzeln schaltbare Filter, drei Presets. Standardmäßig ist alles aus, was
ablenkt — sichtbar bleiben nur Player, Titel, Kanal und Beschreibung.

Oberfläche auf Deutsch und Englisch, [weitere Sprachen](#sprachen) sind ein
Ordner Arbeit. Texte für den Store liegen in
[`docs/`](docs/store-listing.de.md).

## Installieren

1. `chrome://extensions` öffnen
2. **Entwicklermodus** oben rechts einschalten
3. **Entpackte Erweiterung laden** → diesen Ordner auswählen
4. YouTube neu laden

Es gibt keinen Build-Schritt — der Ordner *ist* die Extension.

## Paketieren

`dist/tubeless.crx` ist das signierte Paket, Extension-ID
`inhgfhfdblpbmpohoocoaepcjhoghbij`. Aktuelle Chrome-Versionen verweigern die
Installation von `.crx`-Dateien außerhalb des Web Store — die Datei ist zur
Archivierung und Weitergabe da, installiert wird über den Weg oben.

Das Paket enthält nur, was zur Laufzeit gebraucht wird: `manifest.json`,
`_locales/`, `src/`, `popup/`, `icons/` und die README. `tools/`, `docs/` und
`dist/` bleiben draußen.

Neu bauen über `chrome://extensions` → **Erweiterung packen** → dieses
Verzeichnis als Stammverzeichnis, den vorhandenen Schlüssel als Privatschlüssel.
Ohne denselben Schlüssel ändert sich die Extension-ID.

Auf der Kommandozeile:

```bash
build=$(mktemp -d /home/$USER/tubeless-build.XXXX)   # siehe Hinweis unten
cp -r manifest.json _locales src popup icons README.md "$build/"
chromium --pack-extension="$build" --pack-extension-key=~/.config/tubeless/tubeless.pem
mv "$build.crx" dist/tubeless.crx && rm -rf "$build"
```

Läuft Chromium als Snap, kommt es weder an `~/.config` noch an `/tmp` heran —
Schlüssel und Staging-Verzeichnis müssen dann vorübergehend an einem Pfad
liegen, dessen erste Ebene unter `$HOME` kein Punkt-Verzeichnis ist. Die
Fehlermeldung dazu lautet „Privater Schlüssel konnte nicht gelesen werden".

Der Schlüssel liegt **nicht im Repo**, sondern unter
`~/.config/tubeless/tubeless.pem` (Modus 600). Wer ihn hat, kann Pakete
signieren, die Chrome als dieselbe Extension akzeptiert und als Update
durchwinkt — deshalb steht `*.pem` in der `.gitignore`. Geht er verloren,
bekommt die Extension beim nächsten Packen eine neue ID.

## Bedienung

Klick aufs Tubeless-Icon in der Toolbar:

| Element | Wirkung |
|---|---|
| Schalter oben rechts | Pausiert Tubeless komplett (YouTube unverändert) |
| Suchfeld | Ersatz für die ausgeblendete YouTube-Suchleiste |
| **Radikal** | Wirklich alles weg — auch Titel, Beschreibung, Kanal, Thumbnails |
| **Fokus** | Wie Standard, aber Kopfzeile und Suche bleiben |
| **Nichts filtern** | Alle Filter aus |
| **Standard** (unten) | Zurück zur Auslieferungseinstellung |

Änderungen greifen sofort, ohne Reload, in allen offenen Tabs. Die Einstellungen
liegen in `chrome.storage.sync`, wandern also mit dem Chrome-Profil mit.

### Die Kopfzeile ist standardmäßig weg

Damit ist auch das YouTube-Suchfeld weg — das ist Absicht, dort fängt der Sog
sonst wieder an. Gesucht wird über das Feld im Popup. Wer die Kopfzeile behalten
will, nimmt das Preset **Fokus**.

## Was gefiltert wird

**Kopfzeile & Navigation** — Kopfzeile, Suchleiste, Logo, Glocke, Erstellen-Button,
Konto-Avatar, Sprachsuche, Seitenleiste, Mini-Seitenleiste

**Startseite & Feeds** — Startseiten-Feed, Filter-Chips, Shorts (Shelfs, Grid-Items,
Menüeinträge), Trends & Explore, Promoted-/Werbe-Einblendungen

**Videoseite** — Empfohlene Videos, Kommentare, Live-Chat, Playlist-Panel, Merch/
Tickets/Spenden, Like/Teilen/Speichern, Beschreibung\*, Kanal & Abonnieren\*, Titel\*

**Player** — Endcards & Video-Wand, Pause-Overlay, Infokarten, Heatmap,
Autoplay-Schalter, Weiter-Button, Miniplayer-Button, Ambient-Modus

**Überall** — rote Zähler-Badges, Vorschaubilder\*, Aufrufzahlen\*, Hover-Vorschau

**Verhalten** — Autoplay dauerhaft aus, `/shorts/…` öffnet als normales Video,
ruhiger Platzhalter statt Feed

\* standardmäßig aus, per Klick oder Preset **Radikal** dazuschaltbar

## Wie es funktioniert

`src/content.js` läuft bei `document_start` und setzt für jeden aktiven Filter
eine Klasse `tl-<name>` auf `<html>`; `src/tubeless.css` hängt alle Regeln an
diese Klassen. Damit ist alles schon versteckt, bevor YouTube den ersten Pixel
rendert. Die letzte bekannte Einstellung liegt zusätzlich im `localStorage`, weil
`chrome.storage` nur asynchron antwortet — sonst blitzt der Feed kurz auf.

Drei Filter brauchen JavaScript statt CSS: Autoplay (setzt YouTubes eigenen
`yt-player-autonavstate` und legt notfalls den Schalter um), die Shorts-Umleitung
und der Platzhalter auf der leeren Startseite. Die laufen bei jeder
SPA-Navigation neu (`yt-navigate-finish` & Co.).

Keine Netzwerkzugriffe, kein Tracking, keine Berechtigung außer `storage` und
`*://*.youtube.com/*`.

## Selektoren prüfen

YouTube benennt seine Custom-Elements regelmäßig um. Dann blendet ein Selektor
nichts mehr aus, ohne dass irgendwo ein Fehler auftaucht. Dagegen gibt es einen
Test, der die Extension in ein headless Chromium lädt und gegen das echte
YouTube zählt:

```bash
python3 -m venv .venv && .venv/bin/pip install websocket-client
.venv/bin/python tools/verify.py            # nur Zahlen
.venv/bin/python tools/verify.py --shots     # zusätzlich Screenshots
```

Jedes `FAIL` ist ein Selektor in `src/tubeless.css`, der nachgezogen werden muss.

## Sprachen

Deutsch und Englisch. Chrome wählt anhand der Browsersprache, Englisch ist der
Rückfall für alles andere (`"default_locale": "en"`).

Im Code steht kein einziger sichtbarer Text — Beschriftungen liegen in
`_locales/<sprache>/messages.json` und werden über `chrome.i18n` aufgelöst:
statische über `data-i18n`-Attribute in `popup.html`, dynamische über
`TUBELESS.label()`, `.hint()`, `.groupLabel()` und `.t()`.

Die Schlüssel folgen einer Konvention, damit nichts von Hand verdrahtet werden
muss:

| Schlüssel | wofür |
|---|---|
| `feature<Key>` | Beschriftung eines Filters, `<Key>` ist der Key aus `features.js` |
| `feature<Key>Hint` | optionale Erklärung darunter — fehlt sie, bleibt die Zeile einzeilig |
| `group<Id>` | Titel einer Filtergruppe |
| `extName`, `extDescription` | Name und Kurzbeschreibung, auch fürs Manifest |

**Eine Sprache ergänzen:** `_locales/en/messages.json` nach
`_locales/<code>/messages.json` kopieren, die `message`-Werte übersetzen,
`description` unangetastet lassen (das ist der Hinweis für Übersetzende, nicht
für Nutzende). Sonst ist nichts zu tun — Popup und Manifest ziehen automatisch
nach. Fehlt ein Schlüssel, fällt Chrome auf Englisch zurück.

Ob eine Sprache vollständig ist:

```bash
python3 - <<'EOF'
import json, glob, os
base = set(json.load(open('_locales/en/messages.json')))
for path in sorted(glob.glob('_locales/*/messages.json')):
    keys = set(json.load(open(path)))
    print(os.path.basename(os.path.dirname(path)),
          'fehlt:', sorted(base - keys) or '—',
          '| überzählig:', sorted(keys - base) or '—')
EOF
```

## Dateien

```
manifest.json          MV3-Manifest
_locales/de|en/        Übersetzungen (messages.json)
src/features.js        Feature-Tabelle (Keys, Gruppen, Defaults, Presets, i18n-Helfer)
src/tubeless.css       alle Ausblende-Regeln, an tl-*-Klassen gehängt
src/content.js         Klassen setzen, JS-Filter, SPA-Navigation
popup/                 Bedienoberfläche
dist/tubeless.crx      signiertes Paket
docs/store-listing.*   Texte für den Chrome Web Store, je Sprache
tools/make-icons.py    generiert icons/*.png (ohne externe Abhängigkeiten)
tools/verify.py        Selektor-Test gegen das echte YouTube
```

Einen Filter ergänzen: Eintrag in `src/features.js` anlegen, CSS-Regeln unter
`html.tl-<key>` in `src/tubeless.css` schreiben, `feature<Key>` in **allen**
`_locales/*/messages.json` ergänzen. Popup und Presets bauen sich selbst daraus.
