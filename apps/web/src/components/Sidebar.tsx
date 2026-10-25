import { t } from '@lms/i18n';
import { useEffect, useRef } from 'react';
import { NavLink } from 'react-router-dom';
import {
  CalculatorIcon,
  GearIcon,
  HomeIcon,
  LedgerIcon,
  ReportIcon,
  RouteIcon,
  ShieldIcon,
  SparkIcon,
  UsersIcon,
  WalletIcon,
} from './icons';
import { useApplications } from '../lib/useApplications';
import { isManager } from '../lib/session';

/** Built per render so the labels follow the active language. */
const sections = () => [
  {
    label: t('common.nav.collections'),
    items: [
      { to: '/dashboard', label: t('common.nav.dashboard'), icon: HomeIcon },
      { to: '/customers', label: t('common.nav.customers'), icon: UsersIcon },
      { to: '/loans', label: t('common.nav.loans'), icon: LedgerIcon },
      { to: '/approvals', label: t('common.nav.approvals'), icon: ShieldIcon },
      { to: '/collection', label: t('common.nav.collection'), icon: WalletIcon },
      ...(isManager() ? [{ to: '/reports', label: t('common.nav.reports'), icon: ReportIcon }] : []),
      { to: '/insights', label: t('common.nav.insights'), icon: SparkIcon },
      { to: '/calculator', label: t('common.nav.calculator'), icon: CalculatorIcon },
    ],
  },
  {
    label: t('common.nav.setup'),
    items: [
      { to: '/lines', label: t('common.nav.lines'), icon: RouteIcon },
      { to: '/settings', label: t('common.nav.settings'), icon: GearIcon },
    ],
  },
];

type Props = { open: boolean; onClose: () => void };

/**
 * Persistent rail from 1024px up; below that it slides in over the page and
 * behaves like a dialog — focus moves in, Escape and the scrim close it.
 */
export function Sidebar({ open, onClose }: Props) {
  const navRef = useRef<HTMLElement>(null);
  const pending = useApplications().filter((a) => a.status === 'pending').length;

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }

    navRef.current?.querySelector<HTMLAnchorElement>('a')?.focus();
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  return (
    <>
      {open ? <div className="scrim" onClick={onClose} aria-hidden /> : null}

      <nav
        className={`sidebar${open ? ' sidebar--open' : ''}`}
        aria-label={t('common.nav.sections')}
        ref={navRef}
      >
        {sections().map((section) => (
          <div className="sidebar__group" key={section.label}>
            <p className="sidebar__legend">{section.label}</p>
            <ul className="sidebar__list">
              {section.items.map(({ to, label, icon: Icon }) => (
                <li key={to}>
                  <NavLink
                    to={to}
                    className={({ isActive }) => `navitem${isActive ? ' navitem--active' : ''}`}
                    onClick={onClose}
                  >
                    <Icon size={18} />
                    {label}
                    {to === '/approvals' && pending ? <span className="navitem__badge">{pending}</span> : null}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
    </>
  );
}
