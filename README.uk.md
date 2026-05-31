# AniTube → MyAnimeList Sync

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
![Manifest V3](https://img.shields.io/badge/Manifest-V3-blue)
![Browsers](https://img.shields.io/badge/browsers-Chrome%20%7C%20Firefox-orange)
![Built with WXT](https://img.shields.io/badge/built%20with-WXT%20%2B%20React-de3163)

[🇬🇧 English](README.md) · 🇺🇦 Українська

Браузерне розширення (Chrome/Firefox, Manifest V3), що автоматично відстежує
переглянуті серії аніме на [anitube.in.ua](https://anitube.in.ua) і синхронізує
прогрес із вашим списком на [MyAnimeList](https://myanimelist.net).

## Можливості

- Автоматично визначає аніме зі сторінки anitube (з ручним пошуком на випадок промаху)
- Послідовний перегляд (серія N → N+1) одразу пише прогрес на MAL
- При стрибку через серії питає, з якої серії продовжити або яку зафіксувати
- Пропонує оцінити аніме після фінальної серії
- Постійна панель із прогресом, студією, жанрами та оцінкою; згортається в кнопку
- Інтерфейс UA / EN із перемикачем мови прямо в розширенні

## Скріншоти

| Панель статусу | Вибір серії | Попап |
|---|---|---|
| ![Панель статусу](docs/screenshots/panel-status.png) | ![Вибір серії](docs/screenshots/panel-choice.png) | ![Попап](docs/screenshots/popup.png) |

## Стек

[WXT](https://wxt.dev) + React + TypeScript. Логіка OAuth/API живе у фоновому
service worker; контент-скрипт лише читає сторінку та малює UI.

## Розробка

```bash
npm install
cp .env.example .env   # впишіть дані свого MAL-застосунку (див. нижче)
npm run dev            # Chrome з HMR
npm run dev:firefox    # Firefox
npm run build          # продакшн-збірка (Chrome)
npm run build:firefox
npm test               # юніт-тести (Vitest)
npm run compile        # перевірка типів
```

Зібране розширення зʼявиться в `.output/chrome-mv3/` — завантажте його через
`chrome://extensions` → «Завантажити розпакований».

### Свій MAL-застосунок

Ключі MAL **не** зберігаються в репозиторії — вони беруться з `.env` під час збірки.
Зареєструйте застосунок на [MAL API](https://myanimelist.net/apiconfig) і додайте
`WXT_MAL_CLIENT_ID` та `WXT_MAL_CLIENT_SECRET` у `.env`. Redirect URI застосунку має
збігатися з тим, що повертає `chrome.identity.getRedirectURL('provider_cb')` для вашої
збірки. Авторизація — OAuth2 + PKCE (MAL вимагає client secret для обміну токена).

> ⚠️ Зібране розширення містить ці ключі у бандлі — приховати секрет у браузерному
> розширенні неможливо. `.env` лише тримає його поза публічним репозиторієм.

## Повідомити про баг

Створіть [issue](https://github.com/Snejn1y/anitibe_mal_extension/issues/new) — кнопка
для цього є й у самому розширенні (вкладка «Про розширення»).

## Ліцензія

[MIT](LICENSE)
