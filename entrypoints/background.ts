import { MAL_AUTH_URL, MAL_TOKEN_URL, MAL_CLIENT_ID, MAL_CLIENT_SECRET, OAUTH_REDIRECT_URL } from '../utils/config';
import { malToken, malRefresh, codeVerifier, oauthState } from '../utils/storage';
import { generateVerifier, generateState } from '../utils/oauth';
import { getMALUser, checkUserList, addToList, updateEpisode, completeAnime } from '../utils/mal-api';
import { searchAnime, searchAnimeList } from '../utils/jikan';

type PendingAuth = {
  state: string;
  resolve: (r: { success: boolean; error?: string }) => void;
  tabId?: number;
  cleanup: () => void;
};

let pendingAuth: PendingAuth | null = null;

async function doOAuth(): Promise<{ success: boolean; error?: string }> {
  try {
    if (pendingAuth) {
      const prev = pendingAuth;
      pendingAuth = null;
      prev.cleanup();
      prev.resolve({ success: false, error: 'Login superseded by a new attempt' });
    }

    const verifier = generateVerifier();
    const state = generateState();
    await codeVerifier.setValue(verifier);
    await oauthState.setValue(state);

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: MAL_CLIENT_ID,
      redirect_uri: OAUTH_REDIRECT_URL,
      code_challenge: verifier,
      code_challenge_method: 'plain',
      state,
    });

    const authUrl = `${MAL_AUTH_URL}?${params}`;
    console.log('[BG][OAuth] Opening auth tab; redirect_uri:', OAUTH_REDIRECT_URL);

    const tab = await browser.tabs.create({ url: authUrl });

    return await new Promise<{ success: boolean; error?: string }>((resolve) => {
      const onRemoved = (closedId: number) => {
        if (pendingAuth && closedId === pendingAuth.tabId) {
          const p = pendingAuth;
          pendingAuth = null;
          p.cleanup();
          p.resolve({ success: false, error: 'Authorization cancelled' });
        }
      };
      browser.tabs.onRemoved.addListener(onRemoved);

      pendingAuth = {
        state,
        resolve,
        tabId: tab.id,
        cleanup: () => browser.tabs.onRemoved.removeListener(onRemoved),
      };
    });
  } catch (e: any) {
    console.error('[BG][OAuth] Error:', e.message);
    return { success: false, error: e.message };
  }
}

async function handleOAuthCallback(
  msg: { code?: string; state?: string; error?: string },
  senderTabId?: number,
): Promise<void> {
  const closeTab = () => {
    if (senderTabId !== undefined) browser.tabs.remove(senderTabId).catch(() => {});
  };
  // Resolve the in-memory login promise if this worker still holds one. After an
  // MV3 service-worker restart pendingAuth is null — the token exchange below still
  // completes, and the popup learns it succeeded via getAuthStatus on next open.
  const resolveLogin = (r: { success: boolean; error?: string }) => {
    if (pendingAuth) {
      const p = pendingAuth;
      pendingAuth = null;
      p.cleanup();
      p.resolve(r);
    }
  };

  // Provider-reported error (e.g. the user denied consent): abort the flow. Handled
  // before the state check because error redirects may omit the state parameter.
  if (msg.error) {
    console.error('[BG][OAuth] Provider returned error:', msg.error);
    await oauthState.setValue('');
    closeTab();
    resolveLogin({ success: false, error: msg.error });
    return;
  }

  // CSRF: validate against the persisted state so the check survives worker restarts.
  const expectedState = await oauthState.getValue();
  if (!expectedState || msg.state !== expectedState) {
    console.warn('[BG][OAuth] State mismatch — ignoring callback');
    return;
  }

  if (!msg.code) {
    closeTab();
    resolveLogin({ success: false, error: 'No code in callback' });
    return;
  }

  try {
    const verifier = await codeVerifier.getValue();
    const body = new URLSearchParams({
      client_id: MAL_CLIENT_ID,
      client_secret: MAL_CLIENT_SECRET,
      grant_type: 'authorization_code',
      code: msg.code,
      redirect_uri: OAUTH_REDIRECT_URL,
      code_verifier: verifier,
    });

    const tokenRes = await fetch(MAL_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      throw new Error(`Token exchange failed: ${tokenRes.status} ${err}`);
    }

    const tokens = await tokenRes.json();
    await malToken.setValue(tokens.access_token);
    await malRefresh.setValue(tokens.refresh_token);
    await codeVerifier.setValue('');
    await oauthState.setValue('');

    console.log('[BG][OAuth] Login successful');
    closeTab();
    resolveLogin({ success: true });
  } catch (e: any) {
    console.error('[BG][OAuth] Token exchange error:', e.message);
    closeTab();
    resolveLogin({ success: false, error: e.message });
  }
}

