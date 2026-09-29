import { t } from '@lms/i18n';
import { useState } from 'react';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fontFamily, palette, radius, sizing, space, textStyle } from '../theme';
import { CalendarIcon } from './icons';
import { formatDate, parseIsoDate, todayIso } from '../lib/loan';

type Props = {
  label: string;
  /** `YYYY-MM-DD`, the shape the API takes. */
  value: string;
  onChange: (next: string) => void;
  error?: string;
  hint?: string;
  minimumDate?: Date;
  maximumDate?: Date;
};

/** Field that opens the platform date picker and hands back an ISO date. */
export function DateField({ label, value, onChange, error, hint, minimumDate, maximumDate }: Props) {
  const [open, setOpen] = useState(false);
  const selected = parseIsoDate(value) ?? parseIsoDate(todayIso())!;

  return (
    <View>
      <Text style={styles.label}>{label}</Text>

      <Pressable
        style={[styles.field, !!error && styles.fieldInvalid]}
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${formatDate(value)}`}
      >
        <CalendarIcon />
        <Text style={styles.value}>{formatDate(value)}</Text>
      </Pressable>

      {error ? (
        <Text style={styles.error}>{error}</Text>
      ) : hint ? (
        <Text style={styles.hint}>{hint}</Text>
      ) : null}

      {open ? (
        <DateTimePicker
          value={selected}
          mode="date"
          // Android's picker is a modal that dismisses itself; iOS renders
          // inline and stays until it is closed.
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
          onChange={(event, date) => {
            if (Platform.OS !== 'ios') setOpen(false);
            if (event.type === 'dismissed' || !date) return;
            const month = `${date.getMonth() + 1}`.padStart(2, '0');
            const day = `${date.getDate()}`.padStart(2, '0');
            onChange(`${date.getFullYear()}-${month}-${day}`);
          }}
        />
      ) : null}

      {open && Platform.OS === 'ios' ? (
        <Pressable onPress={() => setOpen(false)} accessibilityRole="button">
          <Text style={styles.done}>{t('common.actions.done')}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    ...textStyle('label', fontFamily.bodySemibold),
    color: colors.text,
    marginBottom: space[2],
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    height: sizing.fieldHeight,
    paddingHorizontal: space[4],
    borderWidth: 1,
    borderColor: 'transparent',
    borderRadius: radius.md,
    backgroundColor: colors.bgField,
  },
  fieldInvalid: { borderColor: colors.danger, backgroundColor: palette.dangerBg },
  value: { ...textStyle('body'), color: colors.text },
  error: { ...textStyle('caption'), color: colors.danger, marginTop: space[2] },
  hint: { ...textStyle('caption'), color: colors.textFaint, marginTop: space[2] },
  done: {
    ...textStyle('bodySm', fontFamily.bodySemibold),
    color: colors.brand,
    textAlign: 'right',
    paddingVertical: space[2],
  },
});
