'use client'

import { useEffect, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { OPEN_SETTINGS_EVENT, readConsent, writeConsent } from '@/lib/consent'

/** Lišta se souhlasem s cookies: "Odmítnout vše" a "Přijmout vše" mají stejnou váhu, podrobnosti jsou v "Nastavit". */
export function CookieBanner() {
  const t = useTranslations('consent')
  const locale = useLocale()
  const [open, setOpen] = useState(false)
  const [detail, setDetail] = useState(false)
  const [preferences, setPreferences] = useState(false)

  useEffect(() => {
    const existing = readConsent()
    if (!existing) setOpen(true)
    else setPreferences(existing.preferences)
    const reopen = () => {
      setPreferences(readConsent()?.preferences ?? false)
      setDetail(true)
      setOpen(true)
    }
    window.addEventListener(OPEN_SETTINGS_EVENT, reopen)
    return () => window.removeEventListener(OPEN_SETTINGS_EVENT, reopen)
  }, [])

  if (!open) return null

  function decide(prefs: boolean) {
    writeConsent(prefs)
    setOpen(false)
    setDetail(false)
  }

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby="cookie-title"
      className="fixed inset-x-3 bottom-3 z-[100] mx-auto max-w-xl rounded-2xl border bg-card/95 p-5 text-card-foreground shadow-2xl backdrop-blur-xl sm:inset-x-auto sm:bottom-5 sm:left-5 sm:mx-0"
    >
      <h2 id="cookie-title" className="text-base font-semibold">
        {t('title')}
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        {t('description')}{' '}
        <a href={`/${locale}/cookies`} className="underline underline-offset-4 hover:text-foreground">
          {t('policy')}
        </a>
      </p>

      {detail && (
        <div className="mt-4 flex flex-col gap-3">
          <div className="flex items-start justify-between gap-4 rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">{t('necessaryTitle')}</p>
              <p className="mt-1 text-xs text-muted-foreground">{t('necessaryText')}</p>
            </div>
            <span className="shrink-0 pt-0.5 text-xs text-muted-foreground">{t('always')}</span>
          </div>
          <div className="flex items-start justify-between gap-4 rounded-lg border p-3">
            <div>
              <label htmlFor="consent-preferences" className="text-sm font-medium">
                {t('preferencesTitle')}
              </label>
              <p className="mt-1 text-xs text-muted-foreground">{t('preferencesText')}</p>
            </div>
            <Switch id="consent-preferences" checked={preferences} onCheckedChange={setPreferences} />
          </div>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {detail ? (
          <Button type="button" onClick={() => decide(preferences)}>
            {t('save')}
          </Button>
        ) : (
          <Button type="button" variant="outline" onClick={() => setDetail(true)}>
            {t('customize')}
          </Button>
        )}
        <Button type="button" onClick={() => decide(false)}>
          {t('rejectAll')}
        </Button>
        <Button type="button" onClick={() => decide(true)}>
          {t('acceptAll')}
        </Button>
      </div>
    </div>
  )
}
