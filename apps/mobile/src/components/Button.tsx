import { t } from '@lms/i18n';
import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, elevation, fontFamily, palette, radius, sizing, space, textStyle } from '../theme';

type Props = {
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'ghost';
  loading?: boolean;
  disabled?: boolean;
  icon?: ReactNode;
};

export function Button({ label, onPress, variant = 'primary', loading, disabled, icon }: Props) {
  const inactive = disabled || loading;
  const primary = variant === 'primary';

  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      style={({ pressed }) => [
        styles.base,
        primary ? styles.primary : styles.ghost,
        primary && elevation('button'),
        pressed && !inactive && (primary ? styles.primaryPressed : styles.ghostPressed),
        inactive && styles.inactive,
      ]}
    >
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator size="small" color={primary ? colors.textOnBrand : colors.brand} />
        ) : (
          icon
        )}
        <Text style={[styles.label, primary ? styles.labelPrimary : styles.labelGhost]}>
          {loading ? t('common.actions.pleaseWait') : label}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    height: sizing.buttonHeight,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space[5],
  },
  content: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  primary: { backgroundColor: colors.brand },
  primaryPressed: { backgroundColor: colors.brandPressed },
  ghost: { backgroundColor: colors.bgElevated, borderColor: colors.border },
  ghostPressed: { backgroundColor: palette.navy050, borderColor: colors.borderStrong },
  inactive: { opacity: 0.55 },
  label: { ...textStyle('body', fontFamily.bodySemibold) },
  labelPrimary: { color: colors.textOnBrand },
  labelGhost: { color: colors.text },
});
