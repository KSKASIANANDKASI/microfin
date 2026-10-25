import { t } from '@lms/i18n';
import * as Location from 'expo-location';
import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import MapView, { Marker, type MapPressEvent, type MarkerDragStartEndEvent } from 'react-native-maps';
import { branchOffice, type LatLng } from '../lib/data';
import { colors, fontFamily, palette, radius, sizing, space, textStyle } from '../theme';
import { PinIcon } from './icons';

/**
 * Android draws Google Maps and crashes without a key in the manifest, so the
 * map only appears once `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` is set and the app
 * rebuilt. iOS uses Apple Maps, which needs no key.
 */
const AVAILABLE = Platform.OS === 'ios' || Boolean(process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY);

const DOORSTEP = { latitudeDelta: 0.004, longitudeDelta: 0.004 };
const CITY = { latitudeDelta: 0.15, longitudeDelta: 0.15 };

/**
 * A map with one pin and a place search above it: tap anywhere to move the
 * pin, long-press and drag it, or choose a search result. Starts on the value,
 * or on the branch office when there is none.
 */
export function PinMap({
  value,
  onPick,
  onFound,
}: {
  value?: LatLng;
  onPick: (p: LatLng) => void;
  onFound: (p: LatLng) => void;
}) {
  const map = useRef<MapView>(null);
  const initial = useRef(value);

  // Follow values set elsewhere (GPS, typed) — the pin itself moves on render.
  useEffect(() => {
    if (value) map.current?.animateToRegion({ latitude: value.lat, longitude: value.lng, ...DOORSTEP }, 300);
  }, [value?.lat, value?.lng]);

  if (!AVAILABLE) return null;

  const start = initial.current ?? branchOffice;
  const pick = (c: { latitude: number; longitude: number }) => onPick({ lat: round(c.latitude), lng: round(c.longitude) });

  return (
    <>
      <PlaceSearch onFound={onFound} />
      <MapView
        ref={map}
        style={styles.map}
        initialRegion={{ latitude: start.lat, longitude: start.lng, ...(initial.current ? DOORSTEP : CITY) }}
        onPress={(e: MapPressEvent) => pick(e.nativeEvent.coordinate)}
        toolbarEnabled={false}
        accessibilityLabel={t('common.geo.mapLabel')}
      >
        {value ? (
          <Marker
            coordinate={{ latitude: value.lat, longitude: value.lng }}
            draggable
            onDragEnd={(e: MarkerDragStartEndEvent) => pick(e.nativeEvent.coordinate)}
            pinColor={colors.brand}
          />
        ) : null}
      </MapView>
    </>
  );
}

type Place = { label: string; at: LatLng };

type SearchState = 'idle' | 'searching' | 'empty' | 'failed';

const MAX_PLACES = 5;

/**
 * Looks an address or landmark up with the device's geocoder (no key needed)
 * and lists the matches, each named by reverse-geocoding it; choosing one
 * moves the pin there.
 */
function PlaceSearch({ onFound }: { onFound: (p: LatLng) => void }) {
  const [query, setQuery] = useState('');
  const [places, setPlaces] = useState<Place[]>([]);
  const [state, setState] = useState<SearchState>('idle');
  const [focused, setFocused] = useState(false);
  // Only the latest search may fill the list.
  const latest = useRef(0);

  async function search() {
    const address = query.trim();
    if (!address) return;
    const run = ++latest.current;
    setState('searching');
    setPlaces([]);
    try {
      const hits = (await Location.geocodeAsync(address)).slice(0, MAX_PLACES);
      const found = await Promise.all(
        hits.map(async (hit): Promise<Place> => {
          const at = { lat: round(hit.latitude), lng: round(hit.longitude) };
          const [named] = await Location.reverseGeocodeAsync(hit).catch(() => []);
          return {
            label: (named && describePlace(named)) || `${at.lat}, ${at.lng}`,
            at,
          };
        }),
      );
      if (run !== latest.current) return;
      setPlaces(found);
      setState(found.length ? 'idle' : 'empty');
    } catch {
      // Android's geocoder throws rather than returning nothing for some misses.
      if (run === latest.current) setState('failed');
    }
  }

  function choose(place: Place) {
    setPlaces([]);
    setQuery(place.label);
    onFound(place.at);
  }

  return (
    <View style={styles.search}>
      <View style={styles.searchRow}>
        <TextInput
          style={[styles.input, focused && styles.inputFocused]}
          value={query}
          placeholder={t('common.geo.searchPlaceholder')}
          placeholderTextColor={colors.textFaint}
          returnKeyType="search"
          autoCorrect={false}
          onChangeText={(next) => {
            setQuery(next);
            if (state !== 'searching') setState('idle');
          }}
          onSubmitEditing={search}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          accessibilityLabel={t('common.geo.searchLabel')}
        />
        <Pressable
          style={({ pressed }) => [styles.searchButton, pressed && styles.pressed]}
          onPress={search}
          disabled={state === 'searching' || !query.trim()}
          accessibilityRole="button"
        >
          <Text style={styles.searchButtonText}>
            {state === 'searching' ? t('common.geo.searching') : t('common.geo.search')}
          </Text>
        </Pressable>
      </View>

      {places.length ? (
        <View style={styles.results} accessibilityLabel={t('common.geo.searchLabel')}>
          {places.map((place, i) => (
            <Pressable
              key={`${place.at.lat},${place.at.lng},${place.label}`}
              style={({ pressed }) => [styles.result, i > 0 && styles.resultDivider, pressed && styles.pressed]}
              onPress={() => choose(place)}
              accessibilityRole="button"
            >
              <PinIcon color={colors.textFaint} />
              <Text style={styles.resultText}>{place.label}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      {state === 'empty' || state === 'failed' ? (
        <Text style={styles.searchNote} accessibilityLiveRegion="polite">
          {t(state === 'empty' ? 'common.geo.noResults' : 'common.geo.searchFailed')}
        </Text>
      ) : null}
    </View>
  );
}

/** "Name, street, area, city" — Android gives a formatted address; iOS only the parts. */
function describePlace(a: Location.LocationGeocodedAddress): string {
  if (a.formattedAddress) return a.formattedAddress;
  const parts = [a.name, a.street, a.district, a.city, a.region].filter((p): p is string => Boolean(p));
  return [...new Set(parts)].join(', ');
}

function round(n: number): number {
  return Math.round(n * 1e6) / 1e6;
}

const styles = StyleSheet.create({
  search: { marginTop: space[3] },
  searchRow: { flexDirection: 'row', gap: space[3] },
  input: {
    flex: 1,
    height: sizing.fieldHeight,
    paddingHorizontal: space[4],
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: colors.bgField,
    ...textStyle('body'),
    color: colors.text,
  },
  inputFocused: {
    backgroundColor: colors.bgElevated,
    borderColor: colors.brand,
  },
  searchButton: {
    justifyContent: 'center',
    height: sizing.fieldHeight,
    paddingHorizontal: space[4],
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.bgElevated,
  },
  searchButtonText: {
    ...textStyle('body', fontFamily.bodySemibold),
    color: colors.text,
  },
  pressed: { backgroundColor: palette.navy050 },
  results: {
    marginTop: space[2],
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.bgElevated,
    overflow: 'hidden',
  },
  result: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space[3],
    padding: space[4],
  },
  resultDivider: { borderTopWidth: 1, borderTopColor: colors.border },
  resultText: { flex: 1, ...textStyle('body'), color: colors.text },
  searchNote: {
    ...textStyle('caption'),
    color: colors.textFaint,
    marginTop: space[2],
  },
  map: {
    height: 240,
    marginTop: space[3],
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
