# Privacy Policy — AniTube → MyAnimeList Sync

_Last updated: 2026-05-31_

This extension is designed to handle as little data as possible. It has no analytics,
no third-party servers and no advertising.

## What the extension stores

Everything is stored **locally in your browser** (`chrome.storage` / `localStorage`):

- **MyAnimeList access & refresh tokens** — obtained when you sign in, used to read and
  update your anime list. Stored in `chrome.storage.sync`.
- **UI language preference** (UA/EN).
- **A cache of identified anime** (title, MAL id, poster URL) per page, to avoid repeated
  lookups. Stored in `localStorage`, expires after 30 days.

The extension never sees or stores your MyAnimeList password — sign-in goes through
MyAnimeList's own OAuth page.

## What is sent, and where

The extension communicates only with:

- **anitube.in.ua** — the page is read locally to detect the anime title and current
  episode. Nothing is sent to anitube.
- **api.jikan.moe** (Jikan, a public MyAnimeList API) — anonymous requests with the anime
  title to find the matching entry. No personal data is included.
- **myanimelist.net / api.myanimelist.net** — reading and updating *your* list, authenticated
  with your token.

No data is sent to the extension author or any other party.

## Data sharing & sale

Your data is **not** sold, rented, or shared with anyone. It is used solely to provide the
sync functionality you requested.

## Your control

- Sign out anytime from the extension popup — this removes the stored tokens.
- You can also revoke access from your
  [MyAnimeList account settings](https://myanimelist.net/apiconfig).
- Removing the extension deletes all locally stored data.

## Contact

Questions or requests: open an
[issue](https://github.com/Snejn1y/anitibe_mal_extension/issues) or email dev@simbioz.ua.
