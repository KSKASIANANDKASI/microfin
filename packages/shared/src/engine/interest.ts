import { roundTo } from '../money';
import type { FeeType, InterestMethod, RepaymentFrequency } from '../types/domain';
import { PERIODS_PER_YEAR } from './dates';

export interface TermsInput {
  principalMinor: number;
  /** Nominal annual rate in percent, e.g. 24 for 24% p.a. */
  annualRatePct: number;
  interestMethod: InterestMethod;
  frequency: RepaymentFrequency;
  installmentCount: number;
  processingFeeType?: FeeType;
  /** Percent when PERCENT_OF_PRINCIPAL, minor units when FLAT_AMOUNT. */
  processingFeeValue?: number;
  deductFeeFromDisbursal?: boolean;
  /** Round each installment to the nearest N minor units (e.g. 100 = whole ₹). */
  roundingMinor?: number;
}

export interface Terms {
  installmentMinor: number;
  totalInterestMinor: number;
  totalPayableMinor: number;
  processingFeeMinor: number;
  netDisbursalMinor: number;
  periodicRate: number;
  /** Effective per-period rate expressed back as an annual percentage. */
  annualRatePct: number;
}

export function periodicRate(annualRatePct: number, frequency: RepaymentFrequency): number {
  return annualRatePct / 100 / PERIODS_PER_YEAR[frequency];
}

export function processingFee(input: TermsInput): number {
  const type = input.processingFeeType ?? 'PERCENT_OF_PRINCIPAL';
  const value = input.processingFeeValue ?? 0;
  if (type === 'FLAT_AMOUNT') return Math.round(value);
  return Math.round((input.principalMinor * value) / 100);
}

/**
 * EMI for the reducing-balance method.
 *   EMI = P·i·(1+i)^n / ((1+i)^n − 1),  and P/n when i = 0.
 */
export function reducingInstallment(
  principalMinor: number,
  rate: number,
  n: number,
): number {
  if (rate === 0) return principalMinor / n;
  const factor = Math.pow(1 + rate, n);
  return (principalMinor * rate * factor) / (factor - 1);
}

/** Price a loan: installment size, total interest, fee and net disbursal. */
export function computeTerms(input: TermsInput): Terms {
  const { principalMinor, installmentCount: n, frequency, interestMethod } = input;
  if (n <= 0) throw new Error('installmentCount must be positive');
  if (principalMinor <= 0) throw new Error('principal must be positive');

  const rate = periodicRate(input.annualRatePct, frequency);
  const rounding = input.roundingMinor ?? 1;

  let installmentMinor: number;
  let totalPayableMinor: number;

  if (interestMethod === 'FLAT') {
    // Interest accrues on the ORIGINAL principal for the whole tenor.
    const years = n / PERIODS_PER_YEAR[frequency];
    const totalInterest = Math.round((principalMinor * input.annualRatePct * years) / 100);
    totalPayableMinor = principalMinor + totalInterest;
    installmentMinor = roundTo(totalPayableMinor / n, rounding);
  } else {
    installmentMinor = roundTo(reducingInstallment(principalMinor, rate, n), rounding);
    // Amortise with the rounded installment so the quoted total matches the
    // schedule the customer will actually be handed.
    let balance = principalMinor;
    let interestSum = 0;
    for (let i = 1; i <= n; i += 1) {
      const interest = Math.round(balance * rate);
      const principalPart =
        i === n ? balance : Math.min(balance, installmentMinor - interest);
      interestSum += interest;
      balance -= principalPart;
    }
    totalPayableMinor = principalMinor + interestSum;
  }

  const totalInterestMinor = totalPayableMinor - principalMinor;
  const processingFeeMinor = processingFee(input);
  const netDisbursalMinor =
    (input.deductFeeFromDisbursal ?? true)
      ? principalMinor - processingFeeMinor
      : principalMinor;

  return {
    installmentMinor,
    totalInterestMinor,
    totalPayableMinor,
    processingFeeMinor,
    netDisbursalMinor,
    periodicRate: rate,
    annualRatePct: input.annualRatePct,
  };
}
