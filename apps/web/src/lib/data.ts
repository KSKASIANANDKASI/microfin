/**
 * Placeholder portfolio data so the screens can be reviewed before the API
 * exists. Shapes mirror what `apps/api` is expected to return.
 */

import { t, weekdayName } from '@lms/i18n';
import {
  addDays,
  buildSchedule,
  computeLoan,
  daysBetween,
  formatShortDate,
  toIso,
  todayIso,
  type LoanType,
  type ScheduleRow,
} from './loan';

export type StatusTone = 'good' | 'warning' | 'critical';

export const user = {
  name: 'Anitha Rajendran',
  get role() {
    return t('data.user.role');
  },
  get branch() {
    return t('data.user.branch');
  },
  initials: 'AR',
};

// Copy lives in the i18n dictionaries; getters resolve it in the active language.
export const kpis = [
  { id: 'outstanding', get label() { return t('data.kpis.outstanding'); }, value: 48250000, delta: 3.2, deltaGood: true, get note() { return t('data.kpis.vsLastMonth'); } },
  { id: 'collected', get label() { return t('data.kpis.collected'); }, value: 1284500, delta: 12.4, deltaGood: true, get note() { return t('data.kpis.vsYesterday'); } },
  { id: 'overdue', get label() { return t('data.kpis.overdue'); }, value: 2140000, delta: 1.8, deltaGood: false, get note() { return t('data.kpis.vsLastWeek'); } },
  { id: 'loans', get label() { return t('data.kpis.loans'); }, value: 1846, delta: -0.6, deltaGood: false, get note() { return t('data.kpis.vsLastMonth'); }, currency: false },
] as const;

/** Collections for the trailing week, oldest first. */
export const collectionsWeek = [
  chartDay('2025-09-08', 986000),
  chartDay('2025-09-09', 1124000),
  chartDay('2025-09-10', 872000),
  chartDay('2025-09-11', 1310000),
  chartDay('2025-09-12', 1284500),
  chartDay('2025-09-13', 640000),
  chartDay('2025-09-14', 128000),
];

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

export const dailyTarget = 1100000;

/** Arrears aging. Ordered buckets — bars are one colour; the tone is a label. */
export const arrears = [
  { get bucket() { return t('data.arrears.current'); }, tone: 'good' as StatusTone, accounts: 1702, amount: 46110000 },
  { get bucket() { return t('data.arrears.overdue1to30'); }, tone: 'warning' as StatusTone, accounts: 108, amount: 1486000 },
  { get bucket() { return t('data.arrears.overdue30plus'); }, tone: 'critical' as StatusTone, accounts: 36, amount: 654000 },
];

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

export const OFFICERS = ['Saravanan M', 'Priya Dharshini', 'Vetrivel S', 'Kalaiselvi R', 'Unassigned'];

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
  frequency: Frequency;
  /** Weekday for weekly lines, day-of-month for monthly ones, else undefined. */
  schedule?: string;
  accounts: number;
  /** Today's figures, in rupees. */
  due: number;
  collected: number;
};

export const lines: Line[] = [
  { id: 'L01', name: 'Line 01 · T. Nagar', officer: 'Saravanan M', frequency: 'daily', accounts: 46, due: 52400, collected: 44100 },
  { id: 'L02', name: 'Line 02 · Perambur', officer: 'Priya Dharshini', frequency: 'daily', accounts: 38, due: 41800, collected: 39650 },
  { id: 'L04', name: 'Line 04 · Velachery', officer: 'Vetrivel S', frequency: 'weekly', schedule: 'Friday', accounts: 51, due: 58900, collected: 36200 },
  { id: 'L07', name: 'Line 07 · Mylapore', officer: 'Kalaiselvi R', frequency: 'monthly-interest', schedule: '5', accounts: 33, due: 36200, collected: 34800 },
];

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

/**
 * One captured page of the ID card. `uri` is a local preview until the API
 * stores the file and hands back a URL.
 */
export type ProofImage = { uri: string; name: string; size?: number };

/** The KYC proof held against a customer — one ID, front and back. */
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
  /** KYC identity proof. Absent until an officer captures it. */
  proof?: IdProof;
  status: 'pending' | 'approved' | 'active';
};

