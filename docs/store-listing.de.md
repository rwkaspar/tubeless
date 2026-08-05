# Store-Eintrag (Deutsch)

Textbausteine für den Chrome Web Store. Die Kurzbeschreibung ist identisch mit
`extDescription` in `_locales/de/messages.json` — wer sie hier ändert, muss sie
dort mitziehen.

## Name (max. 75 Zeichen)

```
Tubeless — YouTube ohne Ablenkung
```

## Kurzbeschreibung (max. 132 Zeichen)

```
Entfernt sämtliche Ablenkungen von YouTube: Feed, Seitenleiste, Shorts, Empfehlungen, Kommentare, Endcards und Autoplay.
```

## Detaillierte Beschreibung

```
Du gehst auf YouTube, um ein bestimmtes Video zu sehen. Vierzig Minuten später
bist du drei Empfehlungen und zwei Shorts weiter und weißt nicht mehr genau,
was eigentlich der Plan war.

Tubeless nimmt YouTube die Angel aus der Hand. Übrig bleibt das Video.

WAS VERSCHWINDET

Startseite und Feeds
• Der Empfehlungs-Feed auf der Startseite — stattdessen ein ruhiger Platzhalter
• Shorts: Regale, Rasterkacheln, Menüeintrag
• Filter-Chips, Trends und Explore
• Promoted-Videos und Werbeeinblendungen

Videoseite
• Die komplette rechte Spalte mit „Als Nächstes"
• Kommentare und Live-Chat
• Like, Teilen, Speichern
• Merch, Tickets, Spendenaufrufe
• Playlist-Panel

Player
• Endcards und die Video-Wand am Schluss
• Das „Weitere Videos"-Overlay beim Pausieren
• Infokarten, Heatmap, Weiter-Button, Miniplayer
• Autoplay — dauerhaft aus, nicht nur für diese Sitzung

Kopfzeile und Navigation
• Die gesamte obere Leiste, die Seitenleiste, die Glocke, den Zähler-Badge

WIE DU ES EINSTELLST

41 Filter, jeder einzeln schaltbar, dazu drei Presets:

• Eigene — deine gespeicherte Auswahl, jederzeit mit einem Klick zurück
• Fokus — Kopfzeile und Suchleiste bleiben, Sponsor-Segmente und Intros werden markiert und übersprungen
• Nichts filtern — alles wieder an

Stell dir zusammen, was du weghaben willst, sichere es einmal als „Eigene" — und
komm nach jedem Ausflug in die anderen Presets mit einem Klick dorthin zurück.

Ein Schalter oben im Popup pausiert Tubeless komplett, wenn du doch mal stöbern
willst. Änderungen greifen sofort, ohne Neuladen, in allen offenen Tabs.

Standardmäßig ist auch die Kopfzeile weg und damit YouTubes Suchfeld — dort
fängt der Sog sonst wieder an. Gesucht wird über das Feld im Popup. Wer die
Kopfzeile behalten will, nimmt das Preset „Fokus".

WORAUF DU DICH VERLASSEN KANNST

• Nichts wird geladen, gemessen oder übertragen. Kein Analytics, keine Konten,
  keine externen Server.
• Die einzigen Berechtigungen sind „storage" für deine Einstellungen und Zugriff
  auf youtube.com. Sonst nichts.
• Deine Einstellungen liegen in deinem Chrome-Profil und wandern per Sync mit.
• Der Quelltext ist offen und lesbar: github.com/rwkaspar/tubeless

ZUR WERBUNG, EHRLICH GESAGT

Tubeless blockiert keine Werbung und greift nicht in die Werbewiedergabe ein —
es blendet lediglich Promoted-Kacheln in Feed und Suche aus. Wer werbefrei
schauen will, braucht YouTube Premium oder einen Werbeblocker; Tubeless ist
keiner und will keiner sein.

OPTIONAL: SPONSOR-SEGMENTE (SPONSORBLOCK)

Von Creators ins Video eingebaute Sponsorings kann Tubeless auf Wunsch grün in
der Fortschrittsleiste markieren und automatisch überspringen — auf Wunsch
inklusive Intros, mit kurzer Einblendung nach jedem Sprung. Alle drei Schalter
sind ab Werk AUS. Erst wenn du sie aktivierst, fragt Tubeless die
Community-Datenbank SponsorBlock ab (optional auch für Intros) — anonymisiert: übertragen wird nur ein
4-Zeichen-Hash-Präfix, nie die Video-ID. Ausgeschaltet heißt: keinerlei
Anfragen.

Dislike-Zahlen zeigt Tubeless bewusst nicht an. Die wären nur über einen
Drittanbieter zu bekommen, an den für jedes Video die Video-ID gehen müsste. Das
verträgt sich nicht mit dem Versprechen oben.

Die Oberfläche ist in zwölf Sprachen übersetzt und richtet sich automatisch
nach deinen Browser-Einstellungen.
```

## Kategorie

Produktivität

## Einzweck-Beschreibung (Pflichtfeld)

```
Tubeless blendet ablenkende Oberflächenelemente auf youtube.com aus — Feed,
Empfehlungen, Kommentare, Shorts, Endcards — und schaltet Autoplay ab. Das ist
der einzige Zweck der Erweiterung.
```

## Begründung der Berechtigungen

**`storage`**

```
Speichert, welche der 41 Filter der Nutzer aktiviert hat, dazu dessen selbst
gesicherte Auswahl. Ohne diese Berechtigung
wären die Einstellungen nach jedem Tab-Wechsel wieder weg. Es werden ausschließlich
diese Schalterzustände gespeichert, keine Nutzungsdaten.
```

**Host-Berechtigung `*://*.youtube.com/*`**

```
Die Erweiterung muss auf YouTube-Seiten CSS-Klassen setzen, um Elemente
auszublenden, Autoplay abzuschalten und /shorts/-URLs auf den normalen Player
umzuleiten. Sie greift auf
keine andere Domain zu.
```

## Datennutzung

Keine Erhebung, keine Weitergabe, keine Verkäufe. Alle drei Erklärungen im
Web-Store-Formular können verneint werden.

## Autor & Unterstützung

Ein Projekt von [NeoTactIQ](https://neotactiq.ai).

- Ko-fi: <https://ko-fi.com/neotactiq>
- Patreon: <https://www.patreon.com/c/neotactiq>
