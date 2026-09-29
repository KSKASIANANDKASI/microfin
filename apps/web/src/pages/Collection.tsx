import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { t, tp } from '@lms/i18n';
import { Card } from '../components/Card';
import { ChevronDownIcon, SearchIcon } from '../components/icons';
import { formatCurrency, lineById, lines, loanById } from '../lib/data';
import { useCollectionSheet } from '../lib/useCollectionSheet';
import { StatusPill } from './Dashboard';

const FILTERS = ['all', 'due', 'overdue', 'collected'] as const;

type Filter = (typeof FILTERS)[number];

function filterLabel(id: Filter): string {
  if (id === 'all') return t('collection.filterAll');
  if (id === 'due') return t('common.status.dueToday');
  if (id === 'overdue') return t('common.status.overdue');
  return t('common.status.collected');
}

export function Collection() {
  const [filter, setFilter] = useState<Filter>('all');
  const [lineId, setLineId] = useState<string>('all');
  const [query, setQuery] = useState('');
  const sheet = useCollectionSheet();

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return sheet.filter((item) => {
      if (filter !== 'all' && item.status !== filter) return false;
      if (lineId !== 'all' && item.lineId !== lineId) return false;
      if (!needle) return true;
      const line = lineById(item.lineId)?.name ?? '';
      return (
        item.customer.toLowerCase().includes(needle) ||
        item.loanNo.toLowerCase().includes(needle) ||
        line.toLowerCase().includes(needle)
      );
    });
  }, [sheet, filter, lineId, query]);

  const selectedLine = lineId === 'all' ? undefined : lineById(lineId);

  const outstanding = rows
    .filter((r) => r.status !== 'collected')
    .reduce((sum, r) => sum + r.amount, 0);

  return (
    <>
      <div className="pagehead row-between">
        <div>
          <h1 className="pagehead__title">{t('common.nav.collection')}</h1>
          <p className="pagehead__sub">
            {tp('collection.summary', rows.length, {
              scope: selectedLine ? selectedLine.name : t('collection.allLines'),
              amount: formatCurrency(outstanding),
            })}
          </p>
        </div>
        <Link
          className="btn btn--sm btn--ghost"
          to={`/collection/route${selectedLine ? `?line=${selectedLine.id}` : ''}`}
        >
          {t('collection.route.view')}
        </Link>
      </div>

      {/* One filter row above everything it scopes. */}
      <div className="filters">
        <label className="search">
          <SearchIcon />
          <input
            type="search"
            placeholder={t('collection.searchPlaceholder')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label={t('collection.searchLabel')}
          />
        </label>

        <label className="select">
          <span className="sr-only">{t('collection.lineFilter')}</span>
          <select value={lineId} onChange={(e) => setLineId(e.target.value)}>
            <option value="all">{t('collection.allLines')}</option>
            {lines.map((line) => (
              <option key={line.id} value={line.id}>
                {line.name}
              </option>
            ))}
          </select>
          <ChevronDownIcon />
        </label>

        <div className="chips" role="group" aria-label={t('collection.statusFilter')}>
          {FILTERS.map((option) => (
            <button
              key={option}
              type="button"
              className={`chip${filter === option ? ' chip--on' : ''}`}
              aria-pressed={filter === option}
              onClick={() => setFilter(option)}
            >
              {filterLabel(option)}
            </button>
          ))}
        </div>
      </div>

      <Card padded={false}>
        {rows.length === 0 ? (
          <p className="empty">{t('collection.empty')}</p>
        ) : (
          <ul className="list list--flush">
            {rows.map((item) => {
              // Split the template on the loan number so it can stay a link.
              const [metaBefore = '', metaAfter = ''] = t('collection.rowMeta', {
                line: lineById(item.lineId)?.name ?? '',
                date: item.dueOn,
              }).split('{loanNo}');
              return (
              <li className="list__row" key={item.id}>
                <span className="list__avatar" aria-hidden>
                  {item.customer
                    .split(' ')
                    .map((part) => part[0])
                    .join('')}
                </span>
                <span className="list__main">
                  <b>{item.customer}</b>
                  <span className="list__meta">
                    {metaBefore}
                    {loanById(item.loanNo) ? <Link to={`/loans/${item.loanNo}`}>{item.loanNo}</Link> : item.loanNo}
                    {metaAfter}
                  </span>
                </span>
                <span className="list__amount">{formatCurrency(item.amount)}</span>
                <StatusPill status={item.status} daysLate={item.daysLate} />
                {item.status === 'collected' ? (
                  <button type="button" className="btn btn--sm" disabled>
                    {t('collection.receipted')}
                  </button>
                ) : (
                  <Link className="btn btn--sm" to={`/collection/${item.id}`}>
                    {t('collection.collect')}
                  </Link>
                )}
              </li>
              );
            })}
          </ul>
        )}
      </Card>
    </>
  );
}
