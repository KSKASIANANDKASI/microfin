import { t, type MessageKey } from '@lms/i18n';
import { useEffect, useState } from 'react';
import * as Location from 'expo-location';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { distanceKm, type LatLng, type PaymentGeo } from '../lib/data';
import { colors, fontFamily, palette, radius, sizing, space, textStyle } from '../theme';
import { formatCoords } from './GeoField';
import { PinIcon } from './icons';

type State = 'locating' | 'done' | 'denied' | 'failed';

/** Further than this from the doorstep pin and the receipt gets a second look. */
const FAR_KM = 0.3;

const ERRORS: Partial<Record<State, MessageKey>> = {
  denied: 'common.geo.deniedDevice',
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
 * Where the officer stood when receipting, from the device's GPS — taken as
 * the screen opens, never typed or placed, so it stands as proof of the visit.
 * Optional: a refused or failed fix never blocks the payment.
 */
export function PaymentGeoField({ value, onChange, doorstep, backdated }: Props) {
  const [state, setState] = useState<State>('locating');

  async function capture() {
    setState('locating');
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setState('denied');
        return;
      }
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setState('done');
      onChange({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: position.coords.accuracy ? Math.round(position.coords.accuracy) : undefined,
      });
    } catch {
      setState('failed');
    }
  }

  useEffect(() => {
    capture();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const away = value && doorstep ? distanceKm(value, doorstep) : undefined;
  const far = away !== undefined && away > FAR_KM;
  const error = ERRORS[state];
  const meta = [
    value?.accuracy ? t('common.geo.accuracy', { metres: value.accuracy }) : undefined,
    away !== undefined ? t('collection.pay.geo.fromDoorstep', { distance: formatDistance(away) }) : undefined,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <View>
      <Text style={styles.label}>{t('collection.pay.geo.label')}</Text>

      {backdated ? (
        <Text style={styles.hint}>{t('collection.pay.geo.backdated')}</Text>
      ) : value || state === 'locating' ? (
        <View style={styles.box}>
          <View style={styles.icon}>
            <PinIcon color={palette.gold700} />
          </View>
          <View style={styles.flex}>
            {value ? <Text style={styles.coords}>{formatCoords(value)}</Text> : null}
            <Text style={styles.meta}>{value ? meta : t('collection.pay.geo.locating')}</Text>
          </View>
          {value ? (
            <Pressable onPress={capture} disabled={state === 'locating'} accessibilityRole="button" hitSlop={8}>
              <Text style={styles.link}>
                {state === 'locating' ? t('common.geo.locating') : t('collection.pay.geo.retry')}
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : (
        <Pressable
          style={({ pressed }) => [styles.retry, pressed && styles.retryPressed]}
          onPress={capture}
          accessibilityRole="button"
        >
          <PinIcon color={colors.brand} />
          <Text style={styles.retryText}>{t('collection.pay.geo.retry')}</Text>
        </Pressable>
      )}

      {backdated ? null : error ? (
        <Text style={styles.error}>{t(error)}</Text>
      ) : far ? (
        <Text style={styles.error}>{t('collection.pay.geo.far', { distance: formatDistance(away!) })}</Text>
      ) : (
        <Text style={styles.hint}>
          {value && !doorstep ? t('collection.pay.geo.noPin') : t('collection.pay.geo.hint')}
        </Text>
      )}
    </View>
  );
}

function formatDistance(km: number): string {
  return km < 1
    ? t('collection.pay.geo.metres', { count: Math.round(km * 1000) })
    : t('collection.pay.geo.km', { count: km.toFixed(1) });
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  label: {
    ...textStyle('label', fontFamily.bodySemibold),
    color: colors.text,
    marginBottom: space[2],
  },
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    padding: space[3],
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.bgElevated,
  },
  icon: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    backgroundColor: palette.gold050,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coords: { ...textStyle('bodySm', fontFamily.bodySemibold), color: colors.text },
  meta: { ...textStyle('caption'), color: colors.textFaint },
  link: { ...textStyle('bodySm', fontFamily.bodySemibold), color: colors.brand },
  retry: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    height: sizing.buttonHeight,
    paddingHorizontal: space[4],
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.bgElevated,
  },
  retryPressed: { backgroundColor: palette.navy050 },
  retryText: { ...textStyle('body', fontFamily.bodySemibold), color: colors.text },
  hint: { ...textStyle('caption'), color: colors.textFaint, marginTop: space[2] },
  error: { ...textStyle('caption'), color: colors.danger, marginTop: space[2] },
});
