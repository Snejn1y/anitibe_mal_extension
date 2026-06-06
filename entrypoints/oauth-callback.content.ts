import { parseCallbackParams } from '../utils/oauth-callback';

// Injected on the self-hosted OAuth callback page. Reads the code/state that MAL
// appended to the URL and relays them to the background, which performs the token
// exchange and closes this tab.
export default defineContentScript({
  matches: ['https://snejn1y.github.io/anitibe_mal_extension/oauth/*'],

  async main() {
    const params = parseCallbackParams(window.location.search);
    console.log('[OAuthCB] Relaying callback params', { hasCode: !!params.code });
    await browser.runtime.sendMessage({ action: 'oauthCallback', ...params });
  },
});
