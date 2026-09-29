import { useId, useState } from 'react';
import { t } from '@lms/i18n';
import { chart } from '@lms/theme';
import { collectionsWeek, dailyTarget, formatCurrency } from '../lib/data';

const WIDTH = 640;
const PLOT_HEIGHT = 190;
const AXIS_BAND = 26;
const PAD_LEFT = 50;
const PAD_RIGHT = 12;
const PAD_TOP = 14;
const BAR_GAP = 2;
const CAP = 4;

const max = Math.max(...collectionsWeek.map((d) => d.amount), dailyTarget) * 1.12;
const plotWidth = WIDTH - PAD_LEFT - PAD_RIGHT;
const slot = plotWidth / collectionsWeek.length;
const barWidth = Math.min(40, slot - BAR_GAP * 2);
const yOf = (value: number) => PAD_TOP + (1 - value / max) * (PLOT_HEIGHT - PAD_TOP);
const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * max);

/** A bar with a rounded top and a square base, anchored to the baseline. */
function barPath(x: number, y: number, w: number, h: number) {
  const r = Math.min(CAP, h);
  return `M${x} ${y + h}V${y + r}a${r} ${r} 0 0 1 ${r} ${-r}h${w - r * 2}a${r} ${r} 0 0 1 ${r} ${r}V${y + h}Z`;
}

export function CollectionsChart() {
  const [active, setActive] = useState<number | null>(null);
  const [view, setView] = useState<'chart' | 'table'>('chart');
  const titleId = useId();
  const peak = collectionsWeek.reduce((a, b) => (b.amount > a.amount ? b : a));

  if (view === 'table') {
    return (
      <>
        <ViewToggle view={view} onChange={setView} />
        <table className="dtable">
          <caption className="sr-only">{t('dashboard.chart.caption')}</caption>
          <thead>
            <tr>
              <th scope="col">{t('dashboard.chart.day')}</th>
              <th scope="col">{t('dashboard.chart.collected')}</th>
              <th scope="col">{t('dashboard.chart.vsTarget')}</th>
            </tr>
          </thead>
          <tbody>
            {collectionsWeek.map((d) => (
              <tr key={d.day}>
                <th scope="row">{d.label}</th>
                <td className="num">{formatCurrency(d.amount)}</td>
                <td className="num">
                  {d.amount >= dailyTarget ? '+' : '−'}
                  {formatCurrency(Math.abs(d.amount - dailyTarget))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </>
    );
  }

  return (
    <>
      <ViewToggle view={view} onChange={setView} />

      <div className="chart">
        <svg
          viewBox={`0 0 ${WIDTH} ${PLOT_HEIGHT + AXIS_BAND}`}
          className="chart__svg"
          role="img"
          aria-labelledby={titleId}
        >
          <title id={titleId}>
            {t('dashboard.chart.summary', { day: peak.label, amount: formatCurrency(peak.amount) })}
          </title>

          {ticks.map((tick) => (
            <g key={tick}>
              <line
                x1={PAD_LEFT}
                x2={WIDTH - PAD_RIGHT}
                y1={yOf(tick)}
                y2={yOf(tick)}
                stroke={tick === 0 ? chart.axis : chart.gridline}
                strokeWidth={1}
              />
              <text x={PAD_LEFT - 10} y={yOf(tick) + 4} className="chart__tick" textAnchor="end">
                {tick === 0 ? '0' : formatCurrency(tick, true)}
              </text>
            </g>
          ))}

          {/* Daily target — a solid reference rule, one shade above the grid. */}
          <line
            x1={PAD_LEFT}
            x2={WIDTH - PAD_RIGHT}
            y1={yOf(dailyTarget)}
            y2={yOf(dailyTarget)}
            stroke={chart.reference}
            strokeWidth={1.5}
          />
          <text
            x={WIDTH - PAD_RIGHT}
            y={yOf(dailyTarget) - 6}
            className="chart__reference"
            textAnchor="end"
          >
            {t('dashboard.chart.target', { amount: formatCurrency(dailyTarget, true) })}
          </text>

          {collectionsWeek.map((d, i) => {
            const x = PAD_LEFT + i * slot + (slot - barWidth) / 2;
            const y = yOf(d.amount);
            const h = yOf(0) - y;
            const isActive = active === i;

            return (
              <g key={d.day}>
                <path
                  d={barPath(x, y, barWidth, h)}
                  fill={isActive ? chart.seriesHover : chart.series}
                />
                {d === peak ? (
                  <text x={x + barWidth / 2} y={y - 8} className="chart__label" textAnchor="middle">
                    {formatCurrency(d.amount, true)}
                  </text>
                ) : null}
                <text
                  x={x + barWidth / 2}
                  y={PLOT_HEIGHT + 18}
                  className="chart__tick"
                  textAnchor="middle"
                >
                  {d.day}
                </text>

                {/* Full-height hit target: the pointer never has to find the bar. */}
                <rect
                  x={PAD_LEFT + i * slot}
                  y={0}
                  width={slot}
                  height={PLOT_HEIGHT + AXIS_BAND}
                  fill="transparent"
                  tabIndex={0}
                  role="button"
                  aria-label={`${d.label}: ${formatCurrency(d.amount)}`}
                  onMouseEnter={() => setActive(i)}
                  onMouseLeave={() => setActive((c) => (c === i ? null : c))}
                  onFocus={() => setActive(i)}
                  onBlur={() => setActive((c) => (c === i ? null : c))}
                />
              </g>
            );
          })}
        </svg>

        {active !== null ? (
          <div
            className="tooltip"
            style={{ left: `${((PAD_LEFT + active * slot + slot / 2) / WIDTH) * 100}%` }}
            role="status"
          >
            <b>{collectionsWeek[active]!.label}</b>
            <span>{formatCurrency(collectionsWeek[active]!.amount)}</span>
            <span className="tooltip__meta">
              {t(
                collectionsWeek[active]!.amount >= dailyTarget
                  ? 'dashboard.chart.aboveTarget'
                  : 'dashboard.chart.belowTarget',
                {
                  amount: formatCurrency(
                    Math.abs(collectionsWeek[active]!.amount - dailyTarget),
                    true,
                  ),
                },
              )}
            </span>
          </div>
        ) : null}
      </div>
    </>
  );
}

function ViewToggle({
  view,
  onChange,
}: {
  view: 'chart' | 'table';
  onChange: (next: 'chart' | 'table') => void;
}) {
  return (
    <div className="segmented" role="group" aria-label={t('dashboard.chart.viewToggle')}>
      {(['chart', 'table'] as const).map((option) => (
        <button
          key={option}
          type="button"
          className={`segmented__btn${view === option ? ' segmented__btn--on' : ''}`}
          aria-pressed={view === option}
          onClick={() => onChange(option)}
        >
          {t(option === 'chart' ? 'dashboard.chart.chart' : 'dashboard.chart.table')}
        </button>
      ))}
    </div>
  );
}
