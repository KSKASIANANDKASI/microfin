/**
 * Portfolio analytics for the Insights screen and the AI assistant: collection
 * efficiency, portfolio-at-risk and a per-loan risk score. Everything is
 * derived from the loan book, so it moves as payments are receipted.
 *
 * The risk score is a transparent rule-based score, not a trained model: each
 * factor carries fixed points and is reported back, so an officer can see why
 * a borrower is flagged and the assistant can explain it.
 */

import {
  arrears,
  collectionsWeek,
  dailyTarget,
  lineById,
  lines,
  loanBook,
  type LoanBookEntry,
} from './data';

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

const ratio = (part: number, whole: number) => (whole > 0 ? part / whole : 0);

export function collectionEfficiency(): CollectionEfficiency {
  const byLine = lines
    .map((line) => ({
      lineId: line.id,
      name: line.name,
      officer: line.officer,
      due: line.due,
      collected: line.collected,
      efficiency: ratio(line.collected, line.due),
    }))
    .sort((a, b) => a.efficiency - b.efficiency);

  const officers = new Map<string, OfficerEfficiency>();
  for (const line of byLine) {
    const row = officers.get(line.officer) ?? { officer: line.officer, lines: 0, due: 0, collected: 0, efficiency: 0 };
    row.lines += 1;
    row.due += line.due;
    row.collected += line.collected;
    officers.set(line.officer, row);
  }
  const byOfficer = [...officers.values()]
    .map((row) => ({ ...row, efficiency: ratio(row.collected, row.due) }))
    .sort((a, b) => a.efficiency - b.efficiency);

  const due = byLine.reduce((sum, l) => sum + l.due, 0);
  const collected = byLine.reduce((sum, l) => sum + l.collected, 0);

  const weekCollected = collectionsWeek.reduce((sum, d) => sum + d.amount, 0);
  const weekTarget = dailyTarget * collectionsWeek.length;

  const lateness = loanBook().flatMap((entry) => entry.loan.repayments);
  const onTime = lateness.filter((days) => days === 0).length;

  return {
    today: { due, collected, efficiency: ratio(collected, due) },
    byLine,
    byOfficer,
    week: {
      collected: weekCollected,
      target: weekTarget,
      efficiency: ratio(weekCollected, weekTarget),
      days: collectionsWeek.length,
    },
    onTimeRate: ratio(onTime, lateness.length),
    avgDaysLate: ratio(
      lateness.reduce((sum, days) => sum + days, 0),
      lateness.length,
    ),
  };
}

// ------------------------------------------------------------------ risk

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

const mean = (values: number[]) => ratio(values.reduce((sum, v) => sum + v, 0), values.length);

/**
 * Points per factor (max 100):
 * - current arrears — days the oldest unpaid installment is late, capped at 30 → 40 pts
 * - late history    — share of past installments paid late → 25 pts
 * - deep lateness   — mean days late when paid, capped at 15 → 15 pts
 * - worsening       — last three payments later than the ones before, by up to 10 days → 10 pts
 * - early in term   — little of the loan repaid yet, so most exposure is still out → 10 pts
 */
export function scoreLoan(entry: LoanBookEntry): LoanRisk {
  const { loan, customer, summary, overdueAmount } = entry;
  const history = loan.repayments;
  const installmentsTotal = summary.schedule.length;

  const arrearsPts = (Math.min(summary.daysLate, 30) / 30) * 40;
  const lateSharePts = ratio(history.filter((d) => d > 0).length, history.length) * 25;
  const depthPts = (Math.min(mean(history), 15) / 15) * 15;
  const recent = history.slice(-3);
  const earlier = history.slice(0, -3);
  const drift = earlier.length ? mean(recent) - mean(earlier) : 0;
  const trendPts = (Math.min(Math.max(drift, 0), 10) / 10) * 10;
  const exposurePts = ratio(summary.outstanding, summary.totalPayable) * 10;

  const factors: RiskFactor[] = [];
  if (arrearsPts >= 10) factors.push('currentArrears');
  if (lateSharePts >= 12.5) factors.push('lateHistory');
  if (depthPts >= 7) factors.push('deepLateness');
  if (trendPts >= 3) factors.push('worsening');
  if (exposurePts >= 7) factors.push('earlyInTerm');

  const score = Math.round(arrearsPts + lateSharePts + depthPts + trendPts + exposurePts);

  return {
    loanId: loan.id,
    customerId: loan.customerId,
    customer: customer?.name ?? loan.customerId,
    lineId: loan.lineId,
    line: lineById(loan.lineId)?.name ?? loan.lineId,
    outstanding: summary.outstanding,
    overdueAmount,
    daysLate: summary.daysLate,
    installmentsPaid: history.length,
    installmentsTotal,
    score,
    band: score >= 60 ? 'high' : score >= 30 ? 'medium' : 'low',
    factors,
  };
}

