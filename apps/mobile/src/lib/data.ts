/**
 * The portfolio as the API (`apps/api-spring`, PostgreSQL) serves it. `loadPortfolio`
 * fills these collections after sign-in; screens read them synchronously and
 * re-render through `usePortfolio` when a refresh or a write lands.
 */

import { monthName, t, weekdayName } from '@lms/i18n';
import { Platform } from 'react-native';
import {
  buildSchedule,
  computeLoan,
  formatShortDate,
  type LoanType,
  type ScheduleRow,
} from './loan';
import { API_URL, api, authHeaders, getSession } from './session';

export type StatusTone = 'good' | 'warning' | 'critical';

/** The signed-in officer, straight from the session the API handed back. */
export const user = {
  get name() {
    return getSession()?.user.fullName ?? '';
  },
  get role() {
    const role = getSession()?.user.role;
    return role ? t(`data.user.roles.${role}`) : '';
  },
  /** Staff are not tied to a branch yet, so the company stands in for it. */
  get branch() {
    return getSession()?.user.company ?? '';
  },
  get initials() {
    return initialsOf(this.name);
  },
};

/** `Saravanan Kumar` → `SK`; a single name gives its first letter. */
function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters = parts.length > 1 ? [parts[0], parts[parts.length - 1]] : parts;
  return letters.map((part) => part?.charAt(0).toUpperCase() ?? '').join('');
}

export type KpiId = 'outstanding' | 'collected' | 'overdue' | 'loans';

export type Kpi = {
  id: KpiId;
  label: string;
  value: number;
  /** Percentage change against `note`'s period; null when there is nothing to compare with. */
  delta: number | null;
  deltaGood: boolean;
  note: string;
  currency: boolean;
};

/** Which comparison each KPI's delta is against, and whether a rise is good news. */
const KPI_META: Record<KpiId, { note: 'vsLastMonth' | 'vsYesterday' | 'vsLastWeek'; riseIsGood: boolean }> = {
  outstanding: { note: 'vsLastMonth', riseIsGood: true },
  collected: { note: 'vsYesterday', riseIsGood: true },
  overdue: { note: 'vsLastWeek', riseIsGood: false },
  loans: { note: 'vsLastMonth', riseIsGood: true },
};

// Copy lives in the i18n dictionaries; getters resolve it in the active language.
export const kpis: Kpi[] = [];

/** Collections for the trailing week, oldest first. */
export const collectionsWeek: ReturnType<typeof chartDay>[] = [];

/** `day` is the axis tick (`Mon`), `label` the tooltip (`Mon 8 Sep`). */
function chartDay(iso: string, amount: number) {
  const weekday = new Date(`${iso}T00:00:00`).getDay();
  return {
    get day() {
      return weekdayName(weekday, true);
    },
    get label() {
      return `${weekdayName(weekday, true)} ${formatShortDate(iso)}`;
    },
    amount,
  };
}

/** The company's daily collection target, in rupees. */
export let dailyTarget = 0;

export type ArrearsBucketId = 'current' | 'overdue1to30' | 'overdue30plus';

/** Arrears aging. Ordered buckets — bars are one colour; the tone is a label. */
export const arrears: { id: ArrearsBucketId; bucket: string; tone: StatusTone; accounts: number; amount: number }[] = [];

/** Applications waiting on a manager, as the dashboard counts them. */
export let pendingApprovals = 0;

/** How often a line collects. `monthly-interest` collects interest only. */
export type Frequency = 'daily' | 'weekly' | 'monthly' | 'monthly-interest';

export const FREQUENCIES: {
  id: Frequency;
  label: string;
  hint: string;
  /** Which follow-up field the frequency asks for, if any. */
  schedule: 'none' | 'weekday' | 'day-of-month';
}[] = [
  frequency('daily', 'none'),
  frequency('weekly', 'weekday'),
  frequency('monthly', 'day-of-month'),
  frequency('monthly-interest', 'day-of-month'),
];

function frequency(id: Frequency, schedule: 'none' | 'weekday' | 'day-of-month') {
  return {
    id,
    get label() {
      return t(`common.frequency.${id}.label`);
    },
    get hint() {
      return t(`common.frequency.${id}.hint`);
    },
    schedule,
  };
}

/**
 * Stored values stay English (they are what the API will persist); show them
 * through `weekdayLabel` / `monthDayLabel` / `officerLabel`.
 */
