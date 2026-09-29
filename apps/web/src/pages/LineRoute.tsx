import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { t, tp } from '@lms/i18n';
import { Card } from '../components/Card';
import { RouteMap, formatCoords, type RouteMapStop } from '../components/RouteMap';
import { ArrowLeftIcon, ChevronDownIcon, PinIcon } from '../components/icons';
import { branchOffice, formatCurrency, lineById, lineRoute, lines, officerLabel } from '../lib/data';
import { pinUrl, routeDirectionsUrl, routeEmbedUrl, stopDirectionsUrl } from '../lib/maps';
import { useCollectionSheet } from '../lib/useCollectionSheet';
import { StatusPill } from './Dashboard';

/**
 * A line's collection round on Google Maps: office → every doorstep still to
 * collect today, nearest first → back to the office.
 */
export function LineRoute() {
  const [params, setParams] = useSearchParams();
  const lineId = params.get('line') ?? lines[0]?.id ?? '';
  const line = lineById(lineId);
  const sheet = useCollectionSheet();
  const route = useMemo(() => lineRoute(sheet, lineId), [sheet, lineId]);

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
  // Bumped on every click so picking the same stop twice still reopens it.
  const [focus, setFocus] = useState<{ seq: number; n: number }>();
  const toCollect = route.stops.reduce((sum, s) => sum + s.installment.amount, 0);

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
          <a className="btn btn--sm" href={routeDirectionsUrl(branchOffice, points)} target="_blank" rel="noreferrer">
            <PinIcon size={16} /> {t('collection.route.openInMaps')}
          </a>
        ) : null}
      </div>

      <Card padded={false}>
        <RouteMap
          // Remount per line so the map never shows the previous route while loading.
          key={lineId}
          office={branchOffice}
          stops={mapStops}
          fallbackSrc={routeEmbedUrl(branchOffice, points)}
          title={t('collection.route.mapTitle', { line: line?.name ?? '' })}
          focus={focus}
        />
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
                  onClick={() => setFocus((f) => ({ seq: index + 1, n: (f?.n ?? 0) + 1 }))}
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
