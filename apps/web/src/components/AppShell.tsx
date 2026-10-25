import { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { t } from '@lms/i18n';
import { ensurePortfolio, portfolioLoaded } from '../lib/data';
import { errorMessage, getSession } from '../lib/session';
import { usePortfolio } from '../lib/usePortfolio';
import { Button } from './Button';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';

/** Top header, a side menu, and the routed section. */
export function AppShell() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { pathname } = useLocation();
  usePortfolio();
  const [loadError, setLoadError] = useState<string>();
  const [attempt, setAttempt] = useState(0);
  const signedIn = !!getSession();

  // A saved session opens straight into the shell; fetch its portfolio first.
  useEffect(() => {
    if (!signedIn || portfolioLoaded()) return;
    setLoadError(undefined);
    ensurePortfolio().catch((error) => setLoadError(errorMessage(error)));
  }, [signedIn, attempt]);

  // A route change means the drawer did its job.
  useEffect(() => setMenuOpen(false), [pathname]);

  // Every page inside the shell needs a signed-in user.
  if (!getSession()) return <Navigate to="/sign-in" replace />;

  if (!portfolioLoaded()) {
    return (
      <div className="shell shell--loading" aria-busy={!loadError}>
        {loadError ? (
          <div className="stack">
            <div className="notice notice--bad" role="alert">
              {loadError}
            </div>
            <Button type="button" onClick={() => setAttempt((n) => n + 1)}>
              {t('common.actions.retry')}
            </Button>
          </div>
        ) : (
          <p className="empty">{t('common.status.loading')}</p>
        )}
      </div>
    );
  }

  return (
    <div className="shell">
      <TopBar onMenuToggle={() => setMenuOpen((v) => !v)} menuOpen={menuOpen} />

      <div className="shell__body">
        <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />

        <main className="shell__main">
          <div className="shell__content">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
