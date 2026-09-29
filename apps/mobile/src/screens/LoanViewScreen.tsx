import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { t, tp, type MessageKey } from '@lms/i18n';
import { AccentBar, accentOverlay, Card } from '../components/Card';
import { Screen } from '../components/Screen';
import { TintFill } from '../components/TintFill';
import { LoanStatePill } from '../components/rows';
import {
  customerById,
  formatCurrency,
  lineById,
  loanById,
  officerLabel,
  summarizeLoan,
  type Repayment,
} from '../lib/data';
import { addMonths, formatDate, loanTypeLabel, type ScheduleRow } from '../lib/loan';
import type { AppStackParamList } from '../navigation/types';
import { colors, fontFamily, palette, radius, space, textStyle } from '../theme';

type Props = NativeStackScreenProps<AppStackParamList, 'LoanView'>;

export function LoanViewScreen({ navigation, route }: Props) {
  const loan = loanById(route.params.loanId);

  if (!loan) {
    return (
      <Screen subtitle={t('loans.view.title')}>
        <Card>
          <Text style={styles.empty}>{t('loans.view.notFound', { id: route.params.loanId })}</Text>
        </Card>
      </Screen>
    );
  }

  const customer = customerById(loan.customerId);
  const line = lineById(loan.lineId);
  const summary = summarizeLoan(loan);
  const { schedule, next } = summary;
  const paidCount = summary.repayments.length;
  const onTime = summary.repayments.filter((r) => r.daysLate === 0).length;
  const closesOn = addMonths(loan.disbursedOn, loan.months);
  const repaidPct = summary.totalPayable
    ? Math.min(100, Math.round((summary.paid / summary.totalPayable) * 100))
    : 0;

  return (
    <Screen subtitle={line ? `${line.name} · ${officerLabel(line.officer)}` : t('loans.view.noLine')}>
      <View style={styles.hero}>
        <TintFill from={palette.navy050} via="#F5F8FD" to={palette.gold050} />
        <View style={styles.heroTop}>
        <View style={styles.flex}>
          {customer ? (
            <Pressable
              onPress={() => navigation.navigate('CustomerView', { customerId: customer.id })}
              accessibilityRole="link"
              hitSlop={6}
            >
              <Text style={styles.heroName}>{customer.name}</Text>
            </Pressable>
          ) : (
            <Text style={styles.heroName}>{t('loans.view.unknownCustomer')}</Text>
          )}
          <Text style={styles.meta}>
            {t('loans.view.typeMeta', { type: loanTypeLabel(loan.type), rate: loan.annualRatePct })}
          </Text>
        </View>
        <LoanStatePill state={summary.state} daysLate={summary.daysLate} />
        </View>

        <View>
          <View style={styles.progressHead}>
            <Text style={styles.progressText}>{t('loans.view.repaidPct', { pct: repaidPct })}</Text>
            <Text style={styles.progressText}>
              {formatCurrency(summary.paid)} / {formatCurrency(summary.totalPayable)}
            </Text>
          </View>
          <View
            style={styles.track}
            accessibilityRole="progressbar"
            accessibilityLabel={t('loans.view.repaidLabel')}
            accessibilityValue={{ min: 0, max: 100, now: repaidPct }}
          >
            <View style={[styles.bar, { width: `${repaidPct}%` }]} />
          </View>
        </View>
      </View>

      <View style={styles.kpis}>
        <Kpi
          label={t('loans.view.outstanding')}
          value={formatCurrency(summary.outstanding)}
          note={t('loans.view.ofAmount', { amount: formatCurrency(summary.totalPayable) })}
        />
        <Kpi
          label={t('loans.view.paidSoFar')}
          value={formatCurrency(summary.paid)}
          note={tp('loans.view.installmentsPaid', schedule.length, { paid: paidCount })}
        />
        <Kpi label={t('loans.view.emi')} value={formatCurrency(loan.emi)} note={t('loans.view.monthly')} />
        <Kpi
          label={t('loans.view.nextDue')}
          value={next ? formatCurrency(next.amount) : '—'}
          note={
            next
              ? next.status === 'overdue'
                ? `${formatDate(next.dueOn)} · ${t('common.status.daysLate', { count: next.daysLate })}`
                : next.status === 'due'
                  ? t('common.status.dueToday')
                  : formatDate(next.dueOn)
              : t('loans.view.fullyRepaid')
          }
          bad={next?.status === 'overdue'}
        />
      </View>

      <Card title={t('loans.view.terms')}>
        <View style={styles.summary}>
          <SummaryRow label={t('loans.fields.principal')} value={formatCurrency(loan.principal)} />
          <SummaryRow label={t('loans.fields.rate')} value={t('loans.summary.ratePerYear', { rate: loan.annualRatePct })} />
          <SummaryRow
            label={loan.type === 'PRE' ? t('loans.summary.interestUpfront') : t('loans.summary.interestWithEmi')}
            value={formatCurrency(summary.totalInterest)}
          />
          <SummaryRow label={t('loans.fields.fee')} value={loan.fee ? `− ${formatCurrency(loan.fee)}` : '—'} />
          <SummaryRow
            label={t('loans.fields.tenure')}
            value={tp('loans.summary.months', loan.months)}
            note={`${formatDate(loan.disbursedOn)} → ${closesOn ? formatDate(closesOn) : '—'}`}
          />
          <SummaryRow label={t('loans.summary.netDisbursal')} value={formatCurrency(summary.netDisbursal)} total />
          <SummaryRow label={t('loans.summary.totalPayable')} value={formatCurrency(summary.totalPayable)} total />
        </View>
      </Card>

      <Card title={t('loans.view.schedule')} subtitle={t('loans.view.scheduleSub')} padded={false}>
        <View style={styles.listTop}>
          {schedule.map((row) => (
            <InstallmentLine key={row.seq} row={row} isNext={row.seq === next?.seq} />
          ))}
        </View>
      </Card>

      <Card
        title={t('loans.view.history')}
        subtitle={
          paidCount
            ? tp('loans.view.historySummary', paidCount, { onTime, late: paidCount - onTime })
            : t('loans.view.historyEmpty')
        }
        padded={false}
      >
        <View style={styles.listTop}>
          {paidCount ? (
            summary.repayments.map((repayment) => (
              <RepaymentLine key={repayment.seq} repayment={repayment} of={schedule.length} />
            ))
          ) : (
            <Text style={styles.empty}>
              {t('loans.view.firstDue', { date: next ? formatDate(next.dueOn) : '—' })}
            </Text>
          )}
        </View>
      </Card>
    </Screen>
  );
}

