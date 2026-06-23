import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router";
import { SyncBanner } from "./SyncBanner";
import { InstallPrompt } from "./InstallPrompt";
import { isCurrentUserAdmin } from "../lib/supabase";
import { useAuth } from "../context";
import "./Layout.css";

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const isHome = location.pathname === "/";
  const isTestPage = location.pathname.startsWith("/test");
  const containerClass = "container container--app";
  const [isAdmin, setIsAdmin] = useState(false);
  const { syncDeadlineWarning, sync, isOnline: online } = useAuth();
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSyncNow = async () => {
    setIsSyncing(true);
    try {
      await sync();
    } catch {
      // error handled in context
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    isCurrentUserAdmin().then(setIsAdmin);
  }, []);

  return (
    <div className="layout">
      <header className="header safe-area-top">
        <div className={`header__container ${containerClass}`}>
          {!isHome && (
            <Link to="/" className="header__back" aria-label="Ana sayfaya dön">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  d="M19 12H5M12 19l-7-7 7-7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Link>
          )}
          <Link to="/" className="header__logo">
            <div className="header__logo-icon">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  d="M22 12h-4l-3 9L9 3l-3 9H2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <span className="header__logo-text">HETracker</span>
          </Link>
          {!isTestPage && (
            <nav className="header__nav">
              {/* <Link
                to="/results"
                className={`header__nav-link ${location.pathname === "/results" ? "active" : ""
                  }`}
                aria-label="Sonuçlar"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    d="M3 3v18h18"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M18 9l-5 5-4-4-3 3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </Link> */}
              <Link
                to="/profile"
                className={`header__nav-link ${location.pathname === "/profile" ? "active" : ""
                  }`}
                aria-label="Profil"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </Link>
              {isAdmin && (
                <Link
                  to="/admin"
                  className="header__nav-link header__nav-link--admin"
                  aria-label="Admin Panel"
                  title="Admin Panel"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path
                      d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </Link>
              )}
            </nav>
          )}
        </div>
      </header>

      {syncDeadlineWarning && (
        <>
        {/*
        <div className="sync-deadline-overlay">
          <div className="sync-deadline-overlay__content">
            <div className="sync-deadline-overlay__icon">⚠️</div>
            <h2 className="sync-deadline-overlay__title">Senkronizasyon Gerekli</h2>
            <p className="sync-deadline-overlay__message">
              İnternetinizi açın/bağlanın ve senkronizasyon işlemini başlatın.
            </p>
            <p className="sync-deadline-overlay__sub">
              Test sonuçlarınız henüz senkronize edilmedi. Verilerinizin kaybolmaması için lütfen internet bağlantınızı açıp senkronizasyonu tamamlayın.
            </p>
            {online ? (
              <button
                className="sync-deadline-overlay__btn"
                onClick={handleSyncNow}
                disabled={isSyncing}
              >
                {isSyncing ? "Senkronize ediliyor..." : "Şimdi Senkronize Et"}
              </button>
            ) : (
              <div className="sync-deadline-overlay__offline">
                📡 Şu anda çevrimdışısınız. Lütfen internet bağlantınızı açın.
              </div>
            )}
          </div>
        </div>
        */}
        </>
      )}

      <main className="main">
        <div className={containerClass}> 
          <InstallPrompt />
        </div>
        {children}
      </main>

      <footer className="footer safe-area-bottom">
        <div className={`footer__container ${containerClass}`}>
          <p className="footer__text">© 2024 HETracker</p>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
