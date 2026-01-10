'use client'

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react'
import { getTranslation } from '@/lib/i18n'

type Locale = 'it' | 'en'

interface LocaleContextType {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: string) => string
}

const LocaleContext = createContext<LocaleContextType | undefined>(undefined)

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('it')

  useEffect(() => {
    // Load saved locale from localStorage
    try {
      const savedLocale = localStorage.getItem('locale') as Locale | null
      if (savedLocale && (savedLocale === 'it' || savedLocale === 'en')) {
        setLocaleState(savedLocale)
      }
    } catch {
      // localStorage not available (SSR)
    }
  }, [])

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale)
    try {
      localStorage.setItem('locale', newLocale)
      document.documentElement.lang = newLocale
    } catch {
      // localStorage not available
    }
  }

  const t = useCallback((key: string): string => {
    return getTranslation(locale, key)
  }, [locale])

  useEffect(() => {
    try {
      document.documentElement.lang = locale
    } catch {
      // document not available (SSR)
    }
  }, [locale])

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LocaleContext.Provider>
  )
}

export function useLocale() {
  const context = useContext(LocaleContext)
  if (context === undefined) {
    throw new Error('useLocale must be used within a LocaleProvider')
  }
  return context
}