export const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export function weekdayLabel(day: string): string {
  const index = WEEKDAYS.indexOf(day);
  return index < 0 ? day : weekdayName((index + 1) % 7);
}

/** 1–28 keeps every month valid; "Last day" covers month-end lines. */
export const MONTH_DAYS = [...Array.from({ length: 28 }, (_, i) => String(i + 1)), 'Last day'];

export function monthDayLabel(day: string): string {
  return day === 'Last day' ? t('common.lastDayOfMonth') : day;
}

/** Staff a line can be assigned to, from GET /officers. */
export type Officer = { id: number; name: string; role: 'ADMIN' | 'MANAGER' | 'LOAN_OFFICER' };

export const officers: Officer[] = [];

/** The API names an officerless line `Unassigned`. */
export function officerLabel(officer: string): string {
  return officer === 'Unassigned' ? t('common.unassigned') : officer;
}

export function frequencyLabel(id: Frequency): string {
  return FREQUENCIES.find((f) => f.id === id)?.label ?? id;
}

/** A collection line — the route an officer walks. */
export type Line = {
  id: string;
  name: string;
  officer: string;
  officerId?: number | null;
  frequency: Frequency;
  /** Weekday for weekly lines, day-of-month for monthly ones, else undefined. */
  schedule?: string;
  accounts: number;
  /** Today's figures, in rupees. */
  due: number;
  collected: number;
};

export const lines: Line[] = [];

export function lineById(id: string): Line | undefined {
  return lines.find((l) => l.id === id);
}

/** One line on today's collection sheet — derived from `loans` further down. */
export type Installment = {
  id: string;
  customer: string;
  loanNo: string;
  /** 1-based installment number on that loan. */
  seq: number;
  lineId: string;
  amount: number;
  /** Already formatted for display — `Today` or `9 Sep`. */
  dueOn: string;
  /** The raw due date, for arithmetic the label cannot carry. */
  dueOnIso: string;
  daysLate: number;
  status: 'due' | 'overdue' | 'collected';
};


/**
 * Government photo IDs accepted as KYC proof. Mirrors the `IdType` enum in the
 * Prisma schema; the copy here is what the officer sees in the field.
 */
export type IdType = 'AADHAAR' | 'PAN' | 'VOTER_ID' | 'DRIVING_LICENSE' | 'PASSPORT';

export const ID_TYPES: {
  id: IdType;
  label: string;
  /** Shown in the number field so the officer knows the shape expected. */
  placeholder: string;
  /** A PAN card carries nothing on its reverse, so only the front is asked for. */
  twoSided: boolean;
}[] = [
  { id: 'AADHAAR', get label() { return t('common.idType.AADHAAR'); }, placeholder: '1234 5678 9012', twoSided: true },
  { id: 'PAN', get label() { return t('common.idType.PAN'); }, placeholder: 'ABCDE1234F', twoSided: false },
  { id: 'VOTER_ID', get label() { return t('common.idType.VOTER_ID'); }, placeholder: 'ABC1234567', twoSided: true },
  { id: 'DRIVING_LICENSE', get label() { return t('common.idType.DRIVING_LICENSE'); }, placeholder: 'KL07 20110001234', twoSided: true },
  { id: 'PASSPORT', get label() { return t('common.idType.PASSPORT'); }, placeholder: 'A1234567', twoSided: true },
];

export function idTypeById(id: IdType | ''): (typeof ID_TYPES)[number] | undefined {
  return ID_TYPES.find((t) => t.id === id);
}

export function idTypeLabel(id: IdType): string {
  return idTypeById(id)?.label ?? id;
}

/** The customer's ID types on file, e.g. "Aadhaar, PAN". */
export function proofLabels(proofs: { type: IdType }[]): string {
  return proofs.map((proof) => idTypeLabel(proof.type)).join(', ');
}

/**
 * One captured page of the ID card. `uri` is a local file until it is saved,
 * then the API's URL for the stored photo, which needs `headers` to load.
 */
export type ProofImage = { uri: string; name: string; size?: number; headers?: Record<string, string>; stored?: boolean };

/** One government ID held against a customer, front and back. A customer holds at most one of each type. */
export type IdProof = {
  type: IdType;
  /** Normalised: no spaces or hyphens, upper case. */
  number: string;
  front?: ProofImage;
  back?: ProofImage;
};

