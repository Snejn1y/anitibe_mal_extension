import { useState, useEffect } from 'react';
import './App.css';
import logoUrl from '~/assets/logo.png';
import pkg from '~/package.json';
import { BUG_REPORT_URL, REPO_URL } from '~/utils/config';

interface User {
  name: string;
  picture?: string;
}

type AuthState = 'loading' | 'logged-out' | 'logged-in';
type Tab = 'home' | 'about';

function App() {
  const [tab, setTab] = useState<Tab>('home');
  const [authState, setAuthState] = useState<AuthState>('loading');
  const [user, setUser] = useState<User | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { checkAuth(); }, []);

  async function checkAuth() {
    setAuthState('loading');
    const res = await browser.runtime.sendMessage({ action: 'getAuthStatus' });
    if (res?.data?.isLoggedIn) {
      setUser(res.data.user);
      setAuthState('logged-in');
    } else {
      setAuthState('logged-out');
    }
  }

  async function handleLogin() {
    setIsLoggingIn(true);
    setError(null);
    const res = await browser.runtime.sendMessage({ action: 'login' });
    if (res?.success) {
      await checkAuth();
    } else {
      setError(res?.error ?? 'Щось пішло не так');
      setAuthState('logged-out');
    }
    setIsLoggingIn(false);
  }

  async function handleLogout() {
    await browser.runtime.sendMessage({ action: 'logout' });
    setUser(null);
    setAuthState('logged-out');
  }

  const bugUrl = `${BUG_REPORT_URL}?title=${encodeURIComponent('[Баг] ')}&body=${encodeURIComponent(
    `Опишіть проблему:\n\n\nЩо очікували:\n\n\nКроки відтворення:\n1. \n2. \n\n---\nВерсія: ${pkg.version}\nБраузер: ${navigator.userAgent}`,
  )}`;

  return (
    <div className="popup">
      <header className="popup-header">
        <div className="header-inner">
          <div className="header-logo">
            <img src={logoUrl} alt="logo" />
          </div>
          <div>
            <div className="header-title">AniTube Sync</div>
            <div className="header-sub">автоматичний трекер аніме</div>
          </div>
        </div>
      </header>

      <nav className="popup-tabs">
        <button
          className={`tab${tab === 'home' ? ' active' : ''}`}
          onClick={() => setTab('home')}
        >
          Головна
        </button>
        <button
          className={`tab${tab === 'about' ? ' active' : ''}`}
          onClick={() => setTab('about')}
        >
          Про розширення
        </button>
      </nav>

      <main className="popup-main">
        {tab === 'home' && (
          <>
            {authState === 'loading' && (
              <div className="state-loading">
                <div className="spinner" />
                <span>секунду...</span>
              </div>
            )}

            {authState === 'logged-out' && (
              <div className="state-logged-out">
                <ul className="feature-list">
                  <li>Серії фіксуються автоматично</li>
                  <li>Список на MAL оновлюється одразу</li>
                  <li>Оцінка після фіналу</li>
                  <li>Ручний пошук аніме</li>
                </ul>

                {error && <p className="error-msg">{error}</p>}

                <button className="btn-login" onClick={handleLogin} disabled={isLoggingIn}>
                  {isLoggingIn ? 'Відкриваємо MAL...' : 'Увійти через MyAnimeList'}
                </button>
              </div>
            )}

            {authState === 'logged-in' && user && (
              <div className="state-logged-in">
                <div className="user-card">
                  {user.picture
                    ? <img className="user-avatar" src={user.picture} alt={user.name} />
                    : <div className="user-avatar-placeholder">{user.name[0].toUpperCase()}</div>
                  }
                  <div className="user-info">
                    <div className="user-name">{user.name}</div>
                    <div className="user-status">
                      <span className="status-dot" />
                      підключено до MAL
                    </div>
                  </div>
                </div>

                <div className="sync-box">
                  Відкрий аніме на anitube.in.ua — розширення зробить решту само.
                </div>

                <button className="btn-logout" onClick={handleLogout}>
                  Вийти з акаунту
                </button>
              </div>
            )}
          </>
        )}

        {tab === 'about' && (
          <div className="state-about">
            <p className="about-desc">
              Автоматично відстежує переглянуті серії на <b>anitube.in.ua</b> і
              синхронізує прогрес із вашим списком на <b>MyAnimeList</b>.
            </p>

            <div className="about-rows">
              <div className="about-row"><span>Версія</span><b>{pkg.version}</b></div>
              <div className="about-row"><span>Розробник</span><b>Sn1zhok</b></div>
            </div>

            <a className="btn-bug" href={bugUrl} target="_blank" rel="noopener noreferrer">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="m8 2 1.88 1.88M14.12 3.88 16 2M9 7.13v-1a3.003 3.003 0 1 1 6 0v1M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6zM12 20v-9M6.53 9C4.6 8.8 3 7.1 3 5M6 13H2M3 21c0-2.1 1.7-3.9 3.8-4M20.97 5c0 2.1-1.6 3.8-3.5 4M22 13h-4M17.2 17c2.1.1 3.8 1.9 3.8 4" />
              </svg>
              Повідомити про баг
            </a>

            <a className="about-link" href={REPO_URL} target="_blank" rel="noopener noreferrer">
              Сторінка проєкту →
            </a>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
