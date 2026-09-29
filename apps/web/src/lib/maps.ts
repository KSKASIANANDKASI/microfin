/**
 * Google Maps for collection routes. With `VITE_GOOGLE_MAPS_API_KEY` the route
 * page draws its own map (Maps JavaScript API) with a pin per customer; without
 * one it falls back to the keyless directions embed. Navigation always hands
 * off to the Google Maps app through plain URLs.
 */

import type { LatLng } from './data';

/** Maps JavaScript API key. Optional; enable "Maps JavaScript API" on it. */
export const MAPS_API_KEY: string | undefined = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || undefined;

/**
 * The slice of `google` the route map uses. Typed loosely on purpose so the
 * app needs no `@types/google.maps` dependency.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type GoogleMaps = { maps: any };

declare global {
  interface Window {
    google?: GoogleMaps;
    gm_authFailure?: () => void;
    __lmsMapsReady?: () => void;
  }
}

let loading: Promise<GoogleMaps> | undefined;

/** Loads the Maps JavaScript API once per page; rejects if the key is missing or refused. */
export function loadGoogleMaps(): Promise<GoogleMaps> {
  if (!MAPS_API_KEY) return Promise.reject(new Error('VITE_GOOGLE_MAPS_API_KEY is not set'));
  if (window.google?.maps?.Map) return Promise.resolve(window.google);

  loading ??= new Promise<GoogleMaps>((resolve, reject) => {
    const fail = (reason: string) => {
      loading = undefined;
      reject(new Error(reason));
    };
    window.__lmsMapsReady = () => (window.google ? resolve(window.google) : fail('Maps loaded without google'));
    // Google calls this when the key is invalid or not allowed for this site.
    window.gm_authFailure = () => fail('Google Maps rejected the API key');

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?${new URLSearchParams({
      key: MAPS_API_KEY!,
      v: 'weekly',
      loading: 'async',
      callback: '__lmsMapsReady',
    })}`;
    script.async = true;
    script.onerror = () => fail('Could not load Google Maps');
    document.head.append(script);
  });
  return loading;
}

/** Maps URLs accept at most 9 waypoints between origin and destination. */
const MAX_LINK_WAYPOINTS = 9;

const point = (p: LatLng) => `${p.lat},${p.lng}`;

/** Office → stops → office in the keyless embed, the fallback when there is no working key. */
export function routeEmbedUrl(office: LatLng, stops: LatLng[]): string {
  if (!stops.length) {
    return `https://maps.google.com/maps?${new URLSearchParams({ q: point(office), z: '14', output: 'embed' })}`;
  }
  const daddr = [...stops, office].map(point).join(' to:');
  return `https://maps.google.com/maps?${new URLSearchParams({ saddr: point(office), daddr, output: 'embed' })}`;
}

/** A single coordinate, opened as a dropped pin in Google Maps. */
export function pinUrl(at: LatLng): string {
  return `https://www.google.com/maps/search/?${new URLSearchParams({ api: '1', query: point(at) })}`;
}

/**
 * Turn-by-turn directions in Google Maps for the whole round. Past nine
 * stops the link ends at the tenth; the officer reopens it from there.
 */
export function routeDirectionsUrl(office: LatLng, stops: LatLng[]): string {
  const fits = stops.length <= MAX_LINK_WAYPOINTS;
  const waypoints = fits ? stops : stops.slice(0, MAX_LINK_WAYPOINTS);
  const destination = fits ? office : stops[MAX_LINK_WAYPOINTS]!;
  const params = new URLSearchParams({
    api: '1',
    origin: point(office),
    destination: point(destination),
    travelmode: 'two-wheeler',
  });
  if (waypoints.length) params.set('waypoints', waypoints.map(point).join('|'));
  return `https://www.google.com/maps/dir/?${params}`;
}

/** Directions to one doorstep from wherever the officer is standing. */
export function stopDirectionsUrl(stop: LatLng): string {
  const params = new URLSearchParams({ api: '1', destination: point(stop), travelmode: 'two-wheeler' });
  return `https://www.google.com/maps/dir/?${params}`;
}
