import { Fragment, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { t, tp } from '@lms/i18n';
import { chart } from '@lms/theme';
import { Card } from '../components/Card';
import { CheckCircleIcon, ClockIcon, SparkIcon, TrendUpIcon, WalletIcon } from '../components/icons';
import { collectionEfficiency, riskAnalysis, type RiskBand } from '../lib/analytics';
import { askAssistant, type ChatMessage } from '../lib/assistant';
import { formatCurrency, formatNumber, officerLabel } from '../lib/data';
import { useCollectionSheet } from '../lib/useCollectionSheet';

const pct = (value: number) => Math.round(value * 100);

const BAND_TONE = { low: 'good', medium: 'warning', high: 'critical' } as const satisfies Record<RiskBand, string>;

const SUGGESTIONS = ['efficiency', 'risk', 'officers', 'summary'] as const;

export function Insights() {
  // Receipts move the loan book; re-derive whenever the sheet changes.
  const sheet = useCollectionSheet();
  const efficiency = useMemo(() => collectionEfficiency(), [sheet]);
  const risk = useMemo(() => riskAnalysis(), [sheet]);
  const watchlist = risk.loans.filter((loan) => loan.band !== 'low');

  return (
    <>
      <div className="pagehead">
        <div>
          <h1 className="pagehead__title">{t('common.nav.insights')}</h1>
          <p className="pagehead__sub">{t('insights.subtitle')}</p>
        </div>
      </div>

      <div className="kpis">
        <Kpi
          icon={<WalletIcon size={18} />}
          label={t('insights.kpis.efficiencyToday')}
          value={`${pct(efficiency.today.efficiency)}%`}
          note={t('insights.kpis.efficiencyTodayNote', {
            collected: formatCurrency(efficiency.today.collected, true),
            due: formatCurrency(efficiency.today.due, true),
          })}
          bad={efficiency.today.efficiency < 0.8}
        />
        <Kpi
          icon={<TrendUpIcon />}
          label={t('insights.kpis.week')}
          value={`${pct(efficiency.week.efficiency)}%`}
          note={t('insights.kpis.weekNote', {
            collected: formatCurrency(efficiency.week.collected, true),
            target: formatCurrency(efficiency.week.target, true),
          })}
          bad={efficiency.week.efficiency < 1}
        />
        <Kpi
          icon={<CheckCircleIcon size={18} />}
          label={t('insights.kpis.onTime')}
          value={`${pct(efficiency.onTimeRate)}%`}
          note={t('insights.kpis.onTimeNote', { days: efficiency.avgDaysLate.toFixed(1) })}
          bad={efficiency.onTimeRate < 0.8}
        />
        <Kpi
          icon={<ClockIcon size={18} />}
          label={t('insights.kpis.par30')}
          value={`${(risk.par30 * 100).toFixed(1)}%`}
          note={t('insights.kpis.par30Note', { pct: (risk.par1 * 100).toFixed(1) })}
          bad={risk.par30 > 0.05}
        />
      </div>

      <div className="grid-2">
        <Card accent title={t('insights.efficiency.byLine')} subtitle={t('insights.efficiency.byLineSubtitle')}>
          <EfficiencyBars
            rows={efficiency.byLine.map((line) => ({
              key: line.lineId,
              name: line.name,
              meta: officerLabel(line.officer),
              due: line.due,
              collected: line.collected,
              efficiency: line.efficiency,
            }))}
          />
        </Card>

        <Card accent title={t('insights.efficiency.byOfficer')} subtitle={t('insights.efficiency.byOfficerSubtitle')}>
          <EfficiencyBars
            rows={efficiency.byOfficer.map((officer) => ({
              key: officer.officer,
              name: officerLabel(officer.officer),
              meta: tp('insights.efficiency.lines', officer.lines, { count: officer.lines }),
              due: officer.due,
              collected: officer.collected,
              efficiency: officer.efficiency,
            }))}
          />
        </Card>
      </div>

      <Card accent title={t('insights.risk.title')} subtitle={t('insights.risk.subtitle')}>
        <div className="insights__bands">
          {(['high', 'medium', 'low'] as const).map((band) => (
            <span className={`pill pill--${BAND_TONE[band]}`} key={band}>
              <span className="statusdot" style={{ background: chart.status[BAND_TONE[band]] }} aria-hidden />
              {t('insights.risk.bandSummary', {
                band: t(`insights.risk.bands.${band}`),
                count: risk.bands[band].loans,
                amount: formatCurrency(risk.bands[band].outstanding, true),
              })}
            </span>
          ))}
        </div>

        {watchlist.length ? (
          <div className="tablewrap tablewrap--flush">
            <table className="dtable dtable--flush">
              <thead>
                <tr>
                  <th scope="col">{t('insights.risk.columns.loan')}</th>
                  <th scope="col">{t('insights.risk.columns.customer')}</th>
                  <th scope="col" className="num">
                    {t('insights.risk.columns.outstanding')}
                  </th>
                  <th scope="col" className="num">
                    {t('insights.risk.columns.daysLate')}
                  </th>
                  <th scope="col">{t('insights.risk.columns.score')}</th>
                  <th scope="col">{t('insights.risk.columns.drivers')}</th>
                </tr>
              </thead>
              <tbody>
                {watchlist.map((loan) => (
                  <tr key={loan.loanId}>
                    <td>
                      <Link to={`/loans/${loan.loanId}`}>{loan.loanId}</Link>
                    </td>
                    <td>
                      <Link to={`/customers/${loan.customerId}`}>{loan.customer}</Link>
                      <span className="dtable__sub">{loan.line}</span>
                    </td>
                    <td className="num">{formatCurrency(loan.outstanding)}</td>
                    <td className="num">{formatNumber(loan.daysLate)}</td>
                    <td>
                      <span className={`pill pill--${BAND_TONE[loan.band]}`}>
                        {loan.score} · {t(`insights.risk.bands.${loan.band}`)}
                      </span>
                    </td>
                    <td className="insights__drivers">
                      {loan.factors.map((f) => t(`insights.risk.factors.${f}`)).join(' · ')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="empty empty--left">{t('insights.risk.none')}</p>
        )}
        <p className="insights__method">{t('insights.risk.method')}</p>
      </Card>

      <AssistantCard />
    </>
  );
}

function Kpi({ icon, label, value, note, bad }: { icon: ReactNode; label: string; value: string; note: string; bad: boolean }) {
  return (
    <article className="kpi">
      <div className="kpi__head">
        <p className="kpi__label">{label}</p>
        <span className="kpi__icon" aria-hidden>
          {icon}
        </span>
      </div>
      <p className="kpi__value">{value}</p>
      <p className={`kpi__note kpi__note--flush${bad ? ' kpi__note--bad' : ''}`}>{note}</p>
    </article>
  );
}

type BarRow = { key: string; name: string; meta: string; due: number; collected: number; efficiency: number };

/** Same visual as the dashboard's lines card: the fill is collected, the track is due. */
function EfficiencyBars({ rows }: { rows: BarRow[] }) {
  return (
    <ul className="lines">
      {rows.map((row) => {
        const value = pct(row.efficiency);
        const short = value < 80;
        return (
          <li className="lines__row" key={row.key}>
            <div className="lines__head">
              <span className="lines__name">
                {row.name}
                <span className="lines__officer">{row.meta}</span>
              </span>
              <span className="lines__value">
                {formatCurrency(row.collected, true)}
                <span className="lines__of"> / {formatCurrency(row.due, true)}</span>
              </span>
            </div>
            <div className="lines__track">
              <span className="lines__bar" style={{ width: `${Math.min(value, 100)}%` }} />
            </div>
            <span className="lines__meta">
              <span
                className="statusdot"
                style={{ background: short ? chart.status.warning : chart.status.good }}
                aria-hidden
              />
              {t('insights.efficiency.pct', { pct: value })}
              {short ? ` · ${t('insights.efficiency.below')}` : ''}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function AssistantCard() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const abortRef = useRef<AbortController>();
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [messages]);

  async function send(question: string) {
    const text = question.trim();
    if (!text || busy) return;

    const history: ChatMessage[] = [...messages, { role: 'user', content: text }];
    setMessages([...history, { role: 'assistant', content: '' }]);
    setDraft('');
    setError(undefined);
    setBusy(true);

    const controller = new AbortController();
    abortRef.current = controller;
    try {
      await askAssistant(
        history,
        (chunk) =>
          setMessages((current) => {
            const last = current.at(-1)!;
            return [...current.slice(0, -1), { ...last, content: last.content + chunk }];
          }),
        controller.signal,
      );
    } catch (err) {
      if (!controller.signal.aborted) {
        setError(t('insights.assistant.failed', { message: err instanceof Error ? err.message : String(err) }));
      }
    } finally {
      // Drop an empty reply so the next turn still alternates user → assistant.
      setMessages((current) => (current.at(-1)?.content ? current : current.slice(0, -1)));
      setBusy(false);
    }
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    void send(draft);
  }

  function reset() {
    abortRef.current?.abort();
    setMessages([]);
    setError(undefined);
  }

  return (
    <Card
      accent
      title={t('insights.assistant.title')}
      subtitle={t('insights.assistant.subtitle')}
      action={
        messages.length ? (
          <button type="button" className="linkbtn" onClick={reset}>
            {t('insights.assistant.clear')}
          </button>
        ) : null
      }
    >
      <div className="chat" ref={logRef} aria-live="polite">
        {messages.length === 0 ? (
          <>
            <p className="chat__hint">{t('insights.assistant.empty')}</p>
            <div className="chips">
              {SUGGESTIONS.map((id) => (
                <button key={id} type="button" className="chip" onClick={() => void send(t(`insights.assistant.suggestions.${id}`))}>
                  {t(`insights.assistant.suggestions.${id}`)}
                </button>
              ))}
            </div>
          </>
        ) : (
          messages.map((message, i) => (
            <div className={`chat__msg chat__msg--${message.role}`} key={i}>
              <span className="chat__who">
                {message.role === 'assistant' ? <SparkIcon size={14} /> : null}
                {message.role === 'user' ? t('insights.assistant.you') : t('insights.assistant.ai')}
              </span>
              <div className="chat__bubble">
                {message.content ? <RichText text={message.content} /> : <span className="chat__typing">{t('insights.assistant.thinking')}</span>}
              </div>
            </div>
          ))
        )}
        {error ? <p className="field__error">{error}</p> : null}
      </div>

      <form className="chat__form" onSubmit={onSubmit}>
        <div className="field__control field__control--area">
          <textarea
            rows={2}
            value={draft}
            placeholder={t('insights.assistant.placeholder')}
            aria-label={t('insights.assistant.placeholder')}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                void send(draft);
              }
            }}
          />
        </div>
        {busy ? (
          <button type="button" className="btn btn--ghost" onClick={() => abortRef.current?.abort()}>
            {t('insights.assistant.stop')}
          </button>
        ) : (
          <button type="submit" className="btn btn--primary" disabled={!draft.trim()}>
            {t('insights.assistant.send')}
          </button>
        )}
      </form>
    </Card>
  );
}

/** Paragraphs, `- ` bullets and **bold** — all the assistant is asked to use. Built as elements, never raw HTML. */
function RichText({ text }: { text: string }) {
  const blocks: ReactNode[] = [];
  let bullets: string[] = [];

  const flush = () => {
    if (!bullets.length) return;
    blocks.push(
      <ul key={blocks.length}>
        {bullets.map((b, i) => (
          <li key={i}>{inline(b)}</li>
        ))}
      </ul>,
    );
    bullets = [];
  };

  for (const line of text.split('\n')) {
    const bullet = line.match(/^\s*[-*•]\s+(.*)$/);
    if (bullet) {
      bullets.push(bullet[1]!);
    } else {
      flush();
      if (line.trim()) blocks.push(<p key={blocks.length}>{inline(line)}</p>);
    }
  }
  flush();
  return <>{blocks}</>;
}

function inline(text: string): ReactNode {
  return text.split(/(\*\*[^*]+\*\*)/).map((part, i) =>
    part.startsWith('**') && part.endsWith('**') ? <b key={i}>{part.slice(2, -2)}</b> : <Fragment key={i}>{part}</Fragment>,
  );
}
