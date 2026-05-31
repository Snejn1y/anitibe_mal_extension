import { describe, it, expect, vi, beforeEach } from 'vitest';
import { searchAnime, searchAnimeList } from '~/utils/jikan';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

const makeJikanResponse = (items: any[]) => ({
  ok: true,
  json: async () => ({ data: items }),
});

const fakeAnime = {
  mal_id: 20,
  title: 'Naruto',
  episodes: 220,
  year: 2002,
  images: { jpg: { image_url: 'https://cdn.myanimelist.net/naruto.jpg' } },
};

beforeEach(() => {
  mockFetch.mockReset();
});

describe('searchAnime', () => {
  it('returns null when fetch fails', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 500 });
    expect(await searchAnime('Naruto')).toBeNull();
  });

  it('returns null when no results', async () => {
    mockFetch.mockResolvedValue(makeJikanResponse([]));
    expect(await searchAnime('Naruto')).toBeNull();
  });

  it('returns first result when no year filter', async () => {
    mockFetch.mockResolvedValue(makeJikanResponse([fakeAnime]));
    const result = await searchAnime('Naruto');
    expect(result).toMatchObject({ malId: 20, title: 'Naruto', totalEpisodes: 220 });
  });

  it('filters by year with +-1 tolerance', async () => {
    const wrong = { ...fakeAnime, mal_id: 99, year: 2010 };
    mockFetch.mockResolvedValue(makeJikanResponse([wrong, fakeAnime]));
    const result = await searchAnime('Naruto', 2002);
    expect(result?.malId).toBe(20);
  });

  it('falls back to first result if year filter removes all', async () => {
    mockFetch.mockResolvedValue(makeJikanResponse([fakeAnime]));
    // fakeAnime.year=2002, searching with year=1999 (tolerance +-1 = 1998-2000), no match
    const result = await searchAnime('Naruto', 1999);
    expect(result?.malId).toBe(20);
  });
});

describe('searchAnimeList', () => {
  it('returns empty array when fetch fails', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 500 });
    expect(await searchAnimeList('Naruto')).toEqual([]);
  });

  it('returns mapped list', async () => {
    mockFetch.mockResolvedValue(makeJikanResponse([fakeAnime]));
    const results = await searchAnimeList('Naruto');
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({ malId: 20, title: 'Naruto' });
  });
});