/** Masks all but the last four characters — full numbers belong server-side. */
export function maskIdNumber(value: string): string {
  const clean = value.replace(/[\s-]/g, '');
  if (clean.length <= 4) return clean;
  return `${'•'.repeat(clean.length - 4)}${clean.slice(-4)}`;
}

/** A borrower on a line. `geo` is captured at the doorstep during onboarding. */
export type Customer = {
  id: string;
  name: string;
  phone: string;
  altPhone?: string;
  parentName: string;
  address: string;
  requestedAmount: number;
  lineId: string;
  geo?: { lat: number; lng: number; accuracy?: number; capturedAt: string };
  /** KYC identity proofs, one per ID type. Empty until an officer captures one. */
  proofs: IdProof[];
  status: 'pending' | 'approved' | 'active';
};

export const customers: Customer[] = [];

export function customerById(id: string): Customer | undefined {
  return customers.find((c) => c.id === id);
}

/**
 * A booked loan. Only the terms and the repayment record are stored; the
 * schedule and balances are derived, the way the ledger will.
 */
export type Loan = {
  /** The loan number — LN-20418. */
  id: string;
  customerId: string;
  lineId: string;
  type: LoanType;
  principal: number;
  annualRatePct: number;
  months: number;
  fee: number;
  /** The installment agreed at booking, which may be rounded off the calculated one. */
  emi: number;
  /** `YYYY-MM-DD`. */
  disbursedOn: string;
  /**
   * One entry per installment collected, oldest first: how many days after its
   * due date the money came in. 0 is on time.
   */
  repayments: number[];
};

export const loans: Loan[] = [];

export function loanById(id: string): Loan | undefined {
  return loans.find((l) => l.id === id);
}

/** Newest disbursal first. */
export function loansForCustomer(customerId: string): Loan[] {
  return loans
    .filter((l) => l.customerId === customerId)
    .sort((a, b) => b.disbursedOn.localeCompare(a.disbursedOn));
}

export type LoanState = 'active' | 'overdue' | 'closed';

/** A collected installment, as the receipt book records it. */
export type Repayment = {
  receiptNo: string;
  seq: number;
  paidOn: string;
  amount: number;
  /** Days after the due date it came in; 0 is on time. */
  daysLate: number;
};

export type LoanSummary = {
  schedule: ScheduleRow[];
  /** Newest first. */
  repayments: Repayment[];
  totalInterest: number;
  totalPayable: number;
  netDisbursal: number;
  paid: number;
  outstanding: number;
  /** The first installment not yet in, if any. */
  next?: ScheduleRow;
  state: LoanState;
  /** Days the oldest unpaid installment is past due. */
  daysLate: number;
};

export function summarizeLoan(loan: Loan): LoanSummary {
  const terms = computeLoan({
    principal: loan.principal,
    annualRatePct: loan.annualRatePct,
    months: loan.months,
    fee: loan.fee,
    type: loan.type,
  })!;
  const schedule = buildSchedule(loan.disbursedOn, loan.months, loan.emi, terms.totalPayable, loan.repayments);
  const paid = schedule.filter((r) => r.status === 'paid').reduce((sum, r) => sum + r.amount, 0);
  const next = schedule.find((r) => r.status !== 'paid');
  const daysLate = next?.status === 'overdue' ? next.daysLate : 0;

  const repayments = schedule
    .filter((r) => r.status === 'paid')
    .map((r) => ({
      receiptNo: receiptNo(loan.id, r.seq),
      seq: r.seq,
      paidOn: r.paidOn ?? r.dueOn,
      amount: r.amount,
      daysLate: r.daysLate,
    }))
    .reverse();

  return {
    schedule,
    repayments,
    totalInterest: terms.totalInterest,
    totalPayable: terms.totalPayable,
    netDisbursal: terms.netDisbursal,
    paid,
    outstanding: terms.totalPayable - paid,
    next,
    state: !next ? 'closed' : daysLate > 0 ? 'overdue' : 'active',
    daysLate,
  };
}

/** One line of the loan book: the loan, who holds it and where it stands. */
export type LoanBookEntry = {
  loan: Loan;
  customer?: Customer;
  summary: LoanSummary;
  /** Unpaid installments already past their due date. */
  overdueAmount: number;
};

