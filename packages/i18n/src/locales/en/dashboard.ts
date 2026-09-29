/** English copy for the dashboard screens (web + mobile). */
export const dashboard = {
  greeting: 'Good morning, {name}',
  collections: {
    title: 'Collections — last 7 days',
    subtitle: 'Against a daily target of {amount}',
  },
  arrears: {
    title: 'Arrears by age',
    subtitle: 'Overdue principal, compared across aging buckets',
    /** `{amount}` is rendered bold, so it stays a literal placeholder. */
    current: {
      one: '{amount} current — {percent}% of the portfolio across {count} account.',
      other: '{amount} current — {percent}% of the portfolio across {count} accounts.',
    },
    accounts: {
      one: '{count} account',
      other: '{count} accounts',
    },
  },
  lines: {
    title: "Today's collection by line",
    subtitle: 'Collected against the amount due on each line',
    manage: 'Manage lines',
  },
  sheet: {
    title: "Today's collection sheet",
    subtitle: '{collected} of {total} collected',
    open: 'Open collection',
    opensLoan: 'Opens the loan',
  },
  chart: {
    chart: 'Chart',
    table: 'Table',
    viewToggle: 'Chart or table view',
    caption: 'Collections by day, last 7 days',
    day: 'Day',
    collected: 'Collected',
    vsTarget: 'vs target',
    summary: 'Collections for the last seven days. Peak {day} at {amount}.',
    target: 'Target {amount}',
    aboveTarget: 'Above target by {amount}',
    belowTarget: 'Below target by {amount}',
    readoutIdle: 'Target {amount} a day · tap a bar for detail',
    readoutAbove: '{day} — {amount} (above target by {diff})',
    readoutBelow: '{day} — {amount} (below target by {diff})',
  },
};
