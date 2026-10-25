import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { t, tp } from '@lms/i18n';
import { Card } from '../components/Card';
import { FAR_KM, formatDistance } from '../components/PaymentGeoField';
import { RouteMap, formatCoords, type RouteMapCollected, type RouteMapStop } from '../components/RouteMap';
import { ArrowLeftIcon, CheckIcon, ChevronDownIcon, PinIcon } from '../components/icons';
import {
  branchOffice,
  formatClock,
  formatCurrency,
  fetchLineRoute,
  lineById,
  lines,
  officerLabel,
  type CollectedStop,
  type LineRoute as Route,
} from '../lib/data';
import { ApiError } from '../lib/session';
import { pinUrl, routeDirectionsUrl, routeEmbedUrl, stopDirectionsUrl } from '../lib/maps';
import { useCollectionSheet } from '../lib/useCollectionSheet';
import { StatusPill } from './Dashboard';
import { usePortfolio } from '../lib/usePortfolio';

const EMPTY_ROUTE: Route = { stops: [], collected: [], unmapped: [], totalKm: 0 };

/**
 * A line's collection round on Google Maps: office → every doorstep still to
 * collect today, nearest first → back to the office.
 */
export function LineRoute() {
  usePortfolio();
  const [params, setParams] = useSearchParams();
  const lineId = params.get('line') ?? lines[0]?.id ?? '';
  const line = lineById(lineId);
  const sheet = useCollectionSheet();
  const [route, setRoute] = useState<Route>(EMPTY_ROUTE);
  const [loadError, setLoadError] = useState<string>();
  // Re-read when the line changes or a receipt moves the sheet.
  useEffect(() => {
    if (!lineId) return;
    let live = true;
    setLoadError(undefined);
    fetchLineRoute(lineId)
      .then((next) => live && setRoute(next))
      .catch((error) => {
        if (!live) return;
        setRoute(EMPTY_ROUTE);
        setLoadError(error instanceof ApiError ? error.message : t('auth.errors.generic'));
      });
    return () => {
      live = false;
    };
  }, [lineId, sheet]);
  const office = route.office ?? branchOffice;

  const points = useMemo(() => route.stops.map((s) => s.geo), [route]);
  // Memoised so the map only redraws when the route itself changes.
  const mapStops = useMemo<RouteMapStop[]>(
    () =>
      route.stops.map((s, i) => ({
        seq: i + 1,
        name: s.customer.name,
        address: s.customer.address,
        amount: formatCurrency(s.installment.amount),
        geo: s.geo,
        navigateUrl: stopDirectionsUrl(s.geo),
      })),
    [route],
  );
  // Receipts pin where they were posted, or at the doorstep if that wasn't recorded.
  const mapCollected = useMemo<RouteMapCollected[]>(
    () =>
      route.collected.flatMap((c) => {
        const geo = c.post?.geo ?? c.customer?.geo;
        if (!geo) return [];
        return [
          {
            key: c.installment.id,
            name: c.customer?.name ?? c.installment.customer,
            geo,
            details: [
              t('collection.route.collectedAmount', { amount: formatCurrency(c.installment.amount) }),
              postedLabel(c),
              c.post?.geo ? t('collection.route.postedHere') : t('collection.route.atDoorstep'),
            ],
          },
        ];
      }),
    [route],
  );
  // Bumped on every click so picking the same pin twice still reopens it.
  const [focus, setFocus] = useState<{ key: string; n: number }>();
  const show = (key: string) => setFocus((f) => ({ key, n: (f?.n ?? 0) + 1 }));
  const toCollect = route.stops.reduce((sum, s) => sum + s.installment.amount, 0);
  const unmappedDue = route.unmapped.reduce((sum, i) => sum + i.amount, 0);
  const collectedTotal = route.collected.reduce((sum, c) => sum + c.installment.amount, 0);
  const receiptsDue = route.stops.length + route.unmapped.length + route.collected.length;

  return (
    <>
      <div className="pagehead">
        <Link className="backlink" to="/collection">
          <ArrowLeftIcon size={14} /> {t('common.nav.collection')}
        </Link>
        <h1 className="pagehead__title">{t('common.screens.lineRoute')}</h1>
        <p className="pagehead__sub">
          {line ? `${officerLabel(line.officer)} · ` : ''}
          {tp('collection.route.summary', route.stops.length, {
            amount: formatCurrency(toCollect),
            km: route.totalKm.toFixed(1),
          })}
        </p>
      </div>

      <div className="filters">
        <label className="select">
          <span className="sr-only">{t('collection.lineFilter')}</span>
          <select value={lineId} onChange={(e) => setParams({ line: e.target.value }, { replace: true })}>
            {lines.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
          <ChevronDownIcon />
        </label>

        {route.stops.length ? (
          <a className="btn btn--sm" href={routeDirectionsUrl(office, points)} target="_blank" rel="noreferrer">
            <PinIcon size={16} /> {t('collection.route.openInMaps')}
          </a>
        ) : null}
      </div>

      {loadError ? (
        <div className="notice notice--bad" role="alert">
          {loadError}
        </div>
      ) : null}

      <Card padded={false}>
        <RouteMap
          // Remount per line so the map never shows the previous route while loading.
          key={lineId}
          office={office}
          stops={mapStops}
          collected={mapCollected}
          fallbackSrc={routeEmbedUrl(office, points)}
          title={t('collection.route.mapTitle', { line: line?.name ?? '' })}
          focus={focus}
        />
      </Card>

      <Card title={t('collection.route.today')}>
        <dl className="summary">
          <div className="summary__row">
            <dt>{t('collection.route.dueToday')}</dt>
            <dd>{formatCurrency(collectedTotal + toCollect + unmappedDue)}</dd>
          </div>
          <div className="summary__row">
            <dt>{t('collection.route.collectedSoFar')}</dt>
            <dd>
              {formatCurrency(collectedTotal)}
              <span className="summary__note">
                {t('collection.route.receipts', { done: route.collected.length, total: receiptsDue })}
              </span>
            </dd>
          </div>
          <div className="summary__row summary__row--total">
            <dt>{t('collection.route.stillToCollect')}</dt>
            <dd>{formatCurrency(toCollect + unmappedDue)}</dd>
          </div>
        </dl>
      </Card>

      <Card
        title={t('collection.route.stops')}
        subtitle={route.stops.length > 9 ? t('collection.route.longRoute') : t('collection.route.stopsHint')}
        padded={false}
      >
        {route.stops.length === 0 ? (
          <p className="empty">{t('collection.route.empty')}</p>
        ) : (
          <ol className="list list--flush">
            {route.stops.map((stop, index) => (
              <li className="list__row" key={stop.installment.id}>
                <button
                  type="button"
                  className="list__avatar routestop__seq"
                  onClick={() => show(String(index + 1))}
                  aria-label={t('collection.route.showOnMap', { name: stop.customer.name })}
                >
                  {index + 1}
                </button>
                <span className="list__main">
                  <b>{stop.customer.name}</b>
                  <span className="list__meta">
                    {t('collection.route.leg', { km: stop.legKm.toFixed(1) })} · {stop.customer.address}
                  </span>
                  <a
                    className="list__meta routestop__coords"
                    href={pinUrl(stop.geo)}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={t('collection.route.coordsLabel', { coords: formatCoords(stop.geo) })}
                  >
                    <PinIcon size={12} /> {formatCoords(stop.geo)}
                    {stop.customer.geo?.accuracy ? ` · ±${stop.customer.geo.accuracy} m` : ''}
                  </a>
                </span>
                <span className="list__amount">{formatCurrency(stop.installment.amount)}</span>
                <StatusPill status={stop.installment.status} daysLate={stop.installment.daysLate} />
                <a
                  className="btn btn--sm btn--ghost"
                  href={stopDirectionsUrl(stop.geo)}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={t('collection.route.navigateTo', { name: stop.customer.name })}
                >
                  {t('collection.route.navigate')}
                </a>
                <Link className="btn btn--sm" to={`/collection/${stop.installment.id}`}>
                  {t('collection.collect')}
                </Link>
              </li>
            ))}
          </ol>
        )}
      </Card>

      <Card title={t('collection.route.collected')} subtitle={t('collection.route.collectedHint')} padded={false}>
        {route.collected.length === 0 ? (
          <p className="empty">{t('collection.route.nothingCollected')}</p>
        ) : (
          <ul className="list list--flush">
            {route.collected.map((c) => (
              <CollectedRow
                key={c.installment.id}
                item={c}
                onShow={c.post?.geo ?? c.customer?.geo ? () => show(c.installment.id) : undefined}
              />
            ))}
          </ul>
        )}
      </Card>

      {route.unmapped.length ? (
        <Card
          title={t('collection.route.unmapped')}
          subtitle={t('collection.route.unmappedHint')}
          padded={false}
        >
          <ul className="list list--flush">
            {route.unmapped.map((item) => (
              <li className="list__row" key={item.id}>
                <span className="list__main">
                  <b>{item.customer}</b>
                  <span className="list__meta">{item.loanNo}</span>
                </span>
                <span className="list__amount">{formatCurrency(item.amount)}</span>
                <Link className="btn btn--sm" to={`/collection/${item.id}`}>
                  {t('collection.collect')}
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
    </>
  );
}

function postedLabel(c: CollectedStop): string {
  if (!c.post) return t('collection.route.timeUnknown');
  return t('collection.route.postedAt', { time: formatClock(new Date(c.post.postedAt)) });
}

/** A receipt posted today: when, how, and where the officer was. */
function CollectedRow({ item, onShow }: { item: CollectedStop; onShow?: () => void }) {
  const name = item.customer?.name ?? item.installment.customer;
  const geo = item.post?.geo;
  const far = item.awayKm !== undefined && item.awayKm > FAR_KM;

  return (
    <li className="list__row">
      <button
        type="button"
        className="list__avatar routestop__seq routestop__seq--done"
        onClick={onShow}
        disabled={!onShow}
        aria-label={t('collection.route.showReceipt', { name })}
      >
        <CheckIcon size={14} />
      </button>
      <span className="list__main">
        <b>{name}</b>
        <span className="list__meta">
          {postedLabel(item)} · {item.installment.loanNo}
        </span>
        {geo ? (
          <span className="list__meta">
            <a
              className="routestop__coords"
              href={pinUrl(geo)}
              target="_blank"
              rel="noreferrer"
              aria-label={t('collection.route.coordsLabel', { coords: formatCoords(geo) })}
            >
              <PinIcon size={12} /> {formatCoords(geo)}
              {geo.accuracy ? ` · ±${geo.accuracy} m` : ''}
            </a>
            {item.awayKm !== undefined ? (
              <span className={far ? 'routestop__far' : undefined}>
                {' · '}
                {far
                  ? t('collection.route.farFlag', { distance: formatDistance(item.awayKm) })
                  : t('collection.pay.geo.fromDoorstep', { distance: formatDistance(item.awayKm) })}
              </span>
            ) : null}
          </span>
        ) : (
          <span className="list__meta">{t('collection.route.noLocation')}</span>
        )}
      </span>
      <span className="list__amount">{formatCurrency(item.installment.amount)}</span>
      <StatusPill status="collected" daysLate={0} />
    </li>
  );
}
