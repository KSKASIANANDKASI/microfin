import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { t, tp } from '@lms/i18n';
import { Card } from '../components/Card';
import { Screen } from '../components/Screen';
import {
  formatCurrency,
  formatNumber,
  frequencyLabel,
  lines,
  officerLabel,
  weekdayLabel,
} from '../lib/data';
import type { Line } from '../lib/data';
import type { AppStackParamList } from '../navigation/types';
import { colors, fontFamily, palette, radius, sizing, space, textStyle } from '../theme';

type Props = NativeStackScreenProps<AppStackParamList, 'Lines'>;

export function LinesScreen({ navigation }: Props) {
  const accounts = lines.reduce((n, l) => n + l.accounts, 0);

  return (
    <Screen
      subtitle={`${tp('lines.count', lines.length)} · ${tp('lines.accounts', accounts, {
        count: formatNumber(accounts),
      })}`}
    >
      <Pressable
        style={({ pressed }) => [styles.newBtn, pressed && styles.newBtnPressed]}
        onPress={() => navigation.navigate('NewLine')}
        accessibilityRole="button"
      >
        <Text style={styles.newBtnText}>{t('common.screens.newLine')}</Text>
      </Pressable>

      <Card padded={false}>
        {lines.map((line) => (
          <View key={line.id} style={styles.row}>
            <View style={styles.head}>
              <View style={styles.flex}>
                <Text style={styles.name}>{line.name}</Text>
                <Text style={styles.meta}>
                  {officerLabel(line.officer)} ·{' '}
                  {tp('lines.accounts', line.accounts, { count: formatNumber(line.accounts) })}
                </Text>
              </View>
              <View style={styles.freq}>
                <Text style={styles.freqLabel}>{frequencyLabel(line.frequency)}</Text>
                {line.schedule ? <Text style={styles.freqWhen}>{scheduleText(line)}</Text> : null}
              </View>
            </View>

            <View style={styles.foot}>
              <Text style={styles.due}>
                {t('lines.dueToday', { amount: formatCurrency(line.due) })}
              </Text>
              <Pressable
                style={styles.editBtn}
                onPress={() => navigation.navigate('NewLine')}
                accessibilityRole="button"
              >
                <Text style={styles.editText}>{t('common.actions.edit')}</Text>
              </Pressable>
            </View>
          </View>
        ))}
      </Card>
    </Screen>
  );
}

export function scheduleText(line: Pick<Line, 'frequency' | 'schedule'>): string {
  if (!line.schedule) return '';
  if (line.frequency === 'weekly') return t('lines.schedule.weekly', { day: weekdayLabel(line.schedule) });
  if (line.schedule === 'Last day') return t('lines.schedule.lastDay');
  // English wants "5th"; other languages use the bare number from {day}.
  return t('lines.schedule.monthly', { day: line.schedule, ordinal: ordinal(line.schedule) });
}

function ordinal(day: string): string {
  const n = Number(day);
  if (!Number.isFinite(n)) return day;
  const suffix =
    n % 10 === 1 && n !== 11 ? 'st' : n % 10 === 2 && n !== 12 ? 'nd' : n % 10 === 3 && n !== 13 ? 'rd' : 'th';
  return `${n}${suffix}`;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  newBtn: {
    height: sizing.buttonHeight,
    borderRadius: radius.md,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  newBtnPressed: { backgroundColor: colors.brandPressed },
  newBtnText: { ...textStyle('body', fontFamily.bodySemibold), color: colors.textOnBrand },
  row: {
    gap: space[3],
    paddingVertical: space[4],
    paddingHorizontal: space[5],
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: space[3] },
  name: { ...textStyle('bodySm', fontFamily.bodySemibold), color: colors.text },
  meta: { ...textStyle('caption'), color: colors.textFaint },
  freq: {
    alignItems: 'flex-end',
    paddingVertical: 6,
    paddingHorizontal: space[3],
    borderRadius: radius.sm,
    backgroundColor: palette.navy050,
  },
  freqLabel: { ...textStyle('caption', fontFamily.bodySemibold), color: colors.brand },
  freqWhen: { ...textStyle('caption'), color: colors.textMuted },
  foot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  due: { ...textStyle('caption'), color: colors.textFaint },
  editBtn: {
    height: sizing.buttonHeightSm,
    paddingHorizontal: space[4],
    justifyContent: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgElevated,
  },
  editText: { ...textStyle('bodySm', fontFamily.bodySemibold), color: colors.text },
});
