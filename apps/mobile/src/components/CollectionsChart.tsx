import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Line, Path, Text as SvgText } from 'react-native-svg';
import { t } from '@lms/i18n';
import { chart } from '@lms/theme';
import { collectionsWeek, dailyTarget, formatCurrency } from '../lib/data';
import { colors, fontFamily, radius, space, textStyle } from '../theme';

const WIDTH = 320;
const PLOT_HEIGHT = 150;
const AXIS_BAND = 22;
const PAD_LEFT = 44;
const PAD_RIGHT = 8;
const PAD_TOP = 14;
const CAP = 4;

const max = Math.max(...collectionsWeek.map((d) => d.amount), dailyTarget) * 1.12;
const slot = (WIDTH - PAD_LEFT - PAD_RIGHT) / collectionsWeek.length;
const barWidth = Math.min(22, slot - 4);
const yOf = (value: number) => PAD_TOP + (1 - value / max) * (PLOT_HEIGHT - PAD_TOP);
const ticks = [0, 0.5, 1].map((f) => f * max);
const peak = collectionsWeek.reduce((a, b) => (b.amount > a.amount ? b : a));

function barPath(x: number, y: number, w: number, h: number) {
  const r = Math.min(CAP, h);
  return `M${x} ${y + h}V${y + r}a${r} ${r} 0 0 1 ${r} ${-r}h${w - r * 2}a${r} ${r} 0 0 1 ${r} ${r}V${y + h}Z`;
}

/**
 * Single-series bars — one measure, one colour. Tap a day to read its value;
 * the same numbers are always available in the table view.
 */
export function CollectionsChart() {
  const [active, setActive] = useState<number | null>(null);
  const [view, setView] = useState<'chart' | 'table'>('chart');

  return (
    <View>
      <View style={styles.segmented} accessibilityLabel={t('dashboard.chart.viewToggle')}>
        {(['chart', 'table'] as const).map((option) => (
          <Pressable
            key={option}
            onPress={() => setView(option)}
            accessibilityRole="button"
            accessibilityState={{ selected: view === option }}
            style={[styles.segBtn, view === option && styles.segBtnOn]}
          >
            <Text style={[styles.segLabel, view === option && styles.segLabelOn]}>
              {t(option === 'chart' ? 'dashboard.chart.chart' : 'dashboard.chart.table')}
            </Text>
          </Pressable>
        ))}
      </View>

      {view === 'table' ? (
        <View style={styles.table}>
          {collectionsWeek.map((d) => (
            <View key={d.day} style={styles.tableRow}>
              <Text style={styles.tableKey}>{d.label}</Text>
              <Text style={styles.tableVal}>{formatCurrency(d.amount)}</Text>
            </View>
          ))}
        </View>
      ) : (
        <>
          <View style={styles.plot}>
            <Svg viewBox={`0 0 ${WIDTH} ${PLOT_HEIGHT + AXIS_BAND}`} width="100%" height={196}>
              {ticks.map((tick) => (
                <Line
                  key={tick}
                  x1={PAD_LEFT}
                  x2={WIDTH - PAD_RIGHT}
                  y1={yOf(tick)}
                  y2={yOf(tick)}
                  stroke={tick === 0 ? chart.axis : chart.gridline}
                  strokeWidth={1}
                />
              ))}
              {ticks.map((tick) => (
                <SvgText
                  key={`t${tick}`}
                  x={PAD_LEFT - 8}
                  y={yOf(tick) + 4}
                  fontSize={9}
                  fill={chart.axisLabel}
                  textAnchor="end"
                >
                  {tick === 0 ? '0' : formatCurrency(tick, true)}
                </SvgText>
              ))}

              <Line
                x1={PAD_LEFT}
                x2={WIDTH - PAD_RIGHT}
                y1={yOf(dailyTarget)}
                y2={yOf(dailyTarget)}
                stroke={chart.reference}
                strokeWidth={1.5}
              />

              {collectionsWeek.map((d, i) => {
                const x = PAD_LEFT + i * slot + (slot - barWidth) / 2;
                const y = yOf(d.amount);
                return (
                  <Path
                    key={d.day}
                    d={barPath(x, y, barWidth, yOf(0) - y)}
                    fill={active === i ? chart.seriesHover : chart.series}
                  />
                );
              })}

              <SvgText
                x={PAD_LEFT + collectionsWeek.indexOf(peak) * slot + slot / 2}
                y={yOf(peak.amount) - 6}
                fontSize={9}
                fontWeight="bold"
                fill={colors.text}
                textAnchor="middle"
              >
                {formatCurrency(peak.amount, true)}
              </SvgText>

              {collectionsWeek.map((d, i) => (
                <SvgText
                  key={`l${d.day}`}
                  x={PAD_LEFT + i * slot + slot / 2}
                  y={PLOT_HEIGHT + 15}
                  fontSize={9}
                  fill={chart.axisLabel}
                  textAnchor="middle"
                >
                  {d.day}
                </SvgText>
              ))}
            </Svg>

            {/* Touch targets sit above the SVG so a whole column is tappable. */}
            <View style={styles.hits} pointerEvents="box-none">
              <View style={{ width: `${(PAD_LEFT / WIDTH) * 100}%` }} />
              {collectionsWeek.map((d, i) => (
                <Pressable
                  key={`h${d.day}`}
                  style={{ width: `${(slot / WIDTH) * 100}%`, height: '100%' }}
                  onPress={() => setActive((c) => (c === i ? null : i))}
                  accessibilityRole="button"
                  accessibilityLabel={`${d.label}: ${formatCurrency(d.amount)}`}
                />
              ))}
            </View>
          </View>

          <Text style={styles.readout}>
            {active === null
              ? t('dashboard.chart.readoutIdle', { amount: formatCurrency(dailyTarget, true) })
              : t(
                  collectionsWeek[active]!.amount >= dailyTarget
                    ? 'dashboard.chart.readoutAbove'
                    : 'dashboard.chart.readoutBelow',
                  {
                    day: collectionsWeek[active]!.label,
                    amount: formatCurrency(collectionsWeek[active]!.amount),
                    diff: formatCurrency(
                      Math.abs(collectionsWeek[active]!.amount - dailyTarget),
                      true,
                    ),
                  },
                )}
          </Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  segmented: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    padding: 2,
    borderRadius: radius.sm,
    backgroundColor: colors.bg,
  },
  segBtn: { paddingVertical: 5, paddingHorizontal: space[3], borderRadius: 6 },
  segBtnOn: { backgroundColor: colors.bgElevated },
  segLabel: { ...textStyle('caption', fontFamily.bodySemibold), color: colors.textFaint },
  segLabelOn: { color: colors.text },
  plot: { marginTop: space[4] },
  hits: { ...StyleSheet.absoluteFill, flexDirection: 'row' },
  readout: { ...textStyle('caption'), color: colors.textFaint, marginTop: space[3] },
  table: { marginTop: space[4] },
  tableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: space[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tableKey: { ...textStyle('bodySm'), color: colors.textMuted },
  tableVal: { ...textStyle('bodySm', fontFamily.bodySemibold), color: colors.text },
});
