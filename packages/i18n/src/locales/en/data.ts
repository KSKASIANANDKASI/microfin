/**
 * Copy carried by the placeholder portfolio in `lib/data.ts`. Goes away with
 * the sample data once the API serves real records.
 */
export const data = {
  user: {
    role: 'Branch Manager',
    branch: 'Chennai — Anna Nagar',
  },
  kpis: {
    outstanding: 'Portfolio outstanding',
    collected: 'Collected today',
    overdue: 'Overdue amount',
    loans: 'Active loans',
    vsLastMonth: 'vs last month',
    vsYesterday: 'vs yesterday',
    vsLastWeek: 'vs last week',
  },
  arrears: {
    current: 'Current',
    overdue1to30: 'Overdue 1–30 days',
    overdue30plus: 'Overdue 30+ days',
  },
  notifications: {
    n1: { title: 'Collection sheet submitted', body: 'Line 04 · Velachery — 18 of 21 collected.', at: '9 min ago' },
    n2: { title: 'Loan approved', body: 'LN-20512 · Revathi Murugan — ₹45,000 sanctioned.', at: '1 hr ago' },
    n3: { title: 'Arrears alert', body: '2 accounts crossed 30 days in Line 01.', at: '3 hr ago' },
    n4: { title: 'Day-end sync complete', body: 'All field devices reconciled.', at: 'Yesterday' },
  },
  reports: {
    r1: {
      name: 'Portfolio summary',
      desc: 'Outstanding, disbursed and closed loans by product and line.',
      updated: 'Updated 10 min ago',
    },
    r2: {
      name: 'Collection register',
      desc: 'Installment-level receipts for any date range, by line or officer.',
      updated: 'Updated today',
    },
    r3: {
      name: 'Overdue ageing',
      desc: 'Ageing buckets at 30 / 60 / 90 days, by line and by officer.',
      updated: 'Updated today',
    },
    r4: {
      name: 'Disbursement register',
      desc: 'Every sanction and payout with approval trail.',
      updated: 'Updated 2 hr ago',
    },
    r5: {
      name: 'Line performance',
      desc: 'Collection efficiency and arrears per line and officer.',
      updated: 'Updated yesterday',
    },
    r6: {
      name: 'Day book',
      desc: 'Cash in, cash out and closing balance per branch day.',
      updated: 'Updated 10 min ago',
    },
  },
};
