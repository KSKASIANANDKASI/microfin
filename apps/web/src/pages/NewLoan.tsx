import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { t, tp } from '@lms/i18n';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { TextField } from '../components/TextField';
import { ArrowLeftIcon, CheckIcon, ChevronDownIcon } from '../components/icons';
import { customers, formatCurrency, lineById, submitApplication } from '../lib/data';
import {
  LOAN_TYPES,
  addMonths,
  computeLoan,
  daysFromToday,
  formatDate,
  parseIsoDate,
  todayIso,
  type LoanType,
} from '../lib/loan';

type Errors = {
  customerId?: string;
  date?: string;
  amount?: string;
  rate?: string;
  fee?: string;
  tenure?: string;
  emi?: string;
};

const MIN_AMOUNT = 1000;
const MAX_AMOUNT = 1000000;
const MAX_RATE = 60;
const MAX_TENURE = 60;
/** A disbursal can be back-dated for a late entry, but not booked far ahead. */
const MAX_DAYS_AHEAD = 7;

const digits = (value: string) => Number(value.replace(/[^\d]/g, ''));

export function NewLoan() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  // Arriving from a customer's page preselects them.
  const [customerId, setCustomerId] = useState(() => {
    const preset = params.get('customer') ?? '';
    return customers.some((c) => c.id === preset) ? preset : '';
  });
  const [date, setDate] = useState(todayIso());
  const [type, setType] = useState<LoanType>('POST');
  const [amount, setAmount] = useState('');
  const [rate, setRate] = useState('');
  const [fee, setFee] = useState('');
  const [tenure, setTenure] = useState('');
  /** Empty means "follow the calculation"; anything else is the officer's call. */
  const [emi, setEmi] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);

  const customer = customers.find((c) => c.id === customerId);
  const principal = digits(amount);
  const rateValue = Number(rate.replace(/[^\d.]/g, ''));
  const feeValue = digits(fee);
  const months = digits(tenure);

  const terms = computeLoan({
    principal,
    annualRatePct: Number.isFinite(rateValue) ? rateValue : 0,
    months,
    fee: feeValue,
    type,
  });
  const emiValue = emi ? digits(emi) : (terms?.emi ?? 0);
  const overridden = !!emi && !!terms && emiValue !== terms.emi;
  const closesOn = months ? addMonths(date, months) : undefined;

  function pickType(next: LoanType) {
    setType(next);
    // The EMI under the old type says nothing about the new one.
    setEmi('');
    setErrors((e) => ({ ...e, emi: undefined }));
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const ahead = daysFromToday(date);
    const next: Errors = {
      customerId: customerId ? undefined : t('loans.new.errors.customer'),
      date: !parseIsoDate(date)
        ? t('loans.new.errors.dateInvalid')
        : ahead !== undefined && ahead > MAX_DAYS_AHEAD
          ? t('loans.new.errors.dateAhead', { days: MAX_DAYS_AHEAD })
          : undefined,
      amount: !principal
        ? t('loans.new.errors.amountRequired')
        : principal < MIN_AMOUNT
          ? t('loans.new.errors.amountMin', { amount: formatCurrency(MIN_AMOUNT) })
          : principal > MAX_AMOUNT
            ? t('loans.new.errors.amountMax', { amount: formatCurrency(MAX_AMOUNT) })
            : undefined,
      rate: !rate.trim()
        ? t('loans.new.errors.rateRequired')
        : !Number.isFinite(rateValue) || rateValue <= 0
          ? t('loans.new.errors.rateNumber')
          : rateValue > MAX_RATE
            ? t('loans.new.errors.rateHigh', { rate: MAX_RATE })
            : undefined,
      // The fee is optional, but it comes out of the disbursal — it cannot
      // swallow the loan.
      fee: feeValue > principal / 10 ? t('loans.new.errors.feeHigh') : undefined,
      tenure: !months
        ? t('loans.new.errors.tenureRequired')
        : months > MAX_TENURE
          ? t('loans.new.errors.tenureMax', { count: MAX_TENURE })
          : undefined,
      emi: undefined,
    };

    // Only worth checking once the figures it depends on are sound.
    if (!next.amount && !next.rate && !next.tenure && terms) {
      const collected = emiValue * months;
      if (!emiValue) next.emi = t('loans.new.errors.emiRequired');
      else if (collected < terms.totalPayable)
        next.emi = t('loans.new.errors.emiShort', {
          months,
          emi: formatCurrency(emiValue),
          gap: formatCurrency(terms.totalPayable - collected),
        });
    }

    setErrors(next);
    if (Object.values(next).some(Boolean)) return;

    setSubmitting(true);
    // UI-only for now: POST /loans (status SUBMITTED) goes here.
    await new Promise((resolve) => setTimeout(resolve, 800));
    const application = submitApplication({
      customerId,
      type,
      principal,
      annualRatePct: rateValue,
      months,
      fee: feeValue,
      emi: emiValue,
      disburseOn: date,
    });
    setSubmitting(false);
    navigate(`/approvals/${application.id}`);
  }

  return (
    <>
      <div className="pagehead">
        <Link className="backlink" to="/customers">
          <ArrowLeftIcon size={14} /> {t('common.nav.customers')}
        </Link>
        <h1 className="pagehead__title">{t('common.screens.newLoan')}</h1>
        <p className="pagehead__sub">{t('loans.new.subtitle')}</p>
      </div>

      <form onSubmit={onSubmit} noValidate>
        <Card title={t('loans.new.borrower')}>
          <div className="stack">
            <div className="grid-2 grid-2--tight">
              <div className="field">
                <label htmlFor="customer">{t('loans.fields.customer')}</label>
                <div className={`select select--block${errors.customerId ? ' select--invalid' : ''}`}>
                  <select
                    id="customer"
                    value={customerId}
                    onChange={(e) => {
                      setCustomerId(e.target.value);
                      setErrors((err) => ({ ...err, customerId: undefined }));
                    }}
                    aria-invalid={errors.customerId ? true : undefined}
                  >
                    <option value="">{t('loans.new.selectCustomer')}</option>
                    {customers.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.name} · {option.phone}
                      </option>
                    ))}
                  </select>
                  <ChevronDownIcon />
                </div>
                {errors.customerId ? (
                  <span className="field__error" role="alert">
                    {errors.customerId}
                  </span>
                ) : (
                  <span className="field__hint">
                    {customer
                      ? t('loans.new.customerMeta', {
                  line: lineById(customer.lineId)?.name ?? '',
                  amount: formatCurrency(customer.requestedAmount),
                })
                      : t('loans.new.customerHint')}
                  </span>
                )}
              </div>

              <TextField
                label={t('loans.fields.disbursalDate')}
                type="date"
                value={date}
                error={errors.date}
                hint={errors.date ? undefined : formatDate(date)}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>

            {customer && !customer.proof ? (
              <p className="notice">
                {t('loans.new.noProof', { name: customer.name })}{' '}
                <Link to={`/customers/${customer.id}/proof`}>{t('loans.new.captureProof')}</Link>
              </p>
            ) : null}
          </div>
        </Card>

        <Card title={t('loans.new.terms')}>
          <div className="stack">
            <fieldset className="fieldset">
              <legend>{t('loans.fields.loanType')}</legend>
              <div className="freqgrid" role="radiogroup" aria-label={t('loans.fields.loanType')}>
                {LOAN_TYPES.map((option) => (
                  <label
                    key={option.id}
                    className={`freqcard${type === option.id ? ' freqcard--on' : ''}`}
                  >
                    <input
                      type="radio"
                      name="loantype"
                      value={option.id}
                      checked={type === option.id}
                      onChange={() => pickType(option.id)}
                    />
                    <span className="freqcard__body">
                      <span className="freqcard__label">
                        {option.label}
                        {type === option.id ? <CheckIcon size={15} /> : null}
                      </span>
                      <span className="freqcard__hint">{option.hint}</span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="grid-2 grid-2--tight">
              <TextField
                label={t('loans.fields.amount')}
                inputMode="numeric"
                placeholder="45,000"
                lead={<span className="field__prefix">₹</span>}
                value={amount}
                error={errors.amount}
                hint={
                  principal
                    ? formatCurrency(principal)
                    : `${formatCurrency(MIN_AMOUNT)}–${formatCurrency(MAX_AMOUNT)}`
                }
                onChange={(e) => setAmount(e.target.value.replace(/[^\d,]/g, ''))}
              />

              <TextField
                label={t('loans.fields.rate')}
                inputMode="decimal"
                placeholder="24"
                lead={<span className="field__prefix">%</span>}
                value={rate}
                error={errors.rate}
                hint={
                  rateValue > 0 && Number.isFinite(rateValue)
                    ? t('loans.new.rateHint', { rate: rateValue, monthly: (rateValue / 12).toFixed(2) })
                    : t('loans.new.rateEmpty')
                }
                onChange={(e) => setRate(e.target.value.replace(/[^\d.]/g, ''))}
              />
            </div>

            <div className="grid-2 grid-2--tight">
              <TextField
                label={t('loans.fields.fee')}
                inputMode="numeric"
                placeholder="0"
                lead={<span className="field__prefix">₹</span>}
                value={fee}
                error={errors.fee}
                hint={
                  feeValue
                    ? t('loans.new.feeHint', { amount: formatCurrency(feeValue) })
                    : t('loans.new.feeEmpty')
                }
                onChange={(e) => setFee(e.target.value.replace(/[^\d,]/g, ''))}
              />

              <TextField
                label={t('loans.fields.tenure')}
                inputMode="numeric"
                placeholder="12"
                maxLength={2}
                value={tenure}
                error={errors.tenure}
                hint={
                  closesOn
                    ? tp('loans.new.tenureHint', months, { date: formatDate(closesOn) })
                    : t('loans.new.tenureEmpty')
                }
                onChange={(e) => setTenure(e.target.value.replace(/[^\d]/g, ''))}
              />
            </div>
          </div>
        </Card>

        <Card title={t('loans.new.repayment')} subtitle={t('loans.new.repaymentSub')}>
          <div className="stack">
            <TextField
              label={t('loans.fields.emi')}
              inputMode="numeric"
              placeholder={terms ? String(terms.emi) : t('loans.new.emiPlaceholder')}
              lead={<span className="field__prefix">₹</span>}
              value={emi || (terms ? String(terms.emi) : '')}
              error={errors.emi}
              hint={
                overridden && terms
                  ? t('loans.new.emiOverridden', { amount: formatCurrency(terms.emi) })
                  : t('loans.new.emiAuto')
              }
              onChange={(e) => {
                setEmi(e.target.value.replace(/[^\d,]/g, ''));
                setErrors((err) => ({ ...err, emi: undefined }));
              }}
            />

            {overridden ? (
              <button type="button" className="linkbtn" onClick={() => setEmi('')}>
                {t('loans.new.resetEmi')}
              </button>
            ) : null}

            {terms ? (
              <dl className="summary">
                <div className="summary__row">
                  <dt>{t('loans.fields.principal')}</dt>
                  <dd>{formatCurrency(principal)}</dd>
                </div>
                <div className="summary__row">
                  <dt>{type === 'PRE' ? t('loans.summary.interestUpfront') : t('loans.summary.interestWithEmi')}</dt>
                  <dd>{formatCurrency(terms.totalInterest)}</dd>
                </div>
                <div className="summary__row">
                  <dt>{t('loans.fields.fee')}</dt>
                  <dd>{feeValue ? `− ${formatCurrency(feeValue)}` : '—'}</dd>
                </div>
                <div className="summary__row summary__row--total">
                  <dt>{t('loans.summary.netDisbursal')}</dt>
                  <dd>{formatCurrency(terms.netDisbursal)}</dd>
                </div>
                <div className="summary__row summary__row--total">
                  <dt>{t('loans.summary.totalPayable')}</dt>
                  <dd>
                    {formatCurrency(terms.totalPayable)}
                    {months ? <span className="summary__note">{months} × {formatCurrency(emiValue)}</span> : null}
                  </dd>
                </div>
              </dl>
            ) : (
              <p className="empty">{t('loans.new.empty')}</p>
            )}
          </div>
        </Card>

        <div className="formactions">
          <Link className="btn btn--sm btn--ghost" to="/customers">
            {t('common.actions.cancel')}
          </Link>
          <Button type="submit" loading={submitting}>
            {t('loans.new.submit')}
          </Button>
        </div>
      </form>
    </>
  );
}
