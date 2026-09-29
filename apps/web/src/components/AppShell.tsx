import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';

/** Top header, a side menu, and the routed section. */
export function AppShell() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { pathname } = useLocation();

  // A route change means the drawer did its job.
  useEffect(() => setMenuOpen(false), [pathname]);

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
