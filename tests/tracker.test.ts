import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Tracker } from '~/content/tracker';

vi.mock('~/content/overlay', () => ({
  panel: {
    showLoading: vi.fn(),
    showError: vi.fn(),
    showIdentify: vi.fn(),
    showManualSearch: vi.fn(),
    showNotInList: vi.fn(),
    showStatus: vi.fn(),
    showNonSequential: vi.fn(),
    showRating: vi.fn(),
    collapse: vi.fn(),
    expand: vi.fn(),
  },
}));

vi.mock('~/content/parser', () => ({
  getTitle: vi.fn(() => 'Naruto'),
  getActiveEpisode: vi.fn(() => 1),
  getAnimeYear: vi.fn(() => 2002),
  getPlaylistItem: vi.fn(() => null),
  triggerOrgNameLoad: vi.fn(),
  getOrgTitle: vi.fn(() => ''),
}));

const mockSendMessage = vi.fn();
globalThis.browser = { runtime: { sendMessage: mockSendMessage } } as any;

vi.mock('~/utils/cache', () => ({
  getCachedAnime: vi.fn(() => null),
  setCachedAnime: vi.fn(),
}));

import * as cache from '~/utils/cache';
import { panel } from '~/content/overlay';
import * as parser from '~/content/parser';

const ANIME = { malId: 20, title: 'Naruto', totalEpisodes: 220, imageUrl: 'img', cachedAt: Date.now() };
const inList = (n: number) => ({ success: true, data: { status: 'watching', num_watched_episodes: n } });
const notInList = { success: true, data: null };

const flush = () => new Promise(r => setTimeout(r, 0));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(parser.getActiveEpisode).mockReturnValue(1);
  vi.mocked(cache.getCachedAnime).mockReturnValue(null);
  document.body.innerHTML = '';
});

// ── isSequential ─────────────────────────────────────────────────

describe('Tracker.isSequential', () => {
  it('true when current = prev + 1', () => {
    expect(new Tracker().isSequential(1, 2)).toBe(true);
  });
  it('false otherwise', () => {
    const t = new Tracker();
    expect(t.isSequential(1, 5)).toBe(false);
    expect(t.isSequential(5, 3)).toBe(false);
    expect(t.isSequential(1, 1)).toBe(false);
  });
});

// ── start / status on load ────────────────────────────────────────

describe('Tracker.start', () => {
  it('identifies when no cache', async () => {
    mockSendMessage.mockResolvedValue({ success: true, data: { ...ANIME } });
    new Tracker().start();
    await flush();
    expect(mockSendMessage).toHaveBeenCalledWith(expect.objectContaining({ action: 'identifyAnime' }));
    expect(panel.showIdentify).toHaveBeenCalled();
  });

  it('on cache hit checks list and shows status', async () => {
    vi.mocked(cache.getCachedAnime).mockReturnValue(ANIME);
    mockSendMessage.mockResolvedValue(inList(3));
    new Tracker().start();
    await flush();
    expect(mockSendMessage).toHaveBeenCalledWith(expect.objectContaining({ action: 'checkUserList', malId: 20 }));
    expect(panel.showStatus).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Naruto', watched: 3, total: 220 }),
      undefined,
    );
  });

  it('on cache hit when not in list shows add prompt', async () => {
    vi.mocked(cache.getCachedAnime).mockReturnValue(ANIME);
    mockSendMessage.mockResolvedValue(notInList);
    new Tracker().start();
    await flush();
    expect(panel.showNotInList).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Naruto' }),
      expect.objectContaining({ onAdd: expect.any(Function), onIgnore: expect.any(Function) }),
    );
  });
});

// ── identification confirm ────────────────────────────────────────

describe('Tracker identification', () => {
  it('onConfirm saves anime and shows status', async () => {
    mockSendMessage
      .mockResolvedValueOnce({ success: true, data: { ...ANIME } }) // identifyAnime
      .mockResolvedValue(inList(0));                                 // checkUserList
    const t = new Tracker();
    t.start();
    await flush();

    const cb = vi.mocked(panel.showIdentify).mock.calls[0][1];
    cb.onConfirm();
    await flush();

    expect(cache.setCachedAnime).toHaveBeenCalled();
    expect(panel.showStatus).toHaveBeenCalled();
  });

  it('onReject opens manual search', async () => {
    mockSendMessage.mockResolvedValueOnce({ success: true, data: { ...ANIME } });
    const t = new Tracker();
    t.start();
    await flush();

    const cb = vi.mocked(panel.showIdentify).mock.calls[0][1];
    cb.onReject();
    expect(panel.showManualSearch).toHaveBeenCalled();
  });
});

// ── sequential ────────────────────────────────────────────────────

