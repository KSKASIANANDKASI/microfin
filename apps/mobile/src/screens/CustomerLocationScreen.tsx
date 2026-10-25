import { useState } from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { t } from '@lms/i18n';
import { StyleSheet, Text, View } from 'react-native';
import { errorMessage } from '../components/bits';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { GeoField, type Geo } from '../components/GeoField';
import { Screen } from '../components/Screen';
import { customerById, lineById, saveGeo } from '../lib/data';
import type { AppStackParamList } from '../navigation/types';
import { colors, space, textStyle } from '../theme';

type Props = NativeStackScreenProps<AppStackParamList, 'CustomerLocation'>;

/** Pin, move or clear an existing customer's doorstep. */
export function CustomerLocationScreen({ navigation, route }: Props) {
  const customer = customerById(route.params.customerId);
  const saved = customer?.geo;

  const [geo, setGeo] = useState<Geo | undefined>(
    saved ? { lat: saved.lat, lng: saved.lng, accuracy: saved.accuracy } : undefined,
  );
  const [invalid, setInvalid] = useState(false);
  const [error, setError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);

  if (!customer) {
    return (
      <Screen subtitle={t('common.screens.doorstepPin')}>
        <Card>
          <Text style={styles.empty}>{t('customers.view.notFound')}</Text>
        </Card>
      </Screen>
    );
  }

  async function onSubmit() {
    if (invalid) {
      setError(t('common.geo.invalid'));
      return;
    }

    // An untouched pin keeps its original capture time.
    const unchanged = geo && saved ? geo.lat === saved.lat && geo.lng === saved.lng : !geo && !saved;
    if (unchanged) {
      navigation.goBack();
      return;
    }

    setSubmitting(true);
    try {
      await saveGeo(route.params.customerId, geo);
    } catch (failure) {
      setError(errorMessage(failure));
      setSubmitting(false);
      return;
    }
    setSubmitting(false);
    navigation.goBack();
  }

  return (
    <Screen subtitle={`${customer.name} · ${customer.phone} · ${lineById(customer.lineId)?.name ?? ''}`}>
      <Card title={t('customers.view.address')} subtitle={customer.address}>
        <GeoField
          value={geo}
          error={error}
          savedNote={
            saved
              ? saved.accuracy
                ? t('customers.view.accuracyAt', { metres: saved.accuracy, time: saved.capturedAt })
                : saved.capturedAt
              : undefined
          }
          onChange={(next, bad) => {
            setGeo(next);
            setInvalid(bad);
            setError(undefined);
          }}
        />
      </Card>

      <View style={styles.actions}>
        <Button
          label={geo || !saved ? t('customers.location.save') : t('customers.location.remove')}
          onPress={onSubmit}
          loading={submitting}
        />
        <Button label={t('common.actions.cancel')} variant="ghost" onPress={() => navigation.goBack()} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  actions: { gap: space[3] },
  empty: { ...textStyle('body'), color: colors.textFaint, textAlign: 'center' },
});
