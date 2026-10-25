import { useEffect, useRef, useState } from 'react';
import { t } from '@lms/i18n';
import type { LatLng } from '../lib/data';
import { MAPS_API_KEY, loadGoogleMaps, type GoogleMaps } from '../lib/maps';

export type RouteMapStop = {
  seq: number;
  name: string;
  address: string;
  amount: string;
  geo: LatLng;
  navigateUrl: string;
};

/** A receipt already posted today, pinned where it was posted. */
export type RouteMapCollected = {
  key: string;
  name: string;
  geo: LatLng;
  /** Info-window lines: amount, posting time, what the pin marks. */
  details: string[];
};

type Props = {
  office: LatLng;
  stops: RouteMapStop[];
  collected?: RouteMapCollected[];
  /** Keyless Google embed, used when there is no API key or the key is rejected. */
  fallbackSrc: string;
  title: string;
  /**
   * Pin to open the info window on, picked from the lists below the map: a
   * stop's number, or a collected receipt's key. `n` changes on every pick so
   * choosing the same pin again reopens it.
   */
  focus?: { key: string; n: number };
};

const BRAND = '#062045';
const GOLD = '#C28E14';
const GREEN = '#1E8E62';

/**
 * Line route on Google Maps: a gold pin for the branch office, a numbered pin
 * at each customer's captured doorstep coordinates, and the visiting order
 * joined up. Needs `VITE_GOOGLE_MAPS_API_KEY`; without one it shows the keyless
 * directions embed instead.
 */
export function RouteMap({ office, stops, collected = [], fallbackSrc, title, focus }: Props) {
  const el = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(!MAPS_API_KEY);
  // Markers by stop number or receipt key, so the lists can open one.
  const markers = useRef(new Map<string, () => void>());

  useEffect(() => {
    if (failed || !el.current) return;
    let cancelled = false;
    const overlays: { setMap(map: null): void }[] = [];

    loadGoogleMaps()
      .then((g) => {
        if (cancelled || !el.current) return;
        const map = new g.maps.Map(el.current, {
          center: office,
          zoom: 13,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
        });
        const info = new g.maps.InfoWindow();
        const bounds = new g.maps.LatLngBounds();
        markers.current.clear();

        const officeMarker = new g.maps.Marker({
          map,
          position: office,
          title: t('collection.route.office'),
          icon: pin(g, GOLD, 11),
          zIndex: 1000,
        });
        officeMarker.addListener('click', () => {
          info.setContent(infoContent(t('collection.route.office'), [formatCoords(office)]));
          info.open({ map, anchor: officeMarker });
        });
        overlays.push(officeMarker);
        bounds.extend(office);

        for (const stop of stops) {
          const marker = new g.maps.Marker({
            map,
            position: stop.geo,
            title: `${stop.seq}. ${stop.name}`,
            label: { text: String(stop.seq), color: '#FFFFFF', fontSize: '12px', fontWeight: '700' },
            icon: pin(g, BRAND, 13),
            zIndex: 100 - stop.seq,
          });
          const open = () => {
            info.setContent(
              infoContent(
                `${stop.seq}. ${stop.name}`,
                [stop.address, formatCoords(stop.geo), t('collection.route.due', { amount: stop.amount })],
                { href: stop.navigateUrl, text: t('collection.route.navigate') },
              ),
            );
            info.open({ map, anchor: marker });
          };
          marker.addListener('click', open);
          markers.current.set(String(stop.seq), open);
          overlays.push(marker);
          bounds.extend(stop.geo);
        }

        // Done for the day: a green tick where each receipt was posted, kept
        // off the walking line.
        for (const item of collected) {
          const marker = new g.maps.Marker({
            map,
            position: item.geo,
            title: item.name,
            label: { text: '✓', color: '#FFFFFF', fontSize: '12px', fontWeight: '700' },
            icon: pin(g, GREEN, 11),
            zIndex: 10,
          });
          const open = () => {
            info.setContent(infoContent(item.name, [...item.details, formatCoords(item.geo)]));
            info.open({ map, anchor: marker });
          };
          marker.addListener('click', open);
          markers.current.set(item.key, open);
          overlays.push(marker);
          bounds.extend(item.geo);
        }

        // Office → stops in visiting order → office. Straight lines: the order,
        // not the road; "Open in Google Maps" gives turn-by-turn.
        if (stops.length) {
          const path = [office, ...stops.map((s) => s.geo), office];
          overlays.push(
            new g.maps.Polyline({
              map,
              path,
              strokeOpacity: 0,
              icons: [
                {
                  icon: { path: 'M 0,-1 0,1', strokeOpacity: 0.8, strokeColor: BRAND, strokeWeight: 3, scale: 3 },
                  offset: '0',
                  repeat: '14px',
                },
              ],
            }),
          );
        }
        if (stops.length || collected.length) map.fitBounds(bounds, 48);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
      overlays.forEach((o) => o.setMap(null));
    };
  }, [failed, office, stops, collected]);

  useEffect(() => {
    if (!focus) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.current?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'nearest' });
    markers.current.get(focus.key)?.();
  }, [focus]);

  if (failed) {
    return (
      <iframe
        className="routemap"
        title={title}
        src={fallbackSrc}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        allowFullScreen
      />
    );
  }

  return <div ref={el} className="routemap" role="region" aria-label={title} />;
}

function pin(g: GoogleMaps, color: string, scale: number) {
  return {
    path: g.maps.SymbolPath.CIRCLE,
    scale,
    fillColor: color,
    fillOpacity: 1,
    strokeColor: '#FFFFFF',
    strokeWeight: 2,
  };
}

export function formatCoords(p: LatLng): string {
  return `${p.lat.toFixed(5)}, ${p.lng.toFixed(5)}`;
}

/** Built from DOM nodes, not an HTML string: customer names and addresses are user input. */
function infoContent(title: string, lines: string[], link?: { href: string; text: string }): HTMLElement {
  const root = document.createElement('div');
  root.className = 'routemap__info';
  const head = document.createElement('b');
  head.textContent = title;
  root.append(head);
  for (const line of lines) {
    const p = document.createElement('span');
    p.textContent = line;
    root.append(p);
  }
  if (link) {
    const a = document.createElement('a');
    a.href = link.href;
    a.target = '_blank';
    a.rel = 'noreferrer';
    a.textContent = link.text;
    root.append(a);
  }
  return root;
}
