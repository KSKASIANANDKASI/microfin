import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { t, tp } from '@lms/i18n';
import { chart } from '@lms/theme';
import { AccentBar, accentOverlay, Card, type AccentStops } from '../components/Card';
import { CollectionsChart } from '../components/CollectionsChart';
import { LinesCard } from '../components/LinesCard';
import { Screen } from '../components/Screen';
import { InstallmentRow } from '../components/rows';
import {
  CalculatorIcon,
  CheckCircleIcon,
  ClockIcon,
  LedgerIcon,
  PlusIcon,
  RouteIcon,
  ShieldIcon,
  TrendDownIcon,
  TrendUpIcon,
  WalletIcon,
} from '../components/icons';
import {
  arrears,
  dailyTarget,
  formatCurrency,
  formatNumber,
  kpis,
  lineById,
  loanById,
  user,
} from '../lib/data';
import { useApplications } from '../lib/useApplications';
import { useCollectionSheet } from '../lib/useCollectionSheet';
import { usePortfolio } from '../lib/usePortfolio';
import { formatDayHeading } from '../lib/loan';
import { colors, fontFamily, palette, radius, space, textStyle } from '../theme';

export function DashboardScreen() {
  const navigation = useNavigation<any>();
  usePortfolio();
  const current = arrears.find((a) => a.tone === 'good') ?? { accounts: 0, amount: 0 };
  const overdue = arrears.filter((a) => a.tone !== 'good');
  // Scale the bars to each other: `current` is far larger and would flatten both
  // overdue buckets into invisible slivers.
  const overdueMax = Math.max(1, ...overdue.map((a) => a.amount));
  const totalOutstanding = arrears.reduce((sum, a) => sum + a.amount, 0);
  const pendingApprovals = useApplications().filter((a) => a.status === 'pending').length;
  const rows = useCollectionSheet();
  const collected = rows.filter((i) => i.status === 'collected').length;
  const sheet = rows.slice(0, 5);
  // `{amount}` is left unfilled so the figure can be rendered bold between the halves.
  const [currentBefore = '', currentAfter = ''] = tp('dashboard.arrears.current', current.accounts, {
    percent: (totalOutstanding ? (current.amount / totalOutstanding) * 100 : 0).toFixed(1),
    count: formatNumber(current.accounts),
  }).split('{amount}');

  return (
    <Screen
      title={t('dashboard.greeting', { name: user.name.split(' ')[0] ?? user.name })}
      subtitle={`${user.branch} · ${formatDayHeading()}`}
    >
      <View style={styles.quick}>
        {[
          { label: t('common.screens.newCustomer'), icon: <PlusIcon size={16} />, screen: 'NewCustomer' },
          { label: t('common.screens.newLoan'), icon: <WalletIcon size={16} color={colors.brand} />, screen: 'NewLoan' },
          {
            label: pendingApprovals ? `${t('common.nav.approvals')} · ${pendingApprovals}` : t('common.nav.approvals'),
            icon: <ShieldIcon size={16} color={colors.brand} />,
            screen: 'Approvals',
          },
          { label: t('common.nav.lines'), icon: <RouteIcon size={16} />, screen: 'Lines' },
          { label: t('common.nav.calculator'), icon: <CalculatorIcon size={16} />, screen: 'Playground' },
        ].map((action) => (
          <Pressable
            key={action.screen}
            style={({ pressed }) => [styles.quickBtn, pressed && styles.quickBtnPressed]}
            onPress={() => navigation.navigate(action.screen)}
            accessibilityRole="button"
          >
            {action.icon}
            <Text style={styles.quickText}>{action.label}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.kpis}>
        {kpis.map((kpi) => {
          const Trend = (kpi.delta ?? 0) >= 0 ? TrendUpIcon : TrendDownIcon;
          const tone = kpi.deltaGood ? colors.success : colors.danger;
          const accent = KPI_ACCENTS[kpi.id];
          const KpiIcon = KPI_ICONS[kpi.id];
          return (
            <View key={kpi.id} style={styles.kpi}>
              <View style={accentOverlay}>
                <AccentBar stops={accent} />
              </View>
              <View style={styles.kpiHead}>
                <Text style={styles.kpiLabel}>{kpi.label}</Text>
                {/* 8-digit hex: the strip's middle hue at ~14% opacity. */}
                <View
                  style={[styles.kpiIcon, { backgroundColor: `${accent[1]}24` }]}
                  accessibilityElementsHidden
                  importantForAccessibility="no-hide-descendants"
                >
                  <KpiIcon size={17} color={accent[0]} />
                </View>
              </View>
              <Text style={styles.kpiValue}>
                {kpi.currency === false
                  ? formatNumber(kpi.value)
                  : formatCurrency(kpi.value, true)}
              </Text>
              {kpi.delta != null ? (
                <View style={styles.kpiDelta}>
                  <Trend color={tone} />
                  <Text style={[styles.kpiDeltaText, { color: tone }]}>
                    {Math.abs(kpi.delta)}%
                  </Text>
                  <Text style={styles.kpiNote}>{kpi.note}</Text>
                </View>
              ) : null}
            </View>
          );
        })}
      </View>

      <Card
        title={t('dashboard.collections.title')}
        subtitle={t('dashboard.collections.subtitle', { amount: formatCurrency(dailyTarget, true) })}
      >
        <CollectionsChart />
      </Card>

      <Card title={t('dashboard.arrears.title')} subtitle={t('dashboard.arrears.subtitle')}>
        <View style={styles.context}>
          <View style={[styles.dot, styles.contextDot, { backgroundColor: chart.status.good }]} />
          <Text style={styles.contextText}>
            {currentBefore}
            <Text style={styles.contextStrong}>{formatCurrency(current.amount, true)}</Text>
            {currentAfter}
          </Text>
        </View>

        {overdue.map((row) => (
          <View key={row.bucket} style={styles.arrears}>
            <View style={styles.arrearsHead}>
              <View style={styles.arrearsName}>
                <View style={[styles.dot, { backgroundColor: chart.status[row.tone] }]} />
                <Text style={styles.arrearsLabel}>{row.bucket}</Text>
              </View>
              <Text style={styles.arrearsValue}>{formatCurrency(row.amount, true)}</Text>
            </View>
            <View style={styles.track}>
              <View style={[styles.bar, { width: `${(row.amount / overdueMax) * 100}%` }]} />
            </View>
            <Text style={styles.arrearsMeta}>
              {tp('dashboard.arrears.accounts', row.accounts, {
                count: formatNumber(row.accounts),
              })}
            </Text>
          </View>
        ))}
      </Card>

      <Card
        title={t('dashboard.lines.title')}
        subtitle={t('dashboard.lines.subtitle')}
        action={
          <Pressable
            onPress={() => navigation.navigate('Lines')}
            accessibilityRole="button"
            accessibilityLabel={t('dashboard.lines.manage')}
          >
            <Text style={styles.cardLink}>{t('common.actions.manage')}</Text>
          </Pressable>
        }
      >
        <LinesCard />
      </Card>

      <Card
        title={t('dashboard.sheet.title')}
        subtitle={t('dashboard.sheet.subtitle', { collected, total: sheet.length })}
        padded={false}
      >
        {sheet.map((item) => (
          <InstallmentRow
            key={item.id}
            customer={item.customer}
            meta={`${item.loanNo} · ${lineById(item.lineId)?.name}`}
            amount={item.amount}
            status={item.status}
            daysLate={item.daysLate}
            onPress={
              loanById(item.loanNo)
                ? () => navigation.navigate('LoanView', { loanId: item.loanNo })
                : undefined
            }
            accessibilityHint={t('dashboard.sheet.opensLoan')}
          />
        ))}
      </Card>
    </Screen>
  );
}

/** One hue per KPI tile's top strip — matches `.kpi--*::before` on web. */
const KPI_ACCENTS: Record<(typeof kpis)[number]['id'], AccentStops> = {
  outstanding: ['#0f766e', '#14b8a6', '#5eead4'], // teal
  collected: ['#15803d', '#22c55e', '#86efac'], // green
  overdue: ['#1d4ed8', '#3b82f6', '#93c5fd'], // blue
  loans: ['#7c5a1e', '#b08d57', '#e3c98f'], // antique gold
};

const KPI_ICONS = {
  outstanding: WalletIcon,
  collected: CheckCircleIcon,
  overdue: ClockIcon,
  loans: LedgerIcon,
} satisfies Record<(typeof kpis)[number]['id'], unknown>;

const styles = StyleSheet.create({
  kpis: { flexDirection: 'row', flexWrap: 'wrap', gap: space[3] },
  kpi: {
    flexGrow: 1,
    flexBasis: '46%',
    padding: space[4],
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.bgElevated,
    // Lets the accent strip sit flush with the rounded top corners.
    overflow: 'hidden',
  },
  kpiHead: { flexDirection: 'row', alignItems: 'flex-start', gap: space[2] },
  kpiIcon: {
    width: 30,
    height: 30,
    marginTop: -space[1],
    marginBottom: -space[2],
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
  },
  kpiLabel: { ...textStyle('caption'), color: colors.textFaint, flex: 1 },
  kpiValue: {
    fontFamily: fontFamily.display,
    fontSize: 24,
    lineHeight: 28,
    letterSpacing: -0.4,
    color: colors.text,
    marginTop: space[2],
  },
  kpiDelta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: space[3] },
  kpiDeltaText: { ...textStyle('caption', fontFamily.bodySemibold) },
  kpiNote: { ...textStyle('caption'), color: colors.textFaint },

  context: {
    flexDirection: 'row',
    gap: space[2],
    paddingBottom: space[5],
    marginBottom: space[5],
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  contextText: { ...textStyle('bodySm'), color: colors.textMuted, flex: 1 },
  contextStrong: { fontFamily: fontFamily.bodyBold, color: colors.text },
  contextDot: { marginTop: 6 },

  arrears: { marginBottom: space[5] },
  arrearsHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  arrearsName: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  arrearsLabel: { ...textStyle('bodySm', fontFamily.bodySemibold), color: colors.text },
  arrearsValue: { ...textStyle('bodySm', fontFamily.bodyBold), color: colors.text },
  track: {
    height: 8,
    marginTop: space[2],
    borderRadius: radius.pill,
    backgroundColor: colors.bg,
    overflow: 'hidden',
  },
  bar: { height: '100%', borderRadius: radius.pill, backgroundColor: chart.series },
  arrearsMeta: { ...textStyle('caption'), color: colors.textFaint, marginTop: space[2] },
  dot: { width: 9, height: 9, borderRadius: 5 },
  cardLink: { ...textStyle('bodySm', fontFamily.bodySemibold), color: colors.brand },
  quick: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
  quickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    paddingVertical: space[3],
    paddingHorizontal: space[4],
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.bgElevated,
  },
  quickBtnPressed: { backgroundColor: palette.navy050 },
  quickText: { ...textStyle('bodySm', fontFamily.bodySemibold), color: colors.text },
});
