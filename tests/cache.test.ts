import { describe, it, expect, beforeEach } from 'vitest';
import { getCachedAnime, setCachedAnime } from '~/utils/cache';

const fakeAnime = {
  malId: 1,
  title: 'Naruto',
  totalEpisodes: 220,
  imageUrl: 'https://example.com/img.jpg',
};

beforeEach(() => {
  localStorage.clear();
});

describe('getCachedAnime', () => {
  it('returns null when nothing cached', () => {
    expect(getCachedAnime('https://anitube.in.ua/anime/naruto')).toBeNull();
  });

  it('returns cached anime within TTL', () => {
    setCachedAnime('https://anitube.in.ua/anime/naruto', fakeAnime);
    const result = getCachedAnime('https://anitube.in.ua/anime/naruto');
    expect(result).toMatchObject(fakeAnime);
  });

  it('returns null and removes entry after TTL expires', () => {
    setCachedAnime('https://anitube.in.ua/anime/naruto', fakeAnime);
    const key = 'anitube_cache_https://anitube.in.ua/anime/naruto';
    const entry = JSON.parse(localStorage.getItem(key)!);
    entry.cachedAt = Date.now() - 31 * 24 * 60 * 60 * 1000;
    localStorage.setItem(key, JSON.stringify(entry));

    expect(getCachedAnime('https://anitube.in.ua/anime/naruto')).toBeNull();
    expect(localStorage.getItem(key)).toBeNull();
  });

  it('returns null and clears key when localStorage contains corrupt JSON', () => {
    const key = 'anitube_cache_https://anitube.in.ua/anime/naruto';
    localStorage.setItem(key, 'not valid json{{');
    expect(getCachedAnime('https://anitube.in.ua/anime/naruto')).toBeNull();
    expect(localStorage.getItem(key)).toBeNull();
  });
});

describe('setCachedAnime', () => {
  it('stores cachedAt timestamp', () => {
    const before = Date.now();
    setCachedAnime('https://anitube.in.ua/anime/naruto', fakeAnime);
    const key = 'anitube_cache_https://anitube.in.ua/anime/naruto';
    const stored = JSON.parse(localStorage.getItem(key)!);
    expect(stored.cachedAt).toBeGreaterThanOrEqual(before);
    expect(stored.cachedAt).toBeLessThanOrEqual(Date.now());
  });
});
