// Public OAuth client: with PKCE (plain) MAL accepts the token exchange using only
// the client_id + code_verifier, so there is NO client secret to keep. The client_id
// is not sensitive — it is sent in the authorize URL and visible to users anyway.
export const MAL_CLIENT_ID = '724019fbc01e3c28e0fc4f29911cd2f9';
export const MAL_AUTH_URL = 'https://myanimelist.net/v1/oauth2/authorize';
export const MAL_TOKEN_URL = 'https://myanimelist.net/v1/oauth2/token';
export const MAL_API_URL = 'https://api.myanimelist.net/v2';

// TODO: замінити на реальний репозиторій, коли він зʼявиться.
export const REPO_URL = 'https://github.com/Snejn1y/anitibe_mal_extension';
export const BUG_REPORT_URL = `${REPO_URL}/issues/new`;
