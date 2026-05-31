const UKRAINIAN = /[абвгґдеєжзиіїйклмнопрстуфхцчшщьюя]/i;

/**
 * Програмно викликає loadOrgName() у контексті сторінки через ін'єкцію <script>.
 * Cloudflare блокує прямий клік, але script-injection обходить цей захист.
 */
export function triggerOrgNameLoad(): void {
  const btn = document.getElementById('btn-orgname') as HTMLButtonElement | null;
  if (!btn) return;
  // Programmatic click — onclick handler runs in main world, no CSP issues
  try {
    btn.click();
    console.log('[CS] Clicked btn-orgname to trigger loadOrgName');
  } catch (e) {
    console.warn('[CS] Failed to click btn-orgname:', e);
  }
}

/** Читає результат loadOrgName з #orgname-result (лише якщо не українська). */
export function getOrgTitle(): string {
  const span = document.getElementById('orgname-result');
  if (!span) return '';
  const text = span.textContent?.trim() ?? '';
  return UKRAINIAN.test(text) ? '' : text;
}

export function isAnimePage(): boolean {
  return /https:\/\/anitube\.in\.ua\/\d+-.+\.html/.test(location.href);
}

export function getTitle(): string {
  // 1) JSON-LD alternateName (non-Ukrainian preferred)
  const ld = document.querySelector('script[type="application/ld+json"]');
  if (ld) {
    try {
      const data = JSON.parse(ld.textContent ?? '');
      if (data.alternateName && !UKRAINIAN.test(data.alternateName)) {
        return data.alternateName.trim();
      }
    } catch {}
  }

  // 2) NUXT embedded data — English/Japanese title
  const nuxt = document.getElementById('__NUXT_DATA__');
  if (nuxt) {
    try {
      const obj = JSON.parse(nuxt.textContent ?? '');
      const anime = obj.data?.[0]?.anime;
      if (anime) {
        const title =
          anime.titleEn || anime.title_en || anime.english_title ||
          anime.titleJp || anime.title_jp || anime.japanese_title;
        if (title?.trim()) return title.trim();
      }
    } catch {}
  }

  // 3) h2[id-mal] text nodes (may be Ukrainian — still useful for Jikan search pre-fill)
  const h2 = document.querySelector('h2[id-mal]');
  if (h2) {
    const text = Array.from(h2.childNodes)
      .filter(n => n.nodeType === Node.TEXT_NODE)
      .map(n => n.textContent?.trim() ?? '')
      .filter(Boolean)
      .join(' ')
      .trim();
    if (text) return text;
  }

  return '';
}

export function getActiveEpisode(): number {
  // 1) Active playlist item
  const activeLi = document.querySelector(
    '.playlists-videos .playlists-items ul li.active',
  );
  if (activeLi) {
    const text = activeLi.textContent?.trim() ?? '';
    const patterns = [
      /^(\d+)\s*серія/i,
      /серія\s*(\d+)/i,
      /^(\d+)\s*episode/i,
      /episode\s*(\d+)/i,
      /^(\d+)\./,
      /^(\d+)\s/,
      /(\d+)$/,
    ];
    for (const p of patterns) {
      const m = text.match(p);
      if (m) return Number(m[1]);
    }
  }

  // 2) Document title
  const titleMatch = document.title.match(
    /(\d+)\s*серія|серія\s*(\d+)|episode\s*(\d+)/i,
  );
  if (titleMatch) {
    return Number(titleMatch[1] ?? titleMatch[2] ?? titleMatch[3]);
  }

  return 0;
}

export function getAnimeYear(): number | undefined {
  // 1) .story_c_r year link (scoped to avoid picking up sidebar/unrelated links)
  const yearLink = document.querySelector('.story_c_r a[href*="/xfsearch/year/"]');
  if (yearLink) {
    const y = parseInt(yearLink.textContent?.trim() ?? '');
    if (!isNaN(y) && y > 1900 && y < 2100) return y;
  }

  // 2) NUXT data
  const nuxt = document.getElementById('__NUXT_DATA__');
  if (nuxt) {
    try {
      const obj = JSON.parse(nuxt.textContent ?? '');
      const anime = obj.data?.[0]?.anime;
      if (anime) {
        const year = anime.year || anime.release_year;
        if (year) return Number(year);
      }
    } catch {}
  }

  return undefined;
}

/**
 * Returns the playlist li element for a given episode number, or null.
 * Used by tracker to programmatically click "resume watching".
 */
export function getPlaylistItem(episode: number): HTMLElement | null {
  const items = document.querySelectorAll<HTMLElement>(
    '.playlists-videos .playlists-items ul li',
  );
  for (const li of items) {
    const text = li.textContent?.trim() ?? '';
    for (const p of [/^(\d+)/, /серія\s*(\d+)/i, /(\d+)$/]) {
      const m = text.match(p);
      if (m && Number(m[1]) === episode) return li;
    }
  }
  return null;
}
