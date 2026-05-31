import '../content/overlay.css';
import { isAnimePage, getActiveEpisode } from '../content/parser';
import { watchPlaylist } from '../content/watcher';
import { Tracker } from '../content/tracker';

export default defineContentScript({
  matches: ['*://anitube.in.ua/*'],
  cssInjectionMode: 'manifest',

  async main() {
    console.log('[CS] Content script loaded');

    if (!isAnimePage()) {
      console.log('[CS] Not an anime page — exiting');
      return;
    }

    const authRes = await browser.runtime.sendMessage({ action: 'getAuthStatus' });
    if (!authRes?.data?.isLoggedIn) {
      console.log('[CS] Not logged in — tracking disabled');
      return;
    }

    const tracker = new Tracker();
    tracker.start();

    let lastEpisode = getActiveEpisode();

    watchPlaylist((episode) => {
      if (episode !== lastEpisode) {
        console.log(`[CS] Episode: ${lastEpisode} -> ${episode}`);
        tracker.handleEpisodeChange(episode);
        lastEpisode = episode;
      }
    });

    console.log('[CS] Tracker running');
  },
});
