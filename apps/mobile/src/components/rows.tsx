import { t } from '@lms/i18n';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { chart } from '@lms/theme';
import { colors, fontFamily, palette, radius, space, textStyle } from '../theme';
import { formatCurrency, type LoanState } from '../lib/data';

export function Avatar({ name }: { name: string }) {
  const initials = name
    .split(' ')
    .map((part) => part[0])
    .join('');
  return (
    <View style={styles.avatar}>
      <Text style={styles.avatarText}>{initials}</Text>
    </View>
  );
}

export function StatusPill({
  status,
  daysLate,
}: {
  status: 'due' | 'overdue' | 'collected';
  daysLate: number;
}) {
  const map = {
    collected: { tone: 'good', label: t('common.status.collected'), bg: palette.successBg, fg: colors.success },
    due: { tone: 'warning', label: t('common.status.dueToday'), bg: palette.gold050, fg: palette.warning },
    overdue: { tone: 'critical', label: t('common.status.daysLate', { count: daysLate }), bg: palette.dangerBg, fg: colors.danger },
  } as const;
  const { tone, label, bg, fg } = map[status];

  return (
    <View style={[styles.pill, { backgroundColor: bg }]}>
      <View style={[styles.dot, { backgroundColor: chart.status[tone] }]} />
      <Text style={[styles.pillText, { color: fg }]}>{label}</Text>
    </View>
  );
}

/** Where a booked loan stands, as derived by `summarizeLoan`. */
export function LoanStatePill({ state, daysLate }: { state: LoanState; daysLate: number }) {
  const { label, bg, fg } =
    state === 'closed'
      ? { label: t('common.status.closed'), bg: colors.bg, fg: colors.textMuted }
      : state === 'overdue'
        ? { label: t('common.status.daysOverdue', { count: daysLate }), bg: palette.dangerBg, fg: colors.danger }
        : { label: t('common.status.active'), bg: palette.successBg, fg: colors.success };

  return (
    <View style={[styles.pill, { backgroundColor: bg }]}>
      <Text style={[styles.pillText, { color: fg }]}>{label}</Text>
    </View>
  );
}

/** One installment: name + meta on the left, amount and state on the right. */
export function InstallmentRow({
  customer,
  meta,
  amount,
  status,
  daysLate,
  action,
  onPress,
  accessibilityHint,
}: {
  customer: string;
  meta: string;
  amount: number;
  status: 'due' | 'overdue' | 'collected';
  daysLate: number;
  action?: React.ReactNode;
  /** Opens the loan behind the installment, when there is one to open. */
  onPress?: () => void;
  accessibilityHint?: string;
}) {
  return (
    <View style={styles.row}>
      <Pressable
        style={styles.identity}
        onPress={onPress}
        disabled={!onPress}
        accessibilityRole={onPress ? 'button' : undefined}
        accessibilityHint={accessibilityHint}
      >
        <Avatar name={customer} />
        <View style={styles.main}>
          <Text style={styles.name}>{customer}</Text>
          <Text style={styles.meta} numberOfLines={1}>
            {meta}
          </Text>
        </View>
        <Text style={styles.amount}>{formatCurrency(amount)}</Text>
      </Pressable>

      {/* State and action share a second line, indented past the avatar, so the
          meta line never has to compete with them for width. */}
      <View style={styles.footer}>
        <StatusPill status={status} daysLate={daysLate} />
        {action}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    width: 38,
    height: 38,
    borderRadius: radius.pill,
    backgroundColor: palette.navy050,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: colors.brand,
    fontFamily: fontFamily.bodyBold,
    fontSize: 12,
  },
  row: {
    gap: space[3],
    paddingVertical: space[4],
    paddingHorizontal: space[5],
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  identity: { flexDirection: 'row', alignItems: 'center', gap: space[4] },
  main: { flex: 1, minWidth: 0 },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space[3],
    paddingLeft: 38 + space[4],
  },
  name: { ...textStyle('bodySm', fontFamily.bodySemibold), color: colors.text },
  meta: { ...textStyle('caption'), color: colors.textFaint },
  amount: { ...textStyle('bodySm', fontFamily.bodyBold), color: colors.text },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    paddingVertical: 4,
    paddingHorizontal: space[3],
    borderRadius: radius.pill,
  },
  pillText: { ...textStyle('caption', fontFamily.bodySemibold) },
  dot: { width: 9, height: 9, borderRadius: 5 },
});
