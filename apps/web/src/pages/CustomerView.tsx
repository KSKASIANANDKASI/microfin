import type { ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { t, tp } from '@lms/i18n';
import { Card } from '../components/Card';
import { ArrowLeftIcon, IdIcon, PinIcon, PlusIcon } from '../components/icons';
import {
  customerById,
  formatCurrency,
  idTypeLabel,
  lineById,
  loansForCustomer,
  maskIdNumber,
  officerLabel,
  summarizeLoan,
  type Loan,
} from '../lib/data';
import { formatDate, loanTypeLabel } from '../lib/loan';
import { CUSTOMER_STATUS } from './Customers';

export function CustomerView() {
  const { id = '' } = useParams();
  const customer = customerById(id);

  if (!customer) {
    return (
      <>
        <div className="pagehead">
          <Link className="backlink" to="/customers">
            <ArrowLeftIcon size={14} /> {t('customers.list.title')}
          </Link>
          <h1 className="pagehead__title">{t('common.screens.customer')}</h1>
        </div>
        <Card>
          <p className="empty">{t('customers.view.notFound')}</p>
        </Card>
      </>
    );
  }

  const line = lineById(customer.lineId);
  const status = CUSTOMER_STATUS[customer.status];
  const customerLoans = loansForCustomer(customer.id);
  const newLoanHref = `/loans/new?customer=${customer.id}`;

  return (
    <>
      <div className="pagehead">
        <Link className="backlink" to="/customers">
          <ArrowLeftIcon size={14} /> {t('customers.list.title')}
        </Link>
        <div className="row-between pagehead__row">
          <div>
            <h1 className="pagehead__title">{customer.name}</h1>
            <p className="pagehead__sub">
              {customer.phone} · {line?.name ?? t('customers.view.noLine')}
            </p>
          </div>
          <span className={`pill pill--${status.tone}`}>{t(status.labelKey)}</span>
        </div>
      </div>

      <Card
        title={t('customers.view.profile')}
        action={
          <Link className="btn btn--sm btn--ghost" to={`/customers/${customer.id}/proof`}>
            <IdIcon size={14} /> {customer.proof ? t('customers.view.updateProof') : t('customers.list.addProof')}
          </Link>
        }
      >
        <dl className="facts">
          <Fact label={t('customers.view.phone')}>
            {customer.phone}
            {customer.altPhone ? <span className="facts__note">{t('customers.view.altPhone', { phone: customer.altPhone })}</span> : null}
          </Fact>
          <Fact label={t('customers.view.parent')}>{customer.parentName}</Fact>
          <Fact label={t('customers.view.address')} wide>
            {customer.address}
          </Fact>
          <Fact label={t('customers.view.line')}>
            {line?.name ?? '—'}
            {line ? <span className="facts__note">{t('customers.view.officer', { name: officerLabel(line.officer) })}</span> : null}
          </Fact>
          <Fact label={t('customers.view.requestedAmount')}>{formatCurrency(customer.requestedAmount)}</Fact>
          <Fact label={t('customers.view.identityProof')}>
            {customer.proof ? (
              <>
                {idTypeLabel(customer.proof.type)}
                <span className="facts__note">{maskIdNumber(customer.proof.number)}</span>
              </>
            ) : (
              <span className="facts__muted">{t('customers.view.notCaptured')}</span>
            )}
          </Fact>
          <Fact label={t('customers.view.doorstepPin')}>
            {customer.geo ? (
              <>
                <span className="facts__inline">
                  <PinIcon size={14} /> {customer.geo.lat.toFixed(5)}, {customer.geo.lng.toFixed(5)}
                </span>
                <span className="facts__note">
                  {customer.geo.accuracy
                    ? t('customers.view.accuracyAt', {
                        metres: customer.geo.accuracy,
                        time: customer.geo.capturedAt,
                      })
                    : customer.geo.capturedAt}
                </span>
              </>
            ) : (
              <span className="facts__muted">{t('customers.view.notPinned')}</span>
            )}
          </Fact>
        </dl>
      </Card>

      <Card
        title={t('customers.view.loans')}
        subtitle={
          customerLoans.length
            ? tp('customers.view.loansOnRecord', customerLoans.length)
            : t('customers.view.noLoans')
        }
        action={
          <Link className="btn btn--sm" to={newLoanHref}>
            <PlusIcon size={14} /> {t('customers.view.newLoan')}
          </Link>
        }
        padded={false}
      >
        {customerLoans.length === 0 ? (
          <p className="empty">
            {t('customers.view.nothingBooked')}{' '}
            <Link to={newLoanHref}>{t('customers.view.bookFirst')}</Link>
          </p>
        ) : (
          <ul className="list list--flush">
            {customerLoans.map((loan) => (
              <LoanRow key={loan.id} loan={loan} />
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}

function Fact({ label, wide, children }: { label: string; wide?: boolean; children: ReactNode }) {
  return (
    <div className={`facts__item${wide ? ' facts__item--wide' : ''}`}>
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function LoanRow({ loan }: { loan: Loan }) {
  const summary = summarizeLoan(loan);

  return (
    <li className="list__row">
      <span className="list__main">
        <Link to={`/loans/${loan.id}`}>
          <b>{loan.id}</b>
        </Link>
        <span className="list__meta">
          {t('customers.view.loanMeta', {
            type: loanTypeLabel(loan.type),
            principal: formatCurrency(loan.principal),
            rate: loan.annualRatePct,
            months: loan.months,
            date: formatDate(loan.disbursedOn),
          })}
        </span>
      </span>
      <span className="list__amount">
        {summary.state === 'closed' ? '—' : formatCurrency(summary.outstanding)}
      </span>
      <LoanStatePill state={summary.state} daysLate={summary.daysLate} />
    </li>
  );
}

export function LoanStatePill({ state, daysLate }: { state: 'active' | 'overdue' | 'closed'; daysLate: number }) {
  if (state === 'closed') return <span className="pill">{t('common.status.closed')}</span>;
  if (state === 'overdue') {
    return <span className="pill pill--critical">{t('common.status.daysOverdue', { count: daysLate })}</span>;
  }
  return <span className="pill pill--good">{t('common.status.active')}</span>;
}
