import { useState } from 'react';
import { t } from '@lms/i18n';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { StyleSheet, Text, View } from 'react-native';
import { AuthScreen } from '../components/AuthScreen';
import { Button } from '../components/Button';
import { TextField } from '../components/TextField';
import { Checkbox, Divider, LinkText } from '../components/bits';
import { AppleIcon, GoogleIcon, LockIcon, MailIcon } from '../components/icons';
import { validateEmail, validatePassword } from '../lib/validate';
import type { AuthStackParamList } from '../navigation/types';
import { colors, space, textStyle } from '../theme';

type Props = NativeStackScreenProps<AuthStackParamList, 'SignIn'>;
type Errors = { email?: string; password?: string };

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
    // UI-only for now: the POST /auth/login call lands here.
    await new Promise((resolve) => setTimeout(resolve, 900));
    setSubmitting(false);
    navigation.getParent()?.navigate('Main');
  }

  return (
    <AuthScreen
      title={t('auth.signIn.title')}
      subtitle={t('auth.signIn.subtitle')}
      footer={
        <Text style={styles.switchLine}>
          {t('auth.signIn.noAccount')}{' '}
          <LinkText onPress={() => navigation.navigate('SignUp')}>{t('auth.signIn.signUpLink')}</LinkText>
        </Text>
      }
    >
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
        <Checkbox checked={remember} onChange={setRemember}>
          <Text style={styles.checkboxLabel}>{t('auth.signIn.keepSignedIn')}</Text>
        </Checkbox>
        <LinkText onPress={() => navigation.navigate('ForgotPassword')}>{t('auth.signIn.forgotPassword')}</LinkText>
      </View>

      <Button label={t('auth.signIn.submit')} onPress={onSubmit} loading={submitting} />


    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space[3],
  },
  checkboxLabel: { ...textStyle('bodySm'), color: colors.textMuted },
  socialRow: { flexDirection: 'row', gap: space[3] },
  socialCell: { flex: 1 },
  switchLine: { ...textStyle('bodySm'), color: colors.textMuted, textAlign: 'center' },
});