export type RiskAnalysis = {
  /** Open loans only, riskiest first. */
  loans: LoanRisk[];
  outstanding: number;
  /** Outstanding on loans with any installment overdue, as a share of all outstanding. */
  par1: number;
  /** Same, for loans more than 30 days late. */
  par30: number;
  bands: Record<RiskBand, { loans: number; outstanding: number }>;
  /** Branch-wide aging from the ledger — covers accounts beyond the sample loan book. */
  aging: { bucket: string; accounts: number; amount: number }[];
};

export function riskAnalysis(): RiskAnalysis {
  const open = loanBook().filter((entry) => entry.summary.state !== 'closed');
  const scored = open.map(scoreLoan).sort((a, b) => b.score - a.score);

  const outstanding = scored.reduce((sum, l) => sum + l.outstanding, 0);
  const atRisk = (minDays: number) =>
    scored.filter((l) => l.daysLate > minDays).reduce((sum, l) => sum + l.outstanding, 0);

  const bands: RiskAnalysis['bands'] = {
    low: { loans: 0, outstanding: 0 },
    medium: { loans: 0, outstanding: 0 },
    high: { loans: 0, outstanding: 0 },
  };
  for (const loan of scored) {
    bands[loan.band].loans += 1;
    bands[loan.band].outstanding += loan.outstanding;
  }

  return {
    loans: scored,
    outstanding,
    par1: ratio(atRisk(0), outstanding),
    par30: ratio(atRisk(30), outstanding),
    bands,
    aging: arrears.map((a) => ({ bucket: a.bucket, accounts: a.accounts, amount: a.amount })),
  };
}

// -------------------------------------------------------------- snapshot

/**
 * What the assistant is allowed to see: figures and names, never phone
 * numbers, addresses or ID proofs. Amounts are whole rupees.
 */
export function portfolioSnapshot() {
  const efficiency = collectionEfficiency();
  const risk = riskAnalysis();
  const pct = (value: number) => Math.round(value * 1000) / 10;

  return {
    asOf: new Date().toISOString().slice(0, 10),
    currency: 'INR',
    collectionEfficiency: {
      todayPct: pct(efficiency.today.efficiency),
      todayDue: efficiency.today.due,
      todayCollected: efficiency.today.collected,
      last7Days: {
        collected: efficiency.week.collected,
        target: efficiency.week.target,
        pctOfTarget: pct(efficiency.week.efficiency),
        daily: collectionsWeek.map((d) => ({ day: d.label, amount: d.amount })),
      },
      onTimeRatePct: pct(efficiency.onTimeRate),
      avgDaysLate: Math.round(efficiency.avgDaysLate * 10) / 10,
      byLine: efficiency.byLine.map((l) => ({ ...l, efficiency: undefined, pct: pct(l.efficiency) })),
      byOfficer: efficiency.byOfficer.map((o) => ({ ...o, efficiency: undefined, pct: pct(o.efficiency) })),
    },
    risk: {
      outstanding: risk.outstanding,
      par1Pct: pct(risk.par1),
      par30Pct: pct(risk.par30),
      bands: risk.bands,
      branchAging: risk.aging,
      scoringMethod:
        'Rule-based 0-100: current arrears (40), share of installments paid late (25), mean days late (15), worsening trend over last 3 payments (10), share of loan still outstanding (10). High >= 60, medium >= 30.',
      loans: risk.loans,
    },
  };
}

export type PortfolioSnapshot = ReturnType<typeof portfolioSnapshot>;
