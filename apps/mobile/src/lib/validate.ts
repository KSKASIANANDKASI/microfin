import { t } from '@lms/i18n';
import type { IdType } from './data';

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const PHONE_RE = /^[6-9]\d{9}$/;

export function requiredText(value: string, label: string): string | undefined {
  if (!value.trim()) return t('validation.required', { label });
  return undefined;
}

export function validateEmail(value: string): string | undefined {
  if (!value.trim()) return t('validation.emailRequired');
  if (!EMAIL_RE.test(value.trim())) return t('validation.emailInvalid');
  return undefined;
}

export function validatePhone(value: string): string | undefined {
  const digits = value.replace(/\D/g, '');
  if (!digits) return t('validation.phoneRequired');
  if (!PHONE_RE.test(digits)) return t('validation.phoneInvalid');
  return undefined;
}

export function validatePassword(value: string): string | undefined {
  if (!value) return t('validation.passwordRequired');
  if (value.length < 8) return t('validation.passwordShort');
  return undefined;
}

/**
 * Format checks only — that the ID exists and belongs to the customer is
 * settled during KYC review, not at the keyboard.
 */
const ID_RULES: Record<IdType, RegExp> = {
  AADHAAR: /^[2-9]\d{11}$/,
  PAN: /^[A-Z]{5}\d{4}[A-Z]$/,
  VOTER_ID: /^[A-Z]{3}\d{7}$/,
  DRIVING_LICENSE: /^[A-Z]{2}\d{13}$/,
  PASSPORT: /^[A-Z]\d{7}$/,
};

/** Drops the spaces and hyphens officers type between groups. */
export function normalizeIdNumber(value: string): string {
  return value.replace(/[\s-]/g, '').toUpperCase();
}

export function validateIdNumber(type: IdType | '', value: string): string | undefined {
  if (!value.trim()) return t('validation.idRequired');
  // With no type chosen there is no shape to check against; that field carries
  // its own error and is the one to fix first.
  if (!type) return undefined;
  if (!ID_RULES[type].test(normalizeIdNumber(value))) return t(`validation.idFormat.${type}`);
  return undefined;
}
