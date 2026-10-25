import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { t } from '@lms/i18n';
import { FormError } from '../components/FormError';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { PaymentGeoField } from '../components/PaymentGeoField';
import { TextField } from '../components/TextField';
import { ArrowLeftIcon, CheckIcon } from '../components/icons';
import {
  PAYMENT_MODES,
  doorstepFor,
  formatCurrency,
  installmentById,
  lineById,
  receiptNo,
  recordPayment,
  type PaymentGeo,
  type PaymentMode,
} from '../lib/data';
import { daysBetween, formatDate, parseIsoDate, todayIso } from '../lib/loan';
import { errorMessage } from '../lib/session';
import { StatusPill } from './Dashboard';
import { usePortfolio } from '../lib/usePortfolio';

type Errors = { date?: string };

export function CollectPayment() {
  usePortfolio();
  const { id = '' } = useParams();
  const navigate = useNavigate();
  // Snapshot at mount: receipting flips the row to `collected`, and the form
  // should keep showing what it just took until it navigates away.
  const [installment] = useState(() => installmentById(id));
  const [date, setDate] = useState(todayIso());
  const [mode, setMode] = useState<PaymentMode>('CASH');
  const [geo, setGeo] = useState<PaymentGeo>();
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  const [saveError, setSaveError] = useState<string>();

  if (!installment || installment.status === 'collected') {
    return (
      <>
        <div className="pagehead">
          <Link className="backlink" to="/collection">
            <ArrowLeftIcon size={14} /> {t('common.nav.collection')}
          </Link>
          <h1 className="pagehead__title">{t('common.screens.collectPayment')}</h1>
        </div>
        <Card>
          <p className="empty">{t('collection.pay.missing')}</p>
          <Link className="linkbtn" to="/collection">
            {t('collection.pay.backToSheet')}
          </Link>
        </Card>
      </>
    );
  }

  function validate(value: string): Errors {
    if (!installment) return {};
    if (!parseIsoDate(value)) return { date: t('collection.pay.errors.dateInvalid') };
    if (value > todayIso()) return { date: t('collection.pay.errors.dateAhead') };
    if (value < installment.dueOnIso) {
      return {
        date: t('collection.pay.errors.dateBeforeDue', { date: formatDate(installment.dueOnIso) }),
      };
    }
    return {};
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!installment) return;

    const next = validate(date);
    setErrors(next);
    if (next.date) return;

    setSubmitting(true);
    setSaveError(undefined);
    try {
      await recordPayment({
        loanId: installment.loanNo,
        seq: installment.seq,
        paidOn: date,
        mode,
        geo: date === todayIso() ? geo : undefined,
      });
    } catch (error) {
      setSaveError(errorMessage(error));
      setSubmitting(false);
      return;
    }
    setSubmitting(false);
    navigate('/collection');
  }

  return (
    <>
      <div className="pagehead">
        <Link className="backlink" to="/collection">
          <ArrowLeftIcon size={14} /> {t('common.nav.collection')}
        </Link>
        <h1 className="pagehead__title">{t('common.screens.collectPayment')}</h1>
        <p className="pagehead__sub">
          {t('collection.pay.subtitle', { seq: installment.seq, loanNo: installment.loanNo })}
        </p>
      </div>

      <form onSubmit={onSubmit} noValidate>
        <Card title={t('collection.pay.installment')}>
          <div className="list__row">
            <span className="list__avatar" aria-hidden>
              {installment.customer
                .split(' ')
                .map((part) => part[0])
                .join('')}
            </span>
            <span className="list__main">
              <b>{installment.customer}</b>
              <span className="list__meta">
                <Link to={`/loans/${installment.loanNo}`}>{installment.loanNo}</Link>
                {` · ${lineById(installment.lineId)?.name ?? ''}`}
              </span>
            </span>
            <StatusPill status={installment.status} daysLate={installment.daysLate} />
          </div>

          <dl className="summary">
            <div className="summary__row">
              <dt>{t('collection.pay.dueOn')}</dt>
              <dd>{formatDate(installment.dueOnIso)}</dd>
            </div>
            <div className="summary__row">
              <dt>{t('collection.pay.receiptNo')}</dt>
              <dd>{receiptNo(installment.loanNo, installment.seq)}</dd>
            </div>
            <div className="summary__row summary__row--total">
              <dt>{t('collection.pay.amount')}</dt>
              <dd>{formatCurrency(installment.amount)}</dd>
            </div>
          </dl>
        </Card>

        <Card title={t('collection.pay.details')}>
          <div className="stack">
            <TextField
              label={t('collection.pay.date')}
              type="date"
              value={date}
              max={todayIso()}
              min={installment.dueOnIso}
              error={errors.date}
              hint={errors.date ? undefined : dateHint(date, installment.dueOnIso)}
              onChange={(e) => {
                setDate(e.target.value);
                setErrors({});
              }}
              autoFocus
            />

            <fieldset className="fieldset">
              <legend>{t('collection.pay.mode')}</legend>
              <div className="freqgrid" role="radiogroup" aria-label={t('collection.pay.mode')}>
                {PAYMENT_MODES.map((option) => (
                  <label key={option.id} className={`freqcard${mode === option.id ? ' freqcard--on' : ''}`}>
                    <input
                      type="radio"
                      name="mode"
                      value={option.id}
                      checked={mode === option.id}
                      onChange={() => setMode(option.id)}
                    />
                    <span className="freqcard__body">
                      <span className="freqcard__label">
                        {option.label}
                        {mode === option.id ? <CheckIcon size={15} /> : null}
                      </span>
                      <span className="freqcard__hint">{option.hint}</span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            <PaymentGeoField
              value={geo}
              onChange={setGeo}
              doorstep={doorstepFor(installment.loanNo)}
              backdated={date !== todayIso()}
            />
          </div>
        </Card>

        <FormError message={saveError} />
        <div className="formactions">
          <Link className="btn btn--sm btn--ghost" to="/collection">
            {t('common.actions.cancel')}
          </Link>
          <Button type="submit" loading={submitting}>
            {t('collection.pay.submit')}
          </Button>
        </div>
      </form>
    </>
  );
}

/** Spells the date back out, and says how late the receipt lands. */
function dateHint(date: string, dueOnIso: string): string {
  if (!parseIsoDate(date)) return t('collection.pay.dateHint');
  const late = Math.max(0, daysBetween(dueOnIso, date) ?? 0);
  return `${formatDate(date)} · ${late ? t('common.status.daysLate', { count: late }) : t('collection.pay.onTime')}`;
}
