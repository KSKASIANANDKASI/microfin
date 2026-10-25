import { useState, type FormEvent } from 'react';
import { t } from '@lms/i18n';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { AuthLayout } from '../components/AuthLayout';
import { Button } from '../components/Button';
import { TextField } from '../components/TextField';
import { AppleIcon, GoogleIcon, LockIcon, MailIcon } from '../components/icons';
import { clearPortfolio } from '../lib/data';
import { ApiError, getSession, signIn } from '../lib/session';
import { validateEmail, validatePassword } from '../lib/validate';

type Errors = { email?: string; password?: string; form?: string };

export function SignIn() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const next: Errors = { email: validateEmail(email), password: validatePassword(password) };
    setErrors(next);
    if (next.email || next.password) return;

    setSubmitting(true);
    try {
      await signIn(email, password, remember);
      // Drop anything a previous user left in memory; the shell loads this user's portfolio.
      clearPortfolio();
      navigate('/dashboard', { replace: true });
    } catch (error) {
      setErrors({ form: error instanceof ApiError ? error.message : t('auth.errors.generic') });
      setSubmitting(false);
    }
  }

  if (getSession()) return <Navigate to="/dashboard" replace />;

  return (
    <AuthLayout>
      <form className="stack" onSubmit={onSubmit} noValidate>
        {errors.form ? (
          <div className="notice notice--bad" role="alert">
            {errors.form}
          </div>
        ) : null}

        <TextField
          label={t('auth.signIn.userOrEmail')}
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="you@example.com"
          lead={<MailIcon />}
          value={email}
          error={errors.email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <TextField
          label={t('auth.field.password')}
          revealable
          autoComplete="current-password"
          placeholder={t('auth.field.passwordPlaceholder')}
          lead={<LockIcon />}
          value={password}
          error={errors.password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <div className="row-between">
          <label className="checkbox">
            <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
            {t('auth.signIn.keepSignedIn')}
          </label>
          <Link to="/forgot-password">{t('auth.signIn.forgotPassword')}</Link>
        </div>

        <Button type="submit" loading={submitting}>
          {t('auth.signIn.submit')}
        </Button>

        <p className="switch-line">
          {t('auth.signIn.noAccount')} <Link to="/sign-up">{t('auth.signIn.signUpLink')}</Link>
        </p>
      </form>
    </AuthLayout>
  );
}
