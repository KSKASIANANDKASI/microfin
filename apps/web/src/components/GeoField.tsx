import { t, type MessageKey } from '@lms/i18n';
import { useState } from 'react';
import { PinIcon } from './icons';

export type Geo = { lat: number; lng: number; accuracy?: number };

type State = 'idle' | 'locating' | 'denied' | 'unsupported' | 'failed';

/**
 * Captures the customer's doorstep coordinates from the browser. Optional by
 * design — an officer onboarding over the phone has nothing to capture.
 */
export function GeoField({ value, onChange }: { value?: Geo; onChange: (next?: Geo) => void }) {
  const [state, setState] = useState<State>('idle');

  function capture() {
    if (!('geolocation' in navigator)) {
      setState('unsupported');
      return;
    }

    setState('locating');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setState('idle');
        onChange({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: Math.round(position.coords.accuracy),
        });
      },
      (error) => setState(error.code === error.PERMISSION_DENIED ? 'denied' : 'failed'),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  return (
    <div className="field">
      <label>{t('common.geo.label')}</label>

      {value ? (
        <div className="geo">
          <span className="geo__icon" aria-hidden>
            <PinIcon />
          </span>
          <span className="geo__body">
            <b>
              {value.lat.toFixed(5)}, {value.lng.toFixed(5)}
            </b>
            <span className="geo__meta">
              {value.accuracy ? `${t('common.geo.accuracy', { metres: value.accuracy })} · ` : ''}
              {t('common.geo.capturedJustNow')}
            </span>
          </span>
          <button type="button" className="linkbtn" onClick={() => onChange(undefined)}>
            {t('common.actions.clear')}
          </button>
        </div>
      ) : (
        <button type="button" className="btn btn--ghost geo__capture" onClick={capture} disabled={state === 'locating'}>
          <PinIcon />
          {state === 'locating' ? t('common.geo.locating') : t('common.geo.useCurrent')}
        </button>
      )}

      <span className={state === 'idle' ? 'field__hint' : 'field__error'}>
        {t(MESSAGES[state])}
      </span>
    </div>
  );
}

const MESSAGES: Record<State, MessageKey> = {
  idle: 'common.geo.idle',
  locating: 'common.geo.waiting',
  denied: 'common.geo.deniedBrowser',
  unsupported: 'common.geo.unsupported',
  failed: 'common.geo.failed',
};
