import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { t } from '@lms/i18n';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { PasswordStrength, scorePassword } from '../components/PasswordStrength';
import { TextField } from '../components/TextField';
import { ArrowLeftIcon, CheckIcon, LockIcon } from '../components/icons';
import { ApiError, changePassword } from '../lib/session';
import { validatePassword } from '../lib/validate';

type Errors = { current?: string; next?: string; confirm?: string; form?: string };

export function ChangePassword() {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
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

  return (
    <>
      <div className="pagehead">
        <Link className="backlink" to="/settings">
          <ArrowLeftIcon size={14} /> {t('common.nav.settings')}
        </Link>
        <h1 className="pagehead__title">
          {done ? t('settings.changePassword.successTitle') : t('settings.changePassword.title')}
        </h1>
        <p className="pagehead__sub">{t('settings.changePassword.subtitle')}</p>
      </div>

      {done ? (
        <Card>
          <div className="stack">
            <div className="notice notice--good">
              <CheckIcon />
              <span>{t('settings.changePassword.successNotice')}</span>
            </div>
            <Link className="btn btn--ghost" to="/settings">
              {t('settings.changePassword.backToSettings')}
            </Link>
          </div>
        </Card>
      ) : (
        <form onSubmit={onSubmit} noValidate>
          <Card>
            <div className="stack">
              {errors.form ? (
                <div className="notice notice--bad" role="alert">
                  {errors.form}
                </div>
              ) : null}

              <TextField
                label={t('settings.changePassword.current')}
                revealable
                autoComplete="current-password"
                placeholder={t('settings.changePassword.currentPlaceholder')}
                lead={<LockIcon />}
                value={current}
                error={errors.current}
                onChange={(e) => setCurrent(e.target.value)}
                autoFocus
              />

              <div>
                <TextField
                  label={t('settings.changePassword.new')}
                  revealable
                  autoComplete="new-password"
                  placeholder={t('settings.changePassword.newPlaceholder')}
                  lead={<LockIcon />}
                  value={next}
                  error={errors.next}
                  onChange={(e) => setNext(e.target.value)}
                />
                {errors.next ? null : <PasswordStrength value={next} />}
              </div>

              <TextField
                label={t('settings.changePassword.confirm')}
                revealable
                autoComplete="new-password"
                placeholder={t('settings.changePassword.confirmPlaceholder')}
                lead={<LockIcon />}
                value={confirm}
                error={errors.confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </div>
          </Card>

          <div className="formactions">
            <Link className="btn btn--sm btn--ghost" to="/settings">
              {t('common.actions.cancel')}
            </Link>
            <Button type="submit" loading={submitting}>
              {t('settings.changePassword.submit')}
            </Button>
          </div>
        </form>
      )}
    </>
  );
}
