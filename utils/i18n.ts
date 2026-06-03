/**
 * Lightweight i18n. The active language is held in a module variable so both the
 * popup (React) and the content panel (plain DOM) can read it synchronously via
 * `tr()`. Call `initLang()` once at startup to load the stored preference, and
 * `setLang()` to change it (persists + updates the module variable).
 */
import { langPref } from './storage';

export type Lang = 'uk' | 'en';

export interface Strings {
  // Popup
  headerSub: string;
  tabHome: string;
  tabAbout: string;
  loading: string;
  features: string[];
  errGeneric: string;
  errAuthFailed: string;
  errAuthRedirectHint: string;
  login: string;
  loginInProgress: string;
  connected: string;
  syncBox: string;
  logout: string;
  aboutDesc: string;
  version: string;
  developer: string;
  reportBug: string;
  projectPage: string;
  language: string;

  // Panel — identification & search
  confirmAnime: string;
  yes: string;
  notIt: string;
  searchHeader: string;
  searchPlaceholder: string;
  searchBtn: string;
  searching: string;
  noResults: string;
  loadingSearch: string;

  // Panel — list / status
  notInList: (title: string) => string;
  startTracking: string;
  adding: string;
  notNeeded: string;
  progress: (watched: number, total: number) => string;
  studioLabel: string;
  completeWatching: string;

  // Panel — non-sequential
  nonSeqText: (current: number) => string;
  resumeFrom: (ep: number) => string;
  updateToEp: (ep: number) => string;
  updating: string;

  // Panel — rating
  ratingText: (title: string) => string;
  finish: string;
  saving: string;
  noScore: string;

  // Aria
  collapseAria: string;
  expandAria: string;
  enlargePoster: string;

  // Errors
  errAddList: string;
  errWriteEp: (ep: number) => string;
  errEpNotFound: (ep: number) => string;
  errUpdateTo: (ep: number) => string;
  errSave: string;
}

const uk: Strings = {
  headerSub: 'автоматичний трекер аніме',
  tabHome: 'Головна',
  tabAbout: 'Про розширення',
  loading: 'секунду...',
  features: [
    'Серії фіксуються автоматично',
    'Список на MAL оновлюється одразу',
    'Оцінка після фіналу',
    'Ручний пошук аніме',
  ],
  errGeneric: 'Щось пішло не так',
  errAuthFailed: 'Не вдалося відкрити сторінку авторизації MyAnimeList.',
  errAuthRedirectHint: 'Перевір, що цей redirect URI додано в налаштуваннях MAL-додатку (apiconfig):',
  login: 'Увійти через MyAnimeList',
  loginInProgress: 'Відкриваємо MAL...',
  connected: 'підключено до MAL',
  syncBox: 'Відкрий аніме на anitube.in.ua — розширення зробить решту само.',
  logout: 'Вийти з акаунту',
  aboutDesc: 'Автоматично відстежує переглянуті серії на anitube.in.ua і синхронізує прогрес із вашим списком на MyAnimeList.',
  version: 'Версія',
  developer: 'Розробник',
  reportBug: 'Повідомити про баг',
  projectPage: 'Сторінка проєкту →',
  language: 'Мова',

  confirmAnime: 'Це правильне аніме?',
  yes: 'Так, це воно',
  notIt: 'Не те',
  searchHeader: 'Пошук аніме на MyAnimeList:',
  searchPlaceholder: 'Назва аніме...',
  searchBtn: 'Знайти',
  searching: 'Шукаємо...',
  noResults: 'Нічого не знайдено',
  loadingSearch: 'Шукаю аніме на MyAnimeList…',

  notInList: (t) => `"${t}" не у списку Watching. Почати відстежувати?`,
  startTracking: 'Почати відстежувати',
  adding: 'Додаємо...',
  notNeeded: 'Не потрібно',
  progress: (w, t) => (t > 0 ? `Прогрес: ${w} / ${t}` : `Прогрес: ${w} серій`),
  studioLabel: 'Студія: ',
  completeWatching: 'Завершити перегляд',

  nonSeqText: (c) => `Обрана серія ${c} — не наступна по порядку.`,
  resumeFrom: (ep) => `Продовжити з серії ${ep}`,
  updateToEp: (ep) => `Оновити до серії ${ep}`,
  updating: 'Оновлюємо...',

  ratingText: (t) => `Перегляд завершено! Оціни "${t}":`,
  finish: 'Завершити',
  saving: 'Зберігаємо...',
  noScore: 'Без оцінки',

  collapseAria: 'Згорнути',
  expandAria: 'Розгорнути AniTube Sync',
  enlargePoster: 'Збільшити постер',

  errAddList: 'Не вдалося додати до списку. Спробуй ще раз.',
  errWriteEp: (ep) => `Не вдалося записати серію ${ep}.`,
  errEpNotFound: (ep) => `Серію ${ep} не знайдено у плейлисті.`,
  errUpdateTo: (ep) => `Не вдалося оновити до серії ${ep}.`,
  errSave: 'Не вдалося зберегти. Спробуй ще раз.',
};

