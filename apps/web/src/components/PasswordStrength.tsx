import { t } from '@lms/i18n';
import { palette } from '@lms/theme';

const LEVELS = [
  { label: 'tooShort', color: palette.border },
  { label: 'weak', color: palette.danger },
  { label: 'fair', color: palette.warning },
  { label: 'good', color: palette.gold500 },
  { label: 'strong', color: palette.success },
] as const;

/** 0–4, mirroring the API's own password policy (length + character classes). */
export function scorePassword(value: string): number {
  if (value.length < 8) return 0;
  let score = 1;
  if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score += 1;
  if (/\d/.test(value)) score += 1;
  if (/[^A-Za-z0-9]/.test(value) || value.length >= 14) score += 1;
  return Math.min(score, 4);
}

export function PasswordStrength({ value }: { value: string }) {
  const score = scorePassword(value);
  const level = LEVELS[score] ?? LEVELS[0];

  return (
    <div className="strength">
      <div className="strength__track" aria-hidden>
        {[1, 2, 3, 4].map((step) => (
          <span
            key={step}
            className="strength__seg"
            style={{ background: step <= score ? level.color : palette.border }}
          />
        ))}
      </div>
      <span className="strength__label" aria-live="polite">
        {value
          ? t('common.password.strength', { level: t(`common.password.levels.${level.label}`) })
          : t('common.password.hint')}
      </span>
    </div>
  );
}
