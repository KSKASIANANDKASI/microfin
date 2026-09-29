import { Link, useSearchParams } from 'react-router-dom';
import { t, tp } from '@lms/i18n';
import { Card } from '../components/Card';
import {
  customerById,
  formatCurrency,
  lineById,
  type ApplicationStatus,
  type LoanApplication,
} from '../lib/data';
import { formatDate, loanTypeLabel } from '../lib/loan';
import { useApplications } from '../lib/useApplications';

const FILTERS: ApplicationStatus[] = ['pending', 'approved', 'disbursed', 'rejected'];

const TONE: Record<ApplicationStatus, string> = {
  pending: 'warning',
  approved: 'good',
  disbursed: '',
  rejected: 'critical',
};

export function ApplicationStatusPill({ status }: { status: ApplicationStatus }) {
  return <span className={`pill${TONE[status] ? ` pill--${TONE[status]}` : ''}`}>{t(`approvals.status.${status}`)}</span>;
}

/** The approval queue. The filter lives in the URL so Back from a review keeps it. */
export function Approvals() {
  const applications = useApplications();
  const [params, setParams] = useSearchParams();
  const requested = params.get('status');
  const filter: ApplicationStatus = FILTERS.includes(requested as ApplicationStatus)
    ? (requested as ApplicationStatus)
    : 'pending';
  const rows = applications.filter((a) => a.status === filter);
  const pending = applications.filter((a) => a.status === 'pending').length;

  return (
    <>
      <div className="pagehead">
        <div>
          <h1 className="pagehead__title">{t('common.nav.approvals')}</h1>
          <p className="pagehead__sub">
            {pending ? tp('approvals.pendingCount', pending) : t('approvals.subtitle')}
          </p>
        </div>
      </div>

      <div className="filters">
        <div className="chips" role="group" aria-label={t('approvals.filterLabel')}>
          {FILTERS.map((option) => {
            const count = applications.filter((a) => a.status === option).length;
            return (
              <button
                key={option}
                type="button"
                className={`chip${filter === option ? ' chip--on' : ''}`}
                aria-pressed={filter === option}
                onClick={() => setParams(option === 'pending' ? {} : { status: option }, { replace: true })}
              >
                {t(`approvals.filters.${option}`)} · {count}
              </button>
            );
          })}
        </div>
      </div>

      <Card padded={false}>
        {rows.length === 0 ? (
          <p className="empty">{t(`approvals.empty.${filter}`)}</p>
        ) : (
          <ul className="list list--flush">
            {rows.map((application) => (
              <ApplicationRow key={application.id} application={application} />
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}

function ApplicationRow({ application }: { application: LoanApplication }) {
  const customer = customerById(application.customerId);
  const name = customer?.name ?? application.customerId;

  return (
    <li className="list__row">
      <span className="list__avatar" aria-hidden>
        {name
          .split(' ')
          .map((part) => part[0])
          .join('')}
      </span>

      <span className="list__main">
        <Link to={`/approvals/${application.id}`}>
          <b>{name}</b>
        </Link>
        <span className="list__meta">
          {t('approvals.rowMeta', {
            id: application.id,
            line: lineById(application.lineId)?.name ?? '—',
            date: formatDate(application.submittedOn),
          })}
        </span>
        <span className="list__meta">
          {t('approvals.rowTerms', {
            type: loanTypeLabel(application.type),
            rate: application.annualRatePct,
            months: tp('loans.summary.months', application.months),
          })}
        </span>
      </span>

      <span className="list__amount">{formatCurrency(application.principal)}</span>
      <ApplicationStatusPill status={application.status} />
    </li>
  );
}
