/** Domain enums mirrored from the Prisma schema so web/mobile need no DB dep. */

export const ROLES = ['ADMIN', 'MANAGER', 'LOAN_OFFICER'] as const;
export type Role = (typeof ROLES)[number];

export const FREQUENCIES = ['DAILY', 'WEEKLY', 'FORTNIGHTLY', 'MONTHLY'] as const;
export type RepaymentFrequency = (typeof FREQUENCIES)[number];

export const INTEREST_METHODS = ['FLAT', 'REDUCING'] as const;
export type InterestMethod = (typeof INTEREST_METHODS)[number];

export const FEE_TYPES = ['PERCENT_OF_PRINCIPAL', 'FLAT_AMOUNT'] as const;
export type FeeType = (typeof FEE_TYPES)[number];

export const PENALTY_BASES = [
  'PERCENT_OF_OVERDUE_INSTALLMENT',
  'PERCENT_OF_OVERDUE_PER_DAY',
  'FLAT_PER_DAY',
] as const;
export type PenaltyBasis = (typeof PENALTY_BASES)[number];

export const LOAN_STATUSES = [
  'DRAFT',
  'SUBMITTED',
  'UNDER_REVIEW',
  'APPROVED',
  'REJECTED',
  'DISBURSED',
  'CLOSED',
  'WRITTEN_OFF',
] as const;
export type LoanStatus = (typeof LOAN_STATUSES)[number];

export const INSTALLMENT_STATUSES = [
  'PENDING',
  'PARTIALLY_PAID',
  'PAID',
  'OVERDUE',
  'WAIVED',
] as const;
export type InstallmentStatus = (typeof INSTALLMENT_STATUSES)[number];

export type TxnChannel = 'CASH' | 'UPI' | 'BANK_TRANSFER' | 'CHEQUE' | 'SYSTEM';

/** Legal transitions of the loan application lifecycle. */
export const LOAN_TRANSITIONS: Record<LoanStatus, LoanStatus[]> = {
  DRAFT: ['SUBMITTED'],
  SUBMITTED: ['UNDER_REVIEW', 'REJECTED'],
  UNDER_REVIEW: ['APPROVED', 'REJECTED'],
  APPROVED: ['DISBURSED', 'REJECTED'],
  REJECTED: [],
  DISBURSED: ['CLOSED', 'WRITTEN_OFF'],
  CLOSED: [],
  WRITTEN_OFF: [],
};

export function canTransition(from: LoanStatus, to: LoanStatus): boolean {
  return LOAN_TRANSITIONS[from].includes(to);
}

/** Who may drive which transition. */
export const TRANSITION_ROLES: Partial<Record<LoanStatus, Role[]>> = {
  SUBMITTED: ['LOAN_OFFICER', 'MANAGER', 'ADMIN'],
  UNDER_REVIEW: ['MANAGER', 'ADMIN'],
  APPROVED: ['MANAGER', 'ADMIN'],
  REJECTED: ['MANAGER', 'ADMIN'],
  DISBURSED: ['MANAGER', 'ADMIN'],
  WRITTEN_OFF: ['ADMIN'],
};
