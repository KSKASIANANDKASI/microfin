import { useState } from 'react';
import { t } from '@lms/i18n';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Screen } from '../components/Screen';
import { TextField } from '../components/TextField';
import { Notice, PasswordStrength, scorePassword } from '../components/bits';
import { LockIcon } from '../components/icons';
import { ApiError, changePassword } from '../lib/session';
import { validatePassword } from '../lib/validate';
import type { AppStackParamList } from '../navigation/types';
import { colors, palette, radius, space, textStyle } from '../theme';

type Props = NativeStackScreenProps<AppStackParamList, 'ChangePassword'>;
type Errors = { current?: string; next?: string; confirm?: string; form?: string };

export function ChangePasswordScreen({ navigation }: Props) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit() {
    const found: Errors = {
      current: current ? undefined : t('validation.passwordRequired'),
      next:
        validatePassword(next) ??
        (scorePassword(next) < 2
          ? t('auth.signUp.weakPassword')
          : next === current
            ? t('settings.changePassword.sameAsCurrent')
            : undefined),
      confirm: !confirm
        ? t('validation.passwordRequired')
        : confirm !== next
          ? t('settings.changePassword.mismatch')
          : undefined,
    };
    setErrors(found);
    if (Object.values(found).some(Boolean)) return;

    setSubmitting(true);
    try {
      await changePassword(current, next);
    } catch (error) {
      const message = error instanceof ApiError ? error.message : t('auth.errors.generic');
      setErrors(error instanceof ApiError && error.code === 'WRONG_PASSWORD' ? { current: message } : { form: message });
      setSubmitting(false);
      return;
    }
    setSubmitting(false);
    setCurrent('');
    setNext('');
    setConfirm('');
    setDone(true);
  }

  if (done) {
    return (
      <Screen subtitle={t('settings.changePassword.successTitle')}>
        <Card>
          <Notice>{t('settings.changePassword.successNotice')}</Notice>
        </Card>
        <Button label={t('settings.changePassword.backToSettings')} variant="ghost" onPress={() => navigation.goBack()} />
      </Screen>
    );
  }

  return (
    <Screen subtitle={t('settings.changePassword.subtitle')}>
      <Card>
        <View style={styles.stack}>
          {errors.form ? (
            <Text style={styles.formError} accessibilityRole="alert">
              {errors.form}
            </Text>
          ) : null}

          <TextField
            label={t('settings.changePassword.current')}
            placeholder={t('settings.changePassword.currentPlaceholder')}
            revealable
            autoCapitalize="none"
            autoComplete="current-password"
            textContentType="password"
            lead={<LockIcon />}
            value={current}
            error={errors.current}
            onChangeText={setCurrent}
          />

          <View>
            <TextField
              label={t('settings.changePassword.new')}
              placeholder={t('settings.changePassword.newPlaceholder')}
              revealable
              autoCapitalize="none"
              autoComplete="new-password"
              textContentType="newPassword"
              lead={<LockIcon />}
              value={next}
              error={errors.next}
              onChangeText={setNext}
            />
            {errors.next ? null : <PasswordStrength value={next} />}
          </View>

          <TextField
            label={t('settings.changePassword.confirm')}
            placeholder={t('settings.changePassword.confirmPlaceholder')}
            revealable
            autoCapitalize="none"
            autoComplete="new-password"
            textContentType="newPassword"
            lead={<LockIcon />}
            value={confirm}
            error={errors.confirm}
            onChangeText={setConfirm}
          />
        </View>
      </Card>

      <View style={styles.actions}>
        <Button label={t('settings.changePassword.submit')} onPress={onSubmit} loading={submitting} />
        <Button label={t('common.actions.cancel')} variant="ghost" onPress={() => navigation.goBack()} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  stack: { gap: space[5] },
  actions: { gap: space[3] },
  formError: {
    ...textStyle('bodySm'),
    color: colors.danger,
    padding: space[4],
    borderRadius: radius.md,
    backgroundColor: palette.dangerBg,
  },
});
