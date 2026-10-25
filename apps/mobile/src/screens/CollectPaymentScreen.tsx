import { useState } from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { t } from '@lms/i18n';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { DateField } from '../components/DateField';
import { PaymentGeoField } from '../components/PaymentGeoField';
import { Screen } from '../components/Screen';
import { FormError, LinkText, errorMessage } from '../components/bits';
import { Avatar, StatusPill } from '../components/rows';
import { CheckIcon } from '../components/icons';
import {
  PAYMENT_MODES,
  doorstepFor,
  formatCurrency,
  installmentById,
  lineById,
  loanById,
  receiptNo,
  recordPayment,
  type PaymentGeo,
  type PaymentMode,
} from '../lib/data';
import { daysBetween, formatDate, parseIsoDate, todayIso } from '../lib/loan';
import type { AppStackParamList } from '../navigation/types';
import { colors, fontFamily, palette, radius, space, textStyle } from '../theme';

type Props = NativeStackScreenProps<AppStackParamList, 'CollectPayment'>;
type Errors = { date?: string };

export function CollectPaymentScreen({ route, navigation }: Props) {
  const { installmentId } = route.params;
  // Snapshot at mount: receipting flips the row to `collected`, and the form
  // should keep showing what it just took until it navigates away.
  const [installment] = useState(() => installmentById(installmentId));
  const [date, setDate] = useState(todayIso());
  const [mode, setMode] = useState<PaymentMode>('CASH');
  const [geo, setGeo] = useState<PaymentGeo>();
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  const [saveError, setSaveError] = useState<string>();

  if (!installment || installment.status === 'collected') {
    return (
      <Screen subtitle={t('collection.pay.missing')}>
        <Card>
          <LinkText onPress={() => navigation.goBack()}>{t('collection.pay.backToSheet')}</LinkText>
        </Card>
      </Screen>
    );
  }

  const dueOnIso = installment.dueOnIso;

  function validate(value: string): Errors {
    if (!parseIsoDate(value)) return { date: t('collection.pay.errors.dateInvalid') };
    if (value > todayIso()) return { date: t('collection.pay.errors.dateAhead') };
    if (value < dueOnIso) {
      return { date: t('collection.pay.errors.dateBeforeDue', { date: formatDate(dueOnIso) }) };
    }
    return {};
  }

  async function onSubmit() {
    if (!installment) return;

    const next = validate(date);
    setErrors(next);
    if (next.date) return;

    setSubmitting(true);
    setSaveError(undefined);
    try {
      await recordPayment({
        loanId: installment.loanNo,
        seq: installment.seq,
        paidOn: date,
        mode,
        geo: date === todayIso() ? geo : undefined,
      });
    } catch (error) {
      setSaveError(errorMessage(error));
      setSubmitting(false);
      return;
    }
    setSubmitting(false);
    navigation.goBack();
  }

  return (
    <Screen subtitle={t('collection.pay.subtitle', { seq: installment.seq, loanNo: installment.loanNo })}>
      <Card title={t('collection.pay.installment')}>
        <View style={styles.identity}>
          <Avatar name={installment.customer} />
          <View style={styles.main}>
            <Text style={styles.name}>{installment.customer}</Text>
            <Text style={styles.meta} numberOfLines={1}>
              {loanById(installment.loanNo) ? (
                <LinkText onPress={() => navigation.navigate('LoanView', { loanId: installment.loanNo })}>
                  {installment.loanNo}
                </LinkText>
              ) : (
                installment.loanNo
              )}
              {` · ${lineById(installment.lineId)?.name ?? ''}`}
            </Text>
          </View>
          <StatusPill status={installment.status} daysLate={installment.daysLate} />
        </View>

        <View style={styles.summary}>
          <SummaryRow label={t('collection.pay.dueOn')} value={formatDate(dueOnIso)} />
          <SummaryRow
            label={t('collection.pay.receiptNo')}
            value={receiptNo(installment.loanNo, installment.seq)}
          />
          <SummaryRow label={t('collection.pay.amount')} value={formatCurrency(installment.amount)} total />
        </View>
      </Card>

      <Card title={t('collection.pay.details')}>
        <View style={styles.stack}>
          <DateField
            label={t('collection.pay.date')}
            value={date}
            minimumDate={parseIsoDate(dueOnIso)}
            maximumDate={parseIsoDate(todayIso())}
            error={errors.date}
            hint={errors.date ? undefined : dateHint(date, dueOnIso)}
            onChange={(next) => {
              setDate(next);
              setErrors({});
            }}
          />

          <View>
            <Text style={styles.legend}>{t('collection.pay.mode')}</Text>
            <View style={styles.modeList}>
              {PAYMENT_MODES.map((option) => {
                const on = mode === option.id;
                return (
                  <Pressable
                    key={option.id}
                    style={[styles.modeCard, on && styles.modeCardOn]}
                    onPress={() => setMode(option.id)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: on }}
                  >
                    <View style={styles.modeHead}>
                      <Text style={[styles.modeLabel, on && styles.modeLabelOn]}>{option.label}</Text>
                      {on ? <CheckIcon size={16} color={colors.brand} /> : null}
                    </View>
                    <Text style={styles.modeHint}>{option.hint}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <PaymentGeoField
            value={geo}
            onChange={setGeo}
            doorstep={doorstepFor(installment.loanNo)}
            backdated={date !== todayIso()}
          />
        </View>
      </Card>

      <View style={styles.actions}>
        <FormError message={saveError} />
        <Button label={t('collection.pay.submit')} onPress={onSubmit} loading={submitting} />
        <Button label={t('common.actions.cancel')} variant="ghost" onPress={() => navigation.goBack()} />
      </View>
    </Screen>
  );
}

/** Spells the date back out, and says how late the receipt lands. */
function dateHint(date: string, dueOnIso: string): string {
  if (!parseIsoDate(date)) return t('collection.pay.dateHint');
  const late = Math.max(0, daysBetween(dueOnIso, date) ?? 0);
  return `${formatDate(date)} · ${late ? t('common.status.daysLate', { count: late }) : t('collection.pay.onTime')}`;
}

function SummaryRow({ label, value, total }: { label: string; value: string; total?: boolean }) {
  return (
    <View style={[styles.summaryRow, total && styles.summaryRowTotal]}>
      <Text style={[styles.summaryLabel, total && styles.summaryStrong]}>{label}</Text>
      <Text style={[styles.summaryValue, total && styles.summaryStrong]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  identity: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  main: { flex: 1 },
  name: { ...textStyle('bodySm', fontFamily.bodySemibold), color: colors.text },
  meta: { ...textStyle('caption'), color: colors.textMuted, marginTop: space[1] },
  summary: {
    marginTop: space[4],
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: space[2],
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: space[4],
    paddingVertical: space[2],
  },
  summaryRowTotal: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: space[2],
    paddingTop: space[3],
  },
  summaryLabel: { ...textStyle('bodySm'), color: colors.textMuted, flex: 1 },
  summaryValue: { ...textStyle('bodySm'), color: colors.text, textAlign: 'right' },
  summaryStrong: { fontFamily: fontFamily.bodySemibold, color: colors.text },
  stack: { gap: space[5] },
  legend: {
    ...textStyle('label', fontFamily.bodySemibold),
    color: colors.text,
    marginBottom: space[2],
  },
  modeList: { gap: space[3] },
  modeCard: {
    padding: space[4],
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.bgElevated,
  },
  modeCardOn: { borderColor: colors.brand, backgroundColor: palette.navy050 },
  modeHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  modeLabel: { ...textStyle('bodySm', fontFamily.bodySemibold), color: colors.text },
  modeLabelOn: { color: colors.brand },
  modeHint: { ...textStyle('caption'), color: colors.textMuted, marginTop: space[1] },
  actions: { gap: space[3] },
});
