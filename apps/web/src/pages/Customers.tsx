import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { t, tp, type MessageKey } from '@lms/i18n';
import { Card } from '../components/Card';
import { ChevronDownIcon, IdIcon, PinIcon, SearchIcon } from '../components/icons';
import { customers, formatCurrency, idTypeLabel, lineById, lines } from '../lib/data';
import type { Customer } from '../lib/data';

/** `labelKey` is translated at render — `t()` must not run at import time. */
export const CUSTOMER_STATUS = {
  pending: { labelKey: 'common.status.pending', tone: 'warning' },
  approved: { labelKey: 'common.status.approved', tone: 'good' },
  active: { labelKey: 'common.status.active', tone: 'good' },
} as const satisfies Record<string, { labelKey: MessageKey; tone: string }>;

export function Customers() {
  const [query, setQuery] = useState('');
  const [lineId, setLineId] = useState('all');

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return customers.filter((customer) => {
      if (lineId !== 'all' && customer.lineId !== lineId) return false;
      if (!needle) return true;
      return (
        customer.name.toLowerCase().includes(needle) ||
        customer.phone.includes(needle) ||
        customer.parentName.toLowerCase().includes(needle) ||
        customer.address.toLowerCase().includes(needle) ||
        (customer.proof?.number.toLowerCase().includes(needle) ?? false)
      );
    });
  }, [lineId, query]);

  const requested = rows.reduce((sum, c) => sum + c.requestedAmount, 0);

  return (
    <>
      <div className="pagehead row-between">
        <div>
          <h1 className="pagehead__title">{t('customers.list.title')}</h1>
          <p className="pagehead__sub">
            {tp('customers.list.summary', rows.length, { amount: formatCurrency(requested) })}
          </p>
        </div>
        <Link className="btn btn--sm" to="/customers/new">
          {t('customers.list.newCustomer')}
        </Link>
      </div>

      <div className="filters">
        <label className="search">
          <SearchIcon />
          <input
            type="search"
            placeholder={t('customers.list.searchPlaceholder')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label={t('customers.list.searchLabel')}
          />
        </label>

        <label className="select">
          <span className="sr-only">{t('customers.list.lineFilter')}</span>
          <select value={lineId} onChange={(e) => setLineId(e.target.value)}>
            <option value="all">{t('customers.list.allLines')}</option>
            {lines.map((line) => (
              <option key={line.id} value={line.id}>
                {line.name}
              </option>
            ))}
          </select>
          <ChevronDownIcon />
        </label>
      </div>

      <Card padded={false}>
        {rows.length === 0 ? (
          <p className="empty">{t('customers.list.empty')}</p>
        ) : (
          <ul className="list list--flush">
            {rows.map((customer) => (
              <CustomerRow key={customer.id} customer={customer} />
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}

function CustomerRow({ customer }: { customer: Customer }) {
  const status = CUSTOMER_STATUS[customer.status];

  return (
    <li className="list__row">
      <span className="list__avatar" aria-hidden>
        {customer.name
          .split(' ')
          .map((part) => part[0])
          .join('')}
      </span>

      <span className="list__main">
        <Link to={`/customers/${customer.id}`}>
          <b>{customer.name}</b>
        </Link>
        <span className="list__meta">
          {customer.phone}
          {customer.altPhone ? ` · ${customer.altPhone}` : ''} ·{' '}
          {t('customers.list.careOf', { name: customer.parentName })}
        </span>
        <span className="list__meta">
          {lineById(customer.lineId)?.name} · {customer.address}
        </span>
      </span>

      <Link
        className={`proof__tag${customer.proof ? '' : ' proof__tag--off'}`}
        to={`/customers/${customer.id}/proof`}
        title={
          customer.proof
            ? t('customers.list.proofOnFile', { idType: idTypeLabel(customer.proof.type) })
            : t('customers.list.noProofOnFile')
        }
      >
        <IdIcon size={14} />
        {customer.proof ? idTypeLabel(customer.proof.type) : t('customers.list.addProof')}
      </Link>

      {customer.geo ? (
        <span className="geo__tag" title={`${customer.geo.lat.toFixed(5)}, ${customer.geo.lng.toFixed(5)}`}>
          <PinIcon size={14} /> {t('customers.list.pinned')}
        </span>
      ) : (
        <span className="geo__tag geo__tag--off">{t('customers.list.noPin')}</span>
      )}

      <span className="list__amount">{formatCurrency(customer.requestedAmount)}</span>
      <span className={`pill pill--${status.tone}`}>{t(status.labelKey)}</span>
    </li>
  );
}
