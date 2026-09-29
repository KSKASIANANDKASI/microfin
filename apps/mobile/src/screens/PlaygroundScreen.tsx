import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { t, tp } from '@lms/i18n';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Screen } from '../components/Screen';
import { TextField } from '../components/TextField';
import { CheckIcon } from '../components/icons';
import { formatCurrency } from '../lib/data';
import { LOAN_TYPES, computeLoan, finalInstallment, type LoanType } from '../lib/loan';
import { colors, fontFamily, palette, radius, space, textStyle } from '../theme';

/** A typical line loan, so the screen opens with an answer on it. */
const EXAMPLE = { type: 'POST' as LoanType, amount: '45,000', rate: '24', tenure: '12', fee: '500' };

const digits = (value: string) => Number(value.replace(/[^\d]/g, ''));

/**
 * Loan calculator. Same pricing as the booking form (`computeLoan`), with
 * nothing to validate or save — officers use it to quote a customer.
 */
export function PlaygroundScreen() {
  const [type, setType] = useState<LoanType>(EXAMPLE.type);
  const [amount, setAmount] = useState(EXAMPLE.amount);
  const [rate, setRate] = useState(EXAMPLE.rate);
  const [tenure, setTenure] = useState(EXAMPLE.tenure);
  const [fee, setFee] = useState(EXAMPLE.fee);

  const principal = digits(amount);
  const rateValue = Number(rate);
  const months = digits(tenure);
  const feeValue = digits(fee);
  const terms = computeLoan({ principal, annualRatePct: rateValue, months, fee: feeValue, type });
  const last = terms ? finalInstallment(terms, months) : 0;

  function reset() {
    setType(EXAMPLE.type);
    setAmount(EXAMPLE.amount);
    setRate(EXAMPLE.rate);
    setTenure(EXAMPLE.tenure);
    setFee(EXAMPLE.fee);
  }

  return (
    <Screen subtitle={t('playground.subtitle')}>
      {/* Result first: on a phone the answer should be visible without scrolling. */}
      <Card title={t('playground.result')}>
        {terms ? (
          <View style={styles.stack} accessibilityLiveRegion="polite">
            <View style={styles.tiles}>
              <View style={styles.tile}>
                <Text style={styles.tileLabel}>{t('loans.fields.emi')}</Text>
                <Text style={styles.tileValue}>{formatCurrency(terms.emi)}</Text>
                <Text style={styles.tileNote}>
                  {tp('playground.emiNote', months)}
                  {last !== terms.emi
                    ? `\n${t('playground.finalInstallment', { amount: formatCurrency(last) })}`
                    : ''}
                </Text>
              </View>
              <View style={styles.tile}>
                <Text style={styles.tileLabel}>{t('loans.summary.netDisbursal')}</Text>
                <Text style={[styles.tileValue, terms.netDisbursal < 0 && styles.tileValueBad]}>
                  {formatCurrency(terms.netDisbursal)}
                </Text>
                <Text style={styles.tileNote}>
                  {type === 'PRE' ? t('playground.netNotePre') : t('playground.netNotePost')}
                </Text>
              </View>
            </View>

            {terms.netDisbursal < 0 ? (
              <View style={styles.notice}>
                <Text style={styles.noticeText}>{t('playground.negative')}</Text>
              </View>
            ) : null}

            <View style={styles.summary}>
              <SummaryRow label={t('loans.fields.principal')} value={formatCurrency(principal)} />
              <SummaryRow
                label={type === 'PRE' ? t('loans.summary.interestUpfront') : t('loans.summary.interestWithEmi')}
                value={formatCurrency(terms.totalInterest)}
              />
              <SummaryRow label={t('loans.fields.fee')} value={feeValue ? `− ${formatCurrency(feeValue)}` : '—'} />
              <SummaryRow
                label={t('loans.summary.totalPayable')}
                value={formatCurrency(terms.totalPayable)}
                note={
                  last === terms.emi
                    ? `${months} × ${formatCurrency(terms.emi)}`
                    : `${months - 1} × ${formatCurrency(terms.emi)} + ${formatCurrency(last)}`
                }
                total
              />
            </View>
          </View>
        ) : (
          <Text style={styles.empty}>{t('loans.new.empty')}</Text>
        )}
      </Card>

      <Card title={t('playground.terms')}>
        <View style={styles.stack}>
          <View>
            <Text style={styles.legend}>{t('loans.fields.loanType')}</Text>
            <View style={styles.typeList} accessibilityRole="radiogroup">
              {LOAN_TYPES.map((option) => {
                const on = type === option.id;
                return (
                  <Pressable
                    key={option.id}
                    style={[styles.typeCard, on && styles.typeCardOn]}
                    onPress={() => setType(option.id)}
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
            hint={principal ? formatCurrency(principal) : undefined}
            onChangeText={(next) => setAmount(next.replace(/[^\d,]/g, ''))}
          />
          <TextField
            label={t('loans.fields.rate')}
            placeholder="24"
            keyboardType="decimal-pad"
            lead={<Text style={styles.prefix}>%</Text>}
            value={rate}
            hint={
              rateValue > 0 && Number.isFinite(rateValue)
                ? t('loans.new.rateHint', { rate: rateValue, monthly: (rateValue / 12).toFixed(2) })
                : t('loans.new.rateEmpty')
            }
            onChangeText={(next) => setRate(next.replace(/[^\d.]/g, ''))}
          />
          <TextField
            label={t('loans.fields.tenure')}
            placeholder="12"
            keyboardType="number-pad"
            maxLength={2}
            value={tenure}
            hint={months ? tp('loans.summary.months', months) : t('loans.new.tenureEmpty')}
            onChangeText={(next) => setTenure(next.replace(/[^\d]/g, ''))}
          />
          <TextField
            label={t('loans.fields.fee')}
            placeholder="0"
            keyboardType="number-pad"
            lead={<Text style={styles.prefix}>₹</Text>}
            value={fee}
            hint={
              feeValue ? t('loans.new.feeHint', { amount: formatCurrency(feeValue) }) : t('loans.new.feeEmpty')
            }
            onChangeText={(next) => setFee(next.replace(/[^\d,]/g, ''))}
          />
        </View>
      </Card>

      <Button label={t('playground.reset')} variant="ghost" onPress={reset} />
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
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: space[3] },
  tile: {
    flexGrow: 1,
    flexBasis: '46%',
    padding: space[4],
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.bgElevated,
  },
  tileLabel: { ...textStyle('caption'), color: colors.textFaint },
  tileValue: {
    fontFamily: fontFamily.display,
    fontSize: 24,
    lineHeight: 28,
    letterSpacing: -0.4,
    color: colors.text,
    marginTop: space[2],
  },
  tileValueBad: { color: colors.danger },
  tileNote: { ...textStyle('caption'), color: colors.textFaint, marginTop: space[2] },
  notice: {
    padding: space[3],
    borderRadius: radius.md,
    backgroundColor: palette.gold050,
  },
  noticeText: { ...textStyle('caption'), color: palette.gold700 },
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
