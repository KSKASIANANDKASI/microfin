import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { t, tp } from '@lms/i18n';
import { Card } from '../components/Card';
import { ChevronDownIcon, SearchIcon } from '../components/icons';
import {
  filterLoanBook,
  formatCurrency,
  formatNumber,
  lineById,
  lines,
  loanBook,
  type LoanBookFilter,
  type LoanBookSort,
} from '../lib/data';
import { formatDate, loanTypeLabel } from '../lib/loan';
import { useApplications } from '../lib/useApplications';
import { LoanStatePill } from './CustomerView';

const FILTERS: LoanBookFilter[] = ['all', 'active', 'overdue', 'closed'];
const SORTS: LoanBookSort[] = ['newest', 'late', 'outstanding'];

/** The whole loan book across customers and lines. */
export function Loans() {
  const [query, setQuery] = useState('');
  const [state, setState] = useState<LoanBookFilter>('all');
  const [lineId, setLineId] = useState('all');
  const [sort, setSort] = useState<LoanBookSort>('newest');
  const pending = useApplications().filter((a) => a.status === 'pending').length;

  const book = useMemo(loanBook, []);
  const rows = filterLoanBook(book, { query, state, lineId, sort });

  const open = book.filter((e) => e.summary.state !== 'closed');
  const behind = book.filter((e) => e.summary.state === 'overdue');
  const outstanding = open.reduce((sum, e) => sum + e.summary.outstanding, 0);
  const overdueAmount = behind.reduce((sum, e) => sum + e.overdueAmount, 0);
  const disbursed = book.reduce((sum, e) => sum + e.loan.principal, 0);

  return (
    <>
      <div className="pagehead row-between">
        <div>
          <h1 className="pagehead__title">{t('common.nav.loans')}</h1>
          <p className="pagehead__sub">
            {tp('loans.list.subtitle', book.length, { amount: formatCurrency(outstanding) })}
          </p>
        </div>
        <Link className="btn btn--sm" to="/loans/new">
          {t('common.screens.newLoan')}
        </Link>
      </div>

      <div className="kpis">
        <Kpi
          tone="blue"
          label={t('loans.list.kpis.active')}
          value={formatNumber(open.length)}
          note={tp('loans.list.kpis.activeNote', book.length - open.length)}
        />
        <Kpi
          tone="teal"
          label={t('loans.list.kpis.outstanding')}
          value={formatCurrency(outstanding, true)}
          note={t('loans.list.kpis.outstandingNote')}
        />
        <Kpi
          tone="rose"
          label={t('loans.list.kpis.overdue')}
          value={formatCurrency(overdueAmount, true)}
          note={tp('loans.list.kpis.overdueNote', behind.length)}
          bad={behind.length > 0}
        />
        <Kpi
          tone="gold"
          label={t('loans.list.kpis.disbursed')}
          value={formatCurrency(disbursed, true)}
          note={t('loans.list.kpis.disbursedNote')}
        />
      </div>

      {pending ? (
        <p className="notice">
          {tp('loans.list.pendingApprovals', pending)} <Link to="/approvals">{t('loans.list.reviewApprovals')}</Link>
        </p>
      ) : null}

      <div className="filters">
        <label className="search">
          <SearchIcon />
          <input
            type="search"
            placeholder={t('loans.list.searchPlaceholder')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label={t('loans.list.searchLabel')}
          />
        </label>

        <label className="select">
          <span className="sr-only">{t('loans.list.lineFilter')}</span>
          <select value={lineId} onChange={(e) => setLineId(e.target.value)}>
            <option value="all">{t('loans.list.allLines')}</option>
            {lines.map((line) => (
              <option key={line.id} value={line.id}>
                {line.name}
              </option>
            ))}
          </select>
          <ChevronDownIcon />
        </label>

        <label className="select">
          <span className="sr-only">{t('loans.list.sortLabel')}</span>
          <select value={sort} onChange={(e) => setSort(e.target.value as LoanBookSort)}>
            {SORTS.map((option) => (
              <option key={option} value={option}>
                {t(`loans.list.sort.${option}`)}
              </option>
            ))}
          </select>
          <ChevronDownIcon />
        </label>
      </div>

      <div className="chips" role="group" aria-label={t('loans.list.filterLabel')}>
        {FILTERS.map((option) => (
          <button
            key={option}
            type="button"
            className={`chip${state === option ? ' chip--on' : ''}`}
            aria-pressed={state === option}
            onClick={() => setState(option)}
          >
            {t(`loans.list.filters.${option}`)} ·{' '}
            {option === 'all' ? book.length : book.filter((e) => e.summary.state === option).length}
          </button>
        ))}
      </div>

      <Card padded={false}>
        {rows.length === 0 ? (
          <p className="empty">{t('loans.list.empty')}</p>
        ) : (
          <div className="tablewrap tablewrap--flush">
            <table className="dtable dtable--flush">
              <thead>
                <tr>
                  <th scope="col">{t('loans.list.columns.loan')}</th>
                  <th scope="col">{t('loans.list.columns.customer')}</th>
                  <th scope="col">{t('loans.list.columns.type')}</th>
                  <th scope="col" className="num">
                    {t('loans.list.columns.principal')}
                  </th>
                  <th scope="col" className="num">
                    {t('loans.list.columns.emi')}
                  </th>
                  <th scope="col">{t('loans.list.columns.disbursed')}</th>
                  <th scope="col" className="num">
                    {t('loans.list.columns.outstanding')}
                  </th>
                  <th scope="col">{t('loans.list.columns.nextDue')}</th>
                  <th scope="col">{t('loans.list.columns.status')}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ loan, customer, summary }) => (
                  <tr key={loan.id}>
                    <td>
                      <Link to={`/loans/${loan.id}`}>
                        <b>{loan.id}</b>
                      </Link>
                    </td>
                    <td>
                      {customer ? <Link to={`/customers/${customer.id}`}>{customer.name}</Link> : loan.customerId}
                      <span className="dtable__sub">{lineById(loan.lineId)?.name ?? '—'}</span>
                    </td>
                    <td>{loanTypeLabel(loan.type)}</td>
                    <td className="num">{formatCurrency(loan.principal)}</td>
                    <td className="num">{formatCurrency(loan.emi)}</td>
                    <td>{formatDate(loan.disbursedOn)}</td>
                    <td className="num">{summary.state === 'closed' ? '—' : formatCurrency(summary.outstanding)}</td>
                    <td>{summary.next ? formatDate(summary.next.dueOn) : '—'}</td>
                    <td>
                      <LoanStatePill state={summary.state} daysLate={summary.daysLate} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}

type KpiTone = 'blue' | 'teal' | 'rose' | 'gold';

function Kpi({
  tone,
  label,
  value,
  note,
  bad,
}: {
  tone: KpiTone;
  label: string;
  value: string;
  note: string;
  bad?: boolean;
}) {
  return (
    <article className={`kpi kpi--tint kpi--tint-${tone}`}>
      <p className="kpi__label">{label}</p>
      <p className="kpi__value">{value}</p>
      <p className={`kpi__note kpi__note--flush${bad ? ' kpi__note--bad' : ''}`}>{note}</p>
    </article>
  );
}
