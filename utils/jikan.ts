const JIKAN_URL = 'https://api.jikan.moe/v4';

export interface JikanAnime {
  malId: number;
  title: string;
  totalEpisodes: number;
  imageUrl: string;
  year: number | null;
  type: string;
  score: number | null;
  studios: string[];
  genres: string[];
}

function mapAnime(a: any): JikanAnime {
  return {
    malId: a.mal_id,
    title: a.title,
    totalEpisodes: a.episodes ?? 0,
    imageUrl: a.images?.jpg?.image_url ?? '',
    year: a.year ?? a.aired?.prop?.from?.year ?? null,
    type: a.type ?? '',
    score: a.score ?? null,
    studios: Array.isArray(a.studios) ? a.studios.map((s: any) => s.name).filter(Boolean) : [],
    genres: Array.isArray(a.genres) ? a.genres.map((g: any) => g.name).filter(Boolean) : [],
  };
}

export async function searchAnime(title: string, year?: number): Promise<JikanAnime | null> {
  const params = new URLSearchParams({ q: title, limit: '5' });
  const res = await fetch(`${JIKAN_URL}/anime?${params}`);
  if (!res.ok) return null;

  const data = await res.json();
  const results: any[] = data.data ?? [];
  if (!results.length) return null;

  let filtered = results;
  if (year !== undefined) {
    filtered = results.filter(a => a.year && Math.abs(a.year - year) <= 1);
  }

  return mapAnime(filtered.length > 0 ? filtered[0] : results[0]);
}

export async function searchAnimeList(query: string): Promise<JikanAnime[]> {
  const params = new URLSearchParams({ q: query, limit: '10' });
  const res = await fetch(`${JIKAN_URL}/anime?${params}`);
  if (!res.ok) return [];

  const data = await res.json();
  return (data.data ?? []).map(mapAnime);
}