function Kpi({ label, value, note, bad }: { label: string; value: string; note: string; bad?: boolean }) {
  return (
    <View style={styles.kpi}>
      <View style={accentOverlay}>
        <AccentBar />
      </View>
      <Text style={styles.kpiLabel}>{label}</Text>
      <Text style={styles.kpiValue}>{value}</Text>
      <Text style={[styles.kpiNote, bad && styles.kpiNoteBad]}>{note}</Text>
    </View>
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

const INSTALLMENT_STATUS: Record<'paid' | 'due' | 'upcoming', { labelKey: MessageKey; bg: string; fg: string }> = {
  paid: { labelKey: 'common.status.paid', bg: palette.successBg, fg: colors.success },
  due: { labelKey: 'common.status.dueToday', bg: palette.gold050, fg: palette.warning },
  upcoming: { labelKey: 'common.status.upcoming', bg: colors.bg, fg: colors.textMuted },
};

/** One schedule row: number and date on the left, amount and state on the right. */
function InstallmentLine({ row, isNext }: { row: ScheduleRow; isNext: boolean }) {
  const pill =
    row.status === 'overdue'
      ? { label: t('common.status.daysLate', { count: row.daysLate }), bg: palette.dangerBg, fg: colors.danger }
      : { ...INSTALLMENT_STATUS[row.status], label: t(INSTALLMENT_STATUS[row.status].labelKey) };

  return (
    <View style={[styles.line, isNext && styles.lineNext]}>
      <Text style={styles.seq}>{row.seq}</Text>
      <View style={styles.flex}>
        <Text style={[styles.lineDate, isNext && styles.lineStrong]}>{formatDate(row.dueOn)}</Text>
        <Text style={styles.meta}>
          {row.paidOn
            ? t('loans.view.paidBalance', { date: formatDate(row.paidOn), amount: formatCurrency(row.balanceAfter) })
            : t('loans.view.balance', { amount: formatCurrency(row.balanceAfter) })}
        </Text>
      </View>
      <View style={styles.lineRight}>
        <Text style={styles.amount}>{formatCurrency(row.amount)}</Text>
        <View style={[styles.pill, { backgroundColor: pill.bg }]}>
          <Text style={[styles.pillText, { color: pill.fg }]}>{pill.label}</Text>
        </View>
      </View>
    </View>
  );
}

/** One receipt: date and receipt number on the left, amount and timeliness on the right. */
function RepaymentLine({ repayment, of }: { repayment: Repayment; of: number }) {
  const late = repayment.daysLate > 0;

  return (
    <View style={styles.line}>
      <View style={styles.flex}>
        <Text style={[styles.lineDate, styles.lineStrong]}>{formatDate(repayment.paidOn)}</Text>
        <Text style={styles.meta}>
          {t('loans.view.receiptLine', { receipt: repayment.receiptNo, seq: repayment.seq, total: of })}
        </Text>
      </View>
      <View style={styles.lineRight}>
        <Text style={styles.amount}>{formatCurrency(repayment.amount)}</Text>
        <View style={[styles.pill, { backgroundColor: late ? palette.gold050 : palette.successBg }]}>
          <Text style={[styles.pillText, { color: late ? palette.warning : colors.success }]}>
            {late ? t('common.status.daysLate', { count: repayment.daysLate }) : t('loans.view.onTime')}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  // Soft navy→gold wash, matching `.loanhero` on web.
  hero: {
    gap: space[4],
    padding: space[4],
    borderWidth: 1,
    borderColor: palette.navy050,
    borderRadius: radius.lg,
    backgroundColor: palette.navy050,
    // Clips the tint to the rounded corners.
    overflow: 'hidden',
  },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: space[4] },
  progressHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: space[3],
    marginBottom: space[2],
  },
  progressText: { ...textStyle('caption', fontFamily.bodySemibold), color: colors.textMuted },
  track: {
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderWidth: 1,
    borderColor: palette.navy050,
    overflow: 'hidden',
  },
  bar: { height: '100%', borderRadius: radius.pill, backgroundColor: palette.navy600 },
  heroName: { ...textStyle('h3', fontFamily.bodySemibold), color: colors.brand },
  meta: { ...textStyle('caption'), color: colors.textFaint },
  kpis: { flexDirection: 'row', flexWrap: 'wrap', gap: space[3] },
  kpi: {
    flexGrow: 1,
    flexBasis: '46%',
    padding: space[4],
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.bgElevated,
    overflow: 'hidden',
  },
  kpiLabel: { ...textStyle('caption'), color: colors.textFaint },
  kpiValue: {
    fontFamily: fontFamily.display,
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: -0.4,
    color: colors.text,
    marginTop: space[2],
  },
  kpiNote: { ...textStyle('caption'), color: colors.textFaint, marginTop: space[1] },
  kpiNoteBad: { fontFamily: fontFamily.bodySemibold, color: colors.danger },
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
  listTop: { marginTop: space[4], borderTopWidth: 1, borderTopColor: colors.border },
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    paddingVertical: space[3],
    paddingHorizontal: space[5],
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  // The installment the officer collects next.
  lineNext: { backgroundColor: palette.gold050 },
  seq: { ...textStyle('caption', fontFamily.bodySemibold), color: colors.textFaint, width: 20 },
  lineDate: { ...textStyle('bodySm'), color: colors.text },
  lineStrong: { fontFamily: fontFamily.bodySemibold },
  lineRight: { alignItems: 'flex-end', gap: space[1] },
  amount: { ...textStyle('bodySm', fontFamily.bodyBold), color: colors.text },
  pill: { paddingVertical: 2, paddingHorizontal: space[3], borderRadius: radius.pill },
  pillText: { ...textStyle('caption', fontFamily.bodySemibold) },
  empty: { ...textStyle('bodySm'), color: colors.textFaint, textAlign: 'center', padding: space[7] },
});
