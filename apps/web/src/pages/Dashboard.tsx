import { Link } from 'react-router-dom';
import { t, tp } from '@lms/i18n';
import { chart } from '@lms/theme';
import { Card } from '../components/Card';
import { CollectionsChart } from '../components/CollectionsChart';
import { LinesCard } from '../components/LinesCard';
import {
  CalculatorIcon,
  CheckCircleIcon,
  ClockIcon,
  LedgerIcon,
  PlusIcon,
  TrendDownIcon,
  TrendUpIcon,
  UsersIcon,
  WalletIcon,
} from '../components/icons';
import {
  arrears,
  dailyTarget,
  formatCurrency,
  formatNumber,
  kpis,
  lineById,
  user,
} from '../lib/data';
import { formatDayHeading } from '../lib/loan';
import { useCollectionSheet } from '../lib/useCollectionSheet';

const current = arrears.find((a) => a.tone === 'good')!;
const overdue = arrears.filter((a) => a.tone !== 'good');
// Scale the bars to each other, not to `current` — it is ~70x larger and would
// flatten both overdue buckets into invisible slivers.
const overdueMax = Math.max(...overdue.map((a) => a.amount));
const totalOutstanding = arrears.reduce((sum, a) => sum + a.amount, 0);

export function Dashboard() {
  const sheet = useCollectionSheet();
  const dueToday = sheet.filter((i) => i.status === 'due');
  const collected = sheet.filter((i) => i.status === 'collected');
  // `{amount}` is left unfilled so the figure can be rendered bold between the halves.
  const [currentBefore = '', currentAfter = ''] = tp('dashboard.arrears.current', current.accounts, {
    percent: ((current.amount / totalOutstanding) * 100).toFixed(1),
    count: formatNumber(current.accounts),
  }).split('{amount}');

  return (
    <>
      <div className="pagehead">
        <div>
          <h1 className="pagehead__title">{t('dashboard.greeting', { name: user.name.split(' ')[0] ?? user.name })}</h1>
          <p className="pagehead__sub">{user.branch} · {formatDayHeading()}</p>
        </div>
      </div>

      <div className="quickactions">
        <Link className="quickaction" to="/customers/new">
          <PlusIcon size={16} /> {t('common.screens.newCustomer')}
        </Link>
        <Link className="quickaction" to="/loans/new">
          <WalletIcon size={16} /> {t('common.screens.newLoan')}
        </Link>
        <Link className="quickaction" to="/customers">
          <UsersIcon size={16} /> {t('common.nav.customers')}
        </Link>
        <Link className="quickaction" to="/calculator">
          <CalculatorIcon size={16} /> {t('common.nav.calculator')}
        </Link>
      </div>

      <div className="kpis">
        {kpis.map((kpi) => {
          const Trend = kpi.delta >= 0 ? TrendUpIcon : TrendDownIcon;
          const KpiIcon = KPI_ICONS[kpi.id];
          return (
            <article className={`kpi kpi--hover kpi--${kpi.id}`} key={kpi.id}>
              <div className="kpi__head">
                <p className="kpi__label">{kpi.label}</p>
                <span className="kpi__icon" aria-hidden>
                  <KpiIcon size={18} />
                </span>
              </div>
              <p className="kpi__value">
                {'currency' in kpi && kpi.currency === false
                  ? formatNumber(kpi.value)
                  : formatCurrency(kpi.value, true)}
              </p>
              <p className={`kpi__delta${kpi.deltaGood ? '' : ' kpi__delta--bad'}`}>
                <Trend />
                {Math.abs(kpi.delta)}%<span className="kpi__note">{kpi.note}</span>
              </p>
            </article>
          );
        })}
      </div>

      <div className="grid-2">
        <Card
          accent
          hoverable
          title={t('dashboard.collections.title')}
          subtitle={t('dashboard.collections.subtitle', { amount: formatCurrency(dailyTarget, true) })}
        >
          <CollectionsChart />
        </Card>

        <Card
          accent
          hoverable
          title={t('dashboard.arrears.title')}
          subtitle={t('dashboard.arrears.subtitle')}
        >
          <p className="arrears__context">
            <span className="statusdot" style={{ background: chart.status.good }} aria-hidden />
            {currentBefore}
            <b>{formatCurrency(current.amount, true)}</b>
            {currentAfter}
          </p>

          <ul className="arrears">
            {overdue.map((row) => (
              <li className="arrears__row" key={row.bucket}>
                <div className="arrears__head">
                  <span className="arrears__name">
                    <span
                      className="statusdot"
                      style={{ background: chart.status[row.tone] }}
                      aria-hidden
                    />
                    {row.bucket}
                  </span>
                  <span className="arrears__value">{formatCurrency(row.amount, true)}</span>
                </div>
                <div className="arrears__track">
                  <span
                    className="arrears__bar"
                    style={{ width: `${(row.amount / overdueMax) * 100}%` }}
                  />
                </div>
                <span className="arrears__meta">
                  {tp('dashboard.arrears.accounts', row.accounts, {
                    count: formatNumber(row.accounts),
                  })}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card
        accent
        hoverable
        title={t('dashboard.lines.title')}
        subtitle={t('dashboard.lines.subtitle')}
        action={
          <Link className="linkbtn" to="/lines">
            {t('dashboard.lines.manage')}
          </Link>
        }
      >
        <LinesCard />
      </Card>

      <Card
        accent
        hoverable
        title={t('dashboard.sheet.title')}
        subtitle={t('dashboard.sheet.subtitle', {
          collected: collected.length,
          total: dueToday.length + collected.length,
        })}
        action={
          <Link className="linkbtn" to="/collection">
            {t('dashboard.sheet.open')}
          </Link>
        }
      >
        <ul className="list">
          {sheet.slice(0, 5).map((item) => (
            <li className="list__row" key={item.id}>
              <span className="list__avatar" aria-hidden>
                {item.customer
                  .split(' ')
                  .map((part) => part[0])
                  .join('')}
              </span>
              <span className="list__main">
                <b>{item.customer}</b>
                <span className="list__meta">
                  {item.loanNo} · {lineById(item.lineId)?.name}
                </span>
              </span>
              <span className="list__amount">{formatCurrency(item.amount)}</span>
              <StatusPill status={item.status} daysLate={item.daysLate} />
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}

const KPI_ICONS = {
  outstanding: WalletIcon,
  collected: CheckCircleIcon,
  overdue: ClockIcon,
  loans: LedgerIcon,
} satisfies Record<(typeof kpis)[number]['id'], unknown>;

export function StatusPill({
  status,
  daysLate,
}: {
  status: 'due' | 'overdue' | 'collected';
  daysLate: number;
}) {
  const map = {
    collected: { tone: 'good', label: t('common.status.collected') },
    due: { tone: 'warning', label: t('common.status.dueToday') },
    overdue: { tone: 'critical', label: t('common.status.daysLate', { count: daysLate }) },
  } as const;
  const { tone, label } = map[status];

  return (
    <span className={`pill pill--${tone}`}>
      <span className="statusdot" style={{ background: chart.status[tone] }} aria-hidden />
      {label}
    </span>
  );
}