export type LoanBookFilter = LoanState | 'all';
export type LoanBookSort = 'newest' | 'late' | 'outstanding';

/** Every loan on the book, newest disbursal first. Read at call time, so fresh disbursals show up. */
export function loanBook(): LoanBookEntry[] {
  return loans
    .map((loan) => {
      const summary = summarizeLoan(loan);
      return {
        loan,
        customer: customerById(loan.customerId),
        summary,
        overdueAmount: summary.schedule
          .filter((row) => row.status === 'overdue')
          .reduce((sum, row) => sum + row.amount, 0),
      };
    })
    .sort((a, b) => b.loan.disbursedOn.localeCompare(a.loan.disbursedOn));
}

export function filterLoanBook(
  entries: LoanBookEntry[],
  { query, state, lineId, sort }: { query: string; state: LoanBookFilter; lineId: string; sort: LoanBookSort },
): LoanBookEntry[] {
  const needle = query.trim().toLowerCase();
  const rows = entries.filter(({ loan, customer, summary }) => {
    if (state !== 'all' && summary.state !== state) return false;
    if (lineId !== 'all' && loan.lineId !== lineId) return false;
    if (!needle) return true;
    return (
      loan.id.toLowerCase().includes(needle) ||
      (customer?.name.toLowerCase().includes(needle) ?? false) ||
      (customer?.phone.includes(needle) ?? false)
    );
  });
  if (sort === 'late') return [...rows].sort((a, b) => b.summary.daysLate - a.summary.daysLate);
  if (sort === 'outstanding') return [...rows].sort((a, b) => b.summary.outstanding - a.summary.outstanding);
  return rows;
}

/** Receipt numbers are per loan and installment, so a re-sync never mints a second one. */
export function receiptNo(loanId: string, seq: number): string {
  return `RC-${loanId.replace(/^LN-/, '')}-${String(seq).padStart(2, '0')}`;
}

// ------------------------------------------------------------ approvals

/**
 * A loan on its way to disbursal. An officer submits it, a manager approves or
 * rejects it, and only an approved application can be disbursed — at which
 * point it becomes a `Loan`. Mirrors LoanStatus SUBMITTED → APPROVED /
 * REJECTED → DISBURSED in the Prisma schema.
 */
export type ApplicationStatus = 'pending' | 'approved' | 'rejected' | 'disbursed';

export type LoanApplication = {
  /** Application number — APP-3104. The loan number is minted at disbursal. */
  id: string;
  customerId: string;
  lineId: string;
  type: LoanType;
  principal: number;
  annualRatePct: number;
  months: number;
  fee: number;
  emi: number;
  /** The disbursal date the officer asked for, `YYYY-MM-DD`. */
  disburseOn: string;
  submittedOn: string;
  /** The line's officer at the time of submission. */
  submittedBy: string;
  status: ApplicationStatus;
  /** The approver's note, or the reason for a rejection. */
  note?: string;
  decidedOn?: string;
  /** Set once disbursed. */
  loanId?: string;
};

export type ApplicationInput = Pick<
  LoanApplication,
  'customerId' | 'type' | 'principal' | 'annualRatePct' | 'months' | 'fee' | 'emi' | 'disburseOn'
>;

let applicationList: LoanApplication[] = [];

export function getApplications(): LoanApplication[] {
  return applicationList;
}

export function subscribeApplications(listener: () => void): () => void {
  return subscribePortfolio(listener);
}

export function applicationById(id: string): LoanApplication | undefined {
  return applicationList.find((a) => a.id === id);
}

/** `2 Sep, 11:04 AM`. */
function formatCapturedAt(date: Date): string {
  return `${date.getDate()} ${monthName(date.getMonth(), true)}, ${formatClock(date)}`;
}

