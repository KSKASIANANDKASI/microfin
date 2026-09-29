import { useState } from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { t } from '@lms/i18n';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { ImageField } from '../components/ImageField';
import { Picker } from '../components/Picker';
import { Screen } from '../components/Screen';
import { TextField } from '../components/TextField';
import { IdIcon } from '../components/icons';
import {
  ID_TYPES,
  customerById,
  idTypeById,
  idTypeLabel,
  lineById,
  maskIdNumber,
  saveProof,
  type IdType,
  type ProofImage,
} from '../lib/data';
import { normalizeIdNumber, validateIdNumber } from '../lib/validate';
import type { AppStackParamList } from '../navigation/types';
import { colors, space, textStyle } from '../theme';

type Props = NativeStackScreenProps<AppStackParamList, 'CustomerProof'>;
type Errors = {
  type?: string;
  number?: string;
  front?: string;
  back?: string;
};

export function CustomerProofScreen({ navigation, route }: Props) {
  const customer = customerById(route.params.customerId);

  const [type, setType] = useState<IdType | ''>(customer?.proof?.type ?? '');
  const [number, setNumber] = useState(customer?.proof?.number ?? '');
  const [front, setFront] = useState<ProofImage | undefined>(customer?.proof?.front);
  const [back, setBack] = useState<ProofImage | undefined>(customer?.proof?.back);
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);

  if (!customer) {
    return (
      <Screen subtitle={t('common.screens.identityProof')}>
        <Card>
          <Text style={styles.empty}>{t('customers.view.notFound')}</Text>
        </Card>
      </Screen>
    );
  }

  const selected = idTypeById(type);
  // Built at render so the labels follow the active language.
  const typeLabels = ID_TYPES.map((option) => option.label);
  // Aadhaar is digits and spaces; every other ID mixes letters and digits.
  const numeric = type === 'AADHAAR';

  function onTypeChange(label: string) {
    const next = ID_TYPES.find((option) => option.label === label);
    if (!next) return;
    setType(next.id);
    // The number typed belongs to the old ID — its shape almost never survives
    // the switch, so clear it rather than flag it as invalid.
    if (next.id !== type) setNumber('');
    setErrors((e) => ({ ...e, type: undefined, number: undefined }));
  }

  async function onSubmit() {
    const twoSided = selected?.twoSided ?? false;
    const next: Errors = {
      type: type ? undefined : t('customers.proof.errors.typeRequired'),
      number: validateIdNumber(type, number),
      front: front ? undefined : t('customers.proof.errors.frontRequired'),
      back: !twoSided || back ? undefined : t('customers.proof.errors.backRequired'),
    };
    setErrors(next);
    if (Object.values(next).some(Boolean)) return;

    setSubmitting(true);
    // UI-only for now. The real call uploads both images, then PUTs
    // { idType, idNumber } to /customers/:id/kyc.
    await new Promise((resolve) => setTimeout(resolve, 800));
    if (type) saveProof(route.params.customerId, { type, number: normalizeIdNumber(number), front, back });
    setSubmitting(false);
    // Back to wherever it was opened from — the customer, the list, or an application under review.
    navigation.goBack();
  }

  return (
    <Screen
      subtitle={`${customer.name} · ${customer.phone} · ${lineById(customer.lineId)?.name ?? ''}`}
    >
      <Card
        title={t('common.screens.identityProof')}
        subtitle={
          customer.proof
            ? t('customers.proof.onFile', {
                idType: idTypeLabel(customer.proof.type),
                number: maskIdNumber(customer.proof.number),
              })
            : t('customers.proof.none')
        }
      >
        <View style={styles.stack}>
          <Picker
            label={t('customers.proof.idType')}
            placeholder={t('customers.proof.selectIdType')}
            value={selected?.label ?? ''}
            options={typeLabels}
            onChange={onTypeChange}
            error={errors.type}
            hint={t('customers.proof.idTypeHint')}
          />

          <TextField
            label={t('customers.proof.idNumber')}
            placeholder={selected?.placeholder ?? t('customers.proof.chooseTypeFirst')}
            lead={<IdIcon size={18} />}
            keyboardType={numeric ? 'number-pad' : 'default'}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={24}
            value={number}
            error={errors.number}
            hint={
              number && !errors.number
                ? t('customers.proof.storedAs', { number: normalizeIdNumber(number) })
                : t('customers.proof.spacesFine')
            }
            onChangeText={(next) =>
              setNumber(
                numeric
                  ? next.replace(/[^\d\s]/g, '')
                  : next.replace(/[^a-zA-Z0-9\s-]/g, '').toUpperCase(),
              )
            }
          />
        </View>
      </Card>

      <Card title={t('customers.proof.images')} subtitle={t('customers.proof.imagesHint')}>
        <View style={styles.stack}>
          <ImageField
            label={t('customers.proof.front')}
            hint={t('customers.proof.frontHint')}
            value={front}
            error={errors.front}
            onChange={setFront}
          />

          {selected && !selected.twoSided ? (
            <Text style={styles.note}>
              {t('customers.proof.noBack', { idType: selected.label })}
            </Text>
          ) : (
            <ImageField
              label={t('customers.proof.back')}
              hint={t('customers.proof.backHint')}
              value={back}
              error={errors.back}
              onChange={setBack}
            />
          )}
        </View>
      </Card>

      <View style={styles.actions}>
        <Button label={t('customers.proof.save')} onPress={onSubmit} loading={submitting} />
        <Button label={t('common.actions.cancel')} variant="ghost" onPress={() => navigation.goBack()} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  stack: { gap: space[5] },
  actions: { gap: space[3] },
  note: { ...textStyle('caption'), color: colors.textFaint },
  empty: { ...textStyle('body'), color: colors.textFaint, textAlign: 'center' },
});