export const customers: Customer[] = [
  {
    id: 'c1',
    name: 'Revathi Murugan',
    phone: '9840112233',
    altPhone: '9884556677',
    parentName: 'Murugan Subramani',
    address: '14/221, Bharathi Salai, Velachery, Chennai 600042',
    requestedAmount: 45000,
    lineId: 'L04',
    geo: { lat: 12.9752, lng: 80.2212, accuracy: 8, capturedAt: '2 Sep, 11:04 AM' },
    proof: { type: 'AADHAAR', number: '432178905612' },
    status: 'active',
  },
  {
    id: 'c2',
    name: 'Senthil Kumaran',
    phone: '9962440155',
    parentName: 'Kumaran Selvaraj',
    address: '8B Sriram Flats, Paper Mills Road, Perambur, Chennai 600011',
    requestedAmount: 60000,
    lineId: 'L02',
    geo: { lat: 13.1143, lng: 80.2331, accuracy: 12, capturedAt: '28 Aug, 3:41 PM' },
    proof: { type: 'PAN', number: 'AKJPV8821M' },
    status: 'active',
  },
  {
    id: 'c3',
    name: 'Nasreen Basheer',
    phone: '9445771208',
    altPhone: '9840993311',
    parentName: 'Basheer Ahmed',
    address: '23, Kutchery Road, Mylapore, Chennai 600004',
    requestedAmount: 30000,
    lineId: 'L07',
    geo: { lat: 13.0339, lng: 80.2687, accuracy: 9, capturedAt: '14 Jan, 10:22 AM' },
    proof: { type: 'VOTER_ID', number: 'TNM4471902' },
    status: 'active',
  },
  {
    id: 'c4',
    name: 'Arulraj Devadoss',
    phone: '9884320176',
    parentName: 'Devadoss Anthony',
    address: '3/118, Thiruvalluvar Street, Velachery, Chennai 600042',
    requestedAmount: 85000,
    lineId: 'L04',
    geo: { lat: 12.9784, lng: 80.2196, accuracy: 6, capturedAt: '11 Jun, 5:12 PM' },
    status: 'active',
  },
  {
    id: 'c5',
    name: 'Lakshmi Priya',
    phone: '9790213344',
    parentName: 'Ramasamy Krishnan',
    address: '41, Usman Road, T. Nagar, Chennai 600017',
    requestedAmount: 25000,
    lineId: 'L01',
    geo: { lat: 13.0418, lng: 80.2341, accuracy: 7, capturedAt: '20 Jul, 9:48 AM' },
    proof: { type: 'AADHAAR', number: '581203349927' },
    status: 'active',
  },
  {
    id: 'c6',
    name: 'Kavitha Elangovan',
    phone: '9500871120',
    altPhone: '9444120087',
    parentName: 'Elangovan Pandian',
    address: '12/5, Madhavaram High Road, Perambur, Chennai 600011',
    requestedAmount: 60000,
    lineId: 'L02',
    geo: { lat: 13.1172, lng: 80.2389, accuracy: 11, capturedAt: '18 May, 4:05 PM' },
    proof: { type: 'AADHAAR', number: '730418822561' },
    status: 'active',
  },
  {
    id: 'c7',
    name: 'Divya Shankar',
    phone: '9677034512',
    parentName: 'Shankar Narayanan',
    address: '7, Royapettah High Road, Mylapore, Chennai 600004',
    requestedAmount: 20000,
    lineId: 'L07',
    geo: { lat: 13.0368, lng: 80.2676, accuracy: 10, capturedAt: '16 Jan, 12:30 PM' },
    proof: { type: 'PAN', number: 'CQRPS4410K' },
    status: 'active',
  },
  {
    id: 'c8',
    name: 'Vignesh Kumar',
    phone: '9841556790',
    parentName: 'Kumar Velu',
    address: '88, Pondy Bazaar, T. Nagar, Chennai 600017',
    requestedAmount: 40000,
    lineId: 'L01',
    geo: { lat: 13.0405, lng: 80.2337, accuracy: 14, capturedAt: '2 Nov, 3:15 PM' },
    proof: { type: 'DRIVING_LICENSE', number: 'TN0920190004512' },
    status: 'active',
  },
  {
    id: 'c9',
    name: 'Meena Gopal',
    phone: '9884761023',
    parentName: 'Gopal Rajan',
    address: '5/2, Taramani Link Road, Velachery, Chennai 600042',
    requestedAmount: 35000,
    lineId: 'L04',
    status: 'pending',
  },
];

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

