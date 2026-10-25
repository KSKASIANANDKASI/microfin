import { Fragment, type ReactNode } from 'react';
import { t } from '@lms/i18n';
import { palette } from '@lms/theme';
import { Logo } from './Logo';
import { BoltIcon, ChartIcon, ShieldIcon } from './icons';

const COMPANY = 'Billionbrains Tech Ltd';

function points() {
  return [
    {
      id: 'security',
      icon: <ShieldIcon />,
      title: t('auth.brand.points.security.title'),
      body: t('auth.brand.points.security.body'),
    },
    {
      id: 'portfolio',
      icon: <ChartIcon />,
      title: t('auth.brand.points.portfolio.title'),
      body: t('auth.brand.points.portfolio.body'),
    },
    {
      id: 'offline',
      icon: <BoltIcon />,
      title: t('auth.brand.points.offline.title'),
      body: t('auth.brand.points.offline.body'),
    },
  ];
}

/**
 * Splits a translated template like "I agree to the {terms}…" and drops React
 * nodes into its `{placeholders}`, so links and emphasis keep the sentence's
 * word order in every language.
 */
export function fillTemplate(template: string, nodes: Record<string, ReactNode>): ReactNode {
  return template.split(/(\{\w+\})/).map((part, index) => {
    const name = /^\{(\w+)\}$/.exec(part)?.[1];
    const node = name !== undefined && name in nodes ? nodes[name] : part;
    return <Fragment key={index}>{node}</Fragment>;
  });
}

/**
 * Two-pane auth shell: brand storytelling on the left, form on the right.
 * Below 900px the brand pane is dropped and a compact lockup sits above the form.
 */
export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="auth">
      <aside className="auth__brand">
        <span className="auth__glow" aria-hidden />
        <svg className="auth__swoosh" viewBox="0 0 600 300" preserveAspectRatio="none" aria-hidden>
          <defs>
            <linearGradient id="auth-swoosh" x1="0" y1="300" x2="600" y2="0" gradientUnits="userSpaceOnUse">
              <stop stopColor={palette.gold700} stopOpacity="0.1" />
              <stop offset="0.6" stopColor={palette.gold500} stopOpacity="0.7" />
              <stop offset="1" stopColor={palette.gold200} stopOpacity="0.2" />
            </linearGradient>
          </defs>
          <path d="M0 300C60 150 240 40 600 0 300 90 140 180 80 300z" fill="url(#auth-swoosh)" />
        </svg>

        <Logo tone="light" size={46} />

        <div className="auth__brand-body">
          <p className="auth__eyebrow">{t('auth.brand.eyebrow')}</p>
          <h2 className="auth__headline">
            {t('auth.brand.headlineLine1')}
            <br />
            {fillTemplate(t('auth.brand.headlineLine2'), { clarity: <em>{t('auth.brand.clarity')}</em> })}
          </h2>
          <p className="auth__sub">{t('auth.brand.sub')}</p>

          <ul className="auth__points">
            {points().map((point) => (
              <li className="auth__point" key={point.id}>
                {point.icon}
                <span>
                  <b>{point.title}</b>
                  {point.body}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <p className="auth__brand-foot">
          {t('auth.brand.copyright', { year: new Date().getFullYear(), company: COMPANY })}
        </p>
      </aside>

      <main className="auth__panel">
        <div className="auth__form-wrap">
          <div className="auth__mobile-logo">
            <Logo size={40} />
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
