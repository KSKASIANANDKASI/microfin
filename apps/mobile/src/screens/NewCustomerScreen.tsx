import { useState } from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { t } from '@lms/i18n';
import { StyleSheet, Text, View } from 'react-native';
import { FormError, errorMessage } from '../components/bits';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { GeoField, type Geo } from '../components/GeoField';
import { Picker } from '../components/Picker';
import { Screen } from '../components/Screen';
import { TextField } from '../components/TextField';
import { PhoneIcon, UserIcon } from '../components/icons';
import { createCustomer, formatCurrency, lineById, lines } from '../lib/data';
import { validatePhone } from '../lib/validate';
import type { AppStackParamList } from '../navigation/types';
import { colors, fontFamily, space, textStyle } from '../theme';

type Props = NativeStackScreenProps<AppStackParamList, 'NewCustomer'>;
type Errors = {
  name?: string;
  phone?: string;
  altPhone?: string;
  parentName?: string;
  address?: string;
  amount?: string;
  line?: string;
  geo?: string;
};

const MIN_AMOUNT = 1000;
const MAX_AMOUNT = 1000000;

export function NewCustomerScreen({ navigation }: Props) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [altPhone, setAltPhone] = useState('');
  const [parentName, setParentName] = useState('');
  const [address, setAddress] = useState('');
  const [amount, setAmount] = useState('');
  // The line's id (its code) — what the server looks the line up by. The picker shows names.
  const [line, setLine] = useState('');
  const [geo, setGeo] = useState<Geo>();
  const [geoInvalid, setGeoInvalid] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  const [saveError, setSaveError] = useState<string>();

  const amountValue = Number(amount.replace(/[^\d]/g, ''));

  async function onSubmit() {
    const next: Errors = {
      name: name.trim() ? undefined : t('customers.form.errors.nameRequired'),
      phone: validatePhone(phone),
      // Optional, but a duplicate of the primary is a data-entry slip.
      altPhone: !altPhone.trim()
        ? undefined
        : validatePhone(altPhone) ??
          (altPhone.replace(/\D/g, '') === phone.replace(/\D/g, '')
            ? t('customers.form.errors.altPhoneSame')
            : undefined),
      parentName: parentName.trim() ? undefined : t('customers.form.errors.parentRequired'),
      address: address.trim() ? undefined : t('customers.form.errors.addressRequired'),
      amount: !amountValue
        ? t('customers.form.errors.amountRequired')
        : amountValue < MIN_AMOUNT
          ? t('customers.form.errors.amountMin', { amount: formatCurrency(MIN_AMOUNT) })
          : amountValue > MAX_AMOUNT
            ? t('customers.form.errors.amountMax', { amount: formatCurrency(MAX_AMOUNT) })
            : undefined,
      line: line ? undefined : t('customers.form.errors.lineRequired'),
      geo: geoInvalid ? t('common.geo.invalid') : undefined,
    };
    setErrors(next);
    if (Object.values(next).some(Boolean)) return;

    setSubmitting(true);
    setSaveError(undefined);
    try {
      await createCustomer({
        name: name.trim(),
        phone: phone.replace(/\D/g, ''),
        altPhone: altPhone.replace(/\D/g, '') || undefined,
        parentName: parentName.trim(),
        address: address.trim(),
        requestedAmount: amountValue,
        lineId: line,
        geo,
      });
    } catch (error) {
      setSaveError(errorMessage(error));
      setSubmitting(false);
      return;
    }
    setSubmitting(false);
    navigation.popTo('Main', { screen: 'Customers' });
  }

  return (
    <Screen subtitle={t('customers.form.subtitle')}>
      <Card title={t('customers.form.identity')}>
        <View style={styles.stack}>
          <TextField
            label={t('customers.form.name')}
            placeholder="Revathi Murugan"
            autoComplete="name"
            lead={<UserIcon />}
            value={name}
            error={errors.name}
            onChangeText={setName}
          />

          <TextField
            label={t('customers.form.parentName')}
            placeholder="Murugan Subramani"
            lead={<UserIcon />}
            value={parentName}
            error={errors.parentName}
            hint={t('customers.form.parentHint')}
            onChangeText={setParentName}
          />

          <TextField
            label={t('customers.form.phone')}
            placeholder="98765 43210"
            keyboardType="number-pad"
            maxLength={11}
            autoComplete="tel"
            lead={<PhoneIcon />}
            value={phone}
            error={errors.phone}
            onChangeText={(next) => setPhone(next.replace(/[^\d\s]/g, ''))}
          />

          <TextField
            label={t('customers.form.altPhone')}
            placeholder={t('customers.form.optional')}
            keyboardType="number-pad"
            maxLength={11}
            lead={<PhoneIcon />}
            value={altPhone}
            error={errors.altPhone}
            onChangeText={(next) => setAltPhone(next.replace(/[^\d\s]/g, ''))}
          />
        </View>
      </Card>

      <Card title={t('customers.form.whereTheyAre')}>
        <View style={styles.stack}>
          <TextField
            label={t('customers.form.address')}
            placeholder={t('customers.form.addressPlaceholder')}
            value={address}
            error={errors.address}
            onChangeText={setAddress}
            multiline
            numberOfLines={3}
            style={styles.area}
            textAlignVertical="top"
          />

          <GeoField
            value={geo}
            error={errors.geo}
            onChange={(next, invalid) => {
              setGeo(next);
              setGeoInvalid(invalid);
            }}
          />
        </View>
      </Card>

      <Card title={t('customers.form.loanRequest')}>
        <View style={styles.stack}>
          <TextField
            label={t('customers.form.amount')}
            placeholder="45,000"
            keyboardType="number-pad"
            lead={<Text style={styles.prefix}>₹</Text>}
            value={amount}
            error={errors.amount}
            hint={
              amountValue
                ? formatCurrency(amountValue)
                : t('customers.form.amountRange', {
                    min: formatCurrency(MIN_AMOUNT),
                    max: formatCurrency(MAX_AMOUNT),
                  })
            }
            onChangeText={(next) => setAmount(next.replace(/[^\d,]/g, ''))}
          />

          <Picker
            label={t('customers.form.line')}
            placeholder={t('customers.form.selectLine')}
            value={lineById(line)?.name ?? ''}
            options={lines.map((l) => l.name)}
            onChange={(name) => {
              setLine(lines.find((l) => l.name === name)?.id ?? '');
              setErrors((e) => ({ ...e, line: undefined }));
            }}
            error={errors.line}
            hint={t('customers.form.lineHint')}
          />
        </View>
      </Card>

      <View style={styles.actions}>
        <FormError message={saveError} />
        <Button label={t('customers.form.save')} onPress={onSubmit} loading={submitting} />
        <Button label={t('common.actions.cancel')} variant="ghost" onPress={() => navigation.goBack()} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  stack: { gap: space[5] },
  area: { minHeight: 72, paddingTop: space[2], paddingBottom: space[2] },
  prefix: { ...textStyle('body', fontFamily.bodySemibold), color: colors.textMuted },
  actions: { gap: space[3] },
});
