<p align="center">
  <img src="docs/logo.svg" width="96" alt="Tubeless-Logo">
</p>

<h1 align="center">Tubeless</h1>

<p align="center"><em>YouTube ohne Ablenkung.</em></p>

<p align="center">
  <img alt="Version" src="https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fraw.githubusercontent.com%2Frwkaspar%2Ftubeless%2Fmain%2Fmanifest.json&query=%24.version&label=version&color=ff3b30">
  <img alt="Manifest V3" src="https://img.shields.io/badge/manifest-v3-0f0f0f">
  <img alt="Chrome 105+" src="https://img.shields.io/badge/chrome-105%2B-0f0f0f">
  <img alt="12 Sprachen" src="https://img.shields.io/badge/sprachen-12-0f0f0f">
</p>

<p align="center"><em>Deutsche Fassung — <a href="README.md">English version</a></em></p>

---

Chrome-Extension, die YouTube auf das reduziert, weswegen du hingegangen bist:
das Video. Kein Feed, keine Empfehlungen, keine Shorts, keine Kommentare, keine
Endcards, kein Autoplay.

42 einzeln schaltbare Filter, drei Presets, davon eines selbst belegbar.
Standardmäßig ist alles aus, was ablenkt — sichtbar bleiben nur Player, Titel,
Kanal und Beschreibung.

