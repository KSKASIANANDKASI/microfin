import { useNavigation } from '@react-navigation/native';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { LOCALES, t, tp } from '@lms/i18n';
import { Card } from '../components/Card';
import { Screen } from '../components/Screen';
import { useLocale } from '../i18n';
import { customers, lines, user } from '../lib/data';
import { ROTATION_MODES, useRotation } from '../orientation';
import { colors, elevation, fontFamily, radius, sizing, space, textStyle } from '../theme';

type Segmented = 'language' | 'rotation';
/** `screen`/`tab` is where the row's button goes; `change` labels it Change instead of Manage. */
type Row = {
  id: string;
  label: string;
  value: string;
  screen?: string;
  tab?: 'Customers';
  change?: true;
  segmented?: Segmented;
};
type Option = { id: string; label: string; on: boolean; select: () => void };

/** Built per render so the copy follows the active language. */
function groups(): { title: string; rows: Row[] }[] {
  return [
    {
      title: t('settings.groups.account'),
      rows: [
        { id: 'name', label: t('settings.rows.name'), value: user.name },
        { id: 'role', label: t('settings.rows.role'), value: user.role },
        { id: 'branch', label: t('settings.rows.branch'), value: user.branch },
      ],
    },
    {
      title: t('settings.groups.collectionSetup'),
      rows: [
        { id: 'lines', label: t('settings.rows.lines'), value: tp('settings.rows.linesValue', lines.length), screen: 'Lines' },
        {
          id: 'customers',
          label: t('settings.rows.customers'),
          value: tp('settings.rows.customersValue', customers.length),
          tab: 'Customers',
        },
      ],
    },
    {
      title: t('settings.groups.preferences'),
      rows: [
        { id: 'language', label: t('settings.rows.language'), value: t('settings.rows.languageHint'), segmented: 'language' },
        // Web has no device rotation to control.
        ...(Platform.OS === 'web'
          ? []
          : [
              {
                id: 'rotation',
                label: t('settings.rows.rotation'),
                value: t('settings.rows.rotationHint'),
                segmented: 'rotation' as const,
              },
            ]),
        { id: 'currency', label: t('settings.rows.currency'), value: t('settings.rows.currencyValue') },
        { id: 'cutoff', label: t('settings.rows.cutoff'), value: t('settings.rows.cutoffValue') },
      ],
    },
    {
      title: t('settings.groups.security'),
      rows: [
        {
          id: 'password',
          label: t('settings.rows.password'),
          value: t('settings.rows.passwordValue'),
          screen: 'ChangePassword',
          change: true,
        },
        { id: 'twoFactor', label: t('settings.rows.twoFactor'), value: t('settings.rows.twoFactorValue') },
        { id: 'sessions', label: t('settings.rows.sessions'), value: t('settings.rows.sessionsValue') },
      ],
    },
  ];
}

export function SettingsScreen() {
  const navigation = useNavigation<any>();
  const [locale, setLocale] = useLocale();
  const [rotation, setRotation] = useRotation();

  const options: Record<Segmented, Option[]> = {
    language: LOCALES.map((option) => ({
      id: option.id,
      label: option.nativeLabel,
      on: locale === option.id,
      select: () => setLocale(option.id),
    })),
    rotation: ROTATION_MODES.map((mode) => ({
      id: mode,
      label: mode === 'auto' ? t('settings.rows.rotationAuto') : t('settings.rows.rotationPortrait'),
      on: rotation === mode,
      select: () => setRotation(mode),
    })),
  };

  return (
    <Screen subtitle={t('settings.subtitle')}>
      {groups().map((group) => (
        <Card key={group.title} title={group.title} padded={false}>
          {group.rows.map((row) => (
            <View key={row.id} style={[styles.row, row.segmented && styles.rowStacked]}>
              <View style={row.segmented ? undefined : styles.flex}>
                <Text style={styles.label}>{row.label}</Text>
                <Text style={styles.value}>{row.value}</Text>
              </View>
              {row.segmented ? (
                <View style={styles.segmented} accessibilityRole="radiogroup" accessibilityLabel={row.label}>
                  {options[row.segmented].map((option) => (
                    <Pressable
                      key={option.id}
                      style={[styles.segment, option.on && styles.segmentOn]}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: option.on }}
                      onPress={option.select}
                    >
                      <Text style={[styles.segmentText, option.on && styles.segmentTextOn]}>{option.label}</Text>
                    </Pressable>
                  ))}
                </View>
              ) : (
                <Pressable
                  style={styles.btn}
                  accessibilityRole="button"
                  onPress={() => {
                    if (row.tab) navigation.navigate('Main', { screen: row.tab });
                    else if (row.screen) navigation.navigate(row.screen);
                  }}
                >
                  <Text style={styles.btnText}>
                    {(row.screen || row.tab) && !row.change ? t('common.actions.manage') : t('common.actions.change')}
                  </Text>
                </Pressable>
              )}
            </View>
          ))}
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[4],
    paddingVertical: space[4],
    paddingHorizontal: space[5],
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowStacked: { flexDirection: 'column', alignItems: 'stretch', gap: space[3] },
  segmented: {
    flexDirection: 'row',
    padding: 3,
    borderRadius: radius.md,
    backgroundColor: colors.bg,
  },
  segment: {
    flex: 1,
    height: sizing.buttonHeightSm,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
  },
  segmentOn: { backgroundColor: colors.bgElevated, ...elevation('button') },
  segmentText: { ...textStyle('bodySm', fontFamily.bodySemibold), color: colors.textFaint },
  segmentTextOn: { color: colors.text },
  label: { ...textStyle('bodySm', fontFamily.bodySemibold), color: colors.text },
  value: { ...textStyle('caption'), color: colors.textFaint },
  btn: {
    height: sizing.buttonHeightSm,
    paddingHorizontal: space[4],
    justifyContent: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgElevated,
  },
  btnText: { ...textStyle('bodySm', fontFamily.bodySemibold), color: colors.text },
});
