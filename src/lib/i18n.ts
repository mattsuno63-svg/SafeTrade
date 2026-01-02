// Internationalization system for SafeTrade
import { it } from '@/locales/it'

export type Locale = 'it' | 'en'

const translations: Record<Locale, Record<string, string>> = {
  it: it,
  en: {
    ...it, // Fallback to IT structure
    // Overrides
    'common.loading': 'Loading...',
    'common.error': 'Error',
    'common.success': 'Success',
    'common.cancel': 'Cancel',
    // We can add EN overrides later or import from a separate en.ts file
  }
}

export function getTranslation(locale: Locale, key: string): string {
  // Always fallback to 'it' if locale is missing
  const currentLocale = translations[locale] || translations['it']
  return currentLocale[key] || key
}

export function t(locale: Locale) {
  return (key: string) => getTranslation(locale, key)
}

