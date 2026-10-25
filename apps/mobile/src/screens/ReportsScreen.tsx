import { useEffect, useState } from 'react';
import { t, tp } from '@lms/i18n';
import { ActivityIndicator, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { Card } from '../components/Card';
import { FormError, errorMessage } from '../components/bits';
import { Screen } from '../components/Screen';
import { ReportIcon } from '../components/icons';
import { reports } from '../lib/data';
import {
  REPORT_RANGES,
  csvFileName,
  formatCell,
  isSnapshot,
  loadReport,
  periodLabel,
  toCsv,
  type ReportColumn,
  type ReportId,
  type ReportRange,
  type ReportTable,
} from '../lib/reports';
import { colors, fontFamily, palette, radius, sizing, space, textStyle } from '../theme';

/** Names get room to breathe; figures are narrower and right-aligned. */
function cellStyle(column?: ReportColumn) {
  return column?.kind === 'text' ? styles.cellText : column?.kind === 'date' ? styles.cellDate : styles.cellNum;
}

function ReportGrid({ table }: { table: ReportTable }) {
  const lines = [...table.rows, ...(table.total ? [table.total] : [])];
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={styles.grid}>
      <View>
        <View style={[styles.gridRow, styles.gridHead]}>
          {table.columns.map((column) => (
            <Text key={column.label} style={[styles.cell, styles.headText, cellStyle(column)]} numberOfLines={2}>
              {column.label}
            </Text>
          ))}
        </View>
        {lines.map((row, r) => {
          const total = table.total !== undefined && r === lines.length - 1;
          return (
            <View key={r} style={[styles.gridRow, total && styles.gridTotal]}>
              {row.map((cell, c) => (
                <Text key={c} style={[styles.cell, cellStyle(table.columns[c]), total && styles.totalText]}>
                  {total && c > 0 && cell === null ? '' : formatCell(table.columns[c]!, cell)}
                </Text>
              ))}
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

export function ReportsScreen() {
  const [range, setRange] = useState<ReportRange>('last30');
  const [openId, setOpenId] = useState<ReportId>();
  const [table, setTable] = useState<ReportTable>();
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState<ReportId>();
  const [error, setError] = useState<string>();

  // The open preview follows the range chips; a snapshot report ignores them.
  const rangeKey = openId && !isSnapshot(openId) ? range : undefined;
  useEffect(() => {
    if (!openId) return;
    let live = true;
    setLoading(true);
    setError(undefined);
    loadReport(openId, range)
      .then((next) => live && setTable(next))
      .catch((e) => live && setError(errorMessage(e)))
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openId, rangeKey]);

  function preview(id: ReportId) {
    setTable(undefined);
    setOpenId(id === openId ? undefined : id);
  }

  async function exportCsv(id: ReportId) {
    setExporting(id);
    setError(undefined);
    try {
      // The preview on screen is already the same report and range.
      const shown = table?.id === id && !loading ? table : await loadReport(id, range);
      await Share.share({ title: csvFileName(shown), message: toCsv(shown) });
    } catch (e) {
      setError(errorMessage(e));
    }
    setExporting(undefined);
  }

  return (
    <Screen title={t('common.nav.reports')} subtitle={t('reports.subtitle')}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}
        accessibilityLabel={t('reports.dateRange')}
      >
        {REPORT_RANGES.map((option) => (
          <Pressable
            key={option}
            onPress={() => setRange(option)}
            accessibilityRole="button"
            accessibilityState={{ selected: range === option }}
            style={[styles.chip, range === option && styles.chipOn]}
          >
            <Text style={[styles.chipText, range === option && styles.chipTextOn]}>
              {t(`reports.ranges.${option}`)}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <FormError message={error} />

      {reports.map((report) => {
        const open = report.id === openId;
        return (
          <Card key={report.id}>
            <View style={styles.row}>
              <View style={styles.icon}>
                <ReportIcon color={palette.gold700} />
              </View>
              <View style={styles.flex}>
                <Text style={styles.name}>{report.name}</Text>
                <Text style={styles.desc}>{report.desc}</Text>
                <Text style={styles.meta}>
                  {open && table && !loading
                    ? `${periodLabel(table)} · ${tp('reports.rowCount', table.rows.length)}`
                    : isSnapshot(report.id)
                      ? t('reports.asOfToday')
                      : t(`reports.ranges.${range}`)}
                </Text>
              </View>
            </View>

            {open ? (
              <View style={styles.preview}>
                {loading && !table ? (
                  <ActivityIndicator color={colors.brand} accessibilityLabel={t('reports.loading')} />
                ) : table && table.rows.length ? (
                  <View style={loading && styles.stale}>
                    <ReportGrid table={table} />
                  </View>
                ) : table ? (
                  <Text style={styles.empty}>{t('reports.empty')}</Text>
                ) : null}
              </View>
            ) : null}

            <View style={styles.actions}>
              <Pressable
                style={[styles.btn, styles.btnGhost]}
                accessibilityRole="button"
                accessibilityState={{ expanded: open }}
                onPress={() => preview(report.id)}
              >
                <Text style={styles.btnGhostText}>{open ? t('reports.hide') : t('reports.preview')}</Text>
              </Pressable>
              <Pressable
                style={[styles.btn, exporting !== undefined && styles.btnBusy]}
                accessibilityRole="button"
                disabled={exporting !== undefined}
                onPress={() => exportCsv(report.id)}
              >
                <Text style={styles.btnText}>
                  {exporting === report.id ? t('common.actions.pleaseWait') : t('reports.export')}
                </Text>
              </Pressable>
            </View>
          </Card>
        );
      })}
    </Screen>
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
  row: { flexDirection: 'row', gap: space[4] },
  icon: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    backgroundColor: palette.gold050,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { ...textStyle('body', fontFamily.bodySemibold), color: colors.text },
  desc: { ...textStyle('bodySm'), color: colors.textMuted, marginTop: space[1] },
  meta: { ...textStyle('caption'), color: colors.textFaint, marginTop: space[2] },
  preview: { marginTop: space[4] },
  stale: { opacity: 0.5 },
  empty: { ...textStyle('bodySm'), color: colors.textFaint, textAlign: 'center' },
  grid: { paddingBottom: space[2] },
  gridRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.border },
  gridHead: { backgroundColor: colors.bg },
  gridTotal: { borderTopWidth: 2, borderTopColor: colors.border, borderBottomWidth: 0 },
  cell: { ...textStyle('caption'), color: colors.text, paddingVertical: space[2], paddingHorizontal: space[2] },
  cellText: { width: 150 },
  cellDate: { width: 104 },
  cellNum: { width: 96, textAlign: 'right' },
  headText: { fontFamily: fontFamily.bodySemibold, color: colors.textFaint },
  totalText: { fontFamily: fontFamily.bodySemibold },
  actions: { flexDirection: 'row', gap: space[2], justifyContent: 'flex-end', marginTop: space[4] },
  btn: {
    height: sizing.buttonHeightSm,
    paddingHorizontal: space[4],
    justifyContent: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.brand,
    backgroundColor: colors.brand,
  },
  btnBusy: { opacity: 0.6 },
  btnGhost: { backgroundColor: colors.bgElevated, borderColor: colors.border },
  btnText: { ...textStyle('bodySm', fontFamily.bodySemibold), color: colors.textOnBrand },
  btnGhostText: { ...textStyle('bodySm', fontFamily.bodySemibold), color: colors.text },
});
