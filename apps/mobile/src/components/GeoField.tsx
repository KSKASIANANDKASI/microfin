import { t, type MessageKey } from '@lms/i18n';
import { useState } from 'react';
import * as Location from 'expo-location';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fontFamily, palette, radius, sizing, space, textStyle } from '../theme';
import { PinIcon } from './icons';

export type Geo = { lat: number; lng: number; accuracy?: number };

type State = 'idle' | 'locating' | 'denied' | 'failed';

const MESSAGES: Record<State, MessageKey> = {
  idle: 'common.geo.idle',
  locating: 'common.geo.waiting',
  denied: 'common.geo.deniedDevice',
  failed: 'common.geo.failed',
};

/** Captures the customer's doorstep coordinates. Optional by design. */
export function GeoField({ value, onChange }: { value?: Geo; onChange: (next?: Geo) => void }) {
  const [state, setState] = useState<State>('idle');

  async function capture() {
    setState('locating');
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setState('denied');
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      setState('idle');
      onChange({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: position.coords.accuracy ? Math.round(position.coords.accuracy) : undefined,
      });
    } catch {
      setState('failed');
    }
  }

  return (
    <View>
      <Text style={styles.label}>{t('common.geo.label')}</Text>

      {value ? (
        <View style={styles.captured}>
          <View style={styles.icon}>
            <PinIcon color={palette.gold700} />
          </View>
          <View style={styles.flex}>
            <Text style={styles.coords}>
              {value.lat.toFixed(5)}, {value.lng.toFixed(5)}
            </Text>
            <Text style={styles.meta}>
              {value.accuracy ? `${t('common.geo.accuracy', { metres: value.accuracy })} · ` : ''}
              {t('common.geo.capturedJustNow')}
            </Text>
          </View>
          <Pressable onPress={() => onChange(undefined)} accessibilityRole="button" hitSlop={8}>
            <Text style={styles.clear}>{t('common.actions.clear')}</Text>
          </Pressable>
        </View>
      ) : (
        <Pressable
          style={({ pressed }) => [styles.capture, pressed && styles.capturePressed]}
          onPress={capture}
          disabled={state === 'locating'}
          accessibilityRole="button"
        >
          <PinIcon color={colors.brand} />
          <Text style={styles.captureText}>
            {state === 'locating' ? t('common.geo.locating') : t('common.geo.useCurrent')}
          </Text>
        </Pressable>
      )}

      <Text style={state === 'idle' || state === 'locating' ? styles.hint : styles.error}>
        {t(MESSAGES[state])}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  label: {
    ...textStyle('label', fontFamily.bodySemibold),
    color: colors.text,
    marginBottom: space[2],
  },
  capture: {
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
  capturePressed: { backgroundColor: palette.navy050 },
  captureText: { ...textStyle('body', fontFamily.bodySemibold), color: colors.text },
  captured: {
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
  clear: { ...textStyle('bodySm', fontFamily.bodySemibold), color: colors.brand },
  hint: { ...textStyle('caption'), color: colors.textFaint, marginTop: space[2] },
  error: { ...textStyle('caption'), color: colors.danger, marginTop: space[2] },
});
