const CACHE_PREFIX = 'anitube_cache_';
const TTL_MS = 30 * 24 * 60 * 60 * 1000;

export interface CachedAnime {
  malId: number;
  title: string;
  totalEpisodes: number;
  imageUrl: string;
  cachedAt: number;
  // Optional: present for newly-cached entries, absent for ones cached before
  // these fields were added (graceful degradation).
  year?: number | null;
  type?: string;
  score?: number | null;
  studios?: string[];
  genres?: string[];
}

export function getCachedAnime(url: string): CachedAnime | null {
  const key = CACHE_PREFIX + url;
  const raw = localStorage.getItem(key);
  if (!raw) return null;

  try {
    const data = JSON.parse(raw) as CachedAnime;
    if (Date.now() - data.cachedAt > TTL_MS) {
      localStorage.removeItem(key);
      return null;
    }
    return data;
  } catch {
    localStorage.removeItem(key);
    return null;
  }
}

export function setCachedAnime(url: string, anime: Omit<CachedAnime, 'cachedAt'>): void {
  const key = CACHE_PREFIX + url;
  localStorage.setItem(key, JSON.stringify({ ...anime, cachedAt: Date.now() }));
}
