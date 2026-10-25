import { t } from '@lms/i18n';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogoMark } from './Logo';
import { clearPortfolio, notifications, user } from '../lib/data';
import { usePortfolio } from '../lib/usePortfolio';
import { clearSession } from '../lib/session';
import {
  BellIcon,
  ChevronDownIcon,
  CloseIcon,
  GearIcon,
  IdIcon,
  LogOutIcon,
  MenuIcon,
} from './icons';

type Panel = 'notifications' | 'profile' | null;

export function TopBar({
  onMenuToggle,
  menuOpen,
}: {
  onMenuToggle: () => void;
  menuOpen: boolean;
}) {
  usePortfolio();
  const navigate = useNavigate();
  const [panel, setPanel] = useState<Panel>(null);
  const barRef = useRef<HTMLElement>(null);
  const unread = notifications.filter((n) => n.unread).length;

  // Dismiss an open menu on outside click or Escape.
  useEffect(() => {
    if (!panel) return;

    function onPointerDown(event: MouseEvent) {
      if (!barRef.current?.contains(event.target as Node)) setPanel(null);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setPanel(null);
    }

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [panel]);

  function toggle(next: Exclude<Panel, null>) {
    setPanel((current) => (current === next ? null : next));
  }

  return (
    <header className="topbar" ref={barRef}>
      <div className="topbar__inner">
        <div className="topbar__brand">
          {/* Only rendered below the sidebar's breakpoint — see global.css. */}
          <button
            type="button"
            className="iconbtn topbar__menu"
            onClick={onMenuToggle}
            aria-label={menuOpen ? t('common.topbar.closeMenu') : t('common.topbar.openMenu')}
            aria-expanded={menuOpen}
          >
            {menuOpen ? <CloseIcon /> : <MenuIcon />}
          </button>
          <LogoMark size={34} />
          <span className="topbar__name">
            Finance Easy
          </span>
        </div>

        <div className="topbar__actions">
          <button
            type="button"
            className={`iconbtn${panel === 'notifications' ? ' iconbtn--active' : ''}`}
            aria-label={
              unread ? t('common.topbar.notificationsUnread', { count: unread }) : t('common.topbar.notifications')
            }
            aria-expanded={panel === 'notifications'}
            aria-haspopup="dialog"
            onClick={() => toggle('notifications')}
          >
            <BellIcon />
            {unread ? <span className="iconbtn__badge">{unread}</span> : null}
          </button>

          <button
            type="button"
            className="iconbtn"
            aria-label={t('common.nav.settings')}
            onClick={() => navigate('/settings')}
          >
            <GearIcon />
          </button>

          <button
            type="button"
            className={`profilebtn${panel === 'profile' ? ' profilebtn--active' : ''}`}
            aria-expanded={panel === 'profile'}
            aria-haspopup="menu"
            onClick={() => toggle('profile')}
          >
            <span className="avatar" aria-hidden>
              {user.initials}
            </span>
            <span className="profilebtn__text">
              <span className="profilebtn__name">{user.name}</span>
              <span className="profilebtn__role">{user.role}</span>
            </span>
            <ChevronDownIcon />
          </button>

          {panel === 'notifications' ? (
            <div className="popover popover--wide" role="dialog" aria-label={t('common.topbar.notifications')}>
              <div className="popover__head">
                <strong>{t('common.topbar.notifications')}</strong>
                <button type="button" className="linkbtn">
                  {t('common.topbar.markAllRead')}
                </button>
              </div>
              <ul className="notif">
                {notifications.map((item) => (
                  <li key={item.id} className={`notif__item${item.unread ? ' notif__item--unread' : ''}`}>
                    <span className="notif__dot" aria-hidden />
                    <span>
                      <b>{item.title}</b>
                      <span className="notif__body">{item.body}</span>
                      <span className="notif__at">{item.at}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {panel === 'profile' ? (
            <div className="popover" role="menu" aria-label={t('common.topbar.profile')}>
              <div className="popover__id">
                <span className="avatar avatar--lg" aria-hidden>
                  {user.initials}
                </span>
                <span>
                  <b>{user.name}</b>
                  <span className="popover__sub">{user.branch}</span>
                </span>
              </div>
              <button type="button" className="menuitem" role="menuitem">
                <IdIcon /> {t('common.topbar.myProfile')}
              </button>
              <button
                type="button"
                className="menuitem"
                role="menuitem"
                onClick={() => navigate('/settings')}
              >
                <GearIcon size={16} /> {t('common.nav.settings')}
              </button>
              <hr className="popover__rule" />
              <button
                type="button"
                className="menuitem menuitem--danger"
                role="menuitem"
                onClick={() => {
                  clearSession();
                  clearPortfolio();
                  navigate('/sign-in', { replace: true });
                }}
              >
                <LogOutIcon /> {t('common.topbar.signOut')}
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
