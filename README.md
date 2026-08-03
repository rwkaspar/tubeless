# Tubeless

Chrome-Extension, die YouTube auf das reduziert, weswegen du hingegangen bist:
das Video. Kein Feed, keine Empfehlungen, keine Shorts, keine Kommentare, keine
Endcards, kein Autoplay.

38 einzeln schaltbare Filter, drei Presets. Standardmäßig ist alles aus, was
ablenkt — sichtbar bleiben nur Player, Titel, Kanal und Beschreibung.

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

Neu bauen: `chrome://extensions` → **Erweiterung packen** → dieses Verzeichnis
als Stammverzeichnis, den vorhandenen Schlüssel als Privatschlüssel angeben.
Ohne denselben Schlüssel ändert sich die Extension-ID.

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

## Dateien

```
manifest.json          MV3-Manifest
src/features.js        Feature-Tabelle (Keys, Labels, Defaults, Presets)
src/tubeless.css       alle Ausblende-Regeln, an tl-*-Klassen gehängt
src/content.js         Klassen setzen, JS-Filter, SPA-Navigation
popup/                 Bedienoberfläche
tools/make-icons.py    generiert icons/*.png (ohne externe Abhängigkeiten)
tools/verify.py        Selektor-Test gegen das echte YouTube
```

Einen Filter ergänzen: Eintrag in `src/features.js` anlegen, CSS-Regeln unter
`html.tl-<key>` in `src/tubeless.css` schreiben. Popup und Presets bauen sich
selbst daraus.
