import { useMemo, useState } from 'react';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { t, tp } from '@lms/i18n';
import { Card } from '../components/Card';
import { Picker } from '../components/Picker';
import { Screen } from '../components/Screen';
import { TintFill } from '../components/TintFill';
import { LoanStatePill } from '../components/rows';
import { SearchIcon } from '../components/icons';
import {
  filterLoanBook,
  formatCurrency,
  formatNumber,
  lineById,
  lines,
  loanBook,
  type LoanBookEntry,
  type LoanBookFilter,
  type LoanBookSort,
} from '../lib/data';
import { formatDate, loanTypeLabel } from '../lib/loan';
import { useApplications } from '../lib/useApplications';
import type { AppStackParamList, MainTabParamList } from '../navigation/types';
import { colors, fontFamily, palette, radius, space, textStyle } from '../theme';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Loans'>,
  NativeStackScreenProps<AppStackParamList>
>;

const FILTERS: LoanBookFilter[] = ['all', 'active', 'overdue', 'closed'];
const SORTS: LoanBookSort[] = ['newest', 'late', 'outstanding'];

/** The whole loan book across customers and lines. */
export function LoansScreen({ navigation }: Props) {
  const [query, setQuery] = useState('');
  const [state, setState] = useState<LoanBookFilter>('all');
  const [lineId, setLineId] = useState('all');
  const [sort, setSort] = useState<LoanBookSort>('newest');
  const applications = useApplications();
  const pending = applications.filter((a) => a.status === 'pending').length;

  // As a tab this screen stays mounted; a disbursal changes the application
  // queue, so rebuilding on it picks up the new loan.
  const book = useMemo(loanBook, [applications]);
  const rows = filterLoanBook(book, { query, state, lineId, sort });

  const open = book.filter((e) => e.summary.state !== 'closed');
  const behind = book.filter((e) => e.summary.state === 'overdue');
  const outstanding = open.reduce((sum, e) => sum + e.summary.outstanding, 0);
  const overdueAmount = behind.reduce((sum, e) => sum + e.overdueAmount, 0);
  const disbursed = book.reduce((sum, e) => sum + e.loan.principal, 0);

  // Picker shows plain strings, so options map back to ids by position.
  const lineIds = ['all', ...lines.map((l) => l.id)];
  const lineLabels = [t('loans.list.allLines'), ...lines.map((l) => l.name)];
  const sortLabels = SORTS.map((s) => t(`loans.list.sort.${s}`));

  return (
    <Screen
      title={t('common.nav.loans')}
      subtitle={tp('loans.list.subtitle', book.length, { amount: formatCurrency(outstanding) })}
    >
      <View style={styles.kpis}>
        <Kpi
          tone="blue"
          label={t('loans.list.kpis.active')}
          value={formatNumber(open.length)}
          note={tp('loans.list.kpis.activeNote', book.length - open.length)}
        />
        <Kpi
          tone="teal"
          label={t('loans.list.kpis.outstanding')}
          value={formatCurrency(outstanding, true)}
          note={t('loans.list.kpis.outstandingNote')}
        />
        <Kpi
          tone="rose"
          label={t('loans.list.kpis.overdue')}
          value={formatCurrency(overdueAmount, true)}
          note={tp('loans.list.kpis.overdueNote', behind.length)}
          bad={behind.length > 0}
        />
        <Kpi
          tone="gold"
          label={t('loans.list.kpis.disbursed')}
          value={formatCurrency(disbursed, true)}
          note={t('loans.list.kpis.disbursedNote')}
        />
      </View>

      {pending ? (
        <Pressable style={styles.notice} onPress={() => navigation.navigate('Approvals')} accessibilityRole="button">
          <Text style={styles.noticeText}>{tp('loans.list.pendingApprovals', pending)}</Text>
          <Text style={styles.noticeLink}>{t('loans.list.reviewApprovals')}</Text>
        </Pressable>
      ) : null}

      <View style={styles.search}>
        <SearchIcon />
        <TextInput
          style={styles.searchInput}
          placeholder={t('loans.list.searchPlaceholder')}
          placeholderTextColor={colors.textFaint}
          value={query}
          onChangeText={setQuery}
          accessibilityLabel={t('loans.list.searchLabel')}
        />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}
        accessibilityLabel={t('loans.list.filterLabel')}
      >
        {FILTERS.map((option) => {
          const on = state === option;
          const count = option === 'all' ? book.length : book.filter((e) => e.summary.state === option).length;
          return (
            <Pressable
              key={option}
              onPress={() => setState(option)}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              style={[styles.chip, on && styles.chipOn]}
            >
              <Text style={[styles.chipText, on && styles.chipTextOn]}>
                {t(`loans.list.filters.${option}`)} · {count}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.pickers}>
        <View style={styles.flex}>
          <Picker
            label={t('loans.list.lineFilter')}
            placeholder={t('loans.list.allLines')}
            value={lineLabels[lineIds.indexOf(lineId)] ?? ''}
            options={lineLabels}
            onChange={(label) => setLineId(lineIds[lineLabels.indexOf(label)] ?? 'all')}
          />
        </View>
        <View style={styles.flex}>
          <Picker
            label={t('loans.list.sortLabel')}
            placeholder={sortLabels[0] ?? ''}
            value={sortLabels[SORTS.indexOf(sort)] ?? ''}
            options={sortLabels}
            onChange={(label) => setSort(SORTS[sortLabels.indexOf(label)] ?? 'newest')}
          />
        </View>
      </View>

      <Card padded={false}>
        {rows.length === 0 ? (
          <Text style={styles.empty}>{t('loans.list.empty')}</Text>
        ) : (
          rows.map((entry) => (
            <LoanRow
              key={entry.loan.id}
              entry={entry}
              onPress={() => navigation.navigate('LoanView', { loanId: entry.loan.id })}
            />
          ))
        )}
      </Card>
    </Screen>
  );
}

function LoanRow({ entry, onPress }: { entry: LoanBookEntry; onPress: () => void }) {
  const { loan, customer, summary } = entry;

  return (
    <Pressable style={({ pressed }) => [styles.row, pressed && styles.rowPressed]} onPress={onPress} accessibilityRole="button">
      <View style={styles.rowHead}>
        <Text style={styles.loanNo}>{loan.id}</Text>
        <LoanStatePill state={summary.state} daysLate={summary.daysLate} />
      </View>
      <Text style={styles.name}>
        {customer?.name ?? loan.customerId}
        <Text style={styles.meta}> · {lineById(loan.lineId)?.name ?? '—'}</Text>
      </Text>
      <Text style={styles.meta}>
        {loanTypeLabel(loan.type)} · {formatCurrency(loan.principal)} · {formatDate(loan.disbursedOn)}
      </Text>
      {summary.state !== 'closed' ? (
        <Text style={styles.amounts}>
          {t('loans.list.rowAmounts', {
            outstanding: formatCurrency(summary.outstanding),
            emi: formatCurrency(loan.emi),
          })}
          {summary.next ? `\n${t('loans.list.rowNext', { date: formatDate(summary.next.dueOn) })}` : ''}
        </Text>
      ) : null}
    </Pressable>
  );
}

/** Same washes as `.kpi--tint-*` on web. */
const KPI_TINTS = {
  blue: { from: '#E6EFFF', to: '#F5F8FF', edge: '#CDDCFB', ink: '#1D4ED8' },
  teal: { from: '#DCF5F1', to: '#F3FBFA', edge: '#BFE9E2', ink: '#0F766E' },
  rose: { from: '#FDE8E8', to: '#FFF6F6', edge: '#F6CFCF', ink: '#B42318' },
  gold: { from: palette.gold050, to: '#FFFCF4', edge: palette.gold200, ink: palette.gold700 },
} as const;

function Kpi({
  tone,
  label,
  value,
  note,
  bad,
}: {
  tone: keyof typeof KPI_TINTS;
  label: string;
  value: string;
  note: string;
  bad?: boolean;
}) {
  const tint = KPI_TINTS[tone];
  return (
    <View style={[styles.kpi, { borderColor: tint.edge }]}>
      <TintFill from={tint.from} to={tint.to} />
      <Text style={[styles.kpiLabel, { color: tint.ink }]}>{label}</Text>
      <Text style={styles.kpiValue}>{value}</Text>
      <Text style={[styles.kpiNote, bad && styles.kpiNoteBad]}>{note}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
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
  kpiLabel: { ...textStyle('caption', fontFamily.bodySemibold), color: colors.textFaint },
  kpiValue: {
    fontFamily: fontFamily.display,
    fontSize: 22,
    lineHeight: 26,
    letterSpacing: -0.4,
    color: colors.text,
    marginTop: space[2],
  },
  kpiNote: { ...textStyle('caption'), color: colors.textMuted, marginTop: space[2] },
  kpiNoteBad: { color: colors.danger, fontFamily: fontFamily.bodySemibold },
  notice: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space[2],
    padding: space[3],
    borderRadius: radius.md,
    backgroundColor: palette.gold050,
  },
  noticeText: { ...textStyle('caption'), color: palette.gold700, flexShrink: 1 },
  noticeLink: { ...textStyle('bodySm', fontFamily.bodySemibold), color: colors.brand },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    paddingLeft: space[4],
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.bgElevated,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    paddingHorizontal: space[3],
    ...textStyle('bodySm'),
    color: colors.text,
  },
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
  pickers: { flexDirection: 'row', gap: space[3] },
  row: {
    gap: 2,
    paddingVertical: space[4],
    paddingHorizontal: space[5],
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowPressed: { backgroundColor: colors.bg },
  rowHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space[3] },
  loanNo: { ...textStyle('bodySm', fontFamily.bodyBold), color: colors.brand },
  name: { ...textStyle('bodySm', fontFamily.bodySemibold), color: colors.text },
  meta: { ...textStyle('caption'), color: colors.textFaint },
  amounts: { ...textStyle('caption', fontFamily.bodySemibold), color: colors.textMuted, marginTop: space[1] },
  empty: { ...textStyle('body'), color: colors.textFaint, textAlign: 'center', padding: space[9] },
});
