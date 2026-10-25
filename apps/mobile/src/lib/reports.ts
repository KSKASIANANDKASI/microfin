/**
 * The six branch registers, read live from GET /reports/*. Each one is turned
 * into a plain table — the same columns drive the on-screen preview and the
 * CSV export, so the two never disagree.
 */
import { t, type MessageKey } from '@lms/i18n';
import { formatCurrency, formatNumber, paymentModeLabel, reports, type PaymentMode } from './data';
import { formatDate } from './loan';
import { api } from './session';

export type ReportId = (typeof reports)[number]['id'];
export type ReportRange = 'today' | 'last7' | 'last30' | 'monthToDate';
export const REPORT_RANGES: ReportRange[] = ['today', 'last7', 'last30', 'monthToDate'];

/** r1 and r3 are a snapshot of the book as it stands; the rest cover a date range. */
export function isSnapshot(id: ReportId): boolean {
  return id === 'r1' || id === 'r3';
}

type Kind = 'text' | 'date' | 'number' | 'money' | 'percent';
export type ReportCell = string | number | null;
export type ReportColumn = { label: string; kind: Kind };

export type ReportTable = {
  id: ReportId;
  name: string;
  /** Inclusive, as `YYYY-MM-DD`. Absent on snapshot reports. */
  from?: string;
  to?: string;
  columns: ReportColumn[];
  rows: ReportCell[][];
  total?: ReportCell[];
};

