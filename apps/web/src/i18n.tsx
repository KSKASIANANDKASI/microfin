import { Fragment, useEffect, useState, type ReactNode } from 'react';
import {
  DEFAULT_LOCALE,
  LOCALES,
  getLocale,
  isLocale,
  setLocale,
  subscribeLocale,
  type Locale,
} from '@lms/i18n';

const STORAGE_KEY = 'lms.locale';

/** Restores the saved language. Call once, before the first render. */
export function initLocale(): void {
  let saved: string | null = null;
  try {
    saved = localStorage.getItem(STORAGE_KEY);
  } catch {
    // Storage blocked (private mode, policy) — fall back to the default.
  }
  setLocale(isLocale(saved) ? saved : DEFAULT_LOCALE);
}

/**
 * Remounts the tree when the language changes so every `t()` call — including
 * ones in helpers and module-level getters — re-runs. The URL is untouched, so
 * the user stays on the page they switched from.
 */
export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setState] = useState(getLocale);

  useEffect(() => subscribeLocale(setState), []);

  useEffect(() => {
    document.documentElement.lang = LOCALES.find((l) => l.id === locale)?.tag ?? locale;
    try {
      localStorage.setItem(STORAGE_KEY, locale);
    } catch {
      // Not persisted; the choice still holds for this visit.
    }
  }, [locale]);

  return <Fragment key={locale}>{children}</Fragment>;
}

export function useLocale(): [Locale, (next: Locale) => void] {
  return [getLocale(), setLocale];
}
