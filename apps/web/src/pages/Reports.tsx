import { useState } from 'react';
import { t } from '@lms/i18n';
import { Card } from '../components/Card';
import { ReportIcon } from '../components/icons';
import { reports } from '../lib/data';

const RANGES = ['today', 'last7', 'last30', 'monthToDate'] as const;

export function Reports() {
  const [range, setRange] = useState<(typeof RANGES)[number]>('last30');

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
          {RANGES.map((option) => (
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
                  {report.updated} · {t(`reports.ranges.${range}`)}
                </p>
              </div>
            </div>
            <div className="report__actions">
              <button type="button" className="btn btn--sm btn--ghost">
                {t('reports.preview')}
              </button>
              <button type="button" className="btn btn--sm">
                {t('reports.export')}
              </button>
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}
