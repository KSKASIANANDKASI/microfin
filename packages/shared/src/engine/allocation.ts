/**
 * Payment waterfall. A collection is applied to the OLDEST open installment
 * first and, within an installment, in the order penalty -> interest ->
 * principal. Partial payments are first-class: whatever is left simply stops
 * mid-installment and that row becomes PARTIALLY_PAID.
 */

export interface OpenInstallment {
  scheduleId: string;
  seq: number;
  dueDate: string;
  penaltyOutstandingMinor: number;
  interestOutstandingMinor: number;
  principalOutstandingMinor: number;
}

export interface Allocation {
  scheduleId: string;
  seq: number;
  penaltyMinor: number;
  interestMinor: number;
  principalMinor: number;
  get totalMinor(): number;
}

export interface AllocationResult {
  allocations: Allocation[];
  penaltyMinor: number;
  interestMinor: number;
  principalMinor: number;
  appliedMinor: number;
  /** Money left over after every open installment is settled (overpayment). */
  unappliedMinor: number;
}

function alloc(
  scheduleId: string,
  seq: number,
  penaltyMinor: number,
  interestMinor: number,
  principalMinor: number,
): Allocation {
  return {
    scheduleId,
    seq,
    penaltyMinor,
    interestMinor,
    principalMinor,
    get totalMinor() {
      return this.penaltyMinor + this.interestMinor + this.principalMinor;
    },
  };
}

export function allocatePayment(
  amountMinor: number,
  installments: OpenInstallment[],
): AllocationResult {
  let remaining = Math.max(0, Math.round(amountMinor));
  const allocations: Allocation[] = [];
  let penalty = 0;
  let interest = 0;
  let principal = 0;

  const ordered = [...installments].sort(
    (a, b) => a.dueDate.localeCompare(b.dueDate) || a.seq - b.seq,
  );

  for (const inst of ordered) {
    if (remaining <= 0) break;
    const p = Math.min(remaining, Math.max(0, inst.penaltyOutstandingMinor));
    remaining -= p;
    const i = Math.min(remaining, Math.max(0, inst.interestOutstandingMinor));
    remaining -= i;
    const pr = Math.min(remaining, Math.max(0, inst.principalOutstandingMinor));
    remaining -= pr;
    if (p + i + pr === 0) continue;
    allocations.push(alloc(inst.scheduleId, inst.seq, p, i, pr));
    penalty += p;
    interest += i;
    principal += pr;
  }

  return {
    allocations,
    penaltyMinor: penalty,
    interestMinor: interest,
    principalMinor: principal,
    appliedMinor: penalty + interest + principal,
    unappliedMinor: remaining,
  };
}
