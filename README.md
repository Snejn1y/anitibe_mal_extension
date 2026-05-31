# AniTube → MyAnimeList Sync

Браузерне розширення (Chrome/Firefox, Manifest V3), що автоматично відстежує
переглянуті серії аніме на [anitube.in.ua](https://anitube.in.ua) і синхронізує
прогрес із вашим списком на [MyAnimeList](https://myanimelist.net).

## Можливості

- Автоматично визначає аніме зі сторінки anitube (з ручним пошуком на випадок промаху)
- Послідовний перегляд (серія N → N+1) одразу пише прогрес на MAL
- При стрибку через серії питає, з якої серії продовжити або яку зафіксувати
- Пропонує оцінити аніме після фінальної серії
- Постійна панель із прогресом, студією, жанрами та оцінкою; згортається в кнопку

## Стек

[WXT](https://wxt.dev) + React + TypeScript. Логіка OAuth/API живе у фоновому
service worker; контент-скрипт лише читає сторінку та малює UI.

## Розробка

```bash
npm install
npm run dev          # Chrome з HMR
npm run dev:firefox  # Firefox
npm run build        # продакшн-збірка (Chrome)
npm run build:firefox
npm test             # юніт-тести (Vitest)
npm run compile      # перевірка типів
```

Зібране розширення зʼявиться в `.output/chrome-mv3/` — завантажте його через
`chrome://extensions` → «Завантажити розпакований».

### Свій MAL-застосунок

Розширення авторизується через OAuth2 + PKCE, **без client secret** — у коді є лише
публічний `MAL_CLIENT_ID`. Якщо ви форкаєте проєкт, зареєструйте власний застосунок
на [MAL API](https://myanimelist.net/apiconfig) і вкажіть його ID в
[`utils/config.ts`](utils/config.ts). Redirect URI має збігатися з тим, що повертає
`chrome.identity.getRedirectURL('provider_cb')` для вашої збірки.

## Повідомити про баг

Створіть [issue](https://github.com/Snejn1y/anitibe_mal_extension/issues/new) — кнопка для
цього є й у самому розширенні (вкладка «Про розширення»).

## Ліцензія

[MIT](LICENSE)