/** `11:04 AM`. */
export function formatClock(date: Date): string {
  const hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours % 12 || 12}:${minutes} ${hours < 12 ? 'AM' : 'PM'}`;
}

/** Why an application cannot be approved yet, if anything stops it. */
export function approvalBlocker(application: LoanApplication): 'noProof' | undefined {
  if (application.status !== 'pending') return undefined;
  return customerById(application.customerId)?.proofs.length ? undefined : 'noProof';
}

// ------------------------------------------------------------- payments

/**
 * How the money came in. These branches collect at the doorstep, so only cash
 * and UPI are offered.
 */
export type PaymentMode = 'CASH' | 'UPI';

export const PAYMENT_MODES: { id: PaymentMode; label: string; hint: string }[] = (
  ['CASH', 'UPI'] as const
).map((id) => ({
  id,
  get label() {
    return t(`common.paymentMode.${id}.label`);
  },
  get hint() {
    return t(`common.paymentMode.${id}.hint`);
  },
}));

export function paymentModeLabel(id: PaymentMode): string {
  return PAYMENT_MODES.find((mode) => mode.id === id)?.label ?? id;
}

export type PaymentInput = {
  loanId: string;
  seq: number;
  /** When the money actually changed hands, `YYYY-MM-DD`. */
  paidOn: string;
  mode: PaymentMode;
  /** Where the officer stood when receipting, if the device could tell. */
  geo?: PaymentGeo;
};

export type PaymentGeo = { lat: number; lng: number; accuracy?: number };

/** The borrower's doorstep pin, to check a receipt was taken there. */
export function doorstepFor(loanId: string): LatLng | undefined {
  return customerById(loanById(loanId)?.customerId ?? '')?.geo;
}

// Rebuilt only when something moves, so `useSyncExternalStore` keeps getting
// the same snapshot back and screens left mounted still see a fresh receipt.
let sheet: Installment[] = [];

export function getCollectionSheet(): Installment[] {
  return sheet;
}

export function subscribeCollectionSheet(listener: () => void): () => void {
  return subscribePortfolio(listener);
}

export function installmentById(id: string): Installment | undefined {
  return sheet.find((item) => item.id === id);
}

export type LatLng = { lat: number; lng: number };

/**
 * The branch office; where the pin map opens for a customer with no pin yet.
 * Set from GET /company; until the office is on file the map opens on Chennai.
 */
export let branchOffice: LatLng = { lat: 13.0827, lng: 80.2707 };

/** Great-circle distance in kilometres. */
export function distanceKm(a: LatLng, b: LatLng): number {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

export type Notification = { id: string; title: string; body: string; at: string; unread: boolean };

/**
 * Header alerts, worked out from the portfolio itself: there is no notification
 * feed on the API yet, so these say what needs attention right now.
 */
export const notifications: Notification[] = [];

function buildNotifications(): Notification[] {
  const today = t('common.status.today');
  const list: Notification[] = [];
  if (pendingApprovals > 0) {
    list.push({
      id: 'approvals',
      title: t('data.notifications.approvals.title'),
      body: t('data.notifications.approvals.body', { count: pendingApprovals }),
      at: today,
      unread: true,
    });
  }
  const late = arrears.find((a) => a.id === 'overdue30plus');
  if (late && late.accounts > 0) {
    list.push({
      id: 'arrears',
      title: t('data.notifications.arrears.title'),
      body: t('data.notifications.arrears.body', { count: late.accounts, amount: formatCurrency(late.amount) }),
      at: today,
      unread: true,
    });
  }
  const due = sheet.filter((item) => item.status !== 'collected').length;
  const collected = sheet.length - due;
  if (sheet.length > 0) {
    list.push({
      id: 'sheet',
      title: t('data.notifications.sheet.title'),
      body: t('data.notifications.sheet.body', { collected, total: sheet.length }),
      at: today,
      unread: due > 0,
    });
  }
  return list;
}

/** The report catalogue; each one is served by GET /reports/{path} — see lib/reports.ts. */
export const reports = (
  [
    ['r1', 'portfolio-summary'],
    ['r2', 'collection-register'],
    ['r3', 'overdue-ageing'],
    ['r4', 'disbursement-register'],
    ['r5', 'line-performance'],
    ['r6', 'day-book'],
  ] as const
).map(([id, path]) => ({
  id,
  path,
  get name() {
    return t(`data.reports.${id}.name`);
  },
  get desc() {
    return t(`data.reports.${id}.desc`);
  },
}));

export function formatCurrency(value: number, compact = false): string {
  if (compact) {
    if (value >= 10000000) return `₹${t('common.units.crore', { value: (value / 10000000).toFixed(2) })}`;
    if (value >= 100000) return `₹${t('common.units.lakh', { value: (value / 100000).toFixed(2) })}`;
    if (value >= 1000) return `₹${t('common.units.thousand', { value: (value / 1000).toFixed(1) })}`;
  }
  return `₹${value.toLocaleString('en-IN')}`;
}

export function formatNumber(value: number): string {
  return value.toLocaleString('en-IN');
}

// ================================================================ the API

type GeoView = { lat: number; lng: number; accuracy: number | null; capturedAt: string | null };
type ProofImageView = { name: string; size: number; url: string };
type CustomerView = {
  id: string;
  name: string;
  phone: string;
  altPhone: string | null;
  parentName: string;
  address: string;
  requestedAmount: number;
  lineId: string;
  geo: GeoView | null;
  proofs: { type: IdType; number: string; front: ProofImageView | null; back: ProofImageView | null }[];
  status: Customer['status'];
};
type LineView = Omit<Line, 'officerId' | 'schedule'> & { officerId: number | null; schedule: string | null };
type LoanBookEntryView = {
  loan: Omit<Loan, 'repayments'>;
  repayments: number[];
};
type ApplicationView = Omit<LoanApplication, 'note' | 'decidedOn' | 'loanId'> & {
  note: string | null;
  decidedOn: string | null;
  loanId: string | null;
};
type SheetItemView = Omit<Installment, 'dueOn' | 'dueOnIso'> & { dueOn: string };
type RepaymentView = { receiptNo: string; seq: number; paidOn: string; amount: number; daysLate: number };
type DashboardView = {
  kpis: { id: KpiId; value: number; delta: number | null; currency: boolean }[];
  collectionsWeek: { date: string; amount: number }[];
  dailyTarget: number;
  arrears: { bucket: ArrearsBucketId; tone: StatusTone; accounts: number; amount: number }[];
  pendingApprovals: number;
};
type CompanyView = { name: string; office: LatLng | null; dailyTarget: number };

const listeners = new Set<() => void>();
let version = 0;

/** Re-renders on every refresh or write; pair with `usePortfolio`. */
export function subscribePortfolio(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getPortfolioVersion(): number {
  return version;
}

function changed() {
  version += 1;
  notifications.splice(0, notifications.length, ...buildNotifications());
  listeners.forEach((listener) => listener());
}

function replace<T>(target: T[], next: T[]) {
  target.splice(0, target.length, ...next);
}

function toCustomer(view: CustomerView): Customer {
  const image = (file: ProofImageView | null): ProofImage | undefined =>
    file
      ? { uri: `${API_URL}${file.url}`, name: file.name, size: file.size, headers: authHeaders(), stored: true }
      : undefined;
  return {
    id: view.id,
    name: view.name,
    phone: view.phone,
    altPhone: view.altPhone ?? undefined,
    parentName: view.parentName,
    address: view.address,
    requestedAmount: view.requestedAmount,
    lineId: view.lineId,
    geo: view.geo
      ? {
          lat: view.geo.lat,
          lng: view.geo.lng,
          accuracy: view.geo.accuracy ?? undefined,
          capturedAt: view.geo.capturedAt ? formatCapturedAt(new Date(view.geo.capturedAt)) : '',
        }
      : undefined,
    proofs: view.proofs.map((proof) => ({
      type: proof.type,
      number: proof.number,
      front: image(proof.front),
      back: image(proof.back),
    })),
    status: view.status,
  };
}

function toLine(view: LineView): Line {
  return { ...view, schedule: view.schedule ?? undefined };
}

function toLoan(entry: LoanBookEntryView): Loan {
  return { ...entry.loan, annualRatePct: Number(entry.loan.annualRatePct), repayments: entry.repayments };
}

function toApplication(view: ApplicationView): LoanApplication {
  return {
    ...view,
    annualRatePct: Number(view.annualRatePct),
    note: view.note ?? undefined,
    decidedOn: view.decidedOn ?? undefined,
    loanId: view.loanId ?? undefined,
  };
}

function toInstallment(item: SheetItemView): Installment {
  const dueOnIso = item.dueOn;
  return {
    id: item.id,
    customer: item.customer,
    loanNo: item.loanNo,
    seq: item.seq,
    lineId: item.lineId,
    amount: item.amount,
    get dueOn() {
      return item.status === 'due' || (item.status === 'collected' && dueOnIso === todayLocalIso())
        ? t('common.status.today')
        : formatShortDate(dueOnIso);
    },
    dueOnIso,
    daysLate: item.daysLate,
    status: item.status,
  };
}

function todayLocalIso(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function applyDashboard(view: DashboardView) {
  replace(
    kpis,
    view.kpis.map((kpi) => {
      const meta = KPI_META[kpi.id];
      return {
        id: kpi.id,
        get label() {
          return t(`data.kpis.${kpi.id}`);
        },
        value: kpi.value,
        delta: kpi.delta == null ? null : Math.round(kpi.delta * 10) / 10,
        deltaGood: kpi.delta == null || (kpi.delta >= 0) === meta.riseIsGood,
        get note() {
          return t(`data.kpis.${meta.note}`);
        },
        currency: kpi.currency,
      };
    }),
  );
  replace(collectionsWeek, view.collectionsWeek.map((day) => chartDay(day.date, day.amount)));
  dailyTarget = view.dailyTarget;
  replace(
    arrears,
    view.arrears.map((row) => ({
      id: row.bucket,
      get bucket() {
        return t(`data.arrears.${row.bucket}`);
      },
      tone: row.tone,
      accounts: row.accounts,
      amount: row.amount,
    })),
  );
  pendingApprovals = view.pendingApprovals;
}

/** Everything a collection or a disbursal moves: loans, the sheet, line totals and the dashboard. */
async function refreshBook() {
  const [bookView, sheetView, lineViews, dashboard] = await Promise.all([
    api<LoanBookEntryView[]>('GET', '/loans'),
    api<SheetItemView[]>('GET', '/collection/sheet'),
    api<LineView[]>('GET', '/lines'),
    api<DashboardView>('GET', '/dashboard'),
  ]);
  replace(loans, bookView.map(toLoan));
  sheet = sheetView.map(toInstallment);
  replace(lines, lineViews.map(toLine));
  applyDashboard(dashboard);
}

async function refreshApplications() {
  const views = await api<ApplicationView[]>('GET', '/applications');
  applicationList = views.map(toApplication);
}

function upsertCustomer(view: CustomerView): Customer {
  const next = toCustomer(view);
  const index = customers.findIndex((c) => c.id === next.id);
  if (index < 0) customers.unshift(next);
  else customers[index] = next;
  return next;
}

/** Loads the whole portfolio for the signed-in user. Call after sign-in and on launch. */
export async function loadPortfolio(): Promise<void> {
  const [customerViews, officerViews, company] = await Promise.all([
    api<CustomerView[]>('GET', '/customers'),
    api<Officer[]>('GET', '/officers'),
    api<CompanyView>('GET', '/company'),
    refreshBook(),
    refreshApplications(),
  ]);
  replace(customers, customerViews.map(toCustomer));
  replace(officers, officerViews);
  if (company.office) branchOffice = company.office;
  changed();
}

/** Re-reads everything; for pull-to-refresh and coming back to the app. */
export const refreshPortfolio = loadPortfolio;

/** Forgets the previous user's portfolio on sign-out. */
export function clearPortfolio(): void {
  replace(kpis, []);
  replace(collectionsWeek, []);
  replace(arrears, []);
  replace(officers, []);
  replace(lines, []);
  replace(customers, []);
  replace(loans, []);
  applicationList = [];
  sheet = [];
  dailyTarget = 0;
  pendingApprovals = 0;
  changed();
}

// ---------------------------------------------------------------- writes

export type LineInput = { name: string; frequency: Frequency; schedule?: string; officerId?: number | null };

/** POST /lines. Managers and admins only. */
export async function createLine(input: LineInput): Promise<Line> {
  const view = await api<LineView>('POST', '/lines', { ...input, schedule: input.schedule || null });
  const line = toLine(view);
  lines.push(line);
  changed();
  return line;
}

export type CustomerInput = Pick<
  Customer,
  'name' | 'phone' | 'parentName' | 'address' | 'requestedAmount' | 'lineId'
> & { altPhone?: string; geo?: PaymentGeo };

/** POST /customers, then the doorstep pin if one was dropped during onboarding. */
export async function createCustomer({ geo, ...input }: CustomerInput): Promise<Customer> {
  let view = await api<CustomerView>('POST', '/customers', { ...input, altPhone: input.altPhone || '' });
  if (geo) view = await api<CustomerView>('PUT', `/customers/${view.id}/geo`, geo);
  const customer = upsertCustomer(view);
  changed();
  return customer;
}

/** PUT /customers/:id/geo, or DELETE to clear the pin. */
export async function saveGeo(customerId: string, geo: PaymentGeo | undefined): Promise<void> {
  const view = geo
    ? await api<CustomerView>('PUT', `/customers/${customerId}/geo`, geo)
    : await api<CustomerView>('DELETE', `/customers/${customerId}/geo`);
  upsertCustomer(view);
  changed();
}

async function photoPart(image: ProofImage): Promise<Blob | { uri: string; name: string; type: string }> {
  const type = image.name.toLowerCase().endsWith('.png')
    ? 'image/png'
    : image.name.toLowerCase().endsWith('.webp')
      ? 'image/webp'
      : 'image/jpeg';
  // Browsers need the bytes; native fetch streams the file from its uri.
  if (Platform.OS === 'web') return (await fetch(image.uri)).blob();
  return { uri: image.uri, name: image.name, type };
}

/**
 * PUT /customers/:id/kyc: adds the proof, or replaces the customer's proof of
 * the same type. Photos already on the server are not sent again. A saved
 * proof unblocks the customer's pending application.
 */
export async function saveProof(customerId: string, proof: IdProof): Promise<void> {
  const form = new FormData();
  form.append('type', proof.type);
  form.append('number', proof.number);
  for (const side of ['front', 'back'] as const) {
    const image = proof[side];
    if (!image || image.stored) continue;
    const part = await photoPart(image);
    if (part instanceof Blob) form.append(side, part, image.name);
    else form.append(side, part as unknown as Blob);
  }
  const view = await api<CustomerView>('PUT', `/customers/${customerId}/kyc`, form);
  upsertCustomer(view);
  await refreshApplications();
  changed();
}

/** DELETE /customers/:id/kyc/:type. */
export async function removeProof(customerId: string, type: IdType): Promise<void> {
  const view = await api<CustomerView>('DELETE', `/customers/${customerId}/kyc/${type}`);
  upsertCustomer(view);
  await refreshApplications();
  changed();
}

/** POST /applications. */
export async function submitApplication(input: ApplicationInput): Promise<LoanApplication> {
  const view = await api<ApplicationView>('POST', '/applications', input);
  await Promise.all([refreshApplications(), refreshBook()]);
  changed();
  return toApplication(view);
}

export async function approveApplication(id: string, note?: string): Promise<LoanApplication> {
  const view = await api<ApplicationView>('POST', `/applications/${id}/approve`, { note: note || null });
  await Promise.all([refreshApplications(), refreshBook()]);
  changed();
  return toApplication(view);
}

export async function rejectApplication(id: string, reason: string): Promise<LoanApplication> {
  const view = await api<ApplicationView>('POST', `/applications/${id}/reject`, { reason });
  await Promise.all([refreshApplications(), refreshBook()]);
  changed();
  return toApplication(view);
}

/**
 * Hands over the cash: the API books the approved application as a live loan,
 * dated today, so its schedule starts from the day the money actually left.
 */
export async function disburseApplication(id: string): Promise<Loan> {
  const detail = await api<{ loan: Omit<Loan, 'repayments'> }>('POST', `/applications/${id}/disburse`);
  const [customerViews] = await Promise.all([
    api<CustomerView[]>('GET', '/customers'),
    refreshApplications(),
    refreshBook(),
  ]);
  replace(customers, customerViews.map(toCustomer));
  changed();
  return loanById(detail.loan.id) ?? { ...detail.loan, repayments: [] };
}

/**
 * Receipts an installment: POST /loans/:id/payments. The API takes one
 * installment in full at a time, oldest first, and never one dated ahead.
 */
export async function recordPayment({ loanId, seq, paidOn, mode, geo }: PaymentInput): Promise<Repayment> {
  const receipt = await api<RepaymentView>('POST', `/loans/${loanId}/payments`, {
    seq,
    paidOn,
    mode,
    geo: geo ?? null,
    // Same id on a retry, so a dropped response never books the receipt twice.
    clientOpId: `${loanId}-${seq}`,
  });
  await refreshBook();
  changed();
  return {
    receiptNo: receipt.receiptNo,
    seq: receipt.seq,
    paidOn: receipt.paidOn,
    amount: receipt.amount,
    daysLate: receipt.daysLate,
  };
}