function iso(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** The chip's dates, counted back from today in local time. */
export function rangeDates(range: ReportRange, now = new Date()): { from: string; to: string } {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (range === 'last7') start.setDate(start.getDate() - 6);
  if (range === 'last30') start.setDate(start.getDate() - 29);
  if (range === 'monthToDate') start.setDate(1);
  return { from: iso(start), to: iso(now) };
}

type ColumnKey = MessageKey extends infer K ? (K extends `reports.columns.${infer C}` ? C : never) : never;
const col = (key: ColumnKey, kind: Kind): ReportColumn => ({ label: t(`reports.columns.${key}`), kind });
const sum = (rows: ReportCell[][], index: number) => rows.reduce((acc, row) => acc + (Number(row[index]) || 0), 0);

/** A total row that adds up the money and count columns from `first` onwards. */
function totals(columns: ReportColumn[], rows: ReportCell[][], first: number): ReportCell[] {
  return columns.map((column, i) =>
    i === 0 ? t('reports.total') : i >= first && (column.kind === 'money' || column.kind === 'number') ? sum(rows, i) : null,
  );
}

type PortfolioRow = { lineId: string; line: string; officer: string; activeLoans: number; closedLoans: number; disbursed: number; outstanding: number; overdue: number };
type ReceiptRow = { receiptNo: string; paidOn: string; loanNo: string; customer: string; lineId: string; officer: string; seq: number; amount: number; mode: PaymentMode; daysLate: number };
type AgeingRow = { lineId: string; line: string; officer: string; buckets: Record<string, { accounts: number; overdue: number; outstanding: number }> };
type DisbursementRow = { loanNo: string; disbursedOn: string; customer: string; lineId: string; type: 'PRE' | 'POST'; principal: number; fee: number; interestUpfront: number; netDisbursal: number; applicationId: string | null; submittedBy: string | null; approvedOn: string | null; note: string | null };
type PerformanceRow = { lineId: string; line: string; officer: string; due: number; collected: number; efficiency: number; arrears: number; overdueAccounts: number };
type DayBookRow = { date: string; cashIn: number; upiIn: number; disbursedOut: number; net: number; closing: number };

const AGEING_BUCKETS = ['current', '1-30', '31-60', '61-90', '90+'] as const;

/** Fetches one report for the chosen range and lays it out as a table. */
export async function loadReport(id: ReportId, range: ReportRange): Promise<ReportTable> {
  const report = reports.find((r) => r.id === id)!;
  const { from, to } = rangeDates(range);
  const query = `?from=${from}&to=${to}`;
  const base = { id, name: report.name, ...(isSnapshot(id) ? {} : { from, to }) };

  switch (id) {
    case 'r1': {
      const data = await api<PortfolioRow[]>('GET', '/reports/portfolio-summary');
      const columns = [col('line', 'text'), col('officer', 'text'), col('activeLoans', 'number'), col('closedLoans', 'number'), col('disbursed', 'money'), col('outstanding', 'money'), col('overdue', 'money')];
      const rows = data.map((r) => [r.line, r.officer, r.activeLoans, r.closedLoans, r.disbursed, r.outstanding, r.overdue]);
      return { ...base, columns, rows, total: rows.length ? totals(columns, rows, 2) : undefined };
    }
    case 'r2': {
      const data = await api<{ receipts: ReceiptRow[]; total: number }>('GET', `/reports/collection-register${query}`);
      const columns = [col('receipt', 'text'), col('paidOn', 'date'), col('loan', 'text'), col('customer', 'text'), col('lineId', 'text'), col('officer', 'text'), col('installment', 'number'), col('mode', 'text'), col('daysLate', 'number'), col('amount', 'money')];
      const rows = data.receipts.map((r) => [r.receiptNo, r.paidOn, r.loanNo, r.customer, r.lineId, r.officer, r.seq, paymentModeLabel(r.mode), r.daysLate, r.amount]);
      const total = rows.length ? [t('reports.total'), null, null, null, null, null, null, null, null, data.total] : undefined;
      return { ...base, columns, rows, total };
    }
    case 'r3': {
      const data = await api<AgeingRow[]>('GET', '/reports/overdue-ageing');
      const columns = [
        col('line', 'text'),
        col('officer', 'text'),
        ...AGEING_BUCKETS.flatMap((b) => [
          { label: t('reports.columns.bucketAccounts', { bucket: t(`reports.buckets.${b}`) }), kind: 'number' as const },
          { label: t('reports.columns.bucketOutstanding', { bucket: t(`reports.buckets.${b}`) }), kind: 'money' as const },
        ]),
        col('overdue', 'money'),
      ];
      const rows = data.map((r) => [
        r.line,
        r.officer,
        ...AGEING_BUCKETS.flatMap((b) => [r.buckets[b]?.accounts ?? 0, r.buckets[b]?.outstanding ?? 0]),
        AGEING_BUCKETS.reduce((acc, b) => acc + (r.buckets[b]?.overdue ?? 0), 0),
      ]);
      return { ...base, columns, rows, total: rows.length ? totals(columns, rows, 2) : undefined };
    }
    case 'r4': {
      const data = await api<{ loans: DisbursementRow[]; principal: number; netDisbursal: number }>('GET', `/reports/disbursement-register${query}`);
      const columns = [col('loan', 'text'), col('disbursedOn', 'date'), col('customer', 'text'), col('lineId', 'text'), col('loanType', 'text'), col('principal', 'money'), col('fee', 'money'), col('interestUpfront', 'money'), col('netDisbursal', 'money'), col('application', 'text'), col('submittedBy', 'text'), col('approvedOn', 'date'), col('note', 'text')];
      const rows = data.loans.map((r) => [r.loanNo, r.disbursedOn, r.customer, r.lineId, t(`common.loanType.${r.type}.label`), r.principal, r.fee, r.interestUpfront, r.netDisbursal, r.applicationId, r.submittedBy, r.approvedOn, r.note]);
      const total = rows.length ? [t('reports.total'), null, null, null, null, data.principal, sum(rows, 6), sum(rows, 7), data.netDisbursal, null, null, null, null] : undefined;
      return { ...base, columns, rows, total };
    }
    case 'r5': {
      const data = await api<PerformanceRow[]>('GET', `/reports/line-performance${query}`);
      const columns = [col('line', 'text'), col('officer', 'text'), col('due', 'money'), col('collected', 'money'), col('efficiency', 'percent'), col('arrears', 'money'), col('overdueAccounts', 'number')];
      const rows = data.map((r) => [r.line, r.officer, r.due, r.collected, r.efficiency, r.arrears, r.overdueAccounts]);
      const total = rows.length ? totals(columns, rows, 2) : undefined;
      // Efficiency doesn't add up; it is collected over due across every line.
      if (total) total[4] = sum(rows, 2) > 0 ? sum(rows, 3) / sum(rows, 2) : 0;
      return { ...base, columns, rows, total };
    }
    case 'r6': {
      const data = await api<DayBookRow[]>('GET', `/reports/day-book${query}`);
      const columns = [col('date', 'date'), col('cashIn', 'money'), col('upiIn', 'money'), col('disbursedOut', 'money'), col('net', 'money'), col('closing', 'money')];
      const rows = data.map((r) => [r.date, r.cashIn, r.upiIn, r.disbursedOut, r.net, r.closing]);
      const total = rows.length ? [t('reports.total'), sum(rows, 1), sum(rows, 2), sum(rows, 3), sum(rows, 4), rows[rows.length - 1]?.[5] ?? null] : undefined;
      return { ...base, columns, rows, total };
    }
  }
}

/** How a cell reads on screen. */
export function formatCell(column: ReportColumn, value: ReportCell): string {
  if (value === null || value === '') return '—';
  if (typeof value === 'string') return column.kind === 'date' ? formatDate(value) : value;
  if (column.kind === 'money') return value < 0 ? `−${formatCurrency(-value)}` : formatCurrency(value);
  if (column.kind === 'percent') return `${(value * 100).toFixed(1)}%`;
  return formatNumber(value);
}

/** The period line under the report title. */
export function periodLabel(table: ReportTable): string {
  if (!table.from || !table.to) return t('reports.asOfToday');
  if (table.from === table.to) return formatDate(table.from);
  return t('reports.period', { from: formatDate(table.from), to: formatDate(table.to) });
}

/**
 * The table as CSV for a spreadsheet: raw rupees, ISO dates and `38.6%` so the
 * numbers stay numbers, with a BOM so Excel reads the Tamil text as UTF-8.
 */
export function toCsv(table: ReportTable): string {
  const escape = (cell: ReportCell, i: number) => {
    if (cell === null) return '';
    if (typeof cell === 'number') return table.columns[i]?.kind === 'percent' ? `${(cell * 100).toFixed(1)}%` : String(cell);
    return /[",\n\r]/.test(cell) ? `"${cell.replace(/"/g, '""')}"` : cell;
  };
  const lines = [table.columns.map((c) => c.label), ...table.rows, ...(table.total ? [table.total] : [])];
  return `\uFEFF${lines.map((line) => line.map((cell, i) => escape(cell, i)).join(',')).join('\r\n')}\r\n`;
}

/** `collection-register_2026-09-25_2026-10-24.csv` */
export function csvFileName(table: ReportTable): string {
  const path = reports.find((r) => r.id === table.id)!.path;
  return `${path}_${table.from && table.to ? `${table.from}_${table.to}` : rangeDates('today').to}.csv`;
}
