import { MAL_API_URL } from './config';

export interface MALUser {
  name: string;
  picture?: string;
}

export async function getMALUser(token: string): Promise<MALUser> {
  const res = await fetch(`${MAL_API_URL}/users/@me?fields=name,picture`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`MAL user fetch failed: ${res.status}`);
  return res.json();
}

export interface UserListStatus {
  status: string;
  num_watched_episodes: number;
}

/**
 * MAL API v2 has no GET on `/anime/{id}/my_list_status` (that sub-resource only
 * supports PATCH/DELETE). The list status is read via the anime resource itself
 * with `fields=my_list_status`; the field is absent when the anime isn't in the
 * user's list. Note MAL's naming quirk: the PATCH body uses `num_watched_episodes`
 * but the response field is `num_episodes_watched`.
 */
export async function checkUserList(token: string, malId: number): Promise<UserListStatus | null> {
  const res = await fetch(`${MAL_API_URL}/anime/${malId}?fields=my_list_status`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`checkUserList failed: ${res.status}`);

  const data = await res.json();
  const s = data?.my_list_status;
  if (!s) return null;

  return {
    status: s.status,
    num_watched_episodes: s.num_episodes_watched ?? s.num_watched_episodes ?? 0,
  };
}

export async function addToList(token: string, malId: number): Promise<void> {
  const res = await fetch(`${MAL_API_URL}/anime/${malId}/my_list_status`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ status: 'watching' }),
  });
  if (!res.ok) throw new Error(`addToList failed: ${res.status}`);
}

export async function updateEpisode(token: string, malId: number, episode: number): Promise<void> {
  const res = await fetch(`${MAL_API_URL}/anime/${malId}/my_list_status`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ num_watched_episodes: String(episode) }),
  });
  if (!res.ok) throw new Error(`updateEpisode failed: ${res.status}`);
}

export async function completeAnime(token: string, malId: number, score: number): Promise<void> {
  const body: Record<string, string> = { status: 'completed' };
  if (score > 0) body.score = String(score);
  const res = await fetch(`${MAL_API_URL}/anime/${malId}/my_list_status`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams(body),
  });
  if (!res.ok) throw new Error(`completeAnime failed: ${res.status}`);
}
