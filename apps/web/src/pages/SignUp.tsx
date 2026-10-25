import { useState, type FormEvent } from 'react';
import { t } from '@lms/i18n';
import { Link, useNavigate } from 'react-router-dom';
import { AuthLayout, fillTemplate } from '../components/AuthLayout';
import { Button } from '../components/Button';
import { PasswordStrength, scorePassword } from '../components/PasswordStrength';
import { TextField } from '../components/TextField';
import { LockIcon, MailIcon, PhoneIcon, UserIcon } from '../components/icons';
import { clearPortfolio } from '../lib/data';
import { errorMessage, signUp } from '../lib/session';
import { requiredText, validateEmail, validatePassword, validatePhone } from '../lib/validate';

type Errors = {
  form?: string;
  companyName?: string;
  fullName?: string;
  confirm?: string;
  email?: string;
  phone?: string;
  password?: string;
  accepted?: string;
};

export function SignUp() {
  const navigate = useNavigate();
  const [companyName, setCompanyName] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const next: Errors = {
      companyName: requiredText(companyName, t('auth.signUp.companyName')),
      fullName: requiredText(fullName, t('auth.signUp.fullName')),
      email: validateEmail(email),
      phone: validatePhone(phone),
      password: validatePassword(password) ?? (scorePassword(password) < 2 ? t('auth.signUp.weakPassword') : undefined),
      confirm: confirm === password ? undefined : t('settings.changePassword.mismatch'),
      accepted: accepted ? undefined : t('auth.signUp.acceptTerms'),
    };
    setErrors(next);
    if (Object.values(next).some(Boolean)) return;

    setSubmitting(true);
    try {
      // Creates the company and its admin, and signs the admin in.
      await signUp({ companyName: companyName.trim(), fullName: fullName.trim(), email, phone, password });
    } catch (error) {
      setErrors({ form: errorMessage(error) });
      setSubmitting(false);
      return;
    }
    clearPortfolio();
    navigate('/dashboard', { replace: true });
  }

  return (
    <AuthLayout>
      <div className="form-head">
        <h1>{t('auth.signUp.title')}</h1>
        <p>{t('auth.signUp.subtitle')}</p>
      </div>

      <form className="stack" onSubmit={onSubmit} noValidate>
        {errors.form ? (
          <div className="notice notice--bad" role="alert">
            {errors.form}
          </div>
        ) : null}

        <TextField
          label={t('auth.signUp.companyName')}
          autoComplete="organization"
          placeholder="ABC Finance"
          lead={<UserIcon />}
          value={companyName}
          error={errors.companyName}
          onChange={(e) => setCompanyName(e.target.value)}
        />

	<TextField
          label={t('auth.signUp.userName')}
          autoComplete="user name"
          placeholder={t('auth.signUp.userNamePlaceholder')}
          lead={<UserIcon />}
          value={fullName}
          error={errors.fullName}
          onChange={(e) => setFullName(e.target.value)}
        />

        <TextField
          label={t('auth.signUp.workEmail')}
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
          label={t('auth.signUp.mobileNumber')}
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          placeholder="98765 43210"
          maxLength={11}
          lead={<PhoneIcon />}
          value={phone}
          error={errors.phone}
          hint={t('auth.signUp.phoneHint')}
          onChange={(e) => setPhone(e.target.value.replace(/[^\d\s]/g, ''))}
        />

        <div>
          <TextField
            label={t('auth.signUp.setPassword')}
            revealable
            autoComplete="new-password"
            placeholder={t('auth.signUp.newPasswordPlaceholder')}
            lead={<LockIcon />}
            value={password}
            error={errors.password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {errors.password ? null : <PasswordStrength value={password} />}
        </div>
	
	<div>
          <TextField
            label={t('auth.signUp.confirmPassword')}
            revealable
            autoComplete="new-password"
            placeholder={t('auth.signUp.confirmPasswordPlaceholder')}
            lead={<LockIcon />}
            value={confirm}
            error={errors.confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </div>

        <div>
          <label className="checkbox" style={{ alignItems: 'flex-start' }}>
            <input
              type="checkbox"
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
              style={{ marginTop: 2 }}
            />
            <span className="legal">
              {fillTemplate(t('auth.signUp.legal'), {
                terms: <a href="#terms">{t('auth.signUp.terms')}</a>,
                privacy: <a href="#privacy">{t('auth.signUp.privacy')}</a>,
                company: 'Billionbrains Tech Ltd',
              })}
            </span>
          </label>
          {errors.accepted ? (
            <span className="field__error" role="alert">
              {errors.accepted}
            </span>
          ) : null}
        </div>

        <Button type="submit" loading={submitting}>
          {t('auth.signUp.submit')}
        </Button>

        <p className="switch-line">
          {t('auth.signUp.haveAccount')} <Link to="/sign-in">{t('auth.signUp.signInLink')}</Link>
        </p>
      </form>
    </AuthLayout>
  );
}
