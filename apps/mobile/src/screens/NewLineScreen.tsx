import { useState } from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { t } from '@lms/i18n';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Picker } from '../components/Picker';
import { Screen } from '../components/Screen';
import { TextField } from '../components/TextField';
import { CheckIcon } from '../components/icons';
import {
  FREQUENCIES,
  MONTH_DAYS,
  OFFICERS,
  WEEKDAYS,
  monthDayLabel,
  officerLabel,
  weekdayLabel,
  type Frequency,
} from '../lib/data';
import type { AppStackParamList } from '../navigation/types';
import { colors, fontFamily, palette, radius, space, textStyle } from '../theme';

type Props = NativeStackScreenProps<AppStackParamList, 'NewLine'>;
type Errors = { name?: string; schedule?: string };

export function NewLineScreen({ navigation }: Props) {
  const [name, setName] = useState('');
  const [frequency, setFrequency] = useState<Frequency>('daily');
  const [schedule, setSchedule] = useState('');
  const [officer, setOfficer] = useState(OFFICERS[OFFICERS.length - 1]!);
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);

  const selected = FREQUENCIES.find((f) => f.id === frequency)!;
  const needsSchedule = selected.schedule !== 'none';
  const byWeekday = selected.schedule === 'weekday';

  // Picker shows its options verbatim, so hand it display labels and map the
  // pick back to the stored (English) value.
  const scheduleValues = byWeekday ? WEEKDAYS : MONTH_DAYS;
  const scheduleLabels = scheduleValues.map(byWeekday ? weekdayLabel : monthDayLabel);
  const officerLabels = OFFICERS.map(officerLabel);

  function pickFrequency(next: Frequency) {
    setFrequency(next);
    setSchedule(''); // the previous answer means nothing under a new frequency
    setErrors((e) => ({ ...e, schedule: undefined }));
  }

  async function onSubmit() {
    const next: Errors = {
      name: name.trim() ? undefined : t('validation.required', { label: t('lines.form.name') }),
      schedule:
        needsSchedule && !schedule
          ? byWeekday
            ? t('lines.form.dayRequired')
            : t('lines.form.dateRequired')
          : undefined,
    };
    setErrors(next);
    if (next.name || next.schedule) return;

    setSubmitting(true);
    // UI-only for now: POST /lines goes here.
    await new Promise((resolve) => setTimeout(resolve, 800));
    setSubmitting(false);
    navigation.popTo('Lines');
  }

  return (
    <Screen subtitle={t('lines.form.subtitle')}>
      <Card>
        <View style={styles.stack}>
          <TextField
            label={t('lines.form.name')}
            placeholder="Line 08 · Ambattur"
            value={name}
            error={errors.name}
            hint={t('lines.form.nameHint')}
            onChangeText={setName}
          />

          <View>
            <Text style={styles.legend}>{t('lines.form.frequency')}</Text>
            <View style={styles.freqList}>
              {FREQUENCIES.map((option) => {
                const on = frequency === option.id;
                return (
                  <Pressable
                    key={option.id}
                    style={[styles.freqCard, on && styles.freqCardOn]}
                    onPress={() => pickFrequency(option.id)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: on }}
                  >
                    <View style={styles.freqHead}>
                      <Text style={[styles.freqLabel, on && styles.freqLabelOn]}>
                        {option.label}
                      </Text>
                      {on ? <CheckIcon size={16} color={colors.brand} /> : null}
                    </View>
                    <Text style={styles.freqHint}>{option.hint}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {needsSchedule ? (
            <Picker
              label={byWeekday ? t('lines.form.day') : t('lines.form.date')}
              placeholder={byWeekday ? t('lines.form.dayPlaceholder') : t('lines.form.datePlaceholder')}
              value={schedule ? scheduleLabels[scheduleValues.indexOf(schedule)] ?? schedule : ''}
              options={scheduleLabels}
              onChange={(next) => {
                setSchedule(scheduleValues[scheduleLabels.indexOf(next)] ?? next);
                setErrors((e) => ({ ...e, schedule: undefined }));
              }}
              error={errors.schedule}
              hint={
                byWeekday
                  ? t('lines.form.dayHint')
                  : t('lines.form.dateHint', { lastDay: t('common.lastDayOfMonth') })
              }
            />
          ) : null}

          <Picker
            label={t('lines.form.officer')}
            placeholder={t('lines.form.officerPlaceholder')}
            value={officerLabel(officer)}
            options={officerLabels}
            onChange={(next) => setOfficer(OFFICERS[officerLabels.indexOf(next)] ?? next)}
            hint={t('lines.form.officerHint')}
          />
        </View>
      </Card>

      <View style={styles.actions}>
        <Button label={t('lines.form.create')} onPress={onSubmit} loading={submitting} />
        <Button label={t('common.actions.cancel')} variant="ghost" onPress={() => navigation.goBack()} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  stack: { gap: space[5] },
  legend: {
    ...textStyle('label', fontFamily.bodySemibold),
    color: colors.text,
    marginBottom: space[2],
  },
  freqList: { gap: space[3] },
  freqCard: {
    padding: space[4],
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.bgElevated,
  },
  freqCardOn: { borderColor: colors.brand, backgroundColor: palette.navy050 },
  freqHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  freqLabel: { ...textStyle('bodySm', fontFamily.bodySemibold), color: colors.text },
  freqLabelOn: { color: colors.brand },
  freqHint: { ...textStyle('caption'), color: colors.textMuted, marginTop: space[1] },
  actions: { gap: space[3] },
});
