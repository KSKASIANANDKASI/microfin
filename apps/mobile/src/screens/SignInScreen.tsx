import { useState } from 'react';
import { t } from '@lms/i18n';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { StyleSheet, Text, View } from 'react-native';
import { AuthScreen } from '../components/AuthScreen';
import { Button } from '../components/Button';
import { TextField } from '../components/TextField';
import { Checkbox, Divider, LinkText } from '../components/bits';
import { AppleIcon, GoogleIcon, LockIcon, MailIcon } from '../components/icons';
import { loadPortfolio } from '../lib/data';
import { ApiError, signIn } from '../lib/session';
import { validateEmail, validatePassword } from '../lib/validate';
import type { AuthStackParamList } from '../navigation/types';
import { colors, palette, radius, space, textStyle } from '../theme';

type Props = NativeStackScreenProps<AuthStackParamList, 'SignIn'>;
type Errors = { email?: string; password?: string; form?: string };

export function SignInScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit() {
    const next: Errors = { email: validateEmail(email), password: validatePassword(password) };
    setErrors(next);
    if (next.email || next.password) return;

    setSubmitting(true);
    try {
      await signIn(email, password, remember);
      await loadPortfolio();
    } catch (error) {
      setErrors({ form: error instanceof ApiError ? error.message : t('auth.errors.generic') });
      setSubmitting(false);
      return;
    }
    setSubmitting(false);
    // Reset rather than navigate, so Back from the dashboard does not return here.
    navigation.getParent()?.reset({ index: 0, routes: [{ name: 'Main' }] });
  }

  return (
    <AuthScreen
      footer={
        <Text style={styles.switchLine}>
          {t('auth.signIn.noAccount')}{' '}
          <LinkText onPress={() => navigation.navigate('SignUp')}>{t('auth.signIn.signUpLink')}</LinkText>
        </Text>
      }
    >
      {errors.form ? (
        <Text style={styles.formError} accessibilityRole="alert">
          {errors.form}
        </Text>
      ) : null}

      <TextField
        label={t('auth.field.email')}
        placeholder="you@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        textContentType="emailAddress"
        lead={<MailIcon />}
        value={email}
        error={errors.email}
        onChangeText={setEmail}
      />

      <TextField
        label={t('auth.field.password')}
        placeholder={t('auth.field.passwordPlaceholder')}
        revealable
        autoCapitalize="none"
        autoComplete="password"
        textContentType="password"
        lead={<LockIcon />}
        value={password}
        error={errors.password}
        onChangeText={setPassword}
      />

      <View style={styles.row}>
        <Checkbox checked={remember} onChange={setRemember} style={styles.remember}>
          <Text style={styles.checkboxLabel}>{t('auth.signIn.keepSignedIn')}</Text>
        </Checkbox>
        <View style={styles.forgot}>
          <LinkText onPress={() => navigation.navigate('ForgotPassword')}>{t('auth.signIn.forgotPassword')}</LinkText>
        </View>
      </View>

      <Button label={t('auth.signIn.submit')} onPress={onSubmit} loading={submitting} />


    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space[3],
  },
  remember: { flexShrink: 1 },
  // Stays on the right when a narrow screen or long translation wraps it below.
  forgot: { marginLeft: 'auto' },
  checkboxLabel: { ...textStyle('bodySm'), color: colors.textMuted },
  formError: {
    ...textStyle('bodySm'),
    color: colors.danger,
    padding: space[4],
    borderRadius: radius.md,
    backgroundColor: palette.dangerBg,
  },
  socialRow: { flexDirection: 'row', gap: space[3] },
  socialCell: { flex: 1 },
  switchLine: { ...textStyle('bodySm'), color: colors.textMuted, textAlign: 'center' },
});
