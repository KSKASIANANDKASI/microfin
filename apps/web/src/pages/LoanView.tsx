import { Link, useParams } from 'react-router-dom';
import { t, tp } from '@lms/i18n';
import { Card } from '../components/Card';
import { ArrowLeftIcon } from '../components/icons';
import {
  customerById,
  formatCurrency,
  lineById,
  loanById,
  officerLabel,
  summarizeLoan,
  type Repayment,
} from '../lib/data';
import { addMonths, formatDate, loanTypeLabel, type ScheduleRow } from '../lib/loan';
import { LoanStatePill } from './CustomerView';
import { usePortfolio } from '../lib/usePortfolio';

export function LoanView() {
  usePortfolio();
  const { id = '' } = useParams();
  const loan = loanById(id);

  if (!loan) {
    return (
      <>
        <div className="pagehead">
          <Link className="backlink" to="/loans">
            <ArrowLeftIcon size={14} /> {t('common.nav.loans')}
          </Link>
          <h1 className="pagehead__title">{t('loans.view.title')}</h1>
        </div>
        <Card>
          <p className="empty">{t('loans.view.notFound', { id })}</p>
        </Card>
      </>
    );
  }

  const customer = customerById(loan.customerId);
  const line = lineById(loan.lineId);
  const summary = summarizeLoan(loan);
  const { schedule, next } = summary;
  const paidCount = summary.repayments.length;
  const onTime = summary.repayments.filter((r) => r.daysLate === 0).length;
  const closesOn = addMonths(loan.disbursedOn, loan.months);
  const repaidPct = summary.totalPayable
    ? Math.min(100, Math.round((summary.paid / summary.totalPayable) * 100))
    : 0;

  return (
    <>
      <div className="pagehead">
        {customer ? (
          <Link className="backlink" to={`/customers/${customer.id}`}>
            <ArrowLeftIcon size={14} /> {customer.name}
          </Link>
        ) : (
          <Link className="backlink" to="/loans">
            <ArrowLeftIcon size={14} /> {t('common.nav.loans')}
          </Link>
        )}
      </div>

      <section className="loanhero">
        <div className="loanhero__top">
          <div className="loanhero__id">
            <h1 className="loanhero__title">{loan.id}</h1>
            <p className="loanhero__name">
              {customer ? <Link to={`/customers/${customer.id}`}>{customer.name}</Link> : t('loans.view.unknownCustomer')}
            </p>
            <p className="loanhero__meta">
              {t('loans.view.typeMeta', { type: loanTypeLabel(loan.type), rate: loan.annualRatePct })}
              {line ? ` · ${line.name} · ${officerLabel(line.officer)}` : ''}
            </p>
          </div>
          <LoanStatePill state={summary.state} daysLate={summary.daysLate} />
        </div>

        <div className="loanhero__progress">
          <div className="loanhero__progress-head">
            <span>{t('loans.view.repaidPct', { pct: repaidPct })}</span>
            <span>
              {formatCurrency(summary.paid)} / {formatCurrency(summary.totalPayable)}
            </span>
          </div>
          <div
            className="loanhero__track"
            role="progressbar"
            aria-label={t('loans.view.repaidLabel')}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={repaidPct}
          >
            <span className="loanhero__bar" style={{ width: `${repaidPct}%` }} />
          </div>
        </div>
      </section>

      <div className="kpis">
        <article className="kpi">
          <p className="kpi__label">{t('loans.view.outstanding')}</p>
          <p className="kpi__value">{formatCurrency(summary.outstanding)}</p>
          <p className="kpi__note kpi__note--flush">
            {t('loans.view.ofRepayable', { amount: formatCurrency(summary.totalPayable) })}
          </p>
        </article>
        <article className="kpi">
          <p className="kpi__label">{t('loans.view.paidSoFar')}</p>
          <p className="kpi__value">{formatCurrency(summary.paid)}</p>
          <p className="kpi__note kpi__note--flush">
            {tp('loans.view.installmentsPaid', schedule.length, { paid: paidCount })}
          </p>
        </article>
        <article className="kpi">
          <p className="kpi__label">{t('loans.view.emi')}</p>
          <p className="kpi__value">{formatCurrency(loan.emi)}</p>
          <p className="kpi__note kpi__note--flush">{t('loans.view.monthly')}</p>
        </article>
        <article className="kpi">
          <p className="kpi__label">{t('loans.view.nextDue')}</p>
          <p className="kpi__value">{next ? formatCurrency(next.amount) : '—'}</p>
          <p className={`kpi__note kpi__note--flush${next?.status === 'overdue' ? ' kpi__note--bad' : ''}`}>
            {next
              ? next.status === 'overdue'
                ? `${formatDate(next.dueOn)} · ${t('common.status.daysLate', { count: next.daysLate })}`
                : next.status === 'due'
                  ? t('common.status.dueToday')
                  : formatDate(next.dueOn)
              : t('loans.view.fullyRepaid')}
          </p>
        </article>
      </div>

      <Card title={t('loans.view.terms')} subtitle={t('loans.view.termsSub', { type: loanTypeLabel(loan.type) })}>
        <dl className="summary">
          <div className="summary__row">
            <dt>{t('loans.fields.principal')}</dt>
            <dd>{formatCurrency(loan.principal)}</dd>
          </div>
          <div className="summary__row">
            <dt>{t('loans.fields.rate')}</dt>
            <dd>{t('loans.summary.ratePerYear', { rate: loan.annualRatePct })}</dd>
          </div>
          <div className="summary__row">
            <dt>{loan.type === 'PRE' ? t('loans.summary.interestUpfront') : t('loans.summary.interestWithEmi')}</dt>
            <dd>{formatCurrency(summary.totalInterest)}</dd>
          </div>
          <div className="summary__row">
            <dt>{t('loans.fields.fee')}</dt>
            <dd>{loan.fee ? `− ${formatCurrency(loan.fee)}` : '—'}</dd>
          </div>
          <div className="summary__row">
            <dt>{t('loans.fields.tenure')}</dt>
            <dd>
              {tp('loans.summary.months', loan.months)}
              <span className="summary__note">
                {formatDate(loan.disbursedOn)} → {closesOn ? formatDate(closesOn) : '—'}
              </span>
            </dd>
          </div>
          <div className="summary__row summary__row--total">
            <dt>{t('loans.summary.netDisbursal')}</dt>
            <dd>{formatCurrency(summary.netDisbursal)}</dd>
          </div>
          <div className="summary__row summary__row--total">
            <dt>{t('loans.summary.totalPayable')}</dt>
            <dd>{formatCurrency(summary.totalPayable)}</dd>
          </div>
        </dl>
      </Card>

      <Card title={t('loans.view.schedule')} subtitle={t('loans.view.scheduleSub')} padded={false}>
        <div className="tablewrap">
          <table className="dtable dtable--flush">
            <thead>
              <tr>
                <th scope="col">#</th>
                <th scope="col">{t('loans.view.table.dueOn')}</th>
                <th scope="col" className="num">
                  {t('loans.view.table.amount')}
                </th>
                <th scope="col" className="num">
                  {t('loans.view.table.balanceAfter')}
                </th>
                <th scope="col">{t('loans.view.table.status')}</th>
                <th scope="col">{t('loans.view.table.paidOn')}</th>
              </tr>
            </thead>
            <tbody>
              {schedule.map((row) => (
                <tr key={row.seq} className={row.seq === next?.seq ? 'dtable__row--next' : undefined}>
                  <td>{row.seq}</td>
                  <td>{formatDate(row.dueOn)}</td>
                  <td className="num">{formatCurrency(row.amount)}</td>
                  <td className="num">{formatCurrency(row.balanceAfter)}</td>
                  <td>
                    <InstallmentPill row={row} />
                  </td>
                  <td>{row.paidOn ? formatDate(row.paidOn) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card
        title={t('loans.view.history')}
        subtitle={
          paidCount
            ? tp('loans.view.historySummary', paidCount, { onTime, late: paidCount - onTime })
            : t('loans.view.historyEmpty')
        }
        padded={false}
      >
        {paidCount ? (
          <ul className="list list--flush list--ruled">
            {summary.repayments.map((repayment) => (
              <RepaymentRow key={repayment.seq} repayment={repayment} of={schedule.length} />
            ))}
          </ul>
        ) : (
          <p className="empty">{t('loans.view.firstDue', { date: next ? formatDate(next.dueOn) : '—' })}</p>
        )}
      </Card>
    </>
  );
}

function RepaymentRow({ repayment, of }: { repayment: Repayment; of: number }) {
  return (
    <li className="list__row">
      <span className="list__main">
        <b>{formatDate(repayment.paidOn)}</b>
        <span className="list__meta">
          {t('loans.view.receiptLine', { receipt: repayment.receiptNo, seq: repayment.seq, total: of })}
        </span>
      </span>
      <span className="list__amount">{formatCurrency(repayment.amount)}</span>
      {repayment.daysLate ? (
        <span className="pill pill--warning">{t('common.status.daysLate', { count: repayment.daysLate })}</span>
      ) : (
        <span className="pill pill--good">{t('loans.view.onTime')}</span>
      )}
    </li>
  );
}

function InstallmentPill({ row }: { row: ScheduleRow }) {
  switch (row.status) {
    case 'paid':
      return <span className="pill pill--good">{t('common.status.paid')}</span>;
    case 'overdue':
      return <span className="pill pill--critical">{t('common.status.daysLate', { count: row.daysLate })}</span>;
    case 'due':
      return <span className="pill pill--warning">{t('common.status.dueToday')}</span>;
    default:
      return <span className="pill">{t('common.status.upcoming')}</span>;
  }
}
