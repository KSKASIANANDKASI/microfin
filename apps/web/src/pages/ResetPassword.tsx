import { useState, type FormEvent } from 'react';
import { t } from '@lms/i18n';
import { Link, useSearchParams } from 'react-router-dom';
import { AuthLayout } from '../components/AuthLayout';
import { Button } from '../components/Button';
import { TextField } from '../components/TextField';
import { ArrowLeftIcon, LockIcon } from '../components/icons';
import { ApiError, errorMessage, resetPassword } from '../lib/session';
import { validatePassword } from '../lib/validate';

type Errors = { password?: string; confirm?: string; form?: string };

/** Landing page for the emailed reset link: `/reset-password?token=…`. */
export function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  // A used or expired link can't be retried; only a new one helps.
  const [linkDead, setLinkDead] = useState(!token);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const next: Errors = {
      password: validatePassword(password),
      confirm: confirm === password ? undefined : t('settings.changePassword.mismatch'),
    };
    setErrors(next);
    if (next.password || next.confirm) return;

    setSubmitting(true);
    try {
      await resetPassword(token, password);
    } catch (failure) {
      if (failure instanceof ApiError && failure.code === 'RESET_LINK_INVALID') setLinkDead(true);
      setErrors({ form: errorMessage(failure) });
      setSubmitting(false);
      return;
    }
    setSubmitting(false);
    setDone(true);
  }

  if (done) {
    return (
      <AuthLayout>
        <div className="form-head">
          <h1>{t('auth.reset.doneTitle')}</h1>
          <p>{t('auth.reset.doneSubtitle')}</p>
        </div>
        <div className="stack">
          <Link className="btn btn--primary" to="/sign-in">
            {t('auth.reset.signIn')}
          </Link>
        </div>
      </AuthLayout>
    );
  }

  if (linkDead) {
    return (
      <AuthLayout>
        <div className="form-head">
          <h1>{t('auth.reset.title')}</h1>
          <p>{errors.form ?? t('auth.reset.missingToken')}</p>
        </div>
        <div className="stack">
          <Link className="btn btn--primary" to="/forgot-password">
            {t('auth.reset.requestNew')}
          </Link>
          <p className="switch-line">
            <Link to="/sign-in">
              <ArrowLeftIcon size={14} /> {t('auth.forgot.backToSignIn')}
            </Link>
          </p>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <div className="form-head">
        <h1>{t('auth.reset.title')}</h1>
        <p>{t('auth.reset.subtitle')}</p>
      </div>

      <form className="stack" onSubmit={onSubmit} noValidate>
        <TextField
          label={t('auth.reset.password')}
          revealable
          autoComplete="new-password"
          placeholder={t('auth.reset.passwordPlaceholder')}
          lead={<LockIcon />}
          value={password}
          error={errors.password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <TextField
          label={t('auth.reset.confirm')}
          revealable
          autoComplete="new-password"
          placeholder={t('auth.reset.confirmPlaceholder')}
          lead={<LockIcon />}
          value={confirm}
          error={errors.confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />

        {errors.form ? (
          <span className="field__error" role="alert">
            {errors.form}
          </span>
        ) : null}

        <Button type="submit" loading={submitting}>
          {t('auth.reset.submit')}
        </Button>

        <p className="switch-line">
          <Link to="/sign-in">
            <ArrowLeftIcon size={14} /> {t('auth.forgot.backToSignIn')}
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
