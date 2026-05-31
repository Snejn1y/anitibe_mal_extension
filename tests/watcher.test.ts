import { describe, it, expect, vi, beforeEach } from 'vitest';
import { watchPlaylist } from '~/content/watcher';

const PLAYLIST_HTML = `
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

beforeEach(() => {
  document.body.innerHTML = '';
});

function getPlaylistItem(n: number): HTMLLIElement {
  return document.querySelectorAll<HTMLLIElement>('.playlists-items li')[n - 1];
}

describe('watchPlaylist', () => {
  it('calls callback with correct episode when a list item is clicked', () => {
    document.body.innerHTML = PLAYLIST_HTML;
    const cb = vi.fn();
    watchPlaylist(cb);

    getPlaylistItem(2).click();

    expect(cb).toHaveBeenCalledOnce();
    expect(cb).toHaveBeenCalledWith(2);
  });

  it('fires for "серія N" format', () => {
    document.body.innerHTML = PLAYLIST_HTML;
    const cb = vi.fn();
    watchPlaylist(cb);

    getPlaylistItem(3).click();

    expect(cb).toHaveBeenCalledWith(3);
  });

  it('fires for two-digit episode', () => {
    document.body.innerHTML = PLAYLIST_HTML;
    const cb = vi.fn();
    watchPlaylist(cb);

    getPlaylistItem(4).click();

    expect(cb).toHaveBeenCalledWith(10);
  });

  it('fires when clicking on a child element inside the li', () => {
    document.body.innerHTML = PLAYLIST_HTML;
    // Add a span inside the second li
    const li = getPlaylistItem(2);
    const span = document.createElement('span');
    span.textContent = 'HD';
    li.appendChild(span);

    const cb = vi.fn();
    watchPlaylist(cb);
    span.click();   // click child, not the li itself

    expect(cb).toHaveBeenCalledWith(2);
  });

  it('does not fire when clicking outside a list item', () => {
    document.body.innerHTML = PLAYLIST_HTML;
    const cb = vi.fn();
    watchPlaylist(cb);

    // Click the container div, not a li
    document.querySelector<HTMLElement>('.playlists-items')!.click();

    expect(cb).not.toHaveBeenCalled();
  });

  it('returns a cleanup function that stops listening', () => {
    document.body.innerHTML = PLAYLIST_HTML;
    const cb = vi.fn();
    const cleanup = watchPlaylist(cb);

    cleanup();
    getPlaylistItem(1).click();

    expect(cb).not.toHaveBeenCalled();
  });

  it('waits for playlist via MutationObserver when not yet in DOM', async () => {
    // Playlist is absent initially
    const cb = vi.fn();
    watchPlaylist(cb);

    expect(cb).not.toHaveBeenCalled();

    // Now inject the playlist
    document.body.innerHTML = PLAYLIST_HTML;

    // MutationObserver fires asynchronously
    await new Promise(r => setTimeout(r, 0));

    getPlaylistItem(1).click();
    expect(cb).toHaveBeenCalledWith(1);
  });

  it('cleanup stops the MutationObserver when playlist never appeared', () => {
    const cb = vi.fn();
    const cleanup = watchPlaylist(cb);
    // Should not throw
    expect(() => cleanup()).not.toThrow();
    expect(cb).not.toHaveBeenCalled();
  });
});
