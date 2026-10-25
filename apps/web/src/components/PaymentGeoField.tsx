import { t, type MessageKey } from '@lms/i18n';
import { useEffect, useState } from 'react';
import { distanceKm, type LatLng, type PaymentGeo } from '../lib/data';
import { PinIcon } from './icons';
import { formatCoords } from './RouteMap';

type State = 'locating' | 'done' | 'denied' | 'unsupported' | 'failed';

/** Further than this from the doorstep pin and the receipt gets a second look. */
export const FAR_KM = 0.3;

const ERRORS: Partial<Record<State, MessageKey>> = {
  denied: 'common.geo.deniedBrowser',
  unsupported: 'common.geo.unsupported',
  failed: 'common.geo.failed',
};

type Props = {
  value?: PaymentGeo;
  onChange: (next?: PaymentGeo) => void;
  /** The customer's pin, to say how far from it the money was taken. */
  doorstep?: LatLng;
  /** A back-dated receipt wasn't taken here and now, so its location isn't either. */
  backdated: boolean;
};

/**
 * Where the officer stood when receipting, from the browser's GPS — taken as
 * the form opens, never typed or placed, so it stands as proof of the visit.
 * Optional: a refused or failed fix never blocks the payment.
 */
export function PaymentGeoField({ value, onChange, doorstep, backdated }: Props) {
  const [state, setState] = useState<State>('locating');

  function capture() {
    if (!('geolocation' in navigator)) {
      setState('unsupported');
      return;
    }

    setState('locating');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setState('done');
        onChange({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: Math.round(position.coords.accuracy),
        });
      },
      (error) => setState(error.code === error.PERMISSION_DENIED ? 'denied' : 'failed'),
      { enableHighAccuracy: true, timeout: 15000 },
    );
  }

  useEffect(capture, []); // eslint-disable-line react-hooks/exhaustive-deps

  const away = value && doorstep ? distanceKm(value, doorstep) : undefined;
  const far = away !== undefined && away > FAR_KM;
  const error = ERRORS[state];

  return (
    <div className="field">
      <label>{t('collection.pay.geo.label')}</label>

      {backdated ? (
        <p className="field__hint">{t('collection.pay.geo.backdated')}</p>
      ) : value ? (
        <div className="geo">
          <span className="geo__icon" aria-hidden>
            <PinIcon />
          </span>
          <span className="geo__body">
            <b>{formatCoords(value)}</b>
            <span className="geo__meta">
              {[
                value.accuracy ? t('common.geo.accuracy', { metres: value.accuracy }) : undefined,
                away !== undefined ? t('collection.pay.geo.fromDoorstep', { distance: formatDistance(away) }) : undefined,
              ]
                .filter(Boolean)
                .join(' · ')}
            </span>
          </span>
          <button type="button" className="linkbtn" onClick={capture} disabled={state === 'locating'}>
            {state === 'locating' ? t('common.geo.locating') : t('collection.pay.geo.retry')}
          </button>
        </div>
      ) : state === 'locating' ? (
        <div className="geo" role="status">
          <span className="geo__icon" aria-hidden>
            <PinIcon />
          </span>
          <span className="geo__body">
            <span className="geo__meta">{t('collection.pay.geo.locating')}</span>
          </span>
        </div>
      ) : (
        <button type="button" className="btn btn--ghost geo__capture" onClick={capture}>
          <PinIcon />
          {t('collection.pay.geo.retry')}
        </button>
      )}

      {backdated ? null : error ? (
        <span className="field__error" role="alert">
          {t(error)}
        </span>
      ) : far ? (
        <span className="field__error" role="alert">
          {t('collection.pay.geo.far', { distance: formatDistance(away!) })}
        </span>
      ) : (
        <span className="field__hint">
          {value && !doorstep ? t('collection.pay.geo.noPin') : t('collection.pay.geo.hint')}
        </span>
      )}
    </div>
  );
}

export function formatDistance(km: number): string {
  return km < 1
    ? t('collection.pay.geo.metres', { count: Math.round(km * 1000) })
    : t('collection.pay.geo.km', { count: km.toFixed(1) });
}
