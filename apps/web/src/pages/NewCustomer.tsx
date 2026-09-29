import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { t } from '@lms/i18n';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { GeoField, type Geo } from '../components/GeoField';
import { TextField } from '../components/TextField';
import {
  ArrowLeftIcon,
  ChevronDownIcon,
  PhoneIcon,
  UserIcon,
} from '../components/icons';
import { formatCurrency, lines } from '../lib/data';
import { validatePhone } from '../lib/validate';

type Errors = {
  name?: string;
  phone?: string;
  altPhone?: string;
  parentName?: string;
  address?: string;
  amount?: string;
  lineId?: string;
};

const MIN_AMOUNT = 1000;
const MAX_AMOUNT = 1000000;

export function NewCustomer() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [altPhone, setAltPhone] = useState('');
  const [parentName, setParentName] = useState('');
  const [address, setAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [lineId, setLineId] = useState('');
  const [geo, setGeo] = useState<Geo>();
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);

  const amountValue = Number(amount.replace(/[^\d]/g, ''));

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const next: Errors = {
      name: name.trim() ? undefined : t('customers.form.errors.nameRequired'),
      phone: validatePhone(phone),
      // Optional, but if given it still has to be a real number — and a
      // duplicate of the primary is a data-entry slip, not an alternative.
      altPhone: !altPhone.trim()
        ? undefined
        : validatePhone(altPhone) ??
          (altPhone.replace(/\D/g, '') === phone.replace(/\D/g, '')
            ? t('customers.form.errors.altPhoneSame')
            : undefined),
      parentName: parentName.trim() ? undefined : t('customers.form.errors.parentRequired'),
      address: address.trim() ? undefined : t('customers.form.errors.addressRequired'),
      amount: !amountValue
        ? t('customers.form.errors.amountRequired')
        : amountValue < MIN_AMOUNT
          ? t('customers.form.errors.amountMin', { amount: formatCurrency(MIN_AMOUNT) })
          : amountValue > MAX_AMOUNT
            ? t('customers.form.errors.amountMax', { amount: formatCurrency(MAX_AMOUNT) })
            : undefined,
      lineId: lineId ? undefined : t('customers.form.errors.lineRequired'),
    };
    setErrors(next);
    if (Object.values(next).some(Boolean)) return;

    setSubmitting(true);
    // UI-only for now: POST /customers goes here.
    await new Promise((resolve) => setTimeout(resolve, 800));
    setSubmitting(false);
    navigate('/customers');
  }

  return (
    <>
      <div className="pagehead">
        <Link className="backlink" to="/customers">
          <ArrowLeftIcon size={14} /> {t('customers.list.title')}
        </Link>
        <h1 className="pagehead__title">{t('common.screens.newCustomer')}</h1>
        <p className="pagehead__sub">{t('customers.form.subtitle')}</p>
      </div>

      <form onSubmit={onSubmit} noValidate>
        <Card title={t('customers.form.identity')}>
          <div className="stack">
            <TextField
              label={t('customers.form.name')}
              placeholder="Revathi Murugan"
              autoComplete="name"
              lead={<UserIcon />}
              value={name}
              error={errors.name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />

            <TextField
              label={t('customers.form.parentName')}
              placeholder="Murugan Subramani"
              lead={<UserIcon />}
              value={parentName}
              error={errors.parentName}
              hint={t('customers.form.parentHint')}
              onChange={(e) => setParentName(e.target.value)}
            />

            <div className="grid-2 grid-2--tight">
              <TextField
                label={t('customers.form.phone')}
                type="tel"
                inputMode="numeric"
                maxLength={11}
                placeholder="98765 43210"
                autoComplete="tel-national"
                lead={<PhoneIcon />}
                value={phone}
                error={errors.phone}
                onChange={(e) => setPhone(e.target.value.replace(/[^\d\s]/g, ''))}
              />

              <TextField
                label={t('customers.form.altPhone')}
                type="tel"
                inputMode="numeric"
                maxLength={11}
                placeholder={t('customers.form.optional')}
                lead={<PhoneIcon />}
                value={altPhone}
                error={errors.altPhone}
                onChange={(e) => setAltPhone(e.target.value.replace(/[^\d\s]/g, ''))}
              />
            </div>
          </div>
        </Card>

        <Card title={t('customers.form.whereTheyAre')}>
          <div className="stack">
            <div className="field">
              <label htmlFor="address">{t('customers.form.address')}</label>
              <div className={`field__control field__control--area${errors.address ? ' field__control--invalid' : ''}`}>
                <textarea
                  id="address"
                  rows={3}
                  placeholder={t('customers.form.addressPlaceholder')}
                  value={address}
                  aria-invalid={errors.address ? true : undefined}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>
              {errors.address ? (
                <span className="field__error" role="alert">
                  {errors.address}
                </span>
              ) : null}
            </div>

            <GeoField value={geo} onChange={setGeo} />
          </div>
        </Card>

        <Card title={t('customers.form.loanRequest')}>
          <div className="stack">
            <div className="grid-2 grid-2--tight">
              <TextField
                label={t('customers.form.amount')}
                inputMode="numeric"
                placeholder="45,000"
                lead={<span className="field__prefix">₹</span>}
                value={amount}
                error={errors.amount}
                hint={
                  amountValue
                    ? formatCurrency(amountValue)
                    : t('customers.form.amountRange', {
                        min: formatCurrency(MIN_AMOUNT),
                        max: formatCurrency(MAX_AMOUNT),
                      })
                }
                onChange={(e) => setAmount(e.target.value.replace(/[^\d,]/g, ''))}
              />

              <div className="field">
                <label htmlFor="line">{t('customers.form.line')}</label>
                <div className={`select select--block${errors.lineId ? ' select--invalid' : ''}`}>
                  <select
                    id="line"
                    value={lineId}
                    onChange={(e) => setLineId(e.target.value)}
                    aria-invalid={errors.lineId ? true : undefined}
                  >
                    <option value="">{t('customers.form.selectLine')}</option>
                    {lines.map((line) => (
                      <option key={line.id} value={line.id}>
                        {line.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDownIcon />
                </div>
                {errors.lineId ? (
                  <span className="field__error" role="alert">
                    {errors.lineId}
                  </span>
                ) : (
                  <span className="field__hint">{t('customers.form.lineHint')}</span>
                )}
              </div>
            </div>
          </div>
        </Card>

        <div className="formactions">
          <Link className="btn btn--sm btn--ghost" to="/customers">
            {t('common.actions.cancel')}
          </Link>
          <Button type="submit" loading={submitting}>
            {t('customers.form.save')}
          </Button>
        </div>
      </form>
    </>
  );
}
