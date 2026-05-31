// MAL credentials are injected at build time from .env (WXT_* vars), so they are
// not committed to the repo. Copy .env.example → .env and fill in your own MAL app
// (https://myanimelist.net/apiconfig). MAL requires the client secret for the PKCE
// token exchange. Note: bundled extensions can't truly hide secrets — see README.
export const MAL_CLIENT_ID = import.meta.env.WXT_MAL_CLIENT_ID;
export const MAL_CLIENT_SECRET = import.meta.env.WXT_MAL_CLIENT_SECRET;
export const MAL_AUTH_URL = 'https://myanimelist.net/v1/oauth2/authorize';
export const MAL_TOKEN_URL = 'https://myanimelist.net/v1/oauth2/token';
export const MAL_API_URL = 'https://api.myanimelist.net/v2';

// TODO: замінити на реальний репозиторій, коли він зʼявиться.
export const REPO_URL = 'https://github.com/Snejn1y/anitibe_mal_extension';
export const BUG_REPORT_URL = `${REPO_URL}/issues/new`;
