import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  isAnimePage,
  getTitle,
  getActiveEpisode,
  getAnimeYear,
  getOrgTitle,
  getPlaylistItem,
} from '~/content/parser';

beforeEach(() => {
  document.body.innerHTML = '';
  document.head.innerHTML = '';
  document.title = '';
  Object.defineProperty(location, 'href', {
    value: 'https://anitube.in.ua/1234-naruto.html',
    configurable: true,
  });
});

// ── isAnimePage ───────────────────────────────────────────────────

describe('isAnimePage', () => {
  it('returns false for non-anime URL', () => {
    Object.defineProperty(location, 'href', { value: 'https://anitube.in.ua/', configurable: true });
    expect(isAnimePage()).toBe(false);
  });

  it('returns true for anime page URL pattern', () => {
    Object.defineProperty(location, 'href', { value: 'https://anitube.in.ua/1234-naruto.html', configurable: true });
    expect(isAnimePage()).toBe(true);
  });

  it('returns false for search pages', () => {
    Object.defineProperty(location, 'href', { value: 'https://anitube.in.ua/search/?q=naruto', configurable: true });
    expect(isAnimePage()).toBe(false);
  });
});

// ── getTitle ──────────────────────────────────────────────────────

describe('getTitle', () => {
  it('returns empty string when nothing found', () => {
    document.body.innerHTML = '<div></div>';
    expect(getTitle()).toBe('');
  });

  it('reads title from h2[id-mal] text nodes', () => {
    const h2 = document.createElement('h2');
    h2.setAttribute('id-mal', '1');
    h2.appendChild(document.createTextNode('Naruto'));
    const span = document.createElement('span');
    span.textContent = 'something';
    h2.appendChild(span);
    document.body.appendChild(h2);
    expect(getTitle()).toBe('Naruto');
  });

  it('prefers JSON-LD alternateName when not Ukrainian', () => {
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify({ alternateName: 'Naruto' });
    document.head.appendChild(script);
    const h2 = document.createElement('h2');
    h2.setAttribute('id-mal', '1');
    h2.textContent = 'Наруто';
    document.body.appendChild(h2);
    expect(getTitle()).toBe('Naruto');
  });

  it('ignores JSON-LD alternateName when Ukrainian, falls back to h2', () => {
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify({ alternateName: 'Наруто' });
    document.head.appendChild(script);
    const h2 = document.createElement('h2');
    h2.setAttribute('id-mal', '1');
    h2.appendChild(document.createTextNode('Naruto'));
    document.body.appendChild(h2);
    expect(getTitle()).toBe('Naruto');
  });

  it('reads title from NUXT data titleEn', () => {
    const nuxt = document.createElement('script');
    nuxt.id = '__NUXT_DATA__';
    nuxt.textContent = JSON.stringify({ data: [{ anime: { titleEn: 'Naruto Shippuden' } }] });
    document.body.appendChild(nuxt);
    expect(getTitle()).toBe('Naruto Shippuden');
  });

  it('handles invalid JSON in NUXT data gracefully', () => {
    const nuxt = document.createElement('script');
    nuxt.id = '__NUXT_DATA__';
    nuxt.textContent = '{bad json}}';
    document.body.appendChild(nuxt);
    expect(getTitle()).toBe('');
  });
});

// ── getOrgTitle ───────────────────────────────────────────────────

describe('getOrgTitle', () => {
  it('returns empty string when span absent', () => {
    expect(getOrgTitle()).toBe('');
  });

  it('returns empty string when span has Ukrainian text', () => {
    const span = document.createElement('span');
    span.id = 'orgname-result';
    span.textContent = 'Наруто';
    document.body.appendChild(span);
    expect(getOrgTitle()).toBe('');
  });

  it('returns text when span has non-Ukrainian text', () => {
    const span = document.createElement('span');
    span.id = 'orgname-result';
    span.textContent = 'Naruto Shippuden';
    document.body.appendChild(span);
    expect(getOrgTitle()).toBe('Naruto Shippuden');
  });

  it('returns empty string when span is empty', () => {
    const span = document.createElement('span');
    span.id = 'orgname-result';
    document.body.appendChild(span);
    expect(getOrgTitle()).toBe('');
  });
});

