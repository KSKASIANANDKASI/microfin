/** English copy for the lines screens (web + mobile). */
export const lines = {
  count: { one: '{count} line', other: '{count} lines' },
  accounts: { one: '{count} account', other: '{count} accounts' },
  dueToday: 'Due today {amount}',
  schedule: {
    weekly: 'every {day}',
    monthly: 'on the {ordinal}',
    lastDay: 'on the last day',
  },
  form: {
    subtitle: 'Name the route and set how often it collects',
    name: 'Line name',
    nameHint: 'Shown on collection sheets and receipts.',
    frequency: 'Repayment frequency',
    day: 'Collection day',
    date: 'Collection date',
    dayPlaceholder: 'Select a day',
    datePlaceholder: 'Select a date',
    dayRequired: 'Choose the collection day.',
    dateRequired: 'Choose the collection date.',
    dayHint: 'Every installment on this line falls due on this day.',
    dateHint: 'Dates run 1–28 so every month is valid; pick "{lastDay}" for month-end.',
    officer: 'Field officer',
    officerPlaceholder: 'Select an officer',
    officerHint: 'You can reassign the line at any time.',
    create: 'Create line',
  },
  card: {
    summary: {
      one: '{collected} of {due} collected today — {pct}% across {count} line.',
      other: '{collected} of {due} collected today — {pct}% across {count} lines.',
    },
    barTitle: '{line}: {pct}% collected',
    pctCollected: '{pct}% collected',
    followUp: 'needs a follow-up',
  },
};
