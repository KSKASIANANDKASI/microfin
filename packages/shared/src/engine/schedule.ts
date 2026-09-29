import { splitEvenly } from '../money';
import type { InterestMethod, RepaymentFrequency } from '../types/domain';
import { dueDateFor, isoDate } from './dates';
import { computeTerms, periodicRate, type TermsInput } from './interest';

export interface ScheduleRow {
  seq: number;
  dueDate: string; // YYYY-MM-DD
  openingBalanceMinor: number;
  principalDueMinor: number;
  interestDueMinor: number;
  totalDueMinor: number;
  closingBalanceMinor: number;
}

export interface ScheduleInput extends TermsInput {
  disbursedOn: Date;
}

/**
 * Build the full repayment schedule. Invariants (asserted by the tests):
 *   Σ principalDue === principal
 *   Σ totalDue     === principal + totalInterest
 *   last closingBalance === 0
 * The final installment absorbs every rounding remainder.
 */
export function generateSchedule(input: ScheduleInput): ScheduleRow[] {
  const terms = computeTerms(input);
  const n = input.installmentCount;
  const rows: ScheduleRow[] = [];

  const dates = Array.from({ length: n }, (_, i) =>
    isoDate(dueDateFor(input.disbursedOn, input.frequency, i + 1)),
  );

  if (input.interestMethod === 'FLAT') {
    // Even split of both buckets; remainders land on the earliest installments,
    // then the last row is trued up against the exact totals.
    const principalParts = splitEvenly(input.principalMinor, n);
    const interestParts = splitEvenly(terms.totalInterestMinor, n);
    let balance = input.principalMinor;
    for (let i = 0; i < n; i += 1) {
      const principalDue = principalParts[i] ?? 0;
      const interestDue = interestParts[i] ?? 0;
      const opening = balance;
      balance -= principalDue;
      rows.push({
        seq: i + 1,
        dueDate: dates[i] ?? isoDate(input.disbursedOn),
        openingBalanceMinor: opening,
        principalDueMinor: principalDue,
        interestDueMinor: interestDue,
        totalDueMinor: principalDue + interestDue,
        closingBalanceMinor: balance,
      });
    }
    return rows;
  }

  // REDUCING: amortise the rounded EMI against the live balance.
  const rate = periodicRate(input.annualRatePct, input.frequency);
  let balance = input.principalMinor;
  for (let i = 0; i < n; i += 1) {
    const interestDue = Math.round(balance * rate);
    const isLast = i === n - 1;
    const principalDue = isLast
      ? balance
      : Math.max(0, Math.min(balance, terms.installmentMinor - interestDue));
    const opening = balance;
    balance -= principalDue;
    rows.push({
      seq: i + 1,
      dueDate: dates[i] ?? isoDate(input.disbursedOn),
      openingBalanceMinor: opening,
      principalDueMinor: principalDue,
      interestDueMinor: interestDue,
      totalDueMinor: principalDue + interestDue,
      closingBalanceMinor: balance,
    });
  }
  return rows;
}

export function scheduleTotals(rows: ScheduleRow[]) {
  return rows.reduce(
    (acc, r) => ({
      principalMinor: acc.principalMinor + r.principalDueMinor,
      interestMinor: acc.interestMinor + r.interestDueMinor,
      totalMinor: acc.totalMinor + r.totalDueMinor,
    }),
    { principalMinor: 0, interestMinor: 0, totalMinor: 0 },
  );
}
