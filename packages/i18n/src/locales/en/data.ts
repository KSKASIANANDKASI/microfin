/**
 * Copy carried by the placeholder portfolio in `lib/data.ts`. Goes away with
 * the sample data once the API serves real records.
 */
export const data = {
  user: {
    role: 'Branch Manager',
    branch: 'Chennai — Anna Nagar',
    roles: {
      ADMIN: 'Administrator',
      MANAGER: 'Branch Manager',
      LOAN_OFFICER: 'Loan Officer',
    },
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
    approvals: { title: 'Applications awaiting approval', body: '{count} waiting for a manager’s decision.' },
    arrears: { title: 'Arrears alert', body: '{count} accounts are more than 30 days late, {amount} outstanding.' },
    sheet: { title: 'Today’s collection sheet', body: '{collected} of {total} installments collected.' },
  },
  reports: {
    r1: {
      name: 'Portfolio summary',
      desc: 'Outstanding, disbursed and closed loans by product and line.',
    },
    r2: {
      name: 'Collection register',
      desc: 'Installment-level receipts for any date range, by line or officer.',
    },
    r3: {
      name: 'Overdue ageing',
      desc: 'Ageing buckets at 30 / 60 / 90 days, by line and by officer.',
    },
    r4: {
      name: 'Disbursement register',
      desc: 'Every sanction and payout with approval trail.',
    },
    r5: {
      name: 'Line performance',
      desc: 'Collection efficiency and arrears per line and officer.',
    },
    r6: {
      name: 'Day book',
      desc: 'Cash in, cash out and closing balance per branch day.',
    },
  },
};
