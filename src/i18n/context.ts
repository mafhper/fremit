import { createContext } from 'react';
import { localeOptions, type Locale, type MessageSchema } from '@/i18n/messages';

export interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  copy: MessageSchema;
  localeOptions: typeof localeOptions;
}

export const I18nContext = createContext<I18nContextValue | null>(null);
