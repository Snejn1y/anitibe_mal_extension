import { defineConfig } from 'wxt';
import pkg from './package.json';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: '__MSG_extName__',
    description: '__MSG_extDescription__',
    default_locale: 'en',
    version: pkg.version,
    permissions: ['storage', 'identity'],
    host_permissions: [
      'https://myanimelist.net/*',
      'https://api.myanimelist.net/*',
      'https://anitube.in.ua/*',
    ],
  },
});
