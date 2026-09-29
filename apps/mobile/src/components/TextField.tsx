import { t } from '@lms/i18n';
import { useState, type ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import { colors, fontFamily, palette, radius, sizing, space, textStyle } from '../theme';
import { EyeIcon, EyeOffIcon } from './icons';

type Props = TextInputProps & {
  label: string;
  lead?: ReactNode;
  error?: string;
  hint?: string;
  /** Masks the value and renders a show/hide toggle. */
  revealable?: boolean;
};

export function TextField({ label, lead, error, hint, revealable, style, ...rest }: Props) {
  // A multiline field grows with its content, so the control can't keep the
  // fixed single-line height or centre its child.
  const multiline = !!rest.multiline;
  const [focused, setFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);

  return (
    <View>
      <Text style={styles.label}>{label}</Text>

      <View
        style={[
          styles.control,
          multiline && styles.controlArea,
          focused && styles.controlFocused,
          !!error && styles.controlInvalid,
        ]}
      >
        {lead ? <View style={[styles.lead, multiline && styles.leadTop]}>{lead}</View> : null}

        <TextInput
          style={[styles.input, style]}
          placeholderTextColor={colors.textFaint}
          secureTextEntry={revealable && !revealed}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          accessibilityLabel={label}
          {...rest}
        />

        {revealable ? (
          <Pressable
            onPress={() => setRevealed((v) => !v)}
            hitSlop={8}
            style={styles.toggle}
            accessibilityRole="button"
            accessibilityLabel={revealed ? t('common.field.hidePassword') : t('common.field.showPassword')}
          >
            {revealed ? <EyeOffIcon /> : <EyeIcon />}
          </Pressable>
        ) : null}
      </View>

      {error ? (
        <Text style={styles.error}>{error}</Text>
      ) : hint ? (
        <Text style={styles.hint}>{hint}</Text>
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
  control: {
    flexDirection: 'row',
    alignItems: 'center',
    height: sizing.fieldHeight,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: colors.bgField,
  },
  controlArea: {
    height: 'auto',
    minHeight: sizing.fieldHeight,
    alignItems: 'stretch',
    paddingVertical: space[2],
  },
  controlFocused: {
    backgroundColor: colors.bgElevated,
    borderColor: colors.brand,
  },
  controlInvalid: {
    borderColor: colors.danger,
    backgroundColor: palette.dangerBg,
  },
  lead: { paddingLeft: space[4], justifyContent: 'center' },
  leadTop: { justifyContent: 'flex-start', paddingTop: space[2] },
  input: {
    flex: 1,
    height: '100%',
    paddingHorizontal: space[4],
    ...textStyle('body'),
    color: colors.text,
  },
  toggle: { paddingHorizontal: space[4], height: '100%', justifyContent: 'center' },
  error: {
    ...textStyle('caption'),
    color: colors.danger,
    marginTop: space[2],
  },
  hint: {
    ...textStyle('caption'),
    color: colors.textFaint,
    marginTop: space[2],
  },
});