describe('Tracker sequential', () => {
  async function baseline(active = 1, watched = active - 1) {
    vi.mocked(cache.getCachedAnime).mockReturnValue(ANIME);
    vi.mocked(parser.getActiveEpisode).mockReturnValue(active);
    mockSendMessage.mockResolvedValue(inList(watched));
    const t = new Tracker();
    t.start();
    await flush();
    return t;
  }

  it('marks the finished episode and shows new progress', async () => {
    const t = await baseline(1, 0); // watched 0, baseline ep1
    mockSendMessage.mockResolvedValueOnce(inList(0))          // checkUserList in handleSequential
      .mockResolvedValueOnce({ success: true });              // updateEpisode
    t.handleEpisodeChange(2);
    await flush();

    expect(mockSendMessage).toHaveBeenCalledWith(expect.objectContaining({ action: 'updateEpisode', malId: 20, episode: 1 }));
    expect(panel.showStatus).toHaveBeenCalledWith(expect.objectContaining({ watched: 1 }), undefined);
  });

  it('shows error when updateEpisode fails', async () => {
    const t = await baseline(1, 0);
    mockSendMessage.mockResolvedValueOnce(inList(0))
      .mockResolvedValueOnce({ success: false, error: 'net' });
    t.handleEpisodeChange(2);
    await flush();
    expect(panel.showError).toHaveBeenCalledWith(expect.stringContaining('записати'));
  });

  it('does not write episode 0 (baseline 0 → ep1)', async () => {
    const t = await baseline(0, 0); // active 0
    mockSendMessage.mockResolvedValue(inList(0));
    t.handleEpisodeChange(1); // prev 0, current 1 → sequential, but prev<1 guard
    await flush();
    expect(mockSendMessage).not.toHaveBeenCalledWith(expect.objectContaining({ action: 'updateEpisode', episode: 0 }));
  });

  it('prompts rating on final episode', async () => {
    vi.mocked(cache.getCachedAnime).mockReturnValue({ ...ANIME, totalEpisodes: 3 });
    vi.mocked(parser.getActiveEpisode).mockReturnValue(2);
    mockSendMessage.mockResolvedValue(inList(1));
    const t = new Tracker();
    t.start();
    await flush();

    mockSendMessage.mockResolvedValueOnce(inList(1))      // checkUserList
      .mockResolvedValueOnce({ success: true });           // updateEpisode(3)
    t.handleEpisodeChange(3); // current === total(3)
    await flush();
    expect(panel.showRating).toHaveBeenCalled();
  });
});

// ── backward navigation ───────────────────────────────────────────

describe('Tracker backward', () => {
  it('single step back shows status without MAL write or prompt', async () => {
    vi.mocked(cache.getCachedAnime).mockReturnValue(ANIME);
    vi.mocked(parser.getActiveEpisode).mockReturnValue(6);
    mockSendMessage.mockResolvedValue(inList(6));
    const t = new Tracker();
    t.start();
    await flush();

    mockSendMessage.mockClear();
    vi.mocked(panel.showNonSequential).mockClear();
    mockSendMessage.mockResolvedValue(inList(6));
    t.handleEpisodeChange(5); // 6 → 5, one step back
    await flush();
    expect(mockSendMessage).not.toHaveBeenCalledWith(expect.objectContaining({ action: 'updateEpisode' }));
    expect(panel.showNonSequential).not.toHaveBeenCalled();
    expect(panel.showStatus).toHaveBeenCalled();
  });

  it('backward jump of 2+ shows the non-sequential prompt (manual set)', async () => {
    vi.mocked(cache.getCachedAnime).mockReturnValue(ANIME);
    vi.mocked(parser.getActiveEpisode).mockReturnValue(6);
    mockSendMessage.mockResolvedValue(inList(6));
    const t = new Tracker();
    t.start();
    await flush();

    mockSendMessage.mockResolvedValue(inList(6));
    t.handleEpisodeChange(2); // 6 → 2, jump back by 4
    await flush();
    expect(panel.showNonSequential).toHaveBeenCalledWith(
      expect.objectContaining({ watched: 6, current: 2 }),
      expect.objectContaining({ onResume: expect.any(Function), onUpdate: expect.any(Function) }),
    );
    // No automatic write
    expect(mockSendMessage).not.toHaveBeenCalledWith(expect.objectContaining({ action: 'updateEpisode' }));
  });
});

// ── non-sequential ────────────────────────────────────────────────

