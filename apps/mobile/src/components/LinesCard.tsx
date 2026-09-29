import { StyleSheet, Text, View } from 'react-native';
import { t, tp } from '@lms/i18n';
import { chart } from '@lms/theme';
import { formatCurrency, formatNumber, lines, officerLabel } from '../lib/data';
import { colors, fontFamily, radius, space, textStyle } from '../theme';

const dueMax = Math.max(...lines.map((l) => l.due));

/**
 * Today's collection per line. The track is the amount due (scaled to the
 * biggest line) and the fill is what came in, so the shortfall is the gap.
 */
export function LinesCard() {
  const due = lines.reduce((sum, l) => sum + l.due, 0);
  const collected = lines.reduce((sum, l) => sum + l.collected, 0);
  // Split on the collected amount so it can be bold wherever the language puts it.
  const [before = '', after = ''] = tp('lines.card.summary', lines.length, {
    due: formatCurrency(due),
    pct: Math.round((collected / due) * 100),
  }).split('{collected}');

  return (
    <View>
      <Text style={styles.context}>
        {before}
        <Text style={styles.strong}>{formatCurrency(collected)}</Text>
        {after}
      </Text>

      {lines.map((line) => {
        const pct = Math.round((line.collected / line.due) * 100);
        const short = pct < 80;

        return (
          <View key={line.id} style={styles.row}>
            <View style={styles.head}>
              <View style={styles.flex}>
                <Text style={styles.name}>{line.name}</Text>
                <Text style={styles.officer}>{officerLabel(line.officer)}</Text>
              </View>
              <Text style={styles.value}>
                {formatCurrency(line.collected)}
                <Text style={styles.of}> / {formatCurrency(line.due)}</Text>
              </Text>
            </View>

            <View style={[styles.track, { width: `${(line.due / dueMax) * 100}%` }]}>
              <View style={[styles.bar, { width: `${pct}%` }]} />
            </View>

            <View style={styles.meta}>
              <View
                style={[
                  styles.dot,
                  { backgroundColor: short ? chart.status.warning : chart.status.good },
                ]}
              />
              <Text style={styles.metaText}>
                {t('lines.card.pctCollected', { pct })} ·{' '}
                {tp('lines.accounts', line.accounts, { count: formatNumber(line.accounts) })}
                {short ? ` · ${t('lines.card.followUp')}` : ''}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  context: {
    ...textStyle('bodySm'),
    color: colors.textMuted,
    paddingBottom: space[5],
    marginBottom: space[5],
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  strong: { fontFamily: fontFamily.bodyBold, color: colors.text },
  row: { marginBottom: space[5] },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: space[3] },
  name: { ...textStyle('bodySm', fontFamily.bodySemibold), color: colors.text },
  officer: { ...textStyle('caption'), color: colors.textFaint },
  value: { ...textStyle('bodySm', fontFamily.bodyBold), color: colors.text },
  of: { fontFamily: fontFamily.body, color: colors.textFaint },
  track: {
    height: 8,
    minWidth: 40,
    marginTop: space[2],
    borderRadius: radius.pill,
    backgroundColor: colors.bg,
    overflow: 'hidden',
  },
  bar: { height: '100%', borderRadius: radius.pill, backgroundColor: chart.series },
  meta: { flexDirection: 'row', alignItems: 'center', gap: space[2], marginTop: space[2] },
  metaText: { ...textStyle('caption'), color: colors.textFaint, flex: 1 },
  dot: { width: 9, height: 9, borderRadius: 5 },
});
