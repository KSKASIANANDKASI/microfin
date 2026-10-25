import { t, type MessageKey } from '@lms/i18n';
import { useEffect, useId, useRef, useState } from 'react';
import { branchOffice, type LatLng } from '../lib/data';
import { MAPS_API_KEY, loadGoogleMaps } from '../lib/maps';
import { PinIcon } from './icons';
import { formatCoords } from './RouteMap';

export type Geo = { lat: number; lng: number; accuracy?: number };

type State = 'idle' | 'locating' | 'denied' | 'unsupported' | 'failed';

/** Where the current value came from, for the note under the field. */
type Source = 'saved' | 'gps' | 'map' | 'search' | 'typed';

type Props = {
  value?: Geo;
  /**
   * `invalid` is true while the typed coordinates don't parse, so the form can
   * refuse to save rather than silently drop them.
   */
  onChange: (next: Geo | undefined, invalid: boolean) => void;
  /** Shown under a value the form was opened with, e.g. when it was captured. */
  savedNote?: string;
  error?: string;
};

/**
 * The customer's doorstep coordinates: from the browser's GPS, typed or pasted
 * as "lat, lng" (what Google Maps copies), or placed on a map — search for a
 * place, click the map or drag the pin. The map needs `VITE_GOOGLE_MAPS_API_KEY`
 * (search also needs the Geocoding API on it); without one the field still
 * takes GPS and typed coordinates. Optional by design — an
 * officer onboarding over the phone has nothing to capture.
 */
