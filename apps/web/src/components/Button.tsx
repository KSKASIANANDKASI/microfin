import { t } from '@lms/i18n';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'ghost';
  loading?: boolean;
  children: ReactNode;
};

export function Button({ variant = 'primary', loading, children, disabled, ...rest }: Props) {
  return (
    <button className={`btn btn--${variant}`} disabled={disabled || loading} {...rest}>
      {loading ? <span className="btn__spinner" aria-hidden /> : null}
      {loading ? t('common.actions.pleaseWait') : children}
    </button>
  );
}
