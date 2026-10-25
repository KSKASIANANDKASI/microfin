import { useEffect, useRef, useState } from 'react';
import { t, tp } from '@lms/i18n';
import { Card } from '../components/Card';
import { FormError } from '../components/FormError';
import { ReportIcon } from '../components/icons';
import { reports } from '../lib/data';
import {
  REPORT_RANGES,
  csvFileName,
  formatCell,
  isSnapshot,
  loadReport,
  periodLabel,
  toCsv,
  type ReportColumn,
  type ReportId,
  type ReportRange,
  type ReportTable,
} from '../lib/reports';
import { errorMessage } from '../lib/session';
import { usePortfolio } from '../lib/usePortfolio';

function download(table: ReportTable) {
  const url = URL.createObjectURL(new Blob([toCsv(table)], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = csvFileName(table);
  link.click();
  URL.revokeObjectURL(url);
}

/** Figures line up on the right; names and dates read from the left. */
function align(column?: ReportColumn): string | undefined {
  return !column || column.kind === 'text' || column.kind === 'date' ? undefined : 'num';
}

export function Reports() {
  usePortfolio();
  const [range, setRange] = useState<ReportRange>('last30');
  const [openId, setOpenId] = useState<ReportId>();
  const [table, setTable] = useState<ReportTable>();
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState<ReportId>();
  const [error, setError] = useState<string>();
  const previewRef = useRef<HTMLDivElement>(null);

  // The open preview follows the range chips; a snapshot report ignores them.
  const rangeKey = openId && !isSnapshot(openId) ? range : undefined;
  useEffect(() => {
    if (!openId) return;
    let live = true;
    setLoading(true);
    setError(undefined);
    loadReport(openId, range)
      .then((next) => live && setTable(next))
      .catch((e) => live && setError(errorMessage(e)))
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openId, rangeKey]);

  function preview(id: ReportId) {
    setTable(undefined);
    if (id === openId) {
      setOpenId(undefined);
      return;
    }
    setOpenId(id);
    requestAnimationFrame(() => previewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }

  async function exportCsv(id: ReportId) {
    setExporting(id);
    setError(undefined);
    try {
      // The preview on screen is already the same report and range.
      const shown = table?.id === id && !loading ? table : undefined;
      download(shown ?? (await loadReport(id, range)));
    } catch (e) {
      setError(errorMessage(e));
    }
    setExporting(undefined);
  }

  const open = reports.find((r) => r.id === openId);

  return (
    <>
      <div className="pagehead">
        <div>
          <h1 className="pagehead__title">{t('common.nav.reports')}</h1>
          <p className="pagehead__sub">{t('reports.subtitle')}</p>
        </div>
      </div>

      <div className="filters">
        <div className="chips" role="group" aria-label={t('reports.dateRange')}>
          {REPORT_RANGES.map((option) => (
            <button
              key={option}
              type="button"
              className={`chip${range === option ? ' chip--on' : ''}`}
              aria-pressed={range === option}
              onClick={() => setRange(option)}
            >
              {t(`reports.ranges.${option}`)}
            </button>
          ))}
        </div>
      </div>

      <FormError message={error} />

      {open ? (
        <div ref={previewRef} className="reportview">
          <Card
            title={open.name}
            subtitle={
              table && !loading
                ? `${periodLabel(table)} · ${tp('reports.rowCount', table.rows.length)}`
                : t('reports.loading')
            }
            action={
              <div className="report__actions report__actions--head">
                <button type="button" className="btn btn--sm btn--ghost" onClick={() => preview(open.id)}>
                  {t('reports.hide')}
                </button>
                <button
                  type="button"
                  className="btn btn--sm"
                  disabled={!table || loading || exporting !== undefined}
                  onClick={() => exportCsv(open.id)}
                >
                  {t('reports.export')}
                </button>
              </div>
            }
            padded={false}
          >
            {table && table.rows.length ? (
              <div className={`tablewrap tablewrap--flush${loading ? ' reportview__stale' : ''}`}>
                <table className="dtable dtable--flush">
                  <thead>
                    <tr>
                      {table.columns.map((column) => (
                        <th key={column.label} scope="col" className={align(column)}>
                          {column.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {table.rows.map((row, r) => (
                      <tr key={r}>
                        {row.map((cell, c) => (
                          <td key={c} className={align(table.columns[c])}>
                            {formatCell(table.columns[c]!, cell)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                  {table.total ? (
                    <tfoot>
                      <tr className="dtable__total">
                        {table.total.map((cell, c) => (
                          <td key={c} className={c > 0 ? align(table.columns[c]) : undefined}>
                            {c === 0 || cell !== null ? formatCell(table.columns[c]!, cell) : ''}
                          </td>
                        ))}
                      </tr>
                    </tfoot>
                  ) : null}
                </table>
              </div>
            ) : (
              <p className="empty">{table && !loading ? t('reports.empty') : t('reports.loading')}</p>
            )}
          </Card>
        </div>
      ) : null}

      <div className="grid-2">
        {reports.map((report) => (
          <Card key={report.id}>
            <div className="report">
              <span className="report__icon" aria-hidden>
                <ReportIcon />
              </span>
              <div className="report__body">
                <h2 className="report__name">{report.name}</h2>
                <p className="report__desc">{report.desc}</p>
                <p className="report__meta">
                  {isSnapshot(report.id) ? t('reports.asOfToday') : t(`reports.ranges.${range}`)}
                </p>
              </div>
            </div>
            <div className="report__actions">
              <button
                type="button"
                className="btn btn--sm btn--ghost"
                aria-pressed={report.id === openId}
                onClick={() => preview(report.id)}
              >
                {report.id === openId ? t('reports.hide') : t('reports.preview')}
              </button>
              <button
                type="button"
                className="btn btn--sm"
                disabled={exporting !== undefined}
                onClick={() => exportCsv(report.id)}
              >
                {exporting === report.id ? t('common.actions.pleaseWait') : t('reports.export')}
              </button>
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}
