import { useState, type FormEvent } from 'react';
import { t } from '@lms/i18n';
import { Link } from 'react-router-dom';
import { AuthLayout } from '../components/AuthLayout';
import { Button } from '../components/Button';
import { TextField } from '../components/TextField';
import { ArrowLeftIcon, CheckIcon, MailIcon } from '../components/icons';
import { errorMessage, requestPasswordReset } from '../lib/session';
import { validateEmail } from '../lib/validate';

export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const next = validateEmail(email);
    setError(next);
    if (next) return;

    setSubmitting(true);
    try {
      // Always answers "sent", whether or not the email has an account.
      await requestPasswordReset(email);
    } catch (failure) {
      setError(errorMessage(failure));
      setSubmitting(false);
      return;
    }
    setSubmitting(false);
    setSent(true);
  }

  return (
    <AuthLayout>
      <div className="form-head">
        <h1>{sent ? t('auth.forgot.sentTitle') : t('auth.forgot.title')}</h1>
        <p>
          {sent
            ? t('auth.forgot.sentSubtitle', { email })
            : t('auth.forgot.subtitle')}
        </p>
      </div>

      {sent ? (
        <div className="stack">
          <div className="notice">
            <CheckIcon />
            <span>{t('auth.forgot.sentNoticeWeb')}</span>
          </div>
          <Button type="button" variant="ghost" onClick={() => setSent(false)}>
            {t('auth.forgot.differentEmail')}
          </Button>
          <p className="switch-line">
            <Link to="/sign-in">
              <ArrowLeftIcon size={14} /> {t('auth.forgot.backToSignIn')}
            </Link>
          </p>
        </div>
      ) : (
        <form className="stack" onSubmit={onSubmit} noValidate>
          <TextField
            label={t('auth.field.email')}
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="you@example.com"
            lead={<MailIcon />}
            value={email}
            error={error}
            onChange={(e) => setEmail(e.target.value)}
          />

          <Button type="submit" loading={submitting}>
            {t('auth.forgot.submit')}
          </Button>

          <p className="switch-line">
            <Link to="/sign-in">
              <ArrowLeftIcon size={14} /> {t('auth.forgot.backToSignIn')}
            </Link>
          </p>
        </form>
      )}
    </AuthLayout>
  );
}
