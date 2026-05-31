import { getCachedAnime, setCachedAnime, type CachedAnime } from '~/utils/cache';
import { getTitle, getActiveEpisode, getAnimeYear, getPlaylistItem, triggerOrgNameLoad, getOrgTitle } from '~/content/parser';
import { panel } from '~/content/overlay';
import { tr } from '~/utils/i18n';
import type { JikanAnime } from '~/utils/jikan';

const send = (msg: any) => browser.runtime.sendMessage(msg);

interface ListStatus {
  status: string;
  num_watched_episodes: number;
}

export class Tracker {
  private anime: CachedAnime | null = null;
  private currentEpisode: number | null = null;
  private isProcessing = false;
  private inWatchingList = false;

  isSequential(prev: number, current: number): boolean {
    return current === prev + 1;
  }

  start(): void {
    const cached = getCachedAnime(location.href);
    if (cached) {
      console.log('[CS] Cache hit:', cached.title);
      this.anime = cached;
      this.showStatusForActive();
    } else {
      this.identify();
    }
  }

  // ── Identification ────────────────────────────────────────────────

  private identify(): void {
    triggerOrgNameLoad();
    this.waitForOrgTitle((orgTitle) => {
      const title = orgTitle || getTitle();
      const year = getAnimeYear();
      console.log('[CS] Identifying:', title, year);
      panel.showLoading(tr().loadingSearch);

      send({ action: 'identifyAnime', title, year })
        .then((res: any) => {
          if (res?.success && res.data) {
            panel.showIdentify(res.data as JikanAnime, {
              onConfirm: () => this.saveAnime(res.data),
              onReject: () => this.manualSearch(title),
            });
          } else {
            this.manualSearch(title);
          }
        })
        .catch((e: any) => {
          console.error('[CS] identifyAnime error:', e);
          this.manualSearch(title);
        });
    });
  }

  private waitForOrgTitle(callback: (title: string) => void): void {
    const existing = getOrgTitle();
    if (existing) { callback(existing); return; }

    const span = document.getElementById('orgname-result');
    if (!span) { callback(''); return; }

    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      observer.disconnect();
      clearTimeout(fallback);
      callback(getOrgTitle());
    };

