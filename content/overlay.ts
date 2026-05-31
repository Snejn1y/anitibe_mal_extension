import type { JikanAnime } from '~/utils/jikan';

/**
 * A single persistent panel pinned to the top-right of the page.
 *
 * Unlike transient popups, this panel is created once and stays in the DOM for
 * the whole session. Each state (identification, status, non-sequential choice,
 * rating, …) rewrites the panel BODY in place. The panel never disappears on its
 * own — the user can only collapse it to a small floating button via the "−"
 * header button, then restore it by clicking that button.
 *
 * There are no bottom toasts: all feedback (success, error, progress) is shown
 * inside this panel.
 */

const PANEL_ID = 'ov-panel';
const FAB_ID = 'ov-fab';

// ── Small DOM helpers ───────────────────────────────────────────────

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

// ── Inline SVG icons (Lucide-style, currentColor) ───────────────────

const SVG_NS = 'http://www.w3.org/2000/svg';

function svgIcon(
  paths: { d: string }[],
  opts: { filled?: boolean; size?: number } = {},
): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg');
  const s = opts.size ?? 15;
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', String(s));
  svg.setAttribute('height', String(s));
  svg.setAttribute('aria-hidden', 'true');
  svg.classList.add('ov-ic');
  if (opts.filled) {
    svg.setAttribute('fill', 'currentColor');
  } else {
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '2.4');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
  }
  for (const p of paths) {
    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', p.d);
    svg.appendChild(path);
  }
  return svg;
}