/**
 * Sample loans are dated back from today so the collection sheet stays live —
 * a loan "due today" is due whenever the screens are opened. Returns the
 * disbursal date that puts installment `seq` due `daysAgo` days before today.
 */
function disbursedFor(seq: number, daysAgo = 0): string {
  const due = new Date();
  due.setDate(due.getDate() - daysAgo);
  const target = new Date(due.getFullYear(), due.getMonth() - seq, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  // Month-end clamping means the 29th–31st cannot always be hit exactly; the
  // installment then lands a day or two early, which is fine for sample data.
  target.setDate(Math.min(due.getDate(), lastDay));
  return toIso(target);
}

export const loans: Loan[] = [
  {
    id: 'LN-20418',
    customerId: 'c1',
    lineId: 'L04',
    type: 'POST',
    principal: 45000,
    annualRatePct: 24,
    months: 12,
    fee: 900,
    emi: 4650,
    disbursedOn: disbursedFor(6),
    repayments: [0, 0, 2, 0, 0],
  },
  {
    id: 'LN-20377',
    customerId: 'c2',
    lineId: 'L02',
    type: 'PRE',
    principal: 60000,
    annualRatePct: 20,
    months: 18,
    fee: 1200,
    emi: 3350,
    disbursedOn: disbursedFor(7),
    repayments: [0, 0, 0, 1, 0, 0],
  },
  {
    id: 'LN-19980',
    customerId: 'c3',
    lineId: 'L07',
    type: 'POST',
    principal: 30000,
    annualRatePct: 24,
    months: 12,
    fee: 600,
    emi: 3100,
    disbursedOn: disbursedFor(8, 3),
    repayments: [0, 0, 4, 0, 6, 2, 5],
  },
  {
    id: 'LN-20112',
    customerId: 'c4',
    lineId: 'L04',
    type: 'PRE',
    principal: 50000,
    annualRatePct: 18,
    months: 10,
    fee: 1000,
    emi: 5000,
    disbursedOn: disbursedFor(4, 10),
    repayments: [0, 8, 12],
  },
  {
    id: 'LN-20455',
    customerId: 'c5',
    lineId: 'L01',
    type: 'POST',
    principal: 25000,
    annualRatePct: 24,
    months: 12,
    fee: 500,
    // Rounded up from the calculated ₹2,584; the last installment is smaller.
    emi: 2600,
    disbursedOn: disbursedFor(2),
    repayments: [0, 0],
  },
  {
    id: 'LN-20390',
    customerId: 'c6',
    lineId: 'L02',
    type: 'POST',
    principal: 60000,
    annualRatePct: 24,
    months: 12,
    fee: 1200,
    emi: 6200,
    disbursedOn: disbursedFor(5),
    repayments: [0, 0, 0, 0],
  },
  {
    id: 'LN-20204',
    customerId: 'c7',
    lineId: 'L07',
    type: 'POST',
    principal: 20000,
    annualRatePct: 20,
    months: 10,
    fee: 400,
    emi: 2334,
    disbursedOn: disbursedFor(8),
    repayments: [0, 1, 0, 0, 0, 3, 0, 0],
  },
  {
    id: 'LN-19845',
    customerId: 'c8',
    lineId: 'L01',
    type: 'POST',
    principal: 40000,
    annualRatePct: 24,
    months: 12,
    fee: 800,
    emi: 4134,
    disbursedOn: disbursedFor(10, 15),
    repayments: [0, 0, 5, 9, 3, 11, 7, 14, 10],
  },
  {
    // Closed — Revathi's first loan, repaid in full before LN-20418.
    id: 'LN-18702',
    customerId: 'c1',
    lineId: 'L04',
    type: 'POST',
    principal: 25000,
    annualRatePct: 24,
    months: 10,
    fee: 500,
    emi: 3000,
    disbursedOn: '2025-05-10',
    repayments: [0, 0, 1, 0, 0, 0, 3, 0, 0, 0],
  },
];

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

function sampleApplication(
  id: string,
  customerId: string,
  terms: Omit<ApplicationInput, 'customerId' | 'emi' | 'disburseOn'>,
  submittedDaysAgo: number,
  decision?: Pick<LoanApplication, 'status' | 'note'>,
): LoanApplication {
  const lineId = customerById(customerId)?.lineId ?? '';
  const today = todayIso();
  const submittedOn = addDays(today, -submittedDaysAgo) ?? today;
  return {
    id,
    customerId,
    lineId,
    ...terms,
    emi: computeLoan(terms)?.emi ?? 0,
    disburseOn: today,
    submittedOn,
    submittedBy: lineById(lineId)?.officer ?? 'Unassigned',
    status: 'pending',
    ...(decision ? { ...decision, decidedOn: today } : {}),
  };
}

// In-memory until the API exists: the queue lives for the session, and every
// change replaces the array so `useSyncExternalStore` sees a new snapshot.
let applicationList: LoanApplication[] = [
  sampleApplication('APP-3107', 'c9', { type: 'POST', principal: 35000, annualRatePct: 24, months: 10, fee: 500 }, 0),
  sampleApplication('APP-3104', 'c5', { type: 'PRE', principal: 25000, annualRatePct: 24, months: 6, fee: 250 }, 1),
  sampleApplication('APP-3101', 'c2', { type: 'POST', principal: 60000, annualRatePct: 24, months: 12, fee: 1200 }, 2, {
    status: 'approved',
    note: 'Clean record on LN-20377. Disburse at the branch.',
  }),
  sampleApplication('APP-3098', 'c7', { type: 'POST', principal: 20000, annualRatePct: 30, months: 6, fee: 400 }, 3, {
    status: 'rejected',
    note: 'Rate above the line policy. Resubmit at 24%.',
  }),
];

const applicationListeners = new Set<() => void>();

export function getApplications(): LoanApplication[] {
  return applicationList;
}

export function subscribeApplications(listener: () => void): () => void {
  applicationListeners.add(listener);
  return () => {
    applicationListeners.delete(listener);
  };
}

export function applicationById(id: string): LoanApplication | undefined {
  return applicationList.find((a) => a.id === id);
}

function updateApplication(id: string, change: Partial<LoanApplication>): LoanApplication {
  const current = applicationById(id);
  if (!current) throw new Error(`No application ${id}`);
  const next = { ...current, ...change };
  applicationList = applicationList.map((a) => (a.id === id ? next : a));
  applicationListeners.forEach((listener) => listener());
  return next;
}

/**
 * Records a customer's KYC proof. Stands in for PUT /customers/:id/kyc until
 * the API exists, so a captured proof unblocks their pending application.
 */
export function saveProof(customerId: string, proof: IdProof): void {
  const customer = customerById(customerId);
  if (customer) customer.proof = proof;
  applicationListeners.forEach((listener) => listener());
}

/** Why an application cannot be approved yet, if anything stops it. */
export function approvalBlocker(application: LoanApplication): 'noProof' | undefined {
  return customerById(application.customerId)?.proof ? undefined : 'noProof';
}

/** UI-only for now: POST /loans with status SUBMITTED goes here. */
export function submitApplication(input: ApplicationInput): LoanApplication {
  const next = Math.max(...applicationList.map((a) => Number(a.id.replace(/\D/g, '')))) + 1;
  const lineId = customerById(input.customerId)?.lineId ?? '';
  const application: LoanApplication = {
    ...input,
    id: `APP-${next}`,
    lineId,
    submittedOn: todayIso(),
    submittedBy: lineById(lineId)?.officer ?? 'Unassigned',
    status: 'pending',
  };
  applicationList = [application, ...applicationList];
  applicationListeners.forEach((listener) => listener());
  return application;
}

export function approveApplication(id: string, note?: string): LoanApplication {
  const application = applicationById(id);
  if (application?.status !== 'pending') throw new Error(`${id} is not awaiting approval`);
  if (approvalBlocker(application)) throw new Error(`${id} has no identity proof on file`);
  return updateApplication(id, { status: 'approved', note: note || undefined, decidedOn: todayIso() });
}

export function rejectApplication(id: string, reason: string): LoanApplication {
  if (applicationById(id)?.status !== 'pending') throw new Error(`${id} is not awaiting approval`);
  return updateApplication(id, { status: 'rejected', note: reason, decidedOn: todayIso() });
}

/**
 * Hands over the cash: books the approved application as a live loan, dated
 * today, so its schedule starts from the day the money actually left.
 */
export function disburseApplication(id: string): Loan {
  const application = applicationById(id);
  if (application?.status !== 'approved') throw new Error(`${id} is not approved`);

  const loan: Loan = {
    id: `LN-${Math.max(...loans.map((l) => Number(l.id.replace(/\D/g, '')))) + 1}`,
    customerId: application.customerId,
    lineId: application.lineId,
    type: application.type,
    principal: application.principal,
    annualRatePct: application.annualRatePct,
    months: application.months,
    fee: application.fee,
    emi: application.emi,
    disbursedOn: todayIso(),
    repayments: [],
  };
  loans.push(loan);
  updateApplication(id, { status: 'disbursed', loanId: loan.id });
  refreshCollectionSheet();
  return loan;
}

// ------------------------------------------------------------- payments

/**
 * How the money came in. A subset of the `TxnChannel` enum in the Prisma
 * schema: these branches collect at the doorstep, so only cash and UPI are
 * offered. SYSTEM is excluded outright — it is for accruals the ledger posts
 * itself, never for something an officer collects.
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

/**
 * The mode each collected installment came in by, keyed `${loanId}-${seq}`.
 * `Loan.repayments` records only lateness, so the channel is held alongside it
 * until the API stores a Transaction row per receipt.
 */
const paymentModes = new Map<string, PaymentMode>();

export function paymentModeFor(loanId: string, seq: number): PaymentMode | undefined {
  return paymentModes.get(`${loanId}-${seq}`);
}

export type PaymentInput = {
  loanId: string;
  seq: number;
  /** When the money actually changed hands, `YYYY-MM-DD`. */
  paidOn: string;
  mode: PaymentMode;
};

/**
 * Receipts an installment. UI-only for now: POST /loans/:id/payments goes here.
 *
 * Installments are collected oldest first, so the payment appends to
 * `repayments` as the lateness `buildSchedule` reads back — storing the date
 * itself would duplicate what the due date plus that offset already says.
 */
export function recordPayment({ loanId, seq, paidOn, mode }: PaymentInput): Repayment {
  const loan = loanById(loanId);
  if (!loan) throw new Error(`No loan ${loanId}`);
  if (seq !== loan.repayments.length + 1) {
    throw new Error(`Installment ${seq} of ${loanId} is not the one being collected`);
  }
  const row = summarizeLoan(loan).schedule.find((r) => r.seq === seq);
  if (!row) throw new Error(`No installment ${seq} on ${loanId}`);

  // An early payment still settles the installment in full; it is simply not
  // late, so the schedule keeps its own due date.
  const daysLate = Math.max(0, daysBetween(row.dueOn, paidOn) ?? 0);
  loan.repayments.push(daysLate);
  paymentModes.set(`${loanId}-${seq}`, mode);
  refreshCollectionSheet();

  return { receiptNo: receiptNo(loanId, seq), seq, paidOn, amount: row.amount, daysLate };
}

/**
 * Today's collection sheet: every installment due today or overdue, plus the
 * ones already collected today — straight off the loan schedules.
 */
function buildCollectionSheet(): Installment[] {
  return loans.flatMap((loan): Installment[] => {
    const today = todayIso();
    const customer = customerById(loan.customerId)?.name ?? loan.customerId;
    const { schedule } = summarizeLoan(loan);
    const base = { customer, loanNo: loan.id, lineId: loan.lineId };

    const collected = schedule.find((r) => r.status === 'paid' && r.paidOn === today);
    if (collected) {
      return [
        {
          ...base,
          id: `${loan.id}-${collected.seq}`,
          seq: collected.seq,
          amount: collected.amount,
          get dueOn() {
            return collected.dueOn === today ? t('common.status.today') : formatShortDate(collected.dueOn);
          },
          dueOnIso: collected.dueOn,
          daysLate: 0,
          status: 'collected',
        },
      ];
    }

    const next = schedule.find((r) => r.status === 'due' || r.status === 'overdue');
    if (!next) return [];
    return [
      {
        ...base,
        id: `${loan.id}-${next.seq}`,
        seq: next.seq,
        amount: next.amount,
        get dueOn() {
          return next.status === 'due' ? t('common.status.today') : formatShortDate(next.dueOn);
        },
        dueOnIso: next.dueOn,
        daysLate: next.daysLate,
        status: next.status === 'due' ? 'due' : 'overdue',
      },
    ];
  });
}

// Rebuilt only when something moves, so `useSyncExternalStore` keeps getting
// the same snapshot back and screens left mounted still see a fresh receipt.
let sheet: Installment[] = buildCollectionSheet();

const sheetListeners = new Set<() => void>();

export function getCollectionSheet(): Installment[] {
  return sheet;
}

export function subscribeCollectionSheet(listener: () => void): () => void {
  sheetListeners.add(listener);
  return () => {
    sheetListeners.delete(listener);
  };
}

function refreshCollectionSheet(): void {
  sheet = buildCollectionSheet();
  sheetListeners.forEach((listener) => listener());
}

export function installmentById(id: string): Installment | undefined {
  return sheet.find((item) => item.id === id);
}

export type LatLng = { lat: number; lng: number };

/** The branch office every line leaves from and returns to at day end. */
export const branchOffice: LatLng = { lat: 13.085, lng: 80.2101 };

/** One doorstep on a line's route, in the order the officer should walk it. */
export type RouteStop = {
  installment: Installment;
  customer: Customer;
  geo: LatLng;
  /** Straight-line kilometres from the previous stop (or the office). */
  legKm: number;
};

export type LineRoute = {
  stops: RouteStop[];
  /** On today's sheet but never geo-tagged, so they cannot be placed on the map. */
  unmapped: Installment[];
  /** Office → every stop → office, straight-line. Road distance will be longer. */
  totalKm: number;
};

/**
 * Orders today's sheet for a line into a walkable route: nearest unvisited
 * doorstep first, starting from the branch office. Collected stops are left
 * out so the route shrinks as the officer receipts.
 */
export function lineRoute(sheet: Installment[], lineId: string): LineRoute {
  const pending: { installment: Installment; customer: Customer; geo: LatLng }[] = [];
  const unmapped: Installment[] = [];

  for (const installment of sheet) {
    if (installment.lineId !== lineId || installment.status === 'collected') continue;
    const customer = customerById(loanById(installment.loanNo)?.customerId ?? '');
    if (customer?.geo) pending.push({ installment, customer, geo: customer.geo });
    else unmapped.push(installment);
  }

  const stops: RouteStop[] = [];
  let here = branchOffice;
  while (pending.length) {
    let best = 0;
    for (let i = 1; i < pending.length; i++) {
      if (distanceKm(here, pending[i]!.geo) < distanceKm(here, pending[best]!.geo)) best = i;
    }
    const [next] = pending.splice(best, 1);
    stops.push({ ...next!, legKm: distanceKm(here, next!.geo) });
    here = next!.geo;
  }

  const outbound = stops.reduce((sum, s) => sum + s.legKm, 0);
  const totalKm = stops.length ? outbound + distanceKm(here, branchOffice) : 0;
  return { stops, unmapped, totalKm };
}

/** Great-circle distance in kilometres. */
export function distanceKm(a: LatLng, b: LatLng): number {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

export const notifications = [
  notification('n1', true),
  notification('n2', true),
  notification('n3', true),
  notification('n4', false),
];

function notification(id: 'n1' | 'n2' | 'n3' | 'n4', unread: boolean) {
  return {
    id,
    get title() {
      return t(`data.notifications.${id}.title`);
    },
    get body() {
      return t(`data.notifications.${id}.body`);
    },
    get at() {
      return t(`data.notifications.${id}.at`);
    },
    unread,
  };
}

export const reports = (['r1', 'r2', 'r3', 'r4', 'r5', 'r6'] as const).map((id) => ({
  id,
  get name() {
    return t(`data.reports.${id}.name`);
  },
  get desc() {
    return t(`data.reports.${id}.desc`);
  },
  get updated() {
    return t(`data.reports.${id}.updated`);
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
