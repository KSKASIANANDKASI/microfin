/**
 * Pricing for the flat-interest loans these branches write. Interest accrues
 * on the original principal for the whole tenure — nothing here amortises.
 *
 * The two loan types differ only in WHEN the interest is taken:
 *   POST — collected with the installments; the customer takes the full amount.
 *   PRE  — deducted from the cash handed over; installments repay principal.
 */

import { monthName, t, weekdayName } from '@lms/i18n';

export type LoanType = 'POST' | 'PRE';

export const LOAN_TYPES: { id: LoanType; label: string; hint: string }[] = (['POST', 'PRE'] as const).map(
  (id) => ({
    id,
    get label() {
      return t(`common.loanType.${id}.label`);
    },
    get hint() {
      return t(`common.loanType.${id}.hint`);
    },
  }),
);

export function loanTypeLabel(id: LoanType): string {
  return LOAN_TYPES.find((type) => type.id === id)?.label ?? id;
}

export type LoanInput = {
  /** Sanctioned amount, in whole rupees. */
  principal: number;
  /** Nominal annual rate in percent — 24 means 24% p.a. */
  annualRatePct: number;
  /** Tenure, in monthly installments. */
  months: number;
  /** Flat processing fee, in whole rupees. */
  fee: number;
  type: LoanType;
};

export type LoanTerms = {
  totalInterest: number;
  /** What the schedule has to recover across the tenure. */
  totalPayable: number;
  /** Rounded up to the rupee — field collections do not handle paise. */
  emi: number;
  /** Cash actually handed over at disbursal. */
  netDisbursal: number;
};

/** Returns undefined until the inputs are complete enough to price. */
export function computeLoan(input: LoanInput): LoanTerms | undefined {
  const { principal, annualRatePct, months, fee, type } = input;
  if (!(principal > 0) || !(months > 0) || !(annualRatePct >= 0)) return undefined;

  const totalInterest = Math.round((principal * annualRatePct * (months / 12)) / 100);
  const totalPayable = type === 'PRE' ? principal : principal + totalInterest;

  return {
    totalInterest,
    totalPayable,
    emi: Math.ceil(totalPayable / months),
    netDisbursal: type === 'PRE' ? principal - totalInterest - fee : principal - fee,
  };
}

/**
 * The closing installment. EMIs are rounded up to the rupee, so the last one
 * takes whatever is left — the same rule `buildSchedule` applies.
 */
export function finalInstallment(terms: LoanTerms, months: number): number {
  return Math.max(0, terms.totalPayable - terms.emi * (months - 1));
}

/** Today as `YYYY-MM-DD` in local time — `toISOString` would shift the day. */
export function todayIso(): string {
  return toIso(new Date());
}

export function parseIsoDate(iso: string): Date | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return undefined;
  const [, y, m, d] = match;
  const date = new Date(Number(y), Number(m) - 1, Number(d));
  // Rejects the 31st of a 30-day month, which Date would roll forward.
  return date.getMonth() === Number(m) - 1 ? date : undefined;
}

/**
 * The closing date, `months` installments out. A loan booked on the 31st
 * closes on the last day of a shorter month rather than spilling into the next.
 */
export function addMonths(iso: string, months: number): string | undefined {
  const start = parseIsoDate(iso);
  if (!start || !(months > 0)) return undefined;

  const target = new Date(start.getFullYear(), start.getMonth() + months, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(start.getDate(), lastDay));
  return toIso(target);
}

export function formatDate(iso: string): string {
  const date = parseIsoDate(iso);
  if (!date) return iso;
  return `${date.getDate()} ${monthName(date.getMonth(), true)} ${date.getFullYear()}`;
}

/** `Friday, 12 September` — spelled out by hand so web and Hermes agree. */
export function formatDayHeading(date: Date = new Date()): string {
  return `${weekdayName(date.getDay())}, ${date.getDate()} ${monthName(date.getMonth())}`;
}

/** `9 Sep` — for lists where the year is obvious. */
export function formatShortDate(iso: string): string {
  const date = parseIsoDate(iso);
  if (!date) return iso;
  return `${date.getDate()} ${monthName(date.getMonth(), true)}`;
}

/** Whole days from `from` to `to` — negative when `to` is the earlier date. */
export function daysBetween(from: string, to: string): number | undefined {
  const start = parseIsoDate(from);
  const end = parseIsoDate(to);
  if (!start || !end) return undefined;
  return Math.round((end.getTime() - start.getTime()) / 86400000);
}

/** Whole days between two ISO dates — negative when `iso` is in the past. */
export function daysFromToday(iso: string): number | undefined {
  return daysBetween(todayIso(), iso);
}

export function toIso(date: Date): string {
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export function addDays(iso: string, days: number): string | undefined {
  const date = parseIsoDate(iso);
  if (!date) return undefined;
  date.setDate(date.getDate() + days);
  return toIso(date);
}

export type ScheduleRow = {
  /** 1-based installment number. */
  seq: number;
  dueOn: string;
  amount: number;
  /** What is still owed once this installment is in. */
  balanceAfter: number;
  status: 'paid' | 'overdue' | 'due' | 'upcoming';
  /** Days past due — for an unpaid row, as of today; for a paid one, when it came in. */
  daysLate: number;
  /** When the money came in. Set only on paid rows. */
  paidOn?: string;
};

/**
 * The monthly schedule for a booked loan. Every installment is the EMI except
 * the last, which takes whatever is left so the schedule recovers exactly
 * `totalPayable` — an EMI rounded up would otherwise overcollect.
 *
 * `repayments` holds one entry per installment collected, in order: how many
 * days after its due date the money came in.
 */
export function buildSchedule(
  disbursedOn: string,
  months: number,
  emi: number,
  totalPayable: number,
  repayments: number[],
): ScheduleRow[] {
  const rows: ScheduleRow[] = [];
  let balance = totalPayable;

  for (let seq = 1; seq <= months && balance > 0; seq++) {
    const dueOn = addMonths(disbursedOn, seq) ?? disbursedOn;
    const amount = seq === months ? balance : Math.min(emi, balance);
    balance -= amount;

    const paidLate = repayments[seq - 1];
    if (paidLate !== undefined) {
      rows.push({
        seq,
        dueOn,
        amount,
        balanceAfter: balance,
        status: 'paid',
        daysLate: paidLate,
        paidOn: addDays(dueOn, paidLate),
      });
      continue;
    }

    const offset = daysFromToday(dueOn) ?? 0;
    const status: ScheduleRow['status'] = offset < 0 ? 'overdue' : offset === 0 ? 'due' : 'upcoming';
    rows.push({ seq, dueOn, amount, balanceAfter: balance, status, daysLate: status === 'overdue' ? -offset : 0 });
  }

  return rows;
}