async function doRefresh(): Promise<{ success: boolean; error?: string }> {
  try {
    const refresh = await malRefresh.getValue();
    if (!refresh) throw new Error('No refresh token stored');

    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refresh,
      client_id: MAL_CLIENT_ID,
      client_secret: MAL_CLIENT_SECRET,
    });

    const res = await fetch(MAL_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });

    if (!res.ok) throw new Error(`Refresh failed: ${res.status}`);

    const tokens = await res.json();
    await malToken.setValue(tokens.access_token);
    await malRefresh.setValue(tokens.refresh_token);

    console.log('[BG][Refresh] Token refreshed');
    return { success: true };
  } catch (e: any) {
    console.error('[BG][Refresh] Error:', e.message);
    return { success: false, error: e.message };
  }
}

async function doLogout(): Promise<{ success: boolean }> {
  await malToken.setValue('');
  await malRefresh.setValue('');
  console.log('[BG] Logged out');
  return { success: true };
}

async function getAuthStatus(): Promise<{ success: boolean; data: { isLoggedIn: boolean; user?: { name: string; picture?: string } } }> {
  const token = await malToken.getValue();
  if (!token) return { success: true, data: { isLoggedIn: false } };

  try {
    const user = await getMALUser(token);
    return { success: true, data: { isLoggedIn: true, user } };
  } catch {
    // Token likely expired — try refresh
    const refreshResult = await doRefresh();
    if (!refreshResult.success) return { success: true, data: { isLoggedIn: false } };

    try {
      const newToken = await malToken.getValue();
      const user = await getMALUser(newToken);
      return { success: true, data: { isLoggedIn: true, user } };
    } catch {
      return { success: true, data: { isLoggedIn: false } };
    }
  }
}

async function withToken<T>(fn: (token: string) => Promise<T>): Promise<T> {
  const token = await malToken.getValue();
  try {
    return await fn(token);
  } catch (e: any) {
    if (e.message?.includes('401')) {
      const refreshResult = await doRefresh();
      if (!refreshResult.success) throw e;
      const newToken = await malToken.getValue();
      return await fn(newToken);
    }
    throw e;
  }
}

export default defineBackground(() => {
  console.log('[BG] Service worker started');

  browser.runtime.onMessage.addListener((message: any, _sender, sendResponse) => {
    const { action } = message;

    if (action === 'login') {
      doOAuth().then(sendResponse);
      return true;
    }
    if (action === 'oauthCallback') {
      const { code, state, error } = message;
      handleOAuthCallback({ code, state, error }, _sender?.tab?.id).then(() => sendResponse({ success: true }));
      return true;
    }
    if (action === 'logout') {
      doLogout().then(sendResponse);
      return true;
    }
    if (action === 'refresh') {
      doRefresh().then(sendResponse);
      return true;
    }
    if (action === 'getAuthStatus') {
      getAuthStatus()
        .then(sendResponse)
        .catch(() => sendResponse({ success: true, data: { isLoggedIn: false } }));
      return true;
    }

    if (action === 'identifyAnime') {
      const { title, year } = message;
      searchAnime(title, year)
        .then(result => sendResponse({ success: true, data: result }))
        .catch((e: any) => sendResponse({ success: false, error: e.message }));
      return true;
    }

    if (action === 'manualSearch') {
      const { query } = message;
      searchAnimeList(query)
        .then(results => sendResponse({ success: true, data: results }))
        .catch((e: any) => sendResponse({ success: false, error: e.message }));
      return true;
    }

    if (action === 'checkUserList') {
      const { malId } = message;
      withToken(token => checkUserList(token, malId))
        .then(data => sendResponse({ success: true, data }))
        .catch((e: any) => sendResponse({ success: false, error: e.message }));
      return true;
    }

    if (action === 'addToList') {
      const { malId } = message;
      withToken(token => addToList(token, malId))
        .then(() => sendResponse({ success: true }))
        .catch((e: any) => sendResponse({ success: false, error: e.message }));
      return true;
    }

    if (action === 'updateEpisode') {
      const { malId, episode } = message;
      withToken(token => updateEpisode(token, malId, episode))
        .then(() => sendResponse({ success: true }))
        .catch((e: any) => sendResponse({ success: false, error: e.message }));
      return true;
    }

    if (action === 'completeAnime') {
      const { malId, score } = message;
      withToken(token => completeAnime(token, malId, score))
        .then(() => sendResponse({ success: true }))
        .catch((e: any) => sendResponse({ success: false, error: e.message }));
      return true;
    }
  });
});
