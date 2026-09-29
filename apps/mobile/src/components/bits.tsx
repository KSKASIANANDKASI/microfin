import { t } from '@lms/i18n';
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { colors, fontFamily, palette, radius, space, textStyle } from '../theme';
import { CheckIcon } from './icons';

export function Checkbox({
  checked,
  onChange,
  children,
  style,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  return (
    <Pressable
      onPress={() => onChange(!checked)}
      hitSlop={6}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      style={[styles.checkboxRow, style]}
    >
      <View style={[styles.box, checked && styles.boxChecked]}>
        {checked ? <CheckIcon size={13} color={colors.textOnBrand} /> : null}
      </View>
      <View style={styles.flex}>{children}</View>
    </Pressable>
  );
}

export function LinkText({ onPress, children }: { onPress?: () => void; children: React.ReactNode }) {
  return (
    <Text style={styles.link} onPress={onPress} accessibilityRole="link">
      {children}
    </Text>
  );
}

export function Divider({ label }: { label: string }) {
  return (
    <View style={styles.dividerRow}>
      <View style={styles.rule} />
      <Text style={styles.dividerLabel}>{label}</Text>
      <View style={styles.rule} />
    </View>
  );
}

export function Notice({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.notice}>
      <CheckIcon size={18} />
      <Text style={styles.noticeText}>{children}</Text>
    </View>
  );
}

/** 0–4 strength meter, mirroring the web implementation. */
export function scorePassword(value: string): number {
  if (value.length < 8) return 0;
  let score = 1;
  if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score += 1;
  if (/\d/.test(value)) score += 1;
  if (/[^A-Za-z0-9]/.test(value) || value.length >= 14) score += 1;
  return Math.min(score, 4);
}

const LEVELS = [
  { label: 'tooShort', color: colors.border },
  { label: 'weak', color: colors.danger },
  { label: 'fair', color: palette.warning },
  { label: 'good', color: palette.gold500 },
  { label: 'strong', color: colors.success },
] as const;

export function PasswordStrength({ value }: { value: string }) {
  const score = scorePassword(value);
  const level = LEVELS[score] ?? LEVELS[0];

  return (
    <View style={styles.strength}>
      <View style={styles.strengthTrack}>
        {[1, 2, 3, 4].map((step) => (
          <View
            key={step}
            style={[
              styles.strengthSeg,
              { backgroundColor: step <= score ? level.color : colors.border },
            ]}
          />
        ))}
      </View>
      <Text style={styles.strengthLabel}>
        {value
          ? t('common.password.strength', { level: t(`common.password.levels.${level.label}`) })
          : t('common.password.hint')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  checkboxRow: { flexDirection: 'row', alignItems: 'flex-start', gap: space[3] },
  box: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    backgroundColor: colors.bgElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxChecked: { backgroundColor: colors.brand, borderColor: colors.brand },
  link: { ...textStyle('bodySm', fontFamily.bodySemibold), color: colors.brand },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: space[4] },
  rule: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerLabel: { ...textStyle('caption'), color: colors.textFaint },
  notice: {
    flexDirection: 'row',
    gap: space[3],
    padding: space[4],
    borderRadius: radius.md,
    backgroundColor: palette.successBg,
  },
  noticeText: { ...textStyle('bodySm'), color: colors.success, flex: 1 },
  strength: { marginTop: space[2], gap: space[2] },
  strengthTrack: { flexDirection: 'row', gap: 4 },
  strengthSeg: { flex: 1, height: 4, borderRadius: 999 },
  strengthLabel: { ...textStyle('caption'), color: colors.textFaint },
});
