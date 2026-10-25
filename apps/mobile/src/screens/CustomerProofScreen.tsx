import { useState } from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { t } from '@lms/i18n';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { FormError, errorMessage } from '../components/bits';
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
  removeProof,
  saveProof,
  type IdType,
  type ProofImage,
} from '../lib/data';
import { normalizeIdNumber, validateIdNumber } from '../lib/validate';
import type { AppStackParamList } from '../navigation/types';
import { colors, fontFamily, radius, space, textStyle } from '../theme';

type Props = NativeStackScreenProps<AppStackParamList, 'CustomerProof'>;
type Errors = {
  type?: string;
  number?: string;
};

export function CustomerProofScreen({ navigation, route }: Props) {
  const customer = customerById(route.params.customerId);
  // Opened on one proof to edit it; otherwise the form adds a new one.
  const opened = customer?.proofs.find((proof) => proof.type === route.params.type);

  const [type, setType] = useState<IdType | ''>(opened?.type ?? '');
  const [number, setNumber] = useState(opened?.number ?? '');
  const [front, setFront] = useState<ProofImage | undefined>(opened?.front);
  const [back, setBack] = useState<ProofImage | undefined>(opened?.back);
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  const [removing, setRemoving] = useState<IdType>();
  const [saveError, setSaveError] = useState<string>();

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

  const onFile = customer.proofs.find((proof) => proof.type === type);

  function selectType(next: IdType | '') {
    if (next === type) return;
    setType(next);
    // Picking a type already on file loads it for editing. Otherwise the typed
    // number belongs to the old ID — its shape almost never survives the
    // switch, so clear it rather than flag it as invalid.
    const existing = customer?.proofs.find((proof) => proof.type === next);
    setNumber(existing?.number ?? '');
    setFront(existing?.front);
    setBack(existing?.back);
    setErrors((e) => ({ ...e, type: undefined, number: undefined }));
  }

  function onTypeChange(label: string) {
    const next = ID_TYPES.find((option) => option.label === label);
    if (next) selectType(next.id);
  }

  function onRemove(proofType: IdType, proofNumber: string) {
    if (!customer) return;
    const question = t('customers.proof.removeConfirm', {
      idType: idTypeLabel(proofType),
      number: maskIdNumber(proofNumber),
      name: customer.name,
    });
    Alert.alert(t('customers.proof.remove'), question, [
      { text: t('common.actions.cancel'), style: 'cancel' },
      {
        text: t('customers.proof.remove'),
        style: 'destructive',
        onPress: async () => {
          setRemoving(proofType);
          setSaveError(undefined);
          try {
            await removeProof(route.params.customerId, proofType);
            if (proofType === type) selectType('');
          } catch (error) {
            setSaveError(errorMessage(error));
          }
          setRemoving(undefined);
        },
      },
    ]);
  }

  async function onSubmit() {
    const next: Errors = {
      type: type ? undefined : t('customers.proof.errors.typeRequired'),
      number: validateIdNumber(type, number),
    };
    setErrors(next);
    if (Object.values(next).some(Boolean)) return;

    if (!type) return;
    setSubmitting(true);
    setSaveError(undefined);
    try {
      await saveProof(route.params.customerId, { type, number: normalizeIdNumber(number), front, back });
    } catch (error) {
      setSaveError(errorMessage(error));
      setSubmitting(false);
      return;
    }
    setSubmitting(false);
    // Back to wherever it was opened from — the customer, the list, or an application under review.
    navigation.goBack();
  }

  return (
    <Screen
      subtitle={`${customer.name} · ${customer.phone} · ${lineById(customer.lineId)?.name ?? ''}`}
    >
      <Card title={t('customers.proof.onFileTitle')} subtitle={customer.proofs.length ? undefined : t('customers.proof.none')}>
        {customer.proofs.map((proof, index) => (
          <View key={proof.type} style={[styles.row, index > 0 && styles.rowDivider]}>
            <View style={styles.avatar}>
              <IdIcon size={16} color={colors.brand} />
            </View>
            <View style={styles.rowMain}>
              <Text style={styles.rowTitle}>{idTypeLabel(proof.type)}</Text>
              <Text style={styles.rowMeta}>{maskIdNumber(proof.number)}</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: proof.type === type }}
              hitSlop={8}
              onPress={() => selectType(proof.type)}
            >
              <Text style={styles.rowAction}>{t('customers.proof.edit')}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={removing !== undefined}
              hitSlop={8}
              onPress={() => onRemove(proof.type, proof.number)}
            >
              <Text style={[styles.rowAction, styles.rowDanger]}>{t('customers.proof.remove')}</Text>
            </Pressable>
          </View>
        ))}
      </Card>

      <Card
        title={onFile ? t('customers.proof.editTitle', { idType: idTypeLabel(onFile.type) }) : t('customers.proof.addTitle')}
        subtitle={onFile ? t('customers.proof.replaces', { idType: idTypeLabel(onFile.type) }) : undefined}
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
              onChange={setBack}
            />
          )}
        </View>
      </Card>

      <View style={styles.actions}>
        <FormError message={saveError} />
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
  row: { flexDirection: 'row', alignItems: 'center', gap: space[3], paddingVertical: space[3] },
  rowDivider: { borderTopWidth: 1, borderTopColor: colors.border },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowMain: { flex: 1, minWidth: 0 },
  rowTitle: { ...textStyle('bodySm', fontFamily.bodySemibold), color: colors.text },
  rowMeta: { ...textStyle('caption'), color: colors.textFaint },
  rowAction: { ...textStyle('bodySm', fontFamily.bodySemibold), color: colors.brand },
  rowDanger: { color: colors.danger },
  empty: { ...textStyle('body'), color: colors.textFaint, textAlign: 'center' },
});
