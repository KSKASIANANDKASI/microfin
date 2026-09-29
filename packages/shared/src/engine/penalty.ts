import type { PenaltyBasis } from '../types/domain';
import { daysBetween } from './dates';

export interface PenaltyInput {
  basis: PenaltyBasis;
  /** Percent, or minor units for FLAT_PER_DAY. */
  value: number;
  gracePeriodDays: number;
  dueDate: Date;
  asOf: Date;
  /** Installment amount still unpaid. */
  overdueMinor: number;
  capMinor?: number | null;
}

/**
 * Penalty owed on one installment as of `asOf`. Returns 0 while the
 * installment is inside the product's grace period or already settled.
 */
export function computePenalty(input: PenaltyInput): number {
  if (input.overdueMinor <= 0) return 0;
  const lateDays = daysBetween(input.dueDate, input.asOf) - input.gracePeriodDays;
  if (lateDays <= 0) return 0;

  let penalty = 0;
  switch (input.basis) {
    case 'PERCENT_OF_OVERDUE_INSTALLMENT':
      penalty = (input.overdueMinor * input.value) / 100;
      break;
    case 'PERCENT_OF_OVERDUE_PER_DAY':
      penalty = (input.overdueMinor * input.value * lateDays) / 100;
      break;
    case 'FLAT_PER_DAY':
      penalty = input.value * lateDays;
      break;
  }
  penalty = Math.round(penalty);
  if (input.capMinor != null && input.capMinor > 0) penalty = Math.min(penalty, input.capMinor);
  return penalty;
}
