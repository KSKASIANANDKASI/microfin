import { useState } from 'react';
import { t } from '@lms/i18n';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { StyleSheet, Text, View } from 'react-native';
import { AuthScreen } from '../components/AuthScreen';
import { Button } from '../components/Button';
import { TextField } from '../components/TextField';
import { LinkText, Notice } from '../components/bits';
import { MailIcon } from '../components/icons';
import { validateEmail } from '../lib/validate';
import type { AuthStackParamList } from '../navigation/types';
import { colors, space, textStyle } from '../theme';

type Props = NativeStackScreenProps<AuthStackParamList, 'ForgotPassword'>;

export function ForgotPasswordScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit() {
    const next = validateEmail(email);
    setError(next);
    if (next) return;

    setSubmitting(true);
    await new Promise((resolve) => setTimeout(resolve, 900));
    setSubmitting(false);
    setSent(true);
  }

  return (
    <AuthScreen
      title={sent ? t('auth.forgot.sentTitle') : t('auth.forgot.title')}
      subtitle={
        sent
          ? t('auth.forgot.sentSubtitle', { email })
          : t('auth.forgot.subtitle')
      }
      footer={
        <Text style={styles.switchLine}>
          <LinkText onPress={() => navigation.navigate('SignIn')}>{`← ${t('auth.forgot.backToSignIn')}`}</LinkText>
        </Text>
      }
    >
      {sent ? (
        <View style={styles.stack}>
          <Notice>{t('auth.forgot.sentNoticeMobile')}</Notice>
          <Button label={t('auth.forgot.differentEmail')} variant="ghost" onPress={() => setSent(false)} />
        </View>
      ) : (
        <View style={styles.stack}>
          <TextField
            label={t('auth.field.email')}
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            textContentType="emailAddress"
            lead={<MailIcon />}
            value={email}
            error={error}
            onChangeText={setEmail}
          />
          <Button label={t('auth.forgot.submit')} onPress={onSubmit} loading={submitting} />
        </View>
      )}
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  stack: { gap: space[5] },
  switchLine: { ...textStyle('bodySm'), color: colors.textMuted, textAlign: 'center' },
});
