import { t } from '@lms/i18n';
import { useId, useState, type InputHTMLAttributes, type ReactNode } from 'react';
import { EyeIcon, EyeOffIcon } from './icons';

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  lead?: ReactNode;
  error?: string;
  hint?: string;
  /** Renders a show/hide toggle and swaps the input type. */
  revealable?: boolean;
};

export function TextField({ label, lead, error, hint, revealable, id, type = 'text', ...rest }: Props) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const describedBy = error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined;
  const [revealed, setRevealed] = useState(false);

  return (
    <div className="field">
      <label htmlFor={inputId}>{label}</label>

      <div className={`field__control${error ? ' field__control--invalid' : ''}`}>
        {lead ? <span className="field__lead">{lead}</span> : null}
        <input
          id={inputId}
          type={revealable ? (revealed ? 'text' : 'password') : type}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          {...rest}
        />
        {revealable ? (
          <button
            type="button"
            className="field__toggle"
            onClick={() => setRevealed((v) => !v)}
            aria-label={revealed ? t('common.field.hidePassword') : t('common.field.showPassword')}
          >
            {revealed ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        ) : null}
      </div>

      {error ? (
        <span className="field__error" id={`${inputId}-error`} role="alert">
          {error}
        </span>
      ) : hint ? (
        <span className="field__hint" id={`${inputId}-hint`}>
          {hint}
        </span>
      ) : null}
    </div>
  );
}
