# Store listing (English)

Copy for the Chrome Web Store. The short description is identical to
`extDescription` in `_locales/en/messages.json` — change it here and you have to
change it there too.

## Name (max. 75 characters)

```
Tubeless — YouTube without the noise
```

## Short description (max. 132 characters)

```
Strips every distraction from YouTube: feed, sidebar, Shorts, recommendations, comments, end cards and autoplay.
```

## Detailed description

```
You open YouTube to watch one specific video. Forty minutes later you are three
recommendations and two Shorts deep and no longer sure what the plan was.

Tubeless takes the hook out of YouTube's hand. What is left is the video.

WHAT GOES AWAY

Home and feeds
• The recommendation feed on the home page — a calm placeholder instead
• Shorts: shelves, grid tiles, menu entry
• Filter chips, Trending and Explore
• Promoted videos and ad placements

Watch page
• The entire right-hand column with "Up next"
• Comments and live chat
• Like, share, save
• Merch, tickets, donation prompts
• Playlist panel

Player
• End cards and the video wall at the end
• The "More videos" overlay when you pause
• Info cards, heatmap, next button, miniplayer
• Autoplay — off for good, not just for this session

Header and navigation
• The whole top bar, the sidebar, the bell, the counter badge

HOW YOU TUNE IT

38 filters, each one switchable on its own, plus three presets:

• Radical — genuinely everything, down to the title, description and thumbnails
• Focus — like the default, but the header and search bar stay
• Filter nothing — everything back on

A switch at the top of the popup pauses Tubeless entirely, for when you do feel
like browsing. Changes apply immediately, without a reload, in every open tab.

By default the header is gone, and with it YouTube's search field — that is
where the pull usually starts again. You search from the field in the popup. If
you would rather keep the header, pick the "Focus" preset.

WHAT YOU CAN RELY ON

• Nothing is fetched, measured or transmitted. No analytics, no accounts, no
  external servers.
• The only permissions are "storage" for your settings and access to
  youtube.com. Nothing else.
• Your settings live in your Chrome profile and travel with Chrome Sync.
• The source is open and readable: github.com/rwkaspar/tubeless

Tubeless does not block ads inside videos and is not a replacement for an ad
blocker. It cleans up the interface.

English and German, more languages can be added.
```

## Category

Productivity

## Single purpose description (required field)

```
Tubeless hides distracting interface elements on youtube.com — feed,
recommendations, comments, Shorts, end cards — and turns off autoplay. That is
the extension's only purpose.
```

## Permission justifications

**`storage`**

```
Stores which of the 38 filters the user has enabled. Without it the settings
would be gone on every tab switch. Only these switch states are stored, no usage
data.
```

**Host permission `*://*.youtube.com/*`**

```
The extension needs to set CSS classes on YouTube pages to hide elements, turn
off autoplay and redirect /shorts/ URLs to the regular player. It touches no
other domain.
```

## Data usage

No collection, no sharing, no selling. All three declarations in the Web Store
form can be answered with "no".
