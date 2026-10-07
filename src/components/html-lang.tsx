'use client'

import { useEffect } from 'react'

/** Nastaví atribut lang na <html> (kořenový layout je společný pro všechny jazyky). */
export function HtmlLang({ locale, remember = false }: { locale: string; remember?: boolean }) {
  useEffect(() => {
    document.documentElement.lang = locale
    // Marketing stránky si jazyk zapamatují, aby onboarding nového uživatele (ještě bez workspace) mluvil stejně.
    if (remember) document.cookie = `locale=${locale}; path=/; max-age=31536000; samesite=lax`
  }, [locale, remember])
  return null
}
