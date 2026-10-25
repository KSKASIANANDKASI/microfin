import { t, tp } from '@lms/i18n';
import { chart } from '@lms/theme';
import { formatCurrency, formatNumber, lines, officerLabel } from '../lib/data';

/**
 * Today's collection per line. One measure, one colour — the fill is the amount
 * collected, the track is the amount due, so shortfall reads as the gap.
 */
export function LinesCard() {
  const dueMax = Math.max(1, ...lines.map((l) => l.due));
  const due = lines.reduce((sum, l) => sum + l.due, 0);
  const collected = lines.reduce((sum, l) => sum + l.collected, 0);
  // Split on the collected amount so it can be bold wherever the language puts it.
  const [before = '', after = ''] = tp('lines.card.summary', lines.length, {
    due: formatCurrency(due),
    pct: due ? Math.round((collected / due) * 100) : 0,
  }).split('{collected}');

  return (
    <>
      <p className="lines__context">
        {before}
        <b>{formatCurrency(collected)}</b>
        {after}
      </p>

      <ul className="lines">
        {lines.map((line) => {
          const pct = Math.round((line.collected / line.due) * 100);
          const short = pct < 80;

          return (
            <li className="lines__row" key={line.id}>
              <div className="lines__head">
                <span className="lines__name">
                  {line.name}
                  <span className="lines__officer">{officerLabel(line.officer)}</span>
                </span>
                <span className="lines__value">
                  {formatCurrency(line.collected)}
                  <span className="lines__of"> / {formatCurrency(line.due)}</span>
                </span>
              </div>

              <div
                className="lines__track"
                style={{ width: `${(line.due / dueMax) * 100}%` }}
                title={t('lines.card.barTitle', { line: line.name, pct })}
              >
                <span className="lines__bar" style={{ width: `${pct}%` }} />
              </div>

              <span className="lines__meta">
                <span
                  className="statusdot"
                  style={{ background: short ? chart.status.warning : chart.status.good }}
                  aria-hidden
                />
                {t('lines.card.pctCollected', { pct })} ·{' '}
                {tp('lines.accounts', line.accounts, { count: formatNumber(line.accounts) })}
                {short ? ` · ${t('lines.card.followUp')}` : ''}
              </span>
            </li>
          );
        })}
      </ul>
    </>
  );
}
