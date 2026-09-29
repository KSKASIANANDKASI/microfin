import { useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fontFamily, palette, radius, sizing, space, textStyle } from '../theme';
import { CheckIcon, ChevronDownIcon } from './icons';

type Props = {
  label: string;
  /** Shown in the field and as the sheet title when nothing is chosen yet. */
  placeholder: string;
  value: string;
  options: string[];
  onChange: (next: string) => void;
  error?: string;
  hint?: string;
};

/** Field that opens a bottom sheet of options — React Native's missing <select>. */
export function Picker({ label, placeholder, value, options, onChange, error, hint }: Props) {
  const [open, setOpen] = useState(false);
  const insets = useSafeAreaInsets();

  return (
    <View>
      <Text style={styles.label}>{label}</Text>

      <Pressable
        style={[styles.field, !!error && styles.fieldInvalid]}
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value || placeholder}`}
      >
        <Text style={[styles.value, !value && styles.placeholder]}>{value || placeholder}</Text>
        <ChevronDownIcon />
      </Pressable>

      {error ? (
        <Text style={styles.error}>{error}</Text>
      ) : hint ? (
        <Text style={styles.hint}>{hint}</Text>
      ) : null}

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={[styles.sheet, { paddingBottom: insets.bottom + space[4] }]} onPress={() => {}}>
            <View style={styles.grabber} />
            <Text style={styles.sheetTitle}>{label}</Text>

            <FlatList
              data={options}
              keyExtractor={(item) => item}
              style={styles.list}
              renderItem={({ item }) => (
                <Pressable
                  style={({ pressed }) => [styles.option, pressed && styles.optionPressed]}
                  onPress={() => {
                    onChange(item);
                    setOpen(false);
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: item === value }}
                >
                  <Text style={[styles.optionText, item === value && styles.optionTextOn]}>
                    {item}
                  </Text>
                  {item === value ? <CheckIcon size={18} color={colors.brand} /> : null}
                </Pressable>
              )}
            />
          </Pressable>
        </Pressable>
      </Modal>
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
    justifyContent: 'space-between',
    height: sizing.fieldHeight,
    paddingHorizontal: space[4],
    borderWidth: 1,
    borderColor: 'transparent',
    borderRadius: radius.md,
    backgroundColor: colors.bgField,
  },
  fieldInvalid: { borderColor: colors.danger, backgroundColor: palette.dangerBg },
  value: { ...textStyle('body'), color: colors.text },
  placeholder: { color: colors.textFaint },
  error: { ...textStyle('caption'), color: colors.danger, marginTop: space[2] },
  hint: { ...textStyle('caption'), color: colors.textFaint, marginTop: space[2] },

  backdrop: { flex: 1, backgroundColor: 'rgba(4, 22, 47, 0.32)', justifyContent: 'flex-end' },
  sheet: {
    maxHeight: '70%',
    paddingTop: space[3],
    paddingHorizontal: space[4],
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    backgroundColor: colors.bgElevated,
  },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.border,
    marginBottom: space[4],
  },
  sheetTitle: {
    ...textStyle('h3', fontFamily.bodySemibold),
    color: colors.text,
    marginBottom: space[2],
  },
  list: { flexGrow: 0 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: space[4],
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  optionPressed: { backgroundColor: colors.bg },
  optionText: { ...textStyle('body'), color: colors.text },
  optionTextOn: { fontFamily: fontFamily.bodySemibold, color: colors.brand },
});
