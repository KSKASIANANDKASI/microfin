/**
 * English / Tamil copy for both apps. Plain data plus a tiny translator — no
 * React and no platform imports, so web and mobile share every string.
 *
 * The active locale is module state. Each app wraps its tree in a provider
 * that calls `setLocale` and remounts on change, so `t()` can be called
 * anywhere during render (or from a helper) without threading a hook through.
 */

import * as enMessages from './locales/en';
import * as taMessages from './locales/ta';
import type { Leaves, Params, Shape } from './types';

export type { Params, Shape } from './types';

export type Locale = 'en' | 'ta';

export const LOCALES: { id: Locale; label: string; nativeLabel: string; tag: string }[] = [
  { id: 'en', label: 'English', nativeLabel: 'English', tag: 'en-IN' },
  { id: 'ta', label: 'Tamil', nativeLabel: 'தமிழ்', tag: 'ta-IN' },
];

export const DEFAULT_LOCALE: Locale = 'en';

type Messages = typeof enMessages;
const DICTIONARIES: Record<Locale, Shape<Messages>> = { en: enMessages, ta: taMessages };

export type MessageKey = Leaves<Messages>;

type PluralBase<K> = K extends `${infer Base}.other`
  ? `${Base}.one` extends MessageKey
    ? Base
    : never
  : never;

/** A key whose value is a `{ one, other }` pair, for `tp()`. */
export type PluralKey = PluralBase<MessageKey>;

export function isLocale(value: unknown): value is Locale {
  return value === 'en' || value === 'ta';
}

let current: Locale = DEFAULT_LOCALE;
const listeners = new Set<(locale: Locale) => void>();

export function getLocale(): Locale {
  return current;
}

export function setLocale(locale: Locale): void {
  if (locale === current) return;
  current = locale;
  listeners.forEach((fn) => fn(locale));
}

/** Returns an unsubscribe function. */
export function subscribeLocale(fn: (locale: Locale) => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

function lookup(dict: unknown, key: string): string | undefined {
  let node: unknown = dict;
  for (const part of key.split('.')) {
    if (node === null || typeof node !== 'object') return undefined;
    node = (node as Record<string, unknown>)[part];
  }
  return typeof node === 'string' ? node : undefined;
}

function interpolate(message: string, params?: Params): string {
  if (!params) return message;
  return message.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match,
  );
}

/**
 * Translate `key` into the active locale. Falls back to English, then to the
 * key itself, so a gap shows up as readable text rather than a blank.
 */
export function t(key: MessageKey, params?: Params): string {
  const message = lookup(DICTIONARIES[current], key) ?? lookup(DICTIONARIES.en, key) ?? key;
  return interpolate(message, params);
}

/** `tp('lines.accounts', 3)` → the `.one` or `.other` form, with `{count}` filled. */
export function tp(key: PluralKey, count: number, params?: Params): string {
  const form = count === 1 ? 'one' : 'other';
  return t(`${key}.${form}` as MessageKey, { count, ...params });
}

/** Month / weekday names spelled out by hand so web and Hermes agree. */
const MONTH_KEYS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'] as const;
const WEEKDAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;

/** `month` is 0-based, as `Date#getMonth` returns it. */
export function monthName(month: number, short = false): string {
  const key = MONTH_KEYS[month];
  if (!key) return '';
  return t(short ? `common.monthsShort.${key}` : `common.months.${key}`);
}

/** `day` is 0 = Sunday, as `Date#getDay` returns it. */
export function weekdayName(day: number, short = false): string {
  const key = WEEKDAY_KEYS[day];
  if (!key) return '';
  return t(short ? `common.weekdaysShort.${key}` : `common.weekdays.${key}`);
}