// ── getActiveEpisode ──────────────────────────────────────────────

describe('getActiveEpisode', () => {
  it('returns 0 when nothing found', () => {
    document.body.innerHTML = '<div></div>';
    expect(getActiveEpisode()).toBe(0);
  });

  it('parses episode from active playlist item "N серія" format', () => {
    document.body.innerHTML = `
      <div class="playlists-videos">
        <div class="playlists-items">
          <ul>
            <li>1 серія</li>
            <li class="active">5 серія</li>
          </ul>
        </div>
      </div>`;
    expect(getActiveEpisode()).toBe(5);
  });

  it('parses episode from active playlist item "серія N" format', () => {
    document.body.innerHTML = `
      <div class="playlists-videos">
        <div class="playlists-items">
          <ul>
            <li class="active">серія 12</li>
          </ul>
        </div>
      </div>`;
    expect(getActiveEpisode()).toBe(12);
  });

  it('falls back to document title when no active item', () => {
    document.title = 'Naruto — 7 серія';
    document.body.innerHTML = '<div class="playlists-videos"><div class="playlists-items"><ul></ul></div></div>';
    expect(getActiveEpisode()).toBe(7);
  });

  it('returns 0 when active item has no parseable episode', () => {
    document.body.innerHTML = `
      <div class="playlists-videos">
        <div class="playlists-items">
          <ul><li class="active">ОВА</li></ul>
        </div>
      </div>`;
    expect(getActiveEpisode()).toBe(0);
  });
});

// ── getAnimeYear ──────────────────────────────────────────────────

describe('getAnimeYear', () => {
  it('returns undefined when nothing found', () => {
    document.body.innerHTML = '<div></div>';
    expect(getAnimeYear()).toBeUndefined();
  });

  it('reads year from story_c_r year link', () => {
    document.body.innerHTML = `
      <div class="story_c_r">
        <a href="/xfsearch/year/2002">2002</a>
      </div>`;
    expect(getAnimeYear()).toBe(2002);
  });

  it('reads year from NUXT data', () => {
    const nuxt = document.createElement('script');
    nuxt.id = '__NUXT_DATA__';
    nuxt.textContent = JSON.stringify({ data: [{ anime: { year: 2007 } }] });
    document.body.appendChild(nuxt);
    expect(getAnimeYear()).toBe(2007);
  });

  it('ignores year links outside valid range', () => {
    document.body.innerHTML = `<a href="/xfsearch/year/1800">1800</a>`;
    expect(getAnimeYear()).toBeUndefined();
  });
});

// ── getPlaylistItem ───────────────────────────────────────────────

describe('getPlaylistItem', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div class="playlists-videos">
        <div class="playlists-items">
          <ul>
            <li>1 серія</li>
            <li>2 серія</li>
            <li>серія 3</li>
            <li>10 серія</li>
          </ul>
        </div>
      </div>`;
  });

  it('returns the correct li for a matching episode', () => {
    const li = getPlaylistItem(2);
    expect(li).not.toBeNull();
    expect(li!.textContent?.trim()).toBe('2 серія');
  });

  it('returns correct li for "серія N" format', () => {
    const li = getPlaylistItem(3);
    expect(li).not.toBeNull();
    expect(li!.textContent?.trim()).toBe('серія 3');
  });

  it('returns correct li for two-digit episode', () => {
    const li = getPlaylistItem(10);
    expect(li).not.toBeNull();
    expect(li!.textContent?.trim()).toBe('10 серія');
  });

  it('returns null when episode not found', () => {
    expect(getPlaylistItem(99)).toBeNull();
  });
});
