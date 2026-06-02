import { MAL_AUTH_URL, MAL_TOKEN_URL, MAL_CLIENT_ID, MAL_CLIENT_SECRET } from '../utils/config';
import { malToken, malRefresh, codeVerifier } from '../utils/storage';
import { generateVerifier } from '../utils/oauth';
import { getMALUser, checkUserList, addToList, updateEpisode, completeAnime } from '../utils/mal-api';
import { searchAnime, searchAnimeList } from '../utils/jikan';

async function doOAuth(): Promise<{ success: boolean; error?: string; redirectUrl?: string; phase?: 'authorize' | 'token' }> {
  // Computed up-front so it can be surfaced in error responses for debugging:
  // this is the exact redirect URI that must be registered in the MAL app.
  const redirectUrl = chrome.identity.getRedirectURL('provider_cb');
  let phase: 'authorize' | 'token' = 'authorize';

  try {
    const verifier = generateVerifier();
    await codeVerifier.setValue(verifier);

    console.log('[BG][OAuth] Redirect URL:', redirectUrl);

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: MAL_CLIENT_ID,
      redirect_uri: redirectUrl,
      code_challenge: verifier,
      code_challenge_method: 'plain',
    });

    const authUrl = `${MAL_AUTH_URL}?${params}`;
    const resultUrl = await chrome.identity.launchWebAuthFlow({ url: authUrl, interactive: true });

    if (!resultUrl) throw new Error('Auth flow returned no URL');

    // We got a redirect back, so the authorize step succeeded — any failure
    // beyond this point is in the token exchange, not a redirect_uri mismatch.
    phase = 'token';
    const url = new URL(resultUrl);
    const code = url.searchParams.get('code');
    if (!code) throw new Error('No code in redirect URL');

    const storedVerifier = await codeVerifier.getValue();
    const body = new URLSearchParams({
      client_id: MAL_CLIENT_ID,
      client_secret: MAL_CLIENT_SECRET,
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUrl,
      code_verifier: storedVerifier,
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

    console.log('[BG][OAuth] Login successful');
    return { success: true };
  } catch (e: any) {
    console.error('[BG][OAuth] Error:', e.message, '| phase:', phase, '| redirectUrl:', redirectUrl);
    return { success: false, error: e.message, redirectUrl, phase };
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
