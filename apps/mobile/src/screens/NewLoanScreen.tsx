import { useState } from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { t, tp } from '@lms/i18n';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { DateField } from '../components/DateField';
import { Picker } from '../components/Picker';
import { Screen } from '../components/Screen';
import { TextField } from '../components/TextField';
import { CheckIcon } from '../components/icons';
import { customers, formatCurrency, lineById, submitApplication } from '../lib/data';
import {
  LOAN_TYPES,
  addMonths,
  computeLoan,
  daysFromToday,
  formatDate,
  parseIsoDate,
  todayIso,
  type LoanType,
} from '../lib/loan';
import type { AppStackParamList } from '../navigation/types';
import { colors, fontFamily, palette, radius, space, textStyle } from '../theme';

type Props = NativeStackScreenProps<AppStackParamList, 'NewLoan'>;
type Errors = {
  customerId?: string;
  date?: string;
  amount?: string;
  rate?: string;
  fee?: string;
  tenure?: string;
  emi?: string;
};

const MIN_AMOUNT = 1000;
const MAX_AMOUNT = 1000000;
const MAX_RATE = 60;
const MAX_TENURE = 60;
/** A disbursal can be back-dated for a late entry, but not booked far ahead. */
const MAX_DAYS_AHEAD = 7;

const CUSTOMER_LABELS = customers.map((c) => `${c.name} · ${c.phone}`);
const digits = (value: string) => Number(value.replace(/[^\d]/g, ''));

