import { useState } from 'react';
import { t, tp } from '@lms/i18n';
import { Card } from '../components/Card';
import { TextField } from '../components/TextField';
import { CheckIcon } from '../components/icons';
import { formatCurrency } from '../lib/data';
import { LOAN_TYPES, computeLoan, finalInstallment, type LoanType } from '../lib/loan';

/** A typical line loan, so the page opens with an answer on it. */
const EXAMPLE = { type: 'POST' as LoanType, amount: '45,000', rate: '24', tenure: '12', fee: '500' };

const digits = (value: string) => Number(value.replace(/[^\d]/g, ''));

/**
 * Loan calculator. Same pricing as the booking form (`computeLoan`), with
 * nothing to validate or save — officers use it to quote a customer.
 */
export function Playground() {
  const [type, setType] = useState<LoanType>(EXAMPLE.type);
  const [amount, setAmount] = useState(EXAMPLE.amount);
  const [rate, setRate] = useState(EXAMPLE.rate);
  const [tenure, setTenure] = useState(EXAMPLE.tenure);
  const [fee, setFee] = useState(EXAMPLE.fee);

  const principal = digits(amount);
  const rateValue = Number(rate);
  const months = digits(tenure);
  const feeValue = digits(fee);
  const terms = computeLoan({ principal, annualRatePct: rateValue, months, fee: feeValue, type });
  const last = terms ? finalInstallment(terms, months) : 0;

  function reset() {
    setType(EXAMPLE.type);
    setAmount(EXAMPLE.amount);
    setRate(EXAMPLE.rate);
    setTenure(EXAMPLE.tenure);
    setFee(EXAMPLE.fee);
  }

  return (
    <>
      <div className="pagehead">
        <div>
          <h1 className="pagehead__title">{t('common.nav.calculator')}</h1>
          <p className="pagehead__sub">{t('playground.subtitle')}</p>
        </div>
        <button type="button" className="btn btn--sm btn--ghost" onClick={reset}>
          {t('playground.reset')}
        </button>
      </div>

      <div className="grid-2">
        <Card title={t('playground.terms')}>
          <div className="stack">
            <fieldset className="fieldset">
              <legend>{t('loans.fields.loanType')}</legend>
              <div className="freqgrid" role="radiogroup" aria-label={t('loans.fields.loanType')}>
                {LOAN_TYPES.map((option) => (
                  <label key={option.id} className={`freqcard${type === option.id ? ' freqcard--on' : ''}`}>
                    <input
                      type="radio"
                      name="loantype"
                      value={option.id}
                      checked={type === option.id}
                      onChange={() => setType(option.id)}
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
                hint={principal ? formatCurrency(principal) : undefined}
                onChange={(e) => setAmount(e.target.value.replace(/[^\d,]/g, ''))}
              />
              <TextField
                label={t('loans.fields.rate')}
                inputMode="decimal"
                placeholder="24"
                lead={<span className="field__prefix">%</span>}
                value={rate}
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
                hint={months ? tp('loans.summary.months', months) : t('loans.new.tenureEmpty')}
                onChange={(e) => setTenure(e.target.value.replace(/[^\d]/g, ''))}
              />
            </div>
          </div>
        </Card>

        <Card title={t('playground.result')}>
          {terms ? (
            <div className="stack" aria-live="polite">
              <div className="kpis">
                <article className="kpi">
                  <p className="kpi__label">{t('loans.fields.emi')}</p>
                  <p className="kpi__value">{formatCurrency(terms.emi)}</p>
                  <p className="kpi__note kpi__note--flush">
                    {tp('playground.emiNote', months)}
                    {last !== terms.emi ? ` · ${t('playground.finalInstallment', { amount: formatCurrency(last) })}` : ''}
                  </p>
                </article>
                <article className="kpi">
                  <p className="kpi__label">{t('loans.summary.netDisbursal')}</p>
                  <p className="kpi__value">{formatCurrency(terms.netDisbursal)}</p>
                  <p className="kpi__note kpi__note--flush">
                    {type === 'PRE' ? t('playground.netNotePre') : t('playground.netNotePost')}
                  </p>
                </article>
              </div>

              {terms.netDisbursal < 0 ? <p className="notice">{t('playground.negative')}</p> : null}

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
                    <span className="summary__note">
                      {last === terms.emi
                        ? `${months} × ${formatCurrency(terms.emi)}`
                        : `${months - 1} × ${formatCurrency(terms.emi)} + ${formatCurrency(last)}`}
                    </span>
                  </dd>
                </div>
              </dl>
            </div>
          ) : (
            <p className="empty">{t('loans.new.empty')}</p>
          )}
        </Card>
      </div>
    </>
  );
}
