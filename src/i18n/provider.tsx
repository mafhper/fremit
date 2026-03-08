import { type ReactNode, useMemo, useState } from 'react';
import { I18nContext, type I18nContextValue } from '@/i18n/context';
import { localeOptions, messages, type Locale } from '@/i18n/messages';

const storageKey = 'fremit.locale';

function detectLocale(): Locale {
  if (typeof navigator === 'undefined') return 'en-US';

  const candidates = navigator.languages?.length ? navigator.languages : [navigator.language];
  const normalized = candidates.map((value) => value.toLowerCase());

  if (normalized.some((value) => value.startsWith('pt'))) return 'pt-BR';
  if (normalized.some((value) => value.startsWith('es'))) return 'es';
  return 'en-US';
}

function getInitialLocale(): Locale {
  if (typeof window === 'undefined') {
    return 'en-US';
  }

  const stored = window.localStorage.getItem(storageKey) as Locale | null;
  return stored && stored in messages ? stored : detectLocale();
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => getInitialLocale());

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      setLocale: (nextLocale) => {
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(storageKey, nextLocale);
        }
        setLocaleState(nextLocale);
      },
      copy: messages[locale],
      localeOptions,
    }),
    [locale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