    const observer = new MutationObserver(finish);
    observer.observe(span, { childList: true, characterData: true, subtree: true });
    const fallback = setTimeout(finish, 2000);
  }

  private manualSearch(initialQuery: string): void {
    panel.showManualSearch(initialQuery, {
      onSearch: async (query) => {
        const res = await send({ action: 'manualSearch', query });
        return res?.success ? (res.data ?? []) : [];
      },
      onSelect: (selected) => this.saveAnime(selected),
    });
  }

  private saveAnime(anime: JikanAnime): void {
    setCachedAnime(location.href, anime);
    this.anime = { ...anime, cachedAt: Date.now() };
    this.inWatchingList = false;
    console.log('[CS] Anime saved:', anime.title);
    this.showStatusForActive();
  }

  // ── Status display ────────────────────────────────────────────────

  /** Establish the baseline episode from the page and show current MAL status. */
  private showStatusForActive(): void {
    const episode = getActiveEpisode();
    this.currentEpisode = episode;
    this.isProcessing = true;
    this.refreshStatus(episode).finally(() => { this.isProcessing = false; });
  }

  private rowInfo() {
    const a = this.anime!;
    return {
      title: a.title,
      imageUrl: a.imageUrl,
      year: a.year,
      totalEpisodes: a.totalEpisodes,
      type: a.type,
      score: a.score,
      studios: a.studios,
      genres: a.genres,
    };
  }

  /** Check the user list and render either the status panel or the "add" prompt. */
  private async refreshStatus(_episode: number): Promise<void> {
    if (!this.anime) return;
    const res = (await send({ action: 'checkUserList', malId: this.anime.malId }))?.data as ListStatus | null;

    if (!res) {
      this.inWatchingList = false;
      panel.showNotInList(this.rowInfo(), {
        onAdd: () => this.addToListThenStatus(),
        onIgnore: () => panel.collapse(),
      });
      return;
    }

    this.inWatchingList = true;
    this.renderStatus(res.num_watched_episodes);
  }

  private renderStatus(watched: number): void {
    if (!this.anime) return;
    const total = this.anime.totalEpisodes;
    const finished = total > 0 && watched >= total;
    panel.showStatus(
      { ...this.rowInfo(), watched, total },
      finished ? { onComplete: () => this.promptRating() } : undefined,
    );
  }

  private async addToListThenStatus(): Promise<void> {
    if (!this.anime) return;
    const addRes = await send({ action: 'addToList', malId: this.anime.malId });
    if (!addRes?.success) {
      panel.showError(tr().errAddList);
      return;
    }
    this.inWatchingList = true;
    console.log('[CS] Added to watching list:', this.anime.title);
    this.renderStatus(0);
  }

  // ── Episode change routing ────────────────────────────────────────

  handleEpisodeChange(episode: number): void {
    if (!this.anime) {
      console.log('[CS] Episode change — anime not identified yet, ignoring');
      return;
    }
    if (this.isProcessing) return;
    if (episode === this.currentEpisode) return;

    const prev = this.currentEpisode;
    this.currentEpisode = episode;
    this.isProcessing = true;
    const done = () => { this.isProcessing = false; };

    if (prev === null) {
      // First baseline on page load — just show current status, no MAL write.
      this.refreshStatus(episode).catch(e => console.error('[CS]', e)).finally(done);
    } else {
      this.route(prev, episode).catch(e => console.error('[CS]', e)).finally(done);
    }
  }

  /**
   * Decide what an episode change means. The decision is driven by the MAL
   * progress (`watched`), not just the previous click, so jumping around without
   * committing always keeps offering the choice instead of silently dropping it.
   *
   * - Aligned sequential advance (you finished the next-unwatched episode) → auto-mark.
   * - A jump of 2+ episodes (either direction), or being ahead of MAL without a clean
   *   advance → ask the user (lets them manually set the current episode).
   * - A single adjacent step at/behind MAL progress (e.g. re-watching) → just status.
   */
  private async route(prev: number, current: number): Promise<void> {
    if (!this.anime) return;
    const res = (await send({ action: 'checkUserList', malId: this.anime.malId }))?.data as ListStatus | null;

    if (!res) {
      this.inWatchingList = false;
      panel.showNotInList(this.rowInfo(), {
        onAdd: () => this.addToListThenStatus(),
        onIgnore: () => panel.collapse(),
      });
      return;
    }

    this.inWatchingList = true;
    const watched = res.num_watched_episodes;
    const total = this.anime.totalEpisodes;

    // Aligned sequential advance: you were on the next-unwatched episode and moved one
    // forward → mark the episode just finished (or finish the series on the last one).
    if (current === prev + 1 && prev === watched + 1) {
      if (total > 0 && current >= total) await this.markEpisode(total, total);
      else await this.markEpisode(prev, current);
      return;
    }

    const isJump = Math.abs(current - prev) >= 2;
    const aheadOfMal = current > watched + 1;
    if (isJump || aheadOfMal) {
      this.renderNonSequentialChoice(watched, current);
      return;
    }

    // Single adjacent step at or behind MAL progress → just reflect status.
    this.renderStatus(watched);
  }

  /** PATCH the watched count to `episodeToMark`, then render the resulting status. */
  private async markEpisode(episodeToMark: number, current: number): Promise<void> {
    if (!this.anime) return;
    const updateRes = await send({ action: 'updateEpisode', malId: this.anime.malId, episode: episodeToMark });
    if (!updateRes?.success) {
      panel.showError(tr().errWriteEp(episodeToMark));
      return;
    }
    console.log('[CS] Marked episode', episodeToMark, 'on MAL');

    const total = this.anime.totalEpisodes;
    if (total > 0 && current >= total) {
      this.promptRating();
    } else {
      this.renderStatus(episodeToMark);
    }
  }

  // ── Non-sequential (ask the user) ─────────────────────────────────

  /** Render the "resume / set this episode" choice. Shared by jumps and unaligned forward steps. */
  private renderNonSequentialChoice(watched: number, current: number): void {
    if (!this.anime) return;
    const total = this.anime.totalEpisodes;

    panel.showNonSequential(
      { ...this.rowInfo(), watched, total, current },
      {
        onResume: () => {
          const target = watched + 1;
          const item = getPlaylistItem(target);
          if (!item) {
            panel.showError(tr().errEpNotFound(target));
            return;
          }
          // Treat the resumed click as a fresh baseline (no MAL write on landing).
          this.currentEpisode = null;
          item.click();
        },
        onUpdate: async () => {
          const updateRes = await send({ action: 'updateEpisode', malId: this.anime!.malId, episode: current });
          if (!updateRes?.success) {
            panel.showError(tr().errUpdateTo(current));
            return;
          }
          if (total > 0 && current >= total) this.promptRating();
          else this.renderStatus(current);
        },
      },
    );
  }

  // ── Completion / rating ───────────────────────────────────────────

  private promptRating(): void {
    if (!this.anime) return;
    panel.showRating(this.rowInfo(), {
      onRate: async (score) => {
        const res = await send({ action: 'completeAnime', malId: this.anime!.malId, score });
        if (!res?.success) {
          panel.showError(tr().errSave);
          return;
        }
        console.log('[CS] Anime completed, score', score);
        this.renderStatus(this.anime!.totalEpisodes);
      },
    });
  }
}
