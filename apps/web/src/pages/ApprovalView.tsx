import { useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { t, tp } from '@lms/i18n';
import { FormError } from '../components/FormError';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { ArrowLeftIcon, IdIcon } from '../components/icons';
import {
  approvalBlocker,
  approveApplication,
  customerById,
  disburseApplication,
  formatCurrency,
  idTypeLabel,
  lineById,
  loanById,
  loansForCustomer,
  maskIdNumber,
  officerLabel,
  rejectApplication,
  summarizeLoan,
  type LoanApplication,
} from '../lib/data';
import { addMonths, computeLoan, formatDate, loanTypeLabel } from '../lib/loan';
import { useApplications } from '../lib/useApplications';
import { errorMessage, isManager } from '../lib/session';
import { ApplicationStatusPill } from './Approvals';
import { usePortfolio } from '../lib/usePortfolio';

/** Stand-in for the API round trip, so the buttons show their busy state. */

export function ApprovalView() {
  usePortfolio();
  const { id = '' } = useParams();
  // Subscribing keeps the page in step as the application moves through its states.
  const application = useApplications().find((a) => a.id === id);

  if (!application) {
    return (
      <>
        <div className="pagehead">
          <Link className="backlink" to="/approvals">
            <ArrowLeftIcon size={14} /> {t('common.nav.approvals')}
          </Link>
        </div>
        <Card>
          <p className="empty">{t('approvals.view.notFound', { id })}</p>
        </Card>
      </>
    );
  }

  return <Review application={application} />;
}

function Review({ application }: { application: LoanApplication }) {
  const customer = customerById(application.customerId);
  const line = lineById(application.lineId);
  const name = customer?.name ?? application.customerId;
  const terms = computeLoan(application);
  const lastDue = addMonths(application.disburseOn, application.months);
  const existing = loansForCustomer(application.customerId).map(summarizeLoan);
  const active = existing.filter((s) => s.state !== 'closed').length;
  const overdue = existing.filter((s) => s.state === 'overdue').length;
  const backTo = application.status === 'pending' ? '/approvals' : `/approvals?status=${application.status}`;

  return (
    <>
      <div className="pagehead">
        <Link className="backlink" to={backTo}>
          <ArrowLeftIcon size={14} /> {t('common.nav.approvals')}
        </Link>
        <div className="row-between pagehead__row">
          <div>
            <h1 className="pagehead__title">{name}</h1>
            <p className="pagehead__sub">
              {application.id} ·{' '}
              {t('approvals.view.submittedBy', {
                officer: officerLabel(application.submittedBy),
                date: formatDate(application.submittedOn),
              })}
            </p>
          </div>
          <ApplicationStatusPill status={application.status} />
        </div>
      </div>

      <div className="grid-2">
        <Card title={t('approvals.view.borrower')}>
          <dl className="facts">
            <Fact label={t('approvals.view.phone')}>
              {customer ? <Link to={`/customers/${customer.id}`}>{customer.phone}</Link> : '—'}
            </Fact>
            <Fact label={t('approvals.view.line')}>
              {line?.name ?? '—'}
              {line ? <span className="facts__note">{officerLabel(line.officer)}</span> : null}
            </Fact>
            <Fact label={t('approvals.view.identityProof')}>
              {customer?.proofs.length ? (
                customer.proofs.map((proof) => (
                  <span key={proof.type} className="facts__proof">
                    {idTypeLabel(proof.type)}
                    <span className="facts__note">{maskIdNumber(proof.number)}</span>
                  </span>
                ))
              ) : (
                <span className="facts__muted">{t('approvals.view.noProof')}</span>
              )}
            </Fact>
            <Fact label={t('approvals.view.requested')}>
              {customer ? formatCurrency(customer.requestedAmount) : '—'}
            </Fact>
            <Fact label={t('approvals.view.existingLoans')}>
              {active ? tp('approvals.view.loansSummary', active) : t('approvals.view.noLoans')}
              {overdue ? (
                <span className="facts__note facts__note--bad">{tp('approvals.view.overdueLoans', overdue)}</span>
              ) : null}
            </Fact>
          </dl>
        </Card>

        <Card title={t('approvals.view.terms')}>
          {terms ? (
            <dl className="summary">
              <Row label={t('loans.fields.loanType')}>{loanTypeLabel(application.type)}</Row>
              <Row label={t('loans.fields.principal')}>{formatCurrency(application.principal)}</Row>
              <Row label={t('loans.fields.rate')}>
                {t('loans.summary.ratePerYear', { rate: application.annualRatePct })}
              </Row>
              <Row label={t('loans.fields.tenure')}>{tp('loans.summary.months', application.months)}</Row>
              <Row label={application.type === 'PRE' ? t('loans.summary.interestUpfront') : t('loans.summary.interestWithEmi')}>
                {formatCurrency(terms.totalInterest)}
              </Row>
              <Row label={t('loans.fields.fee')}>
                {application.fee ? `− ${formatCurrency(application.fee)}` : '—'}
              </Row>
              <Row label={t('loans.fields.emi')}>{formatCurrency(application.emi)}</Row>
              <Row label={t('approvals.view.plannedDisbursal')}>{formatDate(application.disburseOn)}</Row>
              <Row label={t('approvals.view.closes')}>{lastDue ? formatDate(lastDue) : '—'}</Row>
              <Row label={t('loans.summary.netDisbursal')} total>
                {formatCurrency(terms.netDisbursal)}
              </Row>
              <Row label={t('loans.summary.totalPayable')} total>
                {formatCurrency(terms.totalPayable)}
              </Row>
            </dl>
          ) : null}
        </Card>
      </div>

      {application.status === 'pending' && !isManager() ? (
        <Card title={t('approvals.view.decision')}>
          <p className="notice">{t('approvals.view.awaitingManager')}</p>
        </Card>
      ) : application.status === 'pending' ? (
        <Decision application={application} name={name} overdue={overdue > 0} />
      ) : (
        <Outcome application={application} netDisbursal={terms?.netDisbursal ?? 0} />
      )}
    </>
  );
}

function Decision({ application, name, overdue }: { application: LoanApplication; name: string; overdue: boolean }) {
  const [note, setNote] = useState('');
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState<'approve' | 'reject'>();
  const blocked = approvalBlocker(application) === 'noProof';

  async function decide(action: 'approve' | 'reject') {
    if (action === 'reject' && !note.trim()) {
      setError(t('approvals.view.reasonRequired'));
      return;
    }
    setError(undefined);
    setBusy(action);
    try {
      if (action === 'approve') await approveApplication(application.id, note.trim());
      else await rejectApplication(application.id, note.trim());
    } catch (failure) {
      setError(errorMessage(failure));
    }
    setBusy(undefined);
  }

  return (
    <Card title={t('approvals.view.decision')} subtitle={t('approvals.view.decisionSub')}>
      <div className="stack">
        {blocked ? (
          <p className="notice">
            {t('approvals.view.blockedNoProof', { name })}{' '}
            <Link to={`/customers/${application.customerId}/proof?return=/approvals/${application.id}`}>
              <IdIcon size={14} /> {t('approvals.view.captureProof')}
            </Link>
          </p>
        ) : null}
        {overdue ? <p className="notice">{t('approvals.view.overdueWarning', { name })}</p> : null}

        <div className="field">
          <label htmlFor="decision-note">{t('approvals.view.note')}</label>
          <div className={`field__control field__control--area${error ? ' field__control--invalid' : ''}`}>
            <textarea
              id="decision-note"
              rows={3}
              value={note}
              placeholder={t('approvals.view.notePlaceholder')}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? 'decision-note-error' : undefined}
              onChange={(e) => {
                setNote(e.target.value);
                if (error) setError(undefined);
              }}
            />
          </div>
          {error ? (
            <span className="field__error" id="decision-note-error" role="alert">
              {error}
            </span>
          ) : null}
        </div>

        <div className="formactions">
          <Button
            type="button"
            variant="ghost"
            loading={busy === 'reject'}
            disabled={!!busy}
            onClick={() => decide('reject')}
          >
            {t('approvals.view.reject')}
          </Button>
          <Button
            type="button"
            loading={busy === 'approve'}
            disabled={!!busy || blocked}
            onClick={() => decide('approve')}
          >
            {t('approvals.view.approve')}
          </Button>
        </div>
      </div>
    </Card>
  );
}