export function GeoField({ value, onChange, savedNote, error }: Props) {
  const inputId = useId();
  const [state, setState] = useState<State>('idle');
  const [source, setSource] = useState<Source>('saved');
  const [text, setText] = useState(value ? formatCoords(value) : '');
  const invalid = Boolean(text.trim()) && !parseCoords(text);

  // Follow values set from outside the text box (GPS, the map, Clear) without
  // rewriting what the officer is typing.
  useEffect(() => {
    const typed = parseCoords(text);
    if (!value) {
      if (typed) setText('');
    } else if (!typed || formatCoords(typed) !== formatCoords(value)) {
      setText(formatCoords(value));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  function set(next: Geo | undefined, from: Source) {
    setState('idle');
    setSource(from);
    onChange(next, false);
  }

  function onType(next: string) {
    setText(next);
    setState('idle');
    setSource('typed');
    const parsed = parseCoords(next);
    onChange(parsed, Boolean(next.trim()) && !parsed);
  }

  function capture() {
    if (!('geolocation' in navigator)) {
      setState('unsupported');
      return;
    }

    setState('locating');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setState('idle');
        set(
          {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: Math.round(position.coords.accuracy),
          },
          'gps',
        );
      },
      (error) => setState(error.code === error.PERMISSION_DENIED ? 'denied' : 'failed'),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  const shownError = invalid ? t('common.geo.invalid') : state !== 'idle' && state !== 'locating' ? t(MESSAGES[state]) : error;
  const hint = value ? describe(value, source, savedNote) : t(MESSAGES[state]);

  return (
    <div className="field">
      <label htmlFor={inputId}>{t('common.geo.label')}</label>

      <div className="geo__row">
        <div className={`field__control${shownError ? ' field__control--invalid' : ''}`}>
          <span className="field__lead">
            <PinIcon />
          </span>
          <input
            id={inputId}
            inputMode="decimal"
            autoComplete="off"
            spellCheck={false}
            placeholder={t('common.geo.placeholder')}
            value={text}
            aria-invalid={shownError ? true : undefined}
            aria-describedby={`${inputId}-note`}
            onChange={(e) => onType(e.target.value)}
            onBlur={() => {
              // Tidy a valid entry to the shape everything else shows.
              const parsed = parseCoords(text);
              if (parsed) setText(formatCoords(parsed));
            }}
          />
          {text ? (
            <button type="button" className="field__toggle" onClick={() => onType('')} aria-label={t('common.actions.clear')}>
              ×
            </button>
          ) : null}
        </div>

        <button type="button" className="btn btn--ghost geo__capture" onClick={capture} disabled={state === 'locating'}>
          {state === 'locating' ? t('common.geo.locating') : t('common.geo.useCurrent')}
        </button>
      </div>

      <PinMap value={value} onPick={(p) => set(p, 'map')} onFound={(p) => set(p, 'search')} />

      <span className={shownError ? 'field__error' : 'field__hint'} id={`${inputId}-note`} role={shownError ? 'alert' : undefined}>
        {shownError ?? hint}
      </span>
    </div>
  );
}

function describe(value: Geo, source: Source, savedNote?: string): string {
  if (source === 'saved') return savedNote ?? t('common.geo.mapHint');
  if (source === 'map') return t('common.geo.placedOnMap');
  if (source === 'search') return t('common.geo.fromSearch');
  if (source === 'typed') return t('common.geo.typedIn');
  return value.accuracy
    ? `${t('common.geo.accuracy', { metres: value.accuracy })} · ${t('common.geo.capturedJustNow')}`
    : t('common.geo.capturedJustNow');
}

const MESSAGES: Record<State, MessageKey> = {
  idle: 'common.geo.idle',
  locating: 'common.geo.waiting',
  denied: 'common.geo.deniedBrowser',
  unsupported: 'common.geo.unsupported',
  failed: 'common.geo.failed',
};

/** "13.0827, 80.2707", with or without the comma or brackets. */
export function parseCoords(text: string): LatLng | undefined {
  const match = /^\(?\s*(-?\d{1,2}(?:\.\d+)?)\s*[,\s]\s*(-?\d{1,3}(?:\.\d+)?)\s*\)?$/.exec(text.trim());
  if (!match) return undefined;
  const lat = Number(match[1]);
  const lng = Number(match[2]);
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return undefined;
  return { lat, lng };
}

const ZOOM_DOORSTEP = 17;

/**
 * A map with one draggable pin and a place search above it. Starts on the
 * customer's pin, or on the branch office when there is none; clicking
 * anywhere, or choosing a search result, moves the pin there. Renders nothing
 * without an API key or if Google refuses it.
 */
function PinMap({ value, onPick, onFound }: { value?: Geo; onPick: (p: Geo) => void; onFound: (p: Geo) => void }) {
  const el = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(!MAPS_API_KEY);
  const map = useRef<{ map: any; marker: any }>(); // eslint-disable-line @typescript-eslint/no-explicit-any
  // Read when the map finishes loading, which may be after the value changed.
  const latest = useRef(value);
  latest.current = value;
  const pick = useRef(onPick);
  pick.current = onPick;

  useEffect(() => {
    if (failed || !el.current) return;
    let cancelled = false;

    loadGoogleMaps()
      .then((g) => {
        if (cancelled || !el.current) return;
        const start = latest.current;
        const m = new g.maps.Map(el.current, {
          center: start ?? branchOffice,
          zoom: start ? ZOOM_DOORSTEP : 12,
          streetViewControl: false,
          clickableIcons: false,
          gestureHandling: 'cooperative',
        });
        const marker = new g.maps.Marker({
          map: start ? m : null,
          position: start ?? branchOffice,
          draggable: true,
          title: t('common.geo.label'),
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const place = (e: any) => pick.current({ lat: round(e.latLng.lat()), lng: round(e.latLng.lng()) });
        m.addListener('click', place);
        marker.addListener('dragend', place);
        map.current = { map: m, marker };
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
      map.current?.marker.setMap(null);
      map.current = undefined;
    };
  }, [failed]);

  // Keep the pin on the value, wherever it came from.
  useEffect(() => {
    const current = map.current;
    if (!current) return;
    if (!value) {
      current.marker.setMap(null);
      return;
    }
    current.marker.setPosition(value);
    current.marker.setMap(current.map);
    if (!current.map.getBounds()?.contains(value)) current.map.panTo(value);
    if (current.map.getZoom() < ZOOM_DOORSTEP - 2) current.map.setZoom(ZOOM_DOORSTEP);
  }, [value]);

  if (failed) return null;
  return (
    <>
      <PlaceSearch onFound={onFound} />
      <div ref={el} className="geo__map" role="region" aria-label={t('common.geo.mapLabel')} />
    </>
  );
}

type Place = { label: string; at: Geo };

type SearchState = 'idle' | 'searching' | 'empty' | 'failed';

const MAX_PLACES = 5;

/** Degrees either side of the branch office that results lean towards. */
const NEARBY = 0.5;

/**
 * Looks an address or landmark up with Google's Geocoder, leaning towards the
 * branch's area, and lists the matches; choosing one moves the pin there.
 */
function PlaceSearch({ onFound }: { onFound: (p: Geo) => void }) {
  const inputId = useId();
  const [query, setQuery] = useState('');
  const [places, setPlaces] = useState<Place[]>([]);
  const [state, setState] = useState<SearchState>('idle');
  // Only the latest search may fill the list.
  const latest = useRef(0);

  async function search() {
    const address = query.trim();
    if (!address) return;
    const run = ++latest.current;
    setState('searching');
    setPlaces([]);
    try {
      const g = await loadGoogleMaps();
      const { results } = await new g.maps.Geocoder().geocode({
        address,
        region: 'in',
        bounds: {
          north: branchOffice.lat + NEARBY,
          south: branchOffice.lat - NEARBY,
          east: branchOffice.lng + NEARBY,
          west: branchOffice.lng - NEARBY,
        },
      });
      if (run !== latest.current) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const found: Place[] = results.slice(0, MAX_PLACES).map((r: any) => ({
        label: r.formatted_address,
        at: { lat: round(r.geometry.location.lat()), lng: round(r.geometry.location.lng()) },
      }));
      setPlaces(found);
      setState(found.length ? 'idle' : 'empty');
    } catch (e) {
      if (run !== latest.current) return;
      // The Geocoder rejects rather than resolving empty when nothing matches.
      setState((e as { code?: string }).code === 'ZERO_RESULTS' ? 'empty' : 'failed');
    }
  }

  function choose(place: Place) {
    setPlaces([]);
    setQuery(place.label);
    onFound(place.at);
  }

  return (
    <div className="geo__search">
      <label htmlFor={inputId} className="sr-only">
        {t('common.geo.searchLabel')}
      </label>
      <div className="geo__row">
        <div className="field__control">
          <input
            id={inputId}
            type="search"
            autoComplete="off"
            placeholder={t('common.geo.searchPlaceholder')}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (state !== 'searching') setState('idle');
            }}
            onKeyDown={(e) => {
              // Search, not submit the form the field sits in.
              if (e.key === 'Enter') {
                e.preventDefault();
                void search();
              }
            }}
          />
        </div>
        <button type="button" className="btn btn--ghost geo__capture" onClick={search} disabled={state === 'searching' || !query.trim()}>
          {state === 'searching' ? t('common.geo.searching') : t('common.geo.search')}
        </button>
      </div>

      {places.length ? (
        <ul className="geo__results" aria-label={t('common.geo.searchLabel')}>
          {places.map((place) => (
            <li key={`${place.at.lat},${place.at.lng},${place.label}`}>
              <button type="button" onClick={() => choose(place)}>
                <PinIcon />
                <span>{place.label}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {state === 'empty' || state === 'failed' ? (
        <span className="field__hint" role="status">
          {t(state === 'empty' ? 'common.geo.noResults' : 'common.geo.searchFailed')}
        </span>
      ) : null}
    </div>
  );
}

function round(n: number): number {
  return Math.round(n * 1e6) / 1e6;
}
