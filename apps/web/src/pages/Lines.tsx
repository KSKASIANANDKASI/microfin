import { Link } from 'react-router-dom';
import { t, tp } from '@lms/i18n';
import { Card } from '../components/Card';
import {
  formatCurrency,
  formatNumber,
  frequencyLabel,
  lines,
  officerLabel,
  weekdayLabel,
} from '../lib/data';
import type { Line } from '../lib/data';
import { usePortfolio } from '../lib/usePortfolio';
import { isManager } from '../lib/session';

export function Lines() {
  usePortfolio();
  const accounts = lines.reduce((n, l) => n + l.accounts, 0);
  // Officers see their own lines; only managers set lines up.
  const manager = isManager();

  return (
    <>
      <div className="pagehead row-between">
        <div>
          <h1 className="pagehead__title">{t('common.nav.lines')}</h1>
          <p className="pagehead__sub">
            {tp('lines.count', lines.length)} ·{' '}
            {tp('lines.accounts', accounts, { count: formatNumber(accounts) })}
          </p>
        </div>
        {manager ? (
          <Link className="btn btn--sm" to="/lines/new">
            {t('common.screens.newLine')}
          </Link>
        ) : null}
      </div>

      <Card padded={false}>
        <ul className="list list--flush">
          {lines.map((line) => (
            <li className="list__row" key={line.id}>
              <span className="list__main">
                <b>{line.name}</b>
                <span className="list__meta">
                  {officerLabel(line.officer)} ·{' '}
                  {tp('lines.accounts', line.accounts, { count: formatNumber(line.accounts) })} ·{' '}
                  {t('lines.dueToday', { amount: formatCurrency(line.due) })}
                </span>
              </span>
              <span className="freq">
                {frequencyLabel(line.frequency)}
                {line.schedule ? <span className="freq__when">{scheduleText(line)}</span> : null}
              </span>
              <Link className="btn btn--sm btn--ghost" to={`/collection/route?line=${line.id}`}>
                {t('collection.route.view')}
              </Link>
              {manager ? (
                <Link className="btn btn--sm btn--ghost" to="/lines/new">
                  {t('common.actions.edit')}
                </Link>
              ) : null}
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}

export function scheduleText(line: Pick<Line, 'frequency' | 'schedule'>): string {
  if (!line.schedule) return '';
  if (line.frequency === 'weekly') return t('lines.schedule.weekly', { day: weekdayLabel(line.schedule) });
  if (line.schedule === 'Last day') return t('lines.schedule.lastDay');
  // English wants "5th"; other languages use the bare number from {day}.
  return t('lines.schedule.monthly', { day: line.schedule, ordinal: ordinal(line.schedule) });
}

function ordinal(day: string): string {
  const n = Number(day);
  if (!Number.isFinite(n)) return day;
  const suffix = n % 10 === 1 && n !== 11 ? 'st' : n % 10 === 2 && n !== 12 ? 'nd' : n % 10 === 3 && n !== 13 ? 'rd' : 'th';
  return `${n}${suffix}`;
}
