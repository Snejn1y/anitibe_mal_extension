import { defineConfig } from 'wxt';
import pkg from './package.json';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: '__MSG_extName__',
    description: '__MSG_extDescription__',
    default_locale: 'en',
    version: pkg.version,
    // Public key of the Chrome Web Store item. Pinning it gives the unpacked
    // dev build the SAME extension ID as the published one
    // (baaepennfikmimffojbejmiimpalbdjj), so chrome.identity.getRedirectURL()
    // returns one stable redirect URI to register in the MAL app.
    key: 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAid8QebIUyakKHroMiKbt/xE7NTqT+YYlbpoAkOEleCSZ0rm8uyjcmdj+ZMRUNL9wwMkHe1SEhRkrzvSf6uAJiMp+HNQDJunuWK3S4v2bmXb7CVI3kNS42N+C2NeSxBW1nBkL2kRTO2eiRmg1+TVpbYfXBJAOCaPD86xnKHAvQJpC+hTs/CeRs6CixDmU0t9It54wBRg7hzfsJy/4H5Jz1UCq68WJuEEBEZeL1k3d2GO50Ls/gBs56Alm9X9zeOZYvtj9GHEmgl6OMOQDQem03CF2m7HUm2hxH/Vb78lriWR/AM38BIg3XRKQhQQ3q2mnMM62Tf+CKSksZ04/GAMhhwIDAQAB',
    permissions: ['storage', 'identity'],
    host_permissions: [
      'https://myanimelist.net/*',
      'https://api.myanimelist.net/*',
      'https://anitube.in.ua/*',
    ],
  },
});