export function NewLoanScreen({ navigation, route }: Props) {
  // Arriving from a customer's profile preselects them.
  const [customerId, setCustomerId] = useState(() => {
    const preset = route.params?.customerId ?? '';
    return customers.some((c) => c.id === preset) ? preset : '';
  });
  const [date, setDate] = useState(todayIso());
  const [type, setType] = useState<LoanType>('POST');
  const [amount, setAmount] = useState('');
  const [rate, setRate] = useState('');
  const [fee, setFee] = useState('');
  const [tenure, setTenure] = useState('');
  /** Empty means "follow the calculation"; anything else is the officer's call. */
  const [emi, setEmi] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);

  const customer = customers.find((c) => c.id === customerId);
  const principal = digits(amount);
  const rateValue = Number(rate.replace(/[^\d.]/g, ''));
  const feeValue = digits(fee);
  const months = digits(tenure);

  const terms = computeLoan({
    principal,
    annualRatePct: Number.isFinite(rateValue) ? rateValue : 0,
    months,
    fee: feeValue,
    type,
  });
  const emiValue = emi ? digits(emi) : (terms?.emi ?? 0);
  const overridden = !!emi && !!terms && emiValue !== terms.emi;
  const closesOn = months ? addMonths(date, months) : undefined;

  function pickType(next: LoanType) {
    setType(next);
    // The EMI under the old type says nothing about the new one.
    setEmi('');
    setErrors((e) => ({ ...e, emi: undefined }));
  }

  async function onSubmit() {
    const ahead = daysFromToday(date);
    const next: Errors = {
      customerId: customerId ? undefined : t('loans.new.errors.customer'),
      date: !parseIsoDate(date)
        ? t('loans.new.errors.dateInvalid')
        : ahead !== undefined && ahead > MAX_DAYS_AHEAD
          ? t('loans.new.errors.dateAhead', { days: MAX_DAYS_AHEAD })
          : undefined,
      amount: !principal
        ? t('loans.new.errors.amountRequired')
        : principal < MIN_AMOUNT
          ? t('loans.new.errors.amountMin', { amount: formatCurrency(MIN_AMOUNT) })
          : principal > MAX_AMOUNT
            ? t('loans.new.errors.amountMax', { amount: formatCurrency(MAX_AMOUNT) })
            : undefined,
      rate: !rate.trim()
        ? t('loans.new.errors.rateRequired')
        : !Number.isFinite(rateValue) || rateValue <= 0
          ? t('loans.new.errors.rateNumber')
          : rateValue > MAX_RATE
            ? t('loans.new.errors.rateHigh', { rate: MAX_RATE })
            : undefined,
      // The fee is optional, but it comes out of the disbursal — it cannot
      // swallow the loan.
      fee: feeValue > principal / 10 ? t('loans.new.errors.feeHigh') : undefined,
      tenure: !months
        ? t('loans.new.errors.tenureRequired')
        : months > MAX_TENURE
          ? t('loans.new.errors.tenureMax', { count: MAX_TENURE })
          : undefined,
      emi: undefined,
    };

    // Only worth checking once the figures it depends on are sound.
    if (!next.amount && !next.rate && !next.tenure && terms) {
      const collected = emiValue * months;
      if (!emiValue) next.emi = t('loans.new.errors.emiRequired');
      else if (collected < terms.totalPayable)
        next.emi = t('loans.new.errors.emiShort', {
          months,
          emi: formatCurrency(emiValue),
          gap: formatCurrency(terms.totalPayable - collected),
        });
    }

    setErrors(next);
    if (Object.values(next).some(Boolean)) return;

    setSubmitting(true);
    // UI-only for now: POST /loans (status SUBMITTED) goes here.
    await new Promise((resolve) => setTimeout(resolve, 800));
    const application = submitApplication({
      customerId,
      type,
      principal,
      annualRatePct: rateValue,
      months,
      fee: feeValue,
      emi: emiValue,
      disburseOn: date,
    });
    setSubmitting(false);
    // Replace the form, so Back from the review doesn't reopen a submitted loan.
    navigation.replace('ApprovalView', { applicationId: application.id });
  }

  return (
    <Screen subtitle={t('loans.new.subtitle')}>
      <Card title={t('loans.new.borrower')}>
        <View style={styles.stack}>
          <Picker
            label={t('loans.fields.customer')}
            placeholder={t('loans.new.selectCustomer')}
            value={customer ? `${customer.name} · ${customer.phone}` : ''}
            options={CUSTOMER_LABELS}
            onChange={(label) => {
              const picked = customers.find((c) => `${c.name} · ${c.phone}` === label);
              setCustomerId(picked?.id ?? '');
              setErrors((e) => ({ ...e, customerId: undefined }));
            }}
            error={errors.customerId}
            hint={
              customer
                ? t('loans.new.customerMeta', {
                  line: lineById(customer.lineId)?.name ?? '',
                  amount: formatCurrency(customer.requestedAmount),
                })
                : t('loans.new.customerHint')
            }
          />

          <DateField
            label={t('loans.fields.disbursalDate')}
            value={date}
            onChange={setDate}
            error={errors.date}
            hint={t('loans.new.disbursalDateHint')}
          />

          {customer && !customer.proof ? (
            <Pressable
              style={styles.notice}
              onPress={() => navigation.navigate('CustomerProof', { customerId: customer.id })}
              accessibilityRole="button"
            >
              <Text style={styles.noticeText}>
                {t('loans.new.noProof', { name: customer.name })} {t('loans.new.captureProof')}
              </Text>
            </Pressable>
          ) : null}
        </View>
      </Card>

      <Card title={t('loans.new.terms')}>
        <View style={styles.stack}>
          <View>
            <Text style={styles.legend}>{t('loans.fields.loanType')}</Text>
            <View style={styles.typeList}>
              {LOAN_TYPES.map((option) => {
                const on = type === option.id;
                return (
                  <Pressable
                    key={option.id}
                    style={[styles.typeCard, on && styles.typeCardOn]}
                    onPress={() => pickType(option.id)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: on }}
                  >
                    <View style={styles.typeHead}>
                      <Text style={[styles.typeLabel, on && styles.typeLabelOn]}>{option.label}</Text>
                      {on ? <CheckIcon size={16} color={colors.brand} /> : null}
                    </View>
                    <Text style={styles.typeHint}>{option.hint}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <TextField
            label={t('loans.fields.amount')}
            placeholder="45,000"
            keyboardType="number-pad"
            lead={<Text style={styles.prefix}>₹</Text>}
            value={amount}
            error={errors.amount}
            hint={
              principal
                ? formatCurrency(principal)
                : `${formatCurrency(MIN_AMOUNT)}–${formatCurrency(MAX_AMOUNT)}`
            }
            onChangeText={(next) => setAmount(next.replace(/[^\d,]/g, ''))}
          />

          <TextField
            label={t('loans.fields.rate')}
            placeholder="24"
            keyboardType="decimal-pad"
            lead={<Text style={styles.prefix}>%</Text>}
            value={rate}
            error={errors.rate}
            hint={
              rateValue > 0 && Number.isFinite(rateValue)
                ? t('loans.new.rateHint', { rate: rateValue, monthly: (rateValue / 12).toFixed(2) })
                : t('loans.new.rateEmpty')
            }
            onChangeText={(next) => setRate(next.replace(/[^\d.]/g, ''))}
          />

          <TextField
            label={t('loans.fields.fee')}
            placeholder="0"
            keyboardType="number-pad"
            lead={<Text style={styles.prefix}>₹</Text>}
            value={fee}
            error={errors.fee}
            hint={
              feeValue
                ? t('loans.new.feeHint', { amount: formatCurrency(feeValue) })
                : t('loans.new.feeEmpty')
            }
            onChangeText={(next) => setFee(next.replace(/[^\d,]/g, ''))}
          />

          <TextField
            label={t('loans.fields.tenure')}
            placeholder="12"
            keyboardType="number-pad"
            maxLength={2}
            value={tenure}
            error={errors.tenure}
            hint={
              closesOn
                ? tp('loans.new.tenureHint', months, { date: formatDate(closesOn) })
                : t('loans.new.tenureEmpty')
            }
            onChangeText={(next) => setTenure(next.replace(/[^\d]/g, ''))}
          />
        </View>
      </Card>

      <Card
        title={t('loans.new.repayment')}
        subtitle={t('loans.new.repaymentSub')}
      >
        <View style={styles.stack}>
          <TextField
            label={t('loans.fields.emi')}
            placeholder={terms ? String(terms.emi) : t('loans.new.emiPlaceholder')}
            keyboardType="number-pad"
            lead={<Text style={styles.prefix}>₹</Text>}
            value={emi || (terms ? String(terms.emi) : '')}
            error={errors.emi}
            hint={
              overridden && terms
                ? t('loans.new.emiOverridden', { amount: formatCurrency(terms.emi) })
                : t('loans.new.emiAuto')
            }
            onChangeText={(next) => {
              setEmi(next.replace(/[^\d,]/g, ''));
              setErrors((e) => ({ ...e, emi: undefined }));
            }}
          />

          {overridden ? (
            <Pressable onPress={() => setEmi('')} accessibilityRole="button">
              <Text style={styles.reset}>{t('loans.new.resetEmi')}</Text>
            </Pressable>
          ) : null}

          {terms ? (
            <View style={styles.summary}>
              <SummaryRow label={t('loans.fields.principal')} value={formatCurrency(principal)} />
              <SummaryRow
                label={type === 'PRE' ? t('loans.summary.interestUpfront') : t('loans.summary.interestWithEmi')}
                value={formatCurrency(terms.totalInterest)}
              />
              <SummaryRow
                label={t('loans.fields.fee')}
                value={feeValue ? `− ${formatCurrency(feeValue)}` : '—'}
              />
              <SummaryRow label={t('loans.summary.netDisbursal')} value={formatCurrency(terms.netDisbursal)} total />
              <SummaryRow
                label={t('loans.summary.totalPayable')}
                value={formatCurrency(terms.totalPayable)}
                note={months ? `${months} × ${formatCurrency(emiValue)}` : undefined}
                total
              />
            </View>
          ) : (
            <Text style={styles.empty}>{t('loans.new.empty')}</Text>
          )}
        </View>
      </Card>

      <View style={styles.actions}>
        <Button label={t('loans.new.submit')} onPress={onSubmit} loading={submitting} />
        <Button label={t('common.actions.cancel')} variant="ghost" onPress={() => navigation.goBack()} />
      </View>
    </Screen>
  );
}

function SummaryRow({
  label,
  value,
  note,
  total,
}: {
  label: string;
  value: string;
  note?: string;
  total?: boolean;
}) {
  return (
    <View style={[styles.summaryRow, total && styles.summaryRowTotal]}>
      <Text style={[styles.summaryLabel, total && styles.summaryStrong]}>{label}</Text>
      <View>
        <Text style={[styles.summaryValue, total && styles.summaryStrong]}>{value}</Text>
        {note ? <Text style={styles.summaryNote}>{note}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: space[5] },
  actions: { gap: space[3] },
  prefix: { ...textStyle('body', fontFamily.bodySemibold), color: colors.textMuted },
  legend: { ...textStyle('label', fontFamily.bodySemibold), color: colors.text, marginBottom: space[2] },
  typeList: { gap: space[3] },
  typeCard: {
    padding: space[4],
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.bgElevated,
  },
  typeCardOn: { borderColor: colors.brand, backgroundColor: palette.navy050 },
  typeHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  typeLabel: { ...textStyle('body', fontFamily.bodySemibold), color: colors.text },
  typeLabelOn: { color: colors.brand },
  typeHint: { ...textStyle('caption'), color: colors.textFaint, marginTop: space[1] },
  notice: {
    padding: space[3],
    borderRadius: radius.md,
    backgroundColor: palette.gold050,
  },
  noticeText: { ...textStyle('caption'), color: palette.gold700 },
  reset: { ...textStyle('bodySm', fontFamily.bodySemibold), color: colors.brand },
  summary: {
    padding: space[4],
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.bg,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: space[4],
    paddingVertical: space[2],
  },
  // The two figures the officer reads out loud sit apart from the workings.
  summaryRowTotal: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: space[2],
    paddingTop: space[3],
  },
  summaryLabel: { ...textStyle('bodySm'), color: colors.textMuted, flex: 1 },
  summaryValue: { ...textStyle('bodySm'), color: colors.text, textAlign: 'right' },
  summaryStrong: { fontFamily: fontFamily.bodySemibold, color: colors.text },
  summaryNote: { ...textStyle('caption'), color: colors.textFaint, textAlign: 'right' },
  empty: { ...textStyle('bodySm'), color: colors.textFaint, textAlign: 'center' },
});
