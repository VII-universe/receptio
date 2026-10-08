'use client'

import { useEffect } from 'react'
import { CONSENT_EVENT, canStorePreferences } from '@/lib/consent'

/** Nastaví atribut lang na <html> (kořenový layout je společný pro všechny jazyky). */
export function HtmlLang({ locale, remember = false }: { locale: string; remember?: boolean }) {
  useEffect(() => {
    document.documentElement.lang = locale
    // Marketing stránky si jazyk zapamatují, aby onboarding nového uživatele (ještě bez workspace) mluvil stejně.
    // Je to preference, takže jen se souhlasem uživatele (a po jeho udělení se zapíše hned).
    if (!remember) return
    const store = () => {
      if (canStorePreferences()) document.cookie = `locale=${locale}; path=/; max-age=31536000; samesite=lax`
    }
    store()
    window.addEventListener(CONSENT_EVENT, store)
    return () => window.removeEventListener(CONSENT_EVENT, store)
  }, [locale, remember])
  return null
}
