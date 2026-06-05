import { defineConfig } from 'wxt';
import pkg from './package.json';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: '__MSG_extName__',
    description: '__MSG_extDescription__',
    default_locale: 'en',
    version: pkg.version,
    // Public key of the Chrome Web Store item. Pinning it keeps the unpacked dev
    // build's extension ID identical to the published one. The OAuth redirect URI is
    // now a fixed self-hosted page (see OAUTH_REDIRECT_URL), so this only stabilizes
    // the extension ID; it is no longer required for the auth flow.
    key: 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAid8QebIUyakKHroMiKbt/xE7NTqT+YYlbpoAkOEleCSZ0rm8uyjcmdj+ZMRUNL9wwMkHe1SEhRkrzvSf6uAJiMp+HNQDJunuWK3S4v2bmXb7CVI3kNS42N+C2NeSxBW1nBkL2kRTO2eiRmg1+TVpbYfXBJAOCaPD86xnKHAvQJpC+hTs/CeRs6CixDmU0t9It54wBRg7hzfsJy/4H5Jz1UCq68WJuEEBEZeL1k3d2GO50Ls/gBs56Alm9X9zeOZYvtj9GHEmgl6OMOQDQem03CF2m7HUm2hxH/Vb78lriWR/AM38BIg3XRKQhQQ3q2mnMM62Tf+CKSksZ04/GAMhhwIDAQAB',
    permissions: ['storage'],
    browser_specific_settings: {
      gecko: {
        id: 'anitube-mal-sync@users.noreply.github.com',
      },
    },
    host_permissions: [
      'https://myanimelist.net/*',
      'https://api.myanimelist.net/*',
      'https://anitube.in.ua/*',
    ],
  },
});
