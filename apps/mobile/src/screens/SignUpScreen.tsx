import { useState } from 'react';
import { t } from '@lms/i18n';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { StyleSheet, Text, View } from 'react-native';
import { AuthScreen, fillTemplate } from '../components/AuthScreen';
import { Button } from '../components/Button';
import { TextField } from '../components/TextField';
import { Checkbox, LinkText, PasswordStrength, scorePassword } from '../components/bits';
import { LockIcon, MailIcon, PhoneIcon, UserIcon } from '../components/icons';
import { requiredText, validateEmail, validatePassword, validatePhone } from '../lib/validate';
import type { AuthStackParamList } from '../navigation/types';
import { colors, space, textStyle } from '../theme';

type Props = NativeStackScreenProps<AuthStackParamList, 'SignUp'>;
type Errors = {
  fullName?: string;
  email?: string;
  phone?: string;
  password?: string;
  accepted?: string;
};

export function SignUpScreen({ navigation }: Props) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit() {
    const next: Errors = {
      fullName: requiredText(fullName, t('auth.signUp.fullName')),
      email: validateEmail(email),
      phone: validatePhone(phone),
      password:
        validatePassword(password) ??
        (scorePassword(password) < 2 ? t('auth.signUp.weakPassword') : undefined),
      accepted: accepted ? undefined : t('auth.signUp.acceptTerms'),
    };
    setErrors(next);
    if (Object.values(next).some(Boolean)) return;

    setSubmitting(true);
    // UI-only for now: POST /auth/register goes here.
    await new Promise((resolve) => setTimeout(resolve, 900));
    setSubmitting(false);
    navigation.navigate('SignIn');
  }

  return (
    <AuthScreen
      title={t('auth.signUp.title')}
      subtitle={t('auth.signUp.subtitle')}
      footer={
        <Text style={styles.switchLine}>
          {t('auth.signUp.haveAccount')}{' '}
          <LinkText onPress={() => navigation.navigate('SignIn')}>{t('auth.signUp.signInLink')}</LinkText>
        </Text>
      }
    >
      <TextField
        label={t('auth.signUp.fullName')}
        placeholder="Anitha Rajendran"
        autoComplete="name"
        textContentType="name"
        lead={<UserIcon />}
        value={fullName}
        error={errors.fullName}
        onChangeText={setFullName}
      />

      <TextField
        label={t('auth.signUp.workEmail')}
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
        label={t('auth.signUp.mobileNumber')}
        placeholder="98765 43210"
        keyboardType="number-pad"
        maxLength={11}
        autoComplete="tel"
        textContentType="telephoneNumber"
        lead={<PhoneIcon />}
        value={phone}
        error={errors.phone}
        hint={t('auth.signUp.phoneHint')}
        onChangeText={(next) => setPhone(next.replace(/[^\d\s]/g, ''))}
      />

      <View>
        <TextField
          label={t('auth.field.password')}
          placeholder={t('auth.signUp.passwordPlaceholder')}
          revealable
          autoCapitalize="none"
          autoComplete="new-password"
          textContentType="newPassword"
          lead={<LockIcon />}
          value={password}
          error={errors.password}
          onChangeText={setPassword}
        />
        {errors.password ? null : <PasswordStrength value={password} />}
      </View>

      <View>
        <Checkbox checked={accepted} onChange={setAccepted}>
          <Text style={styles.legal}>
            {fillTemplate(t('auth.signUp.legal'), {
              terms: <Text style={styles.legalLink}>{t('auth.signUp.terms')}</Text>,
              privacy: <Text style={styles.legalLink}>{t('auth.signUp.privacy')}</Text>,
              company: 'BillionBrains Tech Ltd',
            })}
          </Text>
        </Checkbox>
        {errors.accepted ? <Text style={styles.error}>{errors.accepted}</Text> : null}
      </View>

      <Button label={t('auth.signUp.submit')} onPress={onSubmit} loading={submitting} />
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  legal: { ...textStyle('caption'), color: colors.textFaint, lineHeight: 18 },
  legalLink: { color: colors.brand },
  error: { ...textStyle('caption'), color: colors.danger, marginTop: space[2] },
  switchLine: { ...textStyle('bodySm'), color: colors.textMuted, textAlign: 'center' },
});
