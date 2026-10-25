/**
 * Portfolio analytics for the Insights screen: collection efficiency,
 * portfolio-at-risk and a per-loan risk score, as GET /insights computes them
 * from the ledger. `loadPortfolio` fetches them with the rest of the book, so
 * they move as payments are receipted.
 *
 * The risk score is a transparent rule-based score, not a trained model: each
 * factor carries fixed points and is reported back, so an officer can see why
 * a borrower is flagged and the assistant can explain it.
 */

import { t } from '@lms/i18n';
import { insights, type ArrearsBucketId } from './data';

// ------------------------------------------------------------ efficiency

export type LineEfficiency = {
  lineId: string;
  name: string;
  officer: string;
  due: number;
  collected: number;
  /** collected / due, 0–1. */
  efficiency: number;
};

export type OfficerEfficiency = {
  officer: string;
  lines: number;
  due: number;
  collected: number;
  efficiency: number;
};

export type CollectionEfficiency = {
  today: { due: number; collected: number; efficiency: number };
  byLine: LineEfficiency[];
  byOfficer: OfficerEfficiency[];
  week: { collected: number; target: number; efficiency: number; days: number };
  /** Share of installments ever collected that came in on their due date. */
  onTimeRate: number;
  /** Mean days late across every collected installment. */
  avgDaysLate: number;
};

export type RiskBand = 'low' | 'medium' | 'high';

/** Why a loan scored what it did. Keys match `insights.risk.factors.*`. */
export type RiskFactor = 'currentArrears' | 'lateHistory' | 'deepLateness' | 'worsening' | 'earlyInTerm';

export type LoanRisk = {
  loanId: string;
  customerId: string;
  customer: string;
  lineId: string;
  line: string;
  outstanding: number;
  overdueAmount: number;
  daysLate: number;
  installmentsPaid: number;
  installmentsTotal: number;
  /** 0–100; higher is riskier. */
  score: number;
  band: RiskBand;
  factors: RiskFactor[];
};

export type RiskAnalysis = {
  /** Open loans only, riskiest first. */
  loans: LoanRisk[];
  outstanding: number;
  /** Outstanding on loans with any installment overdue, as a share of all outstanding. */
  par1: number;
  /** Same, for loans more than 30 days late. */
  par30: number;
  bands: Record<RiskBand, { loans: number; outstanding: number }>;
  /** Branch-wide aging from the ledger. */
  aging: { bucket: string; accounts: number; amount: number }[];
};

/** GET /insights, as the API sends it. */
export type InsightsView = {
  efficiency: CollectionEfficiency;
  risk: Omit<RiskAnalysis, 'aging'> & { aging: { bucket: ArrearsBucketId; accounts: number; amount: number }[] };
};

const EMPTY_EFFICIENCY: CollectionEfficiency = {
  today: { due: 0, collected: 0, efficiency: 0 },
  byLine: [],
  byOfficer: [],
  week: { collected: 0, target: 0, efficiency: 0, days: 0 },
  onTimeRate: 0,
  avgDaysLate: 0,
};

export function collectionEfficiency(): CollectionEfficiency {
  return insights?.efficiency ?? EMPTY_EFFICIENCY;
}

export function riskAnalysis(): RiskAnalysis {
  const risk = insights?.risk;
  if (!risk) {
    const none = { loans: 0, outstanding: 0 };
    return { loans: [], outstanding: 0, par1: 0, par30: 0, bands: { low: none, medium: none, high: none }, aging: [] };
  }
  return {
    ...risk,
    aging: risk.aging.map((row) => ({ ...row, bucket: t(`data.arrears.${row.bucket}`) })),
  };
}