function Outcome({ application, netDisbursal }: { application: LoanApplication; netDisbursal: number }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const decidedOn = application.decidedOn ? formatDate(application.decidedOn) : '—';

  async function disburse() {
    setBusy(true);
    setError(undefined);
    try {
      await disburseApplication(application.id);
    } catch (failure) {
      setError(errorMessage(failure));
    }
    setBusy(false);
  }

  const loanId = application.loanId;
  const loan = loanId ? loanById(loanId) : undefined;
  const firstDue = loan ? addMonths(loan.disbursedOn, 1) : undefined;

  return (
    <>
      <Card
        title={t('approvals.view.decision')}
        subtitle={
          application.status === 'rejected'
            ? t('approvals.view.rejectedOn', { date: decidedOn })
            : t('approvals.view.approvedOn', { date: decidedOn })
        }
      >
        <p className="empty empty--left">{application.note || '—'}</p>
      </Card>

      {application.status === 'approved' && !isManager() ? (
        <Card title={t('approvals.view.disbursement')}>
          <p className="notice">{t('approvals.view.awaitingDisbursal')}</p>
        </Card>
      ) : application.status === 'approved' ? (
        <Card title={t('approvals.view.disbursement')} subtitle={t('approvals.view.disbursementSub')}>
          <FormError message={error} />
          <div className="formactions">
            <Button type="button" loading={busy} onClick={disburse}>
              {t('approvals.view.disburse', { amount: formatCurrency(netDisbursal) })}
            </Button>
          </div>
        </Card>
      ) : null}

      {application.status === 'disbursed' && loanId ? (
        <Card title={t('approvals.view.disbursement')}>
          <div className="row-between">
            <p className="notice notice--good">
              {t('approvals.view.disbursedAs', { loan: loanId, date: firstDue ? formatDate(firstDue) : '—' })}
            </p>
            <Link className="btn btn--sm" to={`/loans/${loanId}`}>
              {t('approvals.view.openLoan')}
            </Link>
          </div>
        </Card>
      ) : null}
    </>
  );
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="facts__item">
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function Row({ label, total, children }: { label: string; total?: boolean; children: ReactNode }) {
  return (
    <div className={`summary__row${total ? ' summary__row--total' : ''}`}>
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}
