import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocale, isLocale, setLocale, subscribeLocale, type Locale } from '@lms/i18n';

const STORAGE_KEY = 'lms.locale';

/** Restores the saved language. Resolves even when storage is unavailable. */
export async function loadLocale(): Promise<void> {
  try {
    const saved = await AsyncStorage.getItem(STORAGE_KEY);
    if (isLocale(saved)) setLocale(saved);
  } catch {
    // Keep the default.
  }
}

/**
 * The active language, re-rendering on change and saving each choice. Used
 * once, at the root, to key the navigation tree.
 */
export function useActiveLocale(): Locale {
  const [locale, setState] = useState(getLocale);

  useEffect(
    () =>
      subscribeLocale((next) => {
        setState(next);
        AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {
          // Not persisted; the choice still holds until the app restarts.
        });
      }),
    [],
  );

  return locale;
}

export function useLocale(): [Locale, (next: Locale) => void] {
  return [getLocale(), setLocale];
}