const iconPlay  = () => svgIcon([{ d: 'M7 5v14l11-7z' }], { filled: true });
const iconCheck = () => svgIcon([{ d: 'M20 6 9 17l-5-5' }]);
const iconFlag  = () => svgIcon([{ d: 'M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z' }, { d: 'M4 22v-7' }]);
const iconStar  = (size = 15) => svgIcon([{ d: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14l-5-4.87 6.91-1.01L12 2z' }], { filled: true, size });

function button(
  label: string,
  variant: 'primary' | 'secondary' | 'ghost',
  onClick: () => void,
  icon?: () => SVGSVGElement,
): HTMLButtonElement {
  const b = el('button', `ov-btn ov-btn-${variant}`);
  if (icon) b.appendChild(icon());
  b.appendChild(el('span', undefined, label));
  b.onclick = onClick;
  return b;
}

/** Update a button's label text without removing its icon. */
function setBtnLabel(b: HTMLButtonElement, text: string): void {
  const span = b.querySelector('span');
  if (span) span.textContent = text;
  else b.textContent = text;
}

// ── Poster zoom preview ─────────────────────────────────────────────
// A magnified poster shown beside the panel on hover / click. Rendered on
// <body> (not inside the clipped panel) so it isn't cut off.

const ZOOM_ID = 'ov-poster-zoom';
const ZOOM_W = 200;
const ZOOM_H_EST = 286;
let zoomEl: HTMLElement | null = null;
let zoomPinned = false;

function placeZoom(zoom: HTMLElement, anchor: HTMLElement): void {
  const r = anchor.getBoundingClientRect();
  const gap = 12;
  let left = r.left - ZOOM_W - gap;
  if (left < 8) left = r.right + gap; // no room on the left → flip to the right
  let top = r.top + r.height / 2 - ZOOM_H_EST / 2;
  top = Math.max(8, Math.min(top, window.innerHeight - ZOOM_H_EST - 8));
  zoom.style.left = `${left}px`;
  zoom.style.top = `${top}px`;
}

function openPosterZoom(imageUrl: string, anchor: HTMLElement): void {
  if (zoomEl) return; // already open
  const zoom = el('img', 'ov-poster-zoom') as HTMLImageElement;
  zoom.id = ZOOM_ID;
  zoom.src = imageUrl;
  zoom.alt = '';
  document.body.appendChild(zoom);
  placeZoom(zoom, anchor);
  zoomEl = zoom;
}

function closePosterZoom(force = false): void {
  if (zoomPinned && !force) return;
  if (force) zoomPinned = false;
  const z = zoomEl ?? document.getElementById(ZOOM_ID);
  zoomEl = null;
  if (!z) return;
  z.classList.add('ov-poster-zoom-hide');
  z.addEventListener('animationend', () => z.remove(), { once: true });
}

/** Anime metadata shown next to the poster. */
interface RowMeta {
  title: string;
  imageUrl?: string;
  year?: number | null;
  totalEpisodes?: number;
  type?: string;
  score?: number | null;
  studios?: string[];
  genres?: string[];
}

const MAX_GENRES = 3;

/** Poster + title + meta (year · type · score · episodes, studio, genres). */
function animeRow(opts: RowMeta): HTMLElement {
  const row = el('div', 'ov-anime-row');

  const poster = el('img', 'ov-anime-poster');
  if (opts.imageUrl) poster.src = opts.imageUrl;
  poster.alt = '';
  poster.onerror = () => poster.removeAttribute('src');

  if (opts.imageUrl) {
    const url = opts.imageUrl;
    poster.classList.add('ov-anime-poster-zoomable');
    poster.tabIndex = 0;
    poster.setAttribute('role', 'button');
    poster.setAttribute('aria-label', 'Збільшити постер');
    poster.addEventListener('mouseenter', () => openPosterZoom(url, poster));
    poster.addEventListener('mouseleave', () => closePosterZoom());
    poster.addEventListener('focus', () => openPosterZoom(url, poster));
    poster.addEventListener('blur', () => closePosterZoom());
    const toggle = () => {
      zoomPinned = !zoomPinned;
      if (zoomPinned) openPosterZoom(url, poster);
      else closePosterZoom(true);
    };
    poster.addEventListener('click', toggle);
    poster.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
    });
  }

  const info = el('div', 'ov-anime-info');
  const title = el('div', 'ov-anime-title', opts.title);
  info.appendChild(title);

  // Badges: year · type · score · episodes
  const meta = el('div', 'ov-anime-meta');
  if (opts.year) meta.appendChild(el('span', undefined, String(opts.year)));
  if (opts.type && opts.type.toLowerCase() !== 'unknown') meta.appendChild(el('span', undefined, opts.type));
  if (opts.score) {
    const scoreBadge = el('span', 'ov-badge-score');
    scoreBadge.append(iconStar(11), document.createTextNode(opts.score.toFixed(1)));
    meta.appendChild(scoreBadge);
  }
  if (opts.totalEpisodes) meta.appendChild(el('span', undefined, `${opts.totalEpisodes} ep`));
  if (meta.childElementCount) info.appendChild(meta);

  // Studio line
  if (opts.studios?.length) {
    const studio = el('div', 'ov-anime-detail');
    studio.append(el('span', 'ov-detail-label', 'Студія: '), document.createTextNode(opts.studios.join(', ')));
    info.appendChild(studio);
  }

  // Genre chips (capped)
  if (opts.genres?.length) {
    const genres = el('div', 'ov-genres');
    for (const g of opts.genres.slice(0, MAX_GENRES)) {
      genres.appendChild(el('span', 'ov-genre', g));
    }
    info.appendChild(genres);
  }

  row.append(poster, info);
  return row;
}

/** Progress bar with "watched / total" label. */
function progress(watched: number, total: number): HTMLElement {
  const wrap = el('div', 'ov-progress-wrap');

  const line = el('div', 'ov-status-line');
  line.textContent = total > 0 ? `Прогрес: ${watched} / ${total}` : `Прогрес: ${watched} серій`;
  wrap.appendChild(line);

  if (total > 0) {
    const bar = el('div', 'ov-progress');
    const fill = el('div', 'ov-progress-bar');
    fill.style.width = `${Math.min(100, Math.round((watched / total) * 100))}%`;
    bar.appendChild(fill);
    wrap.appendChild(bar);
  }
  return wrap;
}

// ── Panel singleton ─────────────────────────────────────────────────

class Panel {
  private collapsed = false;

  /**
   * Play a one-shot animation class: (re)start it from scratch and clean it up
   * when it finishes so it can play again next time. Optional `onEnd` callback.
   */
  private playAnim(elem: HTMLElement, cls: string, onEnd?: () => void): void {
    elem.classList.remove(cls);
    void elem.offsetWidth; // force reflow so re-adding restarts the animation
    elem.classList.add(cls);
    const handler = () => {
      elem.classList.remove(cls);
      elem.removeEventListener('animationend', handler);
      onEnd?.();
    };
    elem.addEventListener('animationend', handler);
  }

  /** Ensure the panel root exists; return its body and whether it was just created. */
  private ensureRoot(): { root: HTMLElement; body: HTMLElement; firstTime: boolean } {
    let root = document.getElementById(PANEL_ID);
    const firstTime = !root;
    if (!root) {
      root = el('div', 'ov-popup ov-panel');
      root.id = PANEL_ID;

      const header = el('div', 'ov-header');
      header.appendChild(el('span', undefined, 'AniTube × MAL'));

      const actions = el('div', 'ov-header-actions');
      const collapseBtn = el('button', 'ov-icon-btn', '–');
      collapseBtn.setAttribute('aria-label', 'Згорнути');
      collapseBtn.onclick = () => this.collapse();
      actions.appendChild(collapseBtn);
      header.appendChild(actions);

      const body = el('div', 'ov-body');

      root.append(header, body);
      document.body.appendChild(root);
      this.playAnim(root, 'ov-in'); // grow in from the corner on first appearance
    }
    const body = root.querySelector('.ov-body') as HTMLElement;
    return { root, body, firstTime };
  }

  /**
   * Replace the panel body with the given nodes.
   * @param expand when true (default) restores the panel if it was collapsed.
   */
  private render(nodes: HTMLElement[], expand = true): void {
    closePosterZoom(true); // old poster is about to be removed
    const { root, body, firstTime } = this.ensureRoot();
    body.replaceChildren(...nodes);

    if (expand && this.collapsed) {
      this.expand();
    } else if (!this.collapsed) {
      root.style.display = '';
      if (!firstTime) this.playAnim(body, 'ov-swap'); // gentle cross-fade on state change
    }
  }

  // ── Collapse / restore ─────────────────────────────────────────────

  private buildFab(): HTMLButtonElement {
    const fab = el('button', 'ov-collapsed');
    fab.id = FAB_ID;
    fab.setAttribute('aria-label', 'Розгорнути AniTube Sync');
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z');
    svg.appendChild(path);
    fab.appendChild(svg);
    fab.onclick = () => this.expand();
    return fab;
  }

  collapse(): void {
    if (this.collapsed) return;
    this.collapsed = true;
    closePosterZoom(true);

    // The panel shrinks into the corner while the button grows out of it
    // simultaneously — reads as the panel folding into the button.
    const root = document.getElementById(PANEL_ID);
    if (root) {
      this.playAnim(root, 'ov-out', () => { root.style.display = 'none'; });
    }

    if (!document.getElementById(FAB_ID)) {
      const fab = this.buildFab();
      document.body.appendChild(fab);
      this.playAnim(fab, 'ov-fab-in');
    }
  }

  expand(): void {
    if (!this.collapsed) return;
    this.collapsed = false;

    const fab = document.getElementById(FAB_ID) as HTMLElement | null;
    if (fab) this.playAnim(fab, 'ov-fab-out', () => fab.remove());

    const root = document.getElementById(PANEL_ID);
    if (root) {
      root.style.display = '';
      this.playAnim(root, 'ov-in');
    }
  }

  // ── States ─────────────────────────────────────────────────────────

  showLoading(text: string): void {
    const wrap = el('div');
    const spinner = el('div', 'ov-spinner');
    const msg = el('p', 'ov-text', text);
    msg.style.textAlign = 'center';
    wrap.append(spinner, msg);
    this.render([wrap]);
  }

  showError(text: string): void {
    this.render([el('p', 'ov-error', text)]);
  }

  showIdentify(anime: JikanAnime, cb: { onConfirm: () => void; onReject: () => void }): void {
    const row = animeRow(anime);
    const text = el('p', 'ov-text', 'Це правильне аніме?');

    const actions = el('div', 'ov-actions');
    actions.append(
      button('Так, це воно', 'primary', cb.onConfirm),
      button('Не те', 'secondary', cb.onReject),
    );
    this.render([row, text, actions]);
  }

  showManualSearch(
    initialQuery: string,
    cb: {
      onSearch: (query: string) => Promise<JikanAnime[]>;
      onSelect: (anime: JikanAnime) => void;
    },
  ): void {
    const input = el('input', 'ov-search-input');
    input.type = 'text';
    input.placeholder = 'Назва аніме...';
    input.value = initialQuery;

    const results = el('div', 'ov-search-results');
    const searchBtn = button('Знайти', 'primary', () => doSearch());

    const doSearch = async () => {
      const q = input.value.trim();
      if (!q) return;
      searchBtn.disabled = true;
      setBtnLabel(searchBtn, 'Шукаємо...');
      results.replaceChildren(el('div', 'ov-spinner'));

      const list = await cb.onSearch(q);
      searchBtn.disabled = false;
      setBtnLabel(searchBtn, 'Знайти');

      if (!list.length) {
        results.replaceChildren(el('div', 'ov-no-results', 'Нічого не знайдено'));
        return;
      }

      const items = list.map((anime) => {
        const item = el('div', 'ov-result-item');
        const img = el('img', 'ov-result-img');
        if (anime.imageUrl) img.src = anime.imageUrl;
        img.alt = '';
        img.onerror = () => img.removeAttribute('src');

        const block = el('div');
        block.appendChild(el('div', 'ov-result-title', anime.title));
        if (anime.year) block.appendChild(el('div', 'ov-result-year', String(anime.year)));

        item.append(img, block);
        item.onclick = () => cb.onSelect(anime);
        return item;
      });
      results.replaceChildren(...items);
    };

    input.addEventListener('keydown', (e: KeyboardEvent) => { if (e.key === 'Enter') doSearch(); });

    const header = el('p', 'ov-text', 'Пошук аніме на MyAnimeList:');
    const actions = el('div', 'ov-actions');
    actions.appendChild(searchBtn);

    this.render([header, input, results, actions]);
    if (initialQuery.trim()) doSearch();
  }

  showNotInList(
    opts: RowMeta,
    cb: { onAdd: () => void; onIgnore: () => void },
  ): void {
    const row = animeRow(opts);
    const text = el('p', 'ov-text', `"${opts.title}" не у списку Watching. Почати відстежувати?`);

    const addBtn = button('Почати відстежувати', 'primary', () => {
      addBtn.disabled = true;
      setBtnLabel(addBtn, 'Додаємо...');
      cb.onAdd();
    });
    const actions = el('div', 'ov-actions');
    actions.append(addBtn, button('Не потрібно', 'secondary', cb.onIgnore));

    this.render([row, text, actions]);
  }

  showStatus(
    opts: RowMeta & { watched: number; total: number },
    cb?: { onComplete?: () => void },
  ): void {
    const row = animeRow(opts);
    const prog = progress(opts.watched, opts.total);

    const nodes: HTMLElement[] = [row, prog];

    const finished = opts.total > 0 && opts.watched >= opts.total;
    if (finished && cb?.onComplete) {
      const actions = el('div', 'ov-actions');
      actions.appendChild(button('Завершити перегляд', 'primary', cb.onComplete, iconFlag));
      nodes.push(actions);
    }

    // Status is a passive resting state — don't force-expand a collapsed panel.
    this.render(nodes, false);
  }

  showNonSequential(
    opts: RowMeta & { watched: number; total: number; current: number },
    cb: { onResume: () => void; onUpdate: () => void },
  ): void {
    const row = animeRow(opts);
    const prog = progress(opts.watched, opts.total);

    const text = el('p', 'ov-text', `Обрана серія ${opts.current} — не наступна по порядку.`);

    const actions = el('div', 'ov-actions ov-col');

    const nextEp = opts.watched + 1;
    const hasNext = opts.total === 0 || nextEp <= opts.total;
    if (hasNext) {
      actions.appendChild(
        button(`Продовжити з серії ${nextEp}`, 'primary', cb.onResume, iconPlay),
      );
    }
    const updateBtn = button(`Оновити до серії ${opts.current}`, 'secondary', () => {
      updateBtn.disabled = true;
      setBtnLabel(updateBtn, 'Оновлюємо...');
      cb.onUpdate();
    }, iconCheck);
    actions.appendChild(updateBtn);

    this.render([row, prog, text, actions]);
  }

  showRating(
    opts: RowMeta,
    cb: { onRate: (score: number) => void },
  ): void {
    const row = animeRow(opts);
    const text = el('p', 'ov-text', `Перегляд завершено! Оціни "${opts.title}":`);

    let selected = 0;
    const rating = el('div', 'ov-rating');
    const stars: HTMLSpanElement[] = [];
    for (let i = 1; i <= 10; i++) {
      const star = el('span', 'ov-star');
      star.appendChild(iconStar(20));
      star.setAttribute('role', 'button');
      star.setAttribute('aria-label', `${i} / 10`);
      star.onclick = () => {
        selected = i;
        stars.forEach((s, idx) => s.classList.toggle('active', idx < i));
      };
      stars.push(star);
      rating.appendChild(star);
    }

    const actions = el('div', 'ov-actions');
    const completeBtn = button('Завершити', 'primary', () => {
      completeBtn.disabled = true;
      setBtnLabel(completeBtn, 'Зберігаємо...');
      cb.onRate(selected);
    });
    actions.append(completeBtn, button('Без оцінки', 'secondary', () => {
      completeBtn.disabled = true;
      cb.onRate(0);
    }));

    this.render([row, text, rating, actions]);
  }
}

export const panel = new Panel();