const en: Strings = {
  headerSub: 'automatic anime tracker',
  tabHome: 'Home',
  tabAbout: 'About',
  loading: 'one sec...',
  features: [
    'Episodes are logged automatically',
    'Your MAL list updates instantly',
    'Rate the anime after the finale',
    'Manual anime search',
  ],
  errGeneric: 'Something went wrong',
  errAuthFailed: 'Could not open the MyAnimeList authorization page.',
  errAuthRedirectHint: 'Make sure this redirect URI is registered in your MAL app (apiconfig):',
  login: 'Sign in with MyAnimeList',
  loginInProgress: 'Opening MAL...',
  connected: 'connected to MAL',
  syncBox: 'Open an anime on anitube.in.ua — the extension does the rest.',
  logout: 'Sign out',
  aboutDesc: 'Automatically tracks watched episodes on anitube.in.ua and syncs progress to your MyAnimeList list.',
  version: 'Version',
  developer: 'Developer',
  reportBug: 'Report a bug',
  projectPage: 'Project page →',
  language: 'Language',

  confirmAnime: 'Is this the right anime?',
  yes: "Yes, that's it",
  notIt: 'Not it',
  searchHeader: 'Search anime on MyAnimeList:',
  searchPlaceholder: 'Anime title...',
  searchBtn: 'Search',
  searching: 'Searching...',
  noResults: 'Nothing found',
  loadingSearch: 'Searching MyAnimeList…',

  notInList: (t) => `"${t}" isn't on your Watching list. Start tracking?`,
  startTracking: 'Start tracking',
  adding: 'Adding...',
  notNeeded: 'No thanks',
  progress: (w, t) => (t > 0 ? `Progress: ${w} / ${t}` : `Progress: ${w} eps`),
  studioLabel: 'Studio: ',
  completeWatching: 'Mark as completed',

  nonSeqText: (c) => `Episode ${c} isn't the next one in order.`,
  resumeFrom: (ep) => `Continue from episode ${ep}`,
  updateToEp: (ep) => `Set progress to episode ${ep}`,
  updating: 'Updating...',

  ratingText: (t) => `Finished! Rate "${t}":`,
  finish: 'Finish',
  saving: 'Saving...',
  noScore: 'No score',

  collapseAria: 'Collapse',
  expandAria: 'Expand AniTube Sync',
  enlargePoster: 'Enlarge poster',

  errAddList: "Couldn't add to the list. Try again.",
  errWriteEp: (ep) => `Couldn't save episode ${ep}.`,
  errEpNotFound: (ep) => `Episode ${ep} not found in the playlist.`,
  errUpdateTo: (ep) => `Couldn't set progress to episode ${ep}.`,
  errSave: "Couldn't save. Try again.",
};

const DICTS: Record<Lang, Strings> = { uk, en };

function detect(): Lang {
  return navigator.language?.toLowerCase().startsWith('uk') ? 'uk' : 'en';
}

let current: Lang = 'uk';

/** Current translation table. */
export function tr(): Strings {
  return DICTS[current];
}

export function getLang(): Lang {
  return current;
}

/** Set the active language in-memory only (no persistence). */
export function setCurrentLang(lang: Lang): void {
  current = lang;
}

/** Load the stored language (or detect from locale) into the module variable. */
export async function initLang(): Promise<Lang> {
  const stored = await langPref.getValue();
  current = stored === 'uk' || stored === 'en' ? stored : detect();
  return current;
}

/** Persist and apply a language choice. */
export async function setLang(lang: Lang): Promise<void> {
  setCurrentLang(lang);
  await langPref.setValue(lang);
}
