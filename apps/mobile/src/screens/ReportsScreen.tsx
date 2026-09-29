import { useState } from 'react';
import { t } from '@lms/i18n';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Card } from '../components/Card';
import { Screen } from '../components/Screen';
import { ReportIcon } from '../components/icons';
import { reports } from '../lib/data';
import { colors, fontFamily, palette, radius, sizing, space, textStyle } from '../theme';

const RANGES = ['today', 'last7', 'last30', 'monthToDate'] as const;

export function ReportsScreen() {
  const [range, setRange] = useState<(typeof RANGES)[number]>('last30');

  return (
    <Screen title={t('common.nav.reports')} subtitle={t('reports.subtitle')}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}
        accessibilityLabel={t('reports.dateRange')}
      >
        {RANGES.map((option) => (
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

      {reports.map((report) => (
        <Card key={report.id}>
          <View style={styles.row}>
            <View style={styles.icon}>
              <ReportIcon color={palette.gold700} />
            </View>
            <View style={styles.flex}>
              <Text style={styles.name}>{report.name}</Text>
              <Text style={styles.desc}>{report.desc}</Text>
              <Text style={styles.meta}>
                {report.updated} · {t(`reports.ranges.${range}`)}
              </Text>
            </View>
          </View>
          <View style={styles.actions}>
            <Pressable style={[styles.btn, styles.btnGhost]} accessibilityRole="button">
              <Text style={styles.btnGhostText}>{t('reports.preview')}</Text>
            </Pressable>
            <Pressable style={styles.btn} accessibilityRole="button">
              <Text style={styles.btnText}>{t('reports.export')}</Text>
            </Pressable>
          </View>
        </Card>
      ))}
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
  btnGhost: { backgroundColor: colors.bgElevated, borderColor: colors.border },
  btnText: { ...textStyle('bodySm', fontFamily.bodySemibold), color: colors.textOnBrand },
  btnGhostText: { ...textStyle('bodySm', fontFamily.bodySemibold), color: colors.text },
});