Oberfläche in [zwölf Sprachen](#sprachen), gewählt nach den Spracheinstellungen
des Browsers. Texte für den Store liegen in [`docs/`](docs/store-listing.de.md).

<table>
  <tr>
    <td width="60%"><img src="docs/screenshots/1-watch-clean.png" alt="Videoseite: nur Video, Titel und Kanal — sonst nichts"></td>
    <td width="40%"><img src="docs/screenshots/4-popup.png" alt="Das Popup: Presets und 42 einzelne Filter"></td>
  </tr>
  <tr>
    <td align="center"><sub>Die Videoseite: das Video, sonst nichts.</sub></td>
    <td align="center"><sub>Das Popup: Presets, Suche, 42 Filter.</sub></td>
  </tr>
</table>

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
| **Eigene** | Die selbst gespeicherte Auswahl — grau, solange keine da ist |
| **Fokus** | Wie Standard, aber Kopfzeile und Suche bleiben; Sponsor-Segmente und Intros werden markiert und übersprungen (SponsorBlock) |
| **Nichts filtern** | Alle Filter aus |
| **Standard** (unten) | Zurück zur Auslieferungseinstellung |

Änderungen greifen sofort, ohne Reload, in allen offenen Tabs. Die Einstellungen
liegen in `chrome.storage.sync`, wandern also mit dem Chrome-Profil mit.

### Eigene Auswahl

Sobald die aktuelle Auswahl von der gespeicherten abweicht, erscheint unter den
Presets eine Schaltfläche, die sie sichert. Danach holt **Eigene** sie jederzeit
zurück — auch nachdem zwischendurch **Fokus** oder **Nichts filtern** aktiv war.

Die gespeicherte Auswahl liegt unter `_custom` und überlebt **Standard**; nur
erneutes Speichern überschreibt sie.

### Bewertungs-Hinweis

Im Popup taucht frühestens 30 Tage nach der Installation ein kleiner Block auf,
der um eine Bewertung im Web Store bittet, danach höchstens alle 30 Tage.
„Später" verschiebt um dieselbe Frist, „Bewerten" schaltet ihn dauerhaft ab.

Ob wirklich bewertet wurde, kann eine Extension nicht feststellen — Chrome gibt
das nicht preis. Wer auf „Bewerten" klickt, gilt deshalb als erledigt.

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

**Verhalten** — Autoplay dauerhaft aus, Werbung überspringen, `/shorts/…` öffnet
als normales Video, ruhiger Platzhalter statt Feed, Sponsor-Segmente markieren
und überspringen — optional auch Intros (SponsorBlock, opt-in)\*

\* standardmäßig aus, einzeln dazuschaltbar

## Wie es funktioniert

`src/content.js` läuft bei `document_start` und setzt für jeden aktiven Filter
eine Klasse `tl-<name>` auf `<html>`; `src/tubeless.css` hängt alle Regeln an
diese Klassen. Damit ist alles schon versteckt, bevor YouTube den ersten Pixel
rendert. Die letzte bekannte Einstellung liegt zusätzlich im `localStorage`, weil
`chrome.storage` nur asynchron antwortet — sonst blitzt der Feed kurz auf.

Sieben Filter brauchen JavaScript statt CSS: Autoplay (setzt YouTubes eigenen
`yt-player-autonavstate` und legt notfalls den Schalter um), das Überspringen
von Werbung, die drei Sponsor-Filter, die Shorts-Umleitung und der Platzhalter
auf der leeren Startseite. Die laufen bei jeder SPA-Navigation neu
(`yt-navigate-finish` & Co.).

### Werbung

Hier wird nichts blockiert, sondern geklickt: Sobald der „Überspringen"-Button
auftaucht, drückt Tubeless ihn; bei unüberspringbaren Anzeigen springt es ans
Ende des Anzeigen-Clips. YouTube behandelt das wie durchgesehene Werbung, also
gibt es keinen Streit mit der Adblock-Erkennung — aber es macht YouTube auch
nicht werbefrei. Unter MV3 dürfte eine Extension Requests nur über statische
`declarativeNetRequest`-Regeln blocken, und Ads kommen aus derselben Domain und
teils im selben Stream wie das Video; sauber trennen lässt sich das nicht.

Werbung taucht mitten in der Wiedergabe auf, ohne Navigation und ohne Änderung an
`<body>` — davon bekommen die Navigations-Handler nichts mit. Deshalb prüft ein
Intervall alle 400 ms eine Klasse am Player. Das ist ehrlicher als ein
MutationObserver über den halben Player und kostet praktisch nichts.

### Sponsor-Segmente (SponsorBlock, opt-in)

Vom Creator ins Video eingebaute Sponsorings kann kein lokaler Code erkennen —
sie sind Teil des Videobildes. `src/sponsor.js` nutzt deshalb die
Community-Datenbank SponsorBlock: **Markieren** zeichnet die gemeldeten
Abschnitte in die Fortschrittsleiste (Sponsor grün, Intro türkis),
**Überspringen** springt automatisch ans Segment-Ende und blendet kurz einen
Toast ein („Sponsor übersprungen“). **Auch Intros einbeziehen** erweitert beides
um die Intro-Kategorie. Folgen Segmente direkt aufeinander, wird durchgekettet
übersprungen. Alle drei Filter sind standardmäßig aus; solange weder Markieren
noch Überspringen aktiv ist, verlässt keine einzige Anfrage den Browser (per
Netzwerk-Mitschnitt im Test zugesichert).

Abgefragt wird der k-Anonymitäts-Endpunkt: gesendet werden nur die ersten vier
Hex-Zeichen des SHA-256 der Video-ID, gefiltert wird lokal — der Server erfährt
nicht, welches Video läuft. Antworten werden pro Video gecacht, auch
Fehlschläge (kein Retry-Gewitter). Die API erlaubt CORS von überall, deshalb
braucht es keine zusätzliche Host-Berechtigung im Manifest.

### Was bewusst fehlt

**Dislike-Zahlen.** YouTube hat sie 2021 aus der API genommen; die einzige Quelle
wäre die Return-YouTube-Dislike-API, an die für jedes Video die Video-ID
rausginge — und deren Zahlen ohnehin Schätzungen aus einer fremden Nutzerbasis
sind. Das ist mit „nichts wird übertragen" nicht zu vereinbaren, also bleibt es
draußen.

Keine Netzwerkzugriffe in der Standardeinstellung, kein Tracking, keine
Berechtigung außer `storage` und `*://*.youtube.com/*`. Einzige Ausnahme sind
die SponsorBlock-Filter oben — opt-in, anonymisiert, abschaltbar.

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

Deutsch, Englisch, Spanisch, Französisch, Italienisch, Japanisch,
Niederländisch, Polnisch, Portugiesisch (BR), Russisch, Türkisch und
vereinfachtes Chinesisch.

Gewählt wird nach `navigator.languages` — also nach dem, was unter
`chrome://settings/languages` steht. Bewusst *nicht* über `chrome.i18n`: das
richtet sich nach Chromes Anzeigesprache, die unter Linux an der Systemlocale
hängt und dann eine ganz andere sein kann als die, die man eingestellt hat.
`src/i18n.js` löst deshalb selbst auf:

| Browser meldet | Tubeless nimmt |
|---|---|
| `de-AT` | `de` — Regionalvariante fällt auf die Basissprache |
| `pt-PT` | `pt_BR` — nur diese Region ist übersetzt |
| `sv-SE` | `en` — nicht übersetzt, also Rückfall |

Im Code steht kein einziger sichtbarer Text — Beschriftungen liegen in
`_locales/<sprache>/messages.json`: statische über `data-i18n`-Attribute in
`popup.html`, dynamische über `TUBELESS.label()`, `.hint()`, `.groupLabel()`
und `.t()`. Fehlt ein Schlüssel in der gewählten Sprache, greift Englisch;
fehlt er auch dort, bleibt der Schlüsselname stehen — dann sieht man im Popup
sofort, was zu übersetzen ist.

Dieselben Dateien liest Chrome für Name und Beschreibung im Manifest. Damit das
Content-Script sie ebenfalls lesen darf, stehen sie unter
`web_accessible_resources`, beschränkt auf youtube.com.

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
für Nutzende) und den Code in die Liste `AVAILABLE` in `src/i18n.js` eintragen.
Sonst ist nichts zu tun — Popup und Manifest ziehen automatisch nach.

