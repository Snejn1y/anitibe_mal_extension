import { defineConfig } from 'wxt';
import pkg from './package.json';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'AniTube → MyAnimeList Sync',
    description: 'Автоматично відстежує аніме на anitube.in.ua та синхронізує прогрес у MyAnimeList',
    version: pkg.version,
    permissions: ['storage', 'identity'],
    host_permissions: [
      'https://myanimelist.net/*',
      'https://api.myanimelist.net/*',
      'https://anitube.in.ua/*',
    ],
  },
});
