import { t, type MessageKey } from '@lms/i18n';
import { useEffect, useState } from 'react';
import * as Location from 'expo-location';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { LatLng } from '../lib/data';
import { colors, fontFamily, palette, radius, sizing, space, textStyle } from '../theme';
import { PinIcon } from './icons';
import { PinMap } from './PinMap';

export type Geo = { lat: number; lng: number; accuracy?: number };

type State = 'idle' | 'locating' | 'denied' | 'failed';

/** Where the current value came from, for the note under the field. */
type Source = 'saved' | 'gps' | 'map' | 'search' | 'typed';

const MESSAGES: Record<State, MessageKey> = {
  idle: 'common.geo.idle',
  locating: 'common.geo.waiting',
  denied: 'common.geo.deniedDevice',
  failed: 'common.geo.failed',
};

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
 * The customer's doorstep coordinates: from the device's GPS, typed or pasted
 * as "lat, lng" (what Google Maps copies), or placed on the map — search for
 * a place, tap the map, or long-press and drag the pin. Optional by design.
 */
export function GeoField({ value, onChange, savedNote, error }: Props) {
  const [state, setState] = useState<State>('idle');
  const [source, setSource] = useState<Source>('saved');
  const [text, setText] = useState(value ? formatCoords(value) : '');
  const [focused, setFocused] = useState(false);
  const invalid = Boolean(text.trim()) && !parseCoords(text);

  // Follow values set from outside the text box (GPS, the map) without
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
      set(
        {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy ? Math.round(position.coords.accuracy) : undefined,
        },
        'gps',
      );
    } catch {
      setState('failed');
    }
  }

  const shownError = invalid
    ? t('common.geo.invalid')
    : state === 'denied' || state === 'failed'
      ? t(MESSAGES[state])
      : error;
  const hint = value ? describe(value, source, savedNote) : t(MESSAGES[state]);

  return (
    <View>
      <Text style={styles.label}>{t('common.geo.label')}</Text>

      <View style={[styles.control, focused && styles.controlFocused, !!shownError && styles.controlInvalid]}>
        <View style={styles.lead}>
          <PinIcon color={colors.textFaint} />
        </View>
        <TextInput
          style={styles.input}
          value={text}
          placeholder={t('common.geo.placeholder')}
          placeholderTextColor={colors.textFaint}
          keyboardType="numbers-and-punctuation"
          autoCapitalize="none"
          autoCorrect={false}
          onChangeText={onType}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false);
            // Tidy a valid entry to the shape everything else shows.
            const parsed = parseCoords(text);
            if (parsed) setText(formatCoords(parsed));
          }}
          accessibilityLabel={t('common.geo.label')}
        />
        {text ? (
          <Pressable
            onPress={() => onType('')}
            hitSlop={8}
            style={styles.clear}
            accessibilityRole="button"
            accessibilityLabel={t('common.actions.clear')}
          >
            <Text style={styles.clearText}>×</Text>
          </Pressable>
        ) : null}
      </View>

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

      <PinMap value={value} onPick={(p) => set(p, 'map')} onFound={(p) => set(p, 'search')} />

      <Text style={shownError ? styles.error : styles.hint}>{shownError ?? hint}</Text>
    </View>
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

/** Close enough to read a doorstep (~1 m) without pretending to more. */
export function formatCoords(p: LatLng): string {
  return `${p.lat.toFixed(5)}, ${p.lng.toFixed(5)}`;
}

/** "13.0827, 80.2707", with or without the comma or brackets. */
export function parseCoords(text: string): LatLng | undefined {
  const match = /^\(?\s*(-?\d{1,2}(?:\.\d+)?)\s*[,\s]\s*(-?\d{1,3}(?:\.\d+)?)\s*\)?$/.exec(text.trim());
  if (!match) return undefined;
  const lat = Number(match[1]);
  const lng = Number(match[2]);
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return undefined;
  return { lat, lng };
}

const styles = StyleSheet.create({
  label: {
    ...textStyle('label', fontFamily.bodySemibold),
    color: colors.text,
    marginBottom: space[2],
  },
  control: {
    flexDirection: 'row',
    alignItems: 'center',
    height: sizing.fieldHeight,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: colors.bgField,
  },
  controlFocused: {
    backgroundColor: colors.bgElevated,
    borderColor: colors.brand,
  },
  controlInvalid: {
    borderColor: colors.danger,
    backgroundColor: palette.dangerBg,
  },
  lead: { paddingLeft: space[4], justifyContent: 'center' },
  input: {
    flex: 1,
    height: '100%',
    paddingHorizontal: space[4],
    ...textStyle('body'),
    color: colors.text,
  },
  clear: { paddingHorizontal: space[4], height: '100%', justifyContent: 'center' },
  clearText: { ...textStyle('body', fontFamily.bodySemibold), color: colors.textFaint },
  capture: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    height: sizing.buttonHeight,
    marginTop: space[3],
    paddingHorizontal: space[4],
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.bgElevated,
  },
  capturePressed: { backgroundColor: palette.navy050 },
  captureText: { ...textStyle('body', fontFamily.bodySemibold), color: colors.text },
  hint: { ...textStyle('caption'), color: colors.textFaint, marginTop: space[2] },
  error: { ...textStyle('caption'), color: colors.danger, marginTop: space[2] },
});