describe('Tracker non-sequential', () => {
  async function setup(active = 1, jump = 7, watched = 3) {
    vi.mocked(cache.getCachedAnime).mockReturnValue(ANIME);
    vi.mocked(parser.getActiveEpisode).mockReturnValue(active);
    mockSendMessage.mockResolvedValue(inList(active - 1 < 0 ? 0 : active - 1));
    const t = new Tracker();
    t.start();
    await flush();

    mockSendMessage.mockResolvedValue(inList(watched));
    t.handleEpisodeChange(jump);
    await flush();
    return t;
  }

  it('shows non-sequential choice', async () => {
    await setup(1, 7, 3);
    expect(panel.showNonSequential).toHaveBeenCalledWith(
      expect.objectContaining({ watched: 3, current: 7, total: 220 }),
      expect.objectContaining({ onResume: expect.any(Function), onUpdate: expect.any(Function) }),
    );
  });

  it('onResume clicks the watched+1 playlist item', async () => {
    const item = document.createElement('li');
    const clickSpy = vi.spyOn(item, 'click');
    vi.mocked(parser.getPlaylistItem).mockReturnValue(item as any);
    await setup(1, 7, 3);

    const cb = vi.mocked(panel.showNonSequential).mock.calls[0][1];
    cb.onResume();
    expect(parser.getPlaylistItem).toHaveBeenCalledWith(4); // watched(3)+1
    expect(clickSpy).toHaveBeenCalled();
  });

  it('onResume shows error when target episode missing', async () => {
    vi.mocked(parser.getPlaylistItem).mockReturnValue(null);
    await setup(1, 7, 3);
    const cb = vi.mocked(panel.showNonSequential).mock.calls[0][1];
    cb.onResume();
    expect(panel.showError).toHaveBeenCalledWith(expect.stringContaining('4'));
  });

  it('onUpdate marks the current episode', async () => {
    await setup(1, 7, 3);
    mockSendMessage.mockResolvedValueOnce({ success: true });
    const cb = vi.mocked(panel.showNonSequential).mock.calls[0][1];
    await cb.onUpdate();
    expect(mockSendMessage).toHaveBeenCalledWith(expect.objectContaining({ action: 'updateEpisode', episode: 7 }));
    expect(panel.showStatus).toHaveBeenCalledWith(expect.objectContaining({ watched: 7 }), undefined);
  });

  it('keeps prompting when stepping forward without committing the jump', async () => {
    // Progress 1/12, jump to 6 → prompt; then click 7 without choosing → must re-prompt, not drop the choice.
    vi.mocked(cache.getCachedAnime).mockReturnValue(ANIME);
    vi.mocked(parser.getActiveEpisode).mockReturnValue(1);
    mockSendMessage.mockResolvedValue(inList(1));
    const t = new Tracker();
    t.start();
    await flush();

    t.handleEpisodeChange(6); // jump → prompt
    await flush();
    vi.mocked(panel.showNonSequential).mockClear();

    t.handleEpisodeChange(7); // sequential 6→7 but MAL still 1 → must re-prompt
    await flush();

    expect(panel.showNonSequential).toHaveBeenCalledWith(
      expect.objectContaining({ watched: 1, current: 7 }),
      expect.anything(),
    );
    expect(mockSendMessage).not.toHaveBeenCalledWith(expect.objectContaining({ action: 'updateEpisode' }));
  });

  it('keeps prompting when stepping back without committing the jump', async () => {
    // Progress 2/12, jump to 6 → prompt; then click 5 (one step back) without choosing → re-prompt.
    vi.mocked(cache.getCachedAnime).mockReturnValue(ANIME);
    vi.mocked(parser.getActiveEpisode).mockReturnValue(2);
    mockSendMessage.mockResolvedValue(inList(2));
    const t = new Tracker();
    t.start();
    await flush();

    t.handleEpisodeChange(6); // jump → prompt
    await flush();
    vi.mocked(panel.showNonSequential).mockClear();

    t.handleEpisodeChange(5); // one step back from 6 but still ahead of MAL(2) → re-prompt
    await flush();

    expect(panel.showNonSequential).toHaveBeenCalledWith(
      expect.objectContaining({ watched: 2, current: 5 }),
      expect.anything(),
    );
    expect(mockSendMessage).not.toHaveBeenCalledWith(expect.objectContaining({ action: 'updateEpisode' }));
  });
});

// ── guards ────────────────────────────────────────────────────────

describe('Tracker guards', () => {
  it('ignores episode change when not identified', () => {
    const t = new Tracker();
    t.handleEpisodeChange(2);
    expect(mockSendMessage).not.toHaveBeenCalled();
  });

  it('ignores a no-op change to the same episode', async () => {
    vi.mocked(cache.getCachedAnime).mockReturnValue(ANIME);
    vi.mocked(parser.getActiveEpisode).mockReturnValue(3);
    mockSendMessage.mockResolvedValue(inList(2));
    const t = new Tracker();
    t.start();
    await flush();
    mockSendMessage.mockClear();
    t.handleEpisodeChange(3); // same as baseline
    expect(mockSendMessage).not.toHaveBeenCalled();
  });
});
