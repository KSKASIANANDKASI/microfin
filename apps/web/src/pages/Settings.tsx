import { Link } from 'react-router-dom';
import { LOCALES, t, tp } from '@lms/i18n';
import { Card } from '../components/Card';
import { useLocale } from '../i18n';
import { customers, lines, user } from '../lib/data';
import { usePortfolio } from '../lib/usePortfolio';

/** `to` links to the page that manages the row; `change` labels that link Change instead of Manage. */
type Row = { id: string; label: string; value: string; to?: string; change?: true; language?: true };

function groups(): { title: string; rows: Row[] }[] {
  return [
    {
      title: t('settings.groups.account'),
      rows: [
        { id: 'name', label: t('settings.rows.name'), value: user.name },
        { id: 'role', label: t('settings.rows.role'), value: user.role },
        { id: 'branch', label: t('settings.rows.branch'), value: user.branch },
      ],
    },
    {
      title: t('settings.groups.collectionSetup'),
      rows: [
        { id: 'lines', label: t('settings.rows.lines'), value: tp('settings.rows.linesValue', lines.length), to: '/lines' },
        {
          id: 'customers',
          label: t('settings.rows.customers'),
          value: tp('settings.rows.customersValue', customers.length),
          to: '/customers',
        },
      ],
    },
    {
      title: t('settings.groups.preferences'),
      rows: [
        { id: 'language', label: t('settings.rows.language'), value: t('settings.rows.languageHint'), language: true },
        { id: 'currency', label: t('settings.rows.currency'), value: t('settings.rows.currencyValue') },
        { id: 'cutoff', label: t('settings.rows.cutoff'), value: t('settings.rows.cutoffValue') },
      ],
    },
    {
      title: t('settings.groups.security'),
      rows: [
        {
          id: 'password',
          label: t('settings.rows.password'),
          value: t('settings.rows.passwordValue'),
          to: '/settings/password',
          change: true,
        },
        { id: 'twoFactor', label: t('settings.rows.twoFactor'), value: t('settings.rows.twoFactorValue') },
        { id: 'sessions', label: t('settings.rows.sessions'), value: t('settings.rows.sessionsValue') },
      ],
    },
  ];
}

export function Settings() {
  usePortfolio();
  const [locale, setLocale] = useLocale();

  return (
    <>
      <div className="pagehead">
        <div>
          <h1 className="pagehead__title">{t('settings.title')}</h1>
          <p className="pagehead__sub">{t('settings.subtitle')}</p>
        </div>
      </div>

      {groups().map((group) => (
        <Card key={group.title} title={group.title} padded={false}>
          <ul className="list list--flush">
            {group.rows.map((row) => (
              <li className="list__row" key={row.id}>
                <span className="list__main">
                  <b>{row.label}</b>
                  <span className="list__meta">{row.value}</span>
                </span>
                {row.language ? (
                  <div className="segmented" role="radiogroup" aria-label={row.label}>
                    {LOCALES.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        role="radio"
                        aria-checked={locale === option.id}
                        lang={option.tag}
                        className={`segmented__btn${locale === option.id ? ' segmented__btn--on' : ''}`}
                        onClick={() => setLocale(option.id)}
                      >
                        {option.nativeLabel}
                      </button>
                    ))}
                  </div>
                ) : row.to ? (
                  <Link className="btn btn--sm btn--ghost" to={row.to}>
                    {row.change ? t('common.actions.change') : t('common.actions.manage')}
                  </Link>
                ) : (
                  <button type="button" className="btn btn--sm btn--ghost">
                    {t('common.actions.change')}
                  </button>
                )}
              </li>
            ))}
          </ul>
        </Card>
      ))}
    </>
  );
}
