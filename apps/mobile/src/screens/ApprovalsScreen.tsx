import { useState } from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { t, tp } from '@lms/i18n';
import { Card } from '../components/Card';
import { Screen } from '../components/Screen';
import { Avatar } from '../components/rows';
import {
  customerById,
  formatCurrency,
  lineById,
  type ApplicationStatus,
  type LoanApplication,
} from '../lib/data';
import { formatDate, loanTypeLabel } from '../lib/loan';
import { useApplications } from '../lib/useApplications';
import type { AppStackParamList } from '../navigation/types';
import { colors, fontFamily, palette, radius, space, textStyle } from '../theme';

type Props = NativeStackScreenProps<AppStackParamList, 'Approvals'>;

const FILTERS: ApplicationStatus[] = ['pending', 'approved', 'disbursed', 'rejected'];

const PILL: Record<ApplicationStatus, { bg: string; fg: string }> = {
  pending: { bg: palette.gold050, fg: palette.warning },
  approved: { bg: palette.successBg, fg: colors.success },
  disbursed: { bg: colors.bg, fg: colors.textMuted },
  rejected: { bg: palette.dangerBg, fg: colors.danger },
};

export function ApplicationStatusPill({ status }: { status: ApplicationStatus }) {
  const { bg, fg } = PILL[status];
  return (
    <View style={[styles.pill, { backgroundColor: bg }]}>
      <Text style={[styles.pillText, { color: fg }]}>{t(`approvals.status.${status}`)}</Text>
    </View>
  );
}

export function ApprovalsScreen({ navigation, route }: Props) {
  const applications = useApplications();
  const [filter, setFilter] = useState<ApplicationStatus>(route.params?.status ?? 'pending');
  const rows = applications.filter((a) => a.status === filter);
  const pending = applications.filter((a) => a.status === 'pending').length;

  return (
    <Screen subtitle={pending ? tp('approvals.pendingCount', pending) : t('approvals.subtitle')}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}
        accessibilityLabel={t('approvals.filterLabel')}
      >
        {FILTERS.map((option) => {
          const on = filter === option;
          const count = applications.filter((a) => a.status === option).length;
          return (
            <Pressable
              key={option}
              onPress={() => setFilter(option)}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              style={[styles.chip, on && styles.chipOn]}
            >
              <Text style={[styles.chipText, on && styles.chipTextOn]}>
                {t(`approvals.filters.${option}`)} · {count}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <Card padded={false}>
        {rows.length === 0 ? (
          <Text style={styles.empty}>{t(`approvals.empty.${filter}`)}</Text>
        ) : (
          rows.map((application) => (
            <ApplicationRow
              key={application.id}
              application={application}
              onPress={() => navigation.navigate('ApprovalView', { applicationId: application.id })}
            />
          ))
        )}
      </Card>
    </Screen>
  );
}

function ApplicationRow({ application, onPress }: { application: LoanApplication; onPress: () => void }) {
  const name = customerById(application.customerId)?.name ?? application.customerId;

  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      onPress={onPress}
      accessibilityRole="button"
    >
      <Avatar name={name} />
      <View style={styles.flex}>
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.meta}>
          {t('approvals.rowMeta', {
            id: application.id,
            line: lineById(application.lineId)?.name ?? '—',
            date: formatDate(application.submittedOn),
          })}
        </Text>
        <Text style={styles.meta}>
          {t('approvals.rowTerms', {
            type: loanTypeLabel(application.type),
            rate: application.annualRatePct,
            months: tp('loans.summary.months', application.months),
          })}
        </Text>
      </View>
      <View style={styles.side}>
        <Text style={styles.amount}>{formatCurrency(application.principal)}</Text>
        <ApplicationStatusPill status={application.status} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  chips: { gap: space[2], paddingRight: space[4] },
  chip: {
    height: 36,
    paddingHorizontal: space[4],
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    backgroundColor: colors.bgElevated,
  },
  chipOn: { backgroundColor: colors.brand, borderColor: colors.brand },
  chipText: { ...textStyle('bodySm', fontFamily.bodySemibold), color: colors.textMuted },
  chipTextOn: { color: colors.textOnBrand },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space[4],
    paddingVertical: space[4],
    paddingHorizontal: space[5],
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowPressed: { backgroundColor: colors.bg },
  name: { ...textStyle('bodySm', fontFamily.bodySemibold), color: colors.brand },
  meta: { ...textStyle('caption'), color: colors.textFaint },
  side: { alignItems: 'flex-end', gap: space[2] },
  amount: { ...textStyle('bodySm', fontFamily.bodyBold), color: colors.text },
  pill: { paddingVertical: 4, paddingHorizontal: space[3], borderRadius: radius.pill },
  pillText: { ...textStyle('caption', fontFamily.bodySemibold) },
  empty: { ...textStyle('body'), color: colors.textFaint, textAlign: 'center', padding: space[9] },
});