Drei Dinge, an denen man sich schneiden kann:

- Chrome schreibt Regionen mit Unterstrich (`pt_BR`, nicht `pt-BR`).
- In `statusFiltered` müssen `$COUNT$` und `$TOTAL$` erhalten bleiben — die
  Reihenfolge im Satz ist frei, die Zuordnung läuft über den Namen.
- `extDescription` darf **132 Zeichen** nicht überschreiten und `extName` nicht
  75. Übersetzungen werden gern länger als das englische Original; reißt eine
  die Grenze, lädt Chrome die Extension in dieser Sprache gar nicht erst. Das
  Skript unten prüft es mit.

Ob eine Sprache vollständig ist:

```bash
python3 - <<'EOF'
import json, glob, os, re
base = json.load(open('_locales/en/messages.json'))
declared = re.findall(r"'([\w]+)'", re.search(
    r'const AVAILABLE = \[(.*?)\]', open('src/i18n.js').read(), re.S).group(1))
for path in sorted(glob.glob('_locales/*/messages.json')):
    lang = os.path.basename(os.path.dirname(path))
    cat = json.load(open(path))
    holes = [k for k in base if k not in cat]
    stray = [k for k in cat if k not in base]
    empty = [k for k, v in cat.items() if not v.get('message', '').strip()]
    # Chrome lehnt das Manifest ab, wenn description länger als 132 Zeichen ist
    long = [k for k in ('extName', 'extDescription')
            if len(cat.get(k, {}).get('message', '')) > (75 if k == 'extName' else 132)]
    print(f"{lang:6} fehlt: {holes or '—'} | überzählig: {stray or '—'}"
          f" | leer: {empty or '—'} | zu lang: {long or '—'}"
          f" | in i18n.js: {'ja' if lang in declared else 'NEIN'}")
EOF
```

## Dateien

```
manifest.json          MV3-Manifest
_locales/<sprache>/    Übersetzungen (messages.json), zwölf Sprachen
src/i18n.js            Sprachwahl aus navigator.languages, lädt die Kataloge
src/features.js        Feature-Tabelle (Keys, Gruppen, Defaults, Presets, i18n-Helfer)
src/tubeless.css       alle Ausblende-Regeln, an tl-*-Klassen gehängt
src/content.js         Klassen setzen, JS-Filter, SPA-Navigation
src/sponsor.js         SponsorBlock: Marker, Überspringen, Toast (opt-in)
popup/                 Bedienoberfläche
dist/tubeless.crx      signiertes Paket
docs/store-listing.*   Texte für den Chrome Web Store, je Sprache
docs/logo.svg          die Marke, gleiche Form wie icons/*.png
tools/make-icons.py    generiert icons/*.png (ohne externe Abhängigkeiten)
tools/verify.py        Selektor-Test gegen das echte YouTube
```

Einen Filter ergänzen: Eintrag in `src/features.js` anlegen, CSS-Regeln unter
`html.tl-<key>` in `src/tubeless.css` schreiben, `feature<Key>` in **allen**
`_locales/*/messages.json` ergänzen. Popup und Presets bauen sich selbst daraus.

Eine Falle dabei: Presets dürfen **ausschließlich** Filterwerte enthalten. Baut
man sie aus `DEFAULTS`, schleppen sie `_enabled`, `_custom` und `_rate` mit —
und ein Klick auf ein Preset löscht dann die gespeicherte Auswahl und setzt den
Bewertungs-Zähler zurück. Dafür gibt es `selectionFromDefaults()`.
