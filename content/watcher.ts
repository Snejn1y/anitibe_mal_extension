type EpisodeChangeCallback = (episode: number) => void;

const EPISODE_PATTERNS = [
  /^(\d+)\s*серія/i,
  /серія\s*(\d+)/i,
  /^(\d+)\./,
  /^(\d+)\s/,
  /(\d+)$/,
];

function parseEpisodeFromText(text: string): number | null {
  for (const p of EPISODE_PATTERNS) {
    const m = text.match(p);
    if (m) return Number(m[1]);
  }
  return null;
}

const PLAYLIST_SELECTOR = '.playlists-videos .playlists-items';

function attachListener(container: Element, onEpisodeClick: EpisodeChangeCallback): () => void {
  const handler = (e: Event) => {
    const li = (e.target as HTMLElement).closest('li');
    if (!li) return;
    const episode = parseEpisodeFromText(li.textContent?.trim() ?? '');
    if (episode !== null) onEpisodeClick(episode);
  };
  container.addEventListener('click', handler);
  console.log('[CS] Playlist watcher started');
  return () => container.removeEventListener('click', handler);
}

/**
 * Attaches a delegated click listener to the playlist container.
 * If the container is not yet in the DOM (dynamically loaded), waits for it
 * using a MutationObserver. Returns a cleanup function.
 */
export function watchPlaylist(onEpisodeClick: EpisodeChangeCallback): () => void {
  const container = document.querySelector(PLAYLIST_SELECTOR);
  if (container) {
    return attachListener(container, onEpisodeClick);
  }

  // Playlist not yet rendered — wait for it
  console.log('[CS] Playlist not found yet, waiting for DOM...');
  let cleanup: (() => void) | null = null;

  const observer = new MutationObserver(() => {
    const c = document.querySelector(PLAYLIST_SELECTOR);
    if (c) {
      observer.disconnect();
      cleanup = attachListener(c, onEpisodeClick);
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });

  return () => {
    observer.disconnect();
    cleanup?.();
  };
}
