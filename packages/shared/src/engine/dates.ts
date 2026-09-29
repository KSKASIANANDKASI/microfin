import type { RepaymentFrequency } from '../types/domain';

export const PERIODS_PER_YEAR: Record<RepaymentFrequency, number> = {
  DAILY: 365,
  WEEKLY: 52,
  FORTNIGHTLY: 26,
  MONTHLY: 12,
};

/** Midnight UTC for the calendar date of `d` — schedules are date-only. */
export function startOfDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export function addDays(d: Date, n: number): Date {
  const out = startOfDay(d);
  out.setUTCDate(out.getUTCDate() + n);
  return out;
}

/** Month arithmetic that clamps to the last day (31 Jan + 1m -> 28/29 Feb). */
export function addMonths(d: Date, n: number): Date {
  const base = startOfDay(d);
  const day = base.getUTCDate();
  const shifted = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + n, 1));
  const lastDay = new Date(
    Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth() + 1, 0),
  ).getUTCDate();
  shifted.setUTCDate(Math.min(day, lastDay));
  return shifted;
}

/** Due date of installment `seq` (1-based) counting from the disbursement date. */
export function dueDateFor(
  disbursedOn: Date,
  frequency: RepaymentFrequency,
  seq: number,
): Date {
  switch (frequency) {
    case 'DAILY':
      return addDays(disbursedOn, seq);
    case 'WEEKLY':
      return addDays(disbursedOn, seq * 7);
    case 'FORTNIGHTLY':
      return addDays(disbursedOn, seq * 14);
    case 'MONTHLY':
      return addMonths(disbursedOn, seq);
  }
}

export function daysBetween(from: Date, to: Date): number {
  const ms = startOfDay(to).getTime() - startOfDay(from).getTime();
  return Math.floor(ms / 86_400_000);
}

export function isoDate(d: Date): string {
  return startOfDay(d).toISOString().slice(0, 10);
}
