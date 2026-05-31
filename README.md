# AniTube → MyAnimeList Sync

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
![Manifest V3](https://img.shields.io/badge/Manifest-V3-blue)
![Browsers](https://img.shields.io/badge/browsers-Chrome%20%7C%20Firefox-orange)
![Built with WXT](https://img.shields.io/badge/built%20with-WXT%20%2B%20React-de3163)

🇬🇧 English · [🇺🇦 Українська](README.uk.md)

Browser extension (Chrome/Firefox, Manifest V3) that automatically tracks watched
anime episodes on [anitube.in.ua](https://anitube.in.ua) and syncs your progress to
[MyAnimeList](https://myanimelist.net).

## Features

- Auto-detects the anime from the anitube page (with manual search as a fallback)
- Sequential watching (episode N → N+1) writes progress to MAL instantly
- When you jump across episodes, it asks where to continue or which episode to set
- Offers to rate the anime after the final episode
- Persistent panel with progress, studio, genres and score; collapses into a button
- UA / EN interface with an in-extension language switch

## Screenshots

| Status panel | Episode choice | Popup |
|---|---|---|
| ![Status panel](docs/screenshots/panel-status.png) | ![Episode choice](docs/screenshots/panel-choice.png) | ![Popup](docs/screenshots/popup.png) |

## Tech

[WXT](https://wxt.dev) + React + TypeScript. OAuth/API logic lives in the background
service worker; the content script only reads the page and renders the UI.

## Development

```bash
npm install
cp .env.example .env   # fill in your MAL app credentials (see below)
npm run dev            # Chrome with HMR
npm run dev:firefox    # Firefox
npm run build          # production build (Chrome)
npm run build:firefox
npm test               # unit tests (Vitest)
npm run compile        # type-check
```

The built extension lands in `.output/chrome-mv3/` — load it via
`chrome://extensions` → "Load unpacked".

### MAL application

MAL credentials are **not** committed — they are injected at build time from `.env`.
Register an app at [MAL API](https://myanimelist.net/apiconfig) and set
`WXT_MAL_CLIENT_ID` and `WXT_MAL_CLIENT_SECRET` in your `.env`. The app's redirect URI
must match what `chrome.identity.getRedirectURL('provider_cb')` returns for your build.
Auth uses OAuth2 + PKCE (MAL requires the client secret for the token exchange).

> ⚠️ A bundled extension cannot truly hide secrets — the built artifact contains these
> keys. `.env` only keeps them out of the public repository.

## Reporting bugs

Open an [issue](https://github.com/Snejn1y/anitibe_mal_extension/issues/new) — there is
also a button for it inside the extension (the "About" tab).

## License

[MIT](LICENSE)
