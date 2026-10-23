'use client'

import { useEffect, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { OPEN_SETTINGS_EVENT, readConsent, writeConsent } from '@/lib/consent'
import { cn } from '@/lib/utils'

/**
 * Lišta se souhlasem s cookies ve stylu veřejného webu. Logika, cookie i texty jsou stejné jako
 * u lišty aplikace (components/consent): „Odmítnout vše“ a „Přijmout vše“ mají stejnou váhu,
 * podrobnosti jsou v „Nastavit“, z patičky se otevře událostí OPEN_SETTINGS_EVENT.
 *
 * Vykreslí se už na serveru, aby nepřibyla až po hydrataci (pozdní LCP). Když je souhlas uložený,
 * schová ji před prvním vykreslením skript v layoutu (html[data-consent]) a po hydrataci zmizí úplně.
 */
export function ConsentBanner() {
  const t = useTranslations('consent')
  const locale = useLocale()
  const [hydrated, setHydrated] = useState(false)
  const [open, setOpen] = useState(true)
  const [detail, setDetail] = useState(false)
  const [preferences, setPreferences] = useState(false)

  useEffect(() => {
    const existing = readConsent()
    setHydrated(true)
    if (existing) {
      setOpen(false)
      setPreferences(existing.preferences)
    }
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

  const button = 'mk-btn mk-btn-sm min-h-11 px-4'
  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby="cookie-title"
      data-ssr={hydrated ? undefined : ''}
      className="mk-consent tone-light fixed inset-x-3 bottom-3 z-[100] max-w-[30rem] rounded-[1.25rem] bg-white p-5 text-[0.9375rem] shadow-[0_24px_60px_-20px_rgb(20_22_31/0.45)] ring-1 ring-ink/10 sm:inset-x-auto sm:bottom-5 sm:left-5"
    >
      <h2 id="cookie-title" className="font-semibold">
        {t('title')}
      </h2>
      <p className="mt-1.5 text-sm leading-relaxed text-fg-soft">
        {t('description')}{' '}
        <a href={`/${locale}/cookies`} className="underline underline-offset-4 hover:text-fg">
          {t('policy')}
        </a>
      </p>

      {detail && (
        <div className="mt-4 flex flex-col gap-2.5 text-sm">
          <div className="flex items-start justify-between gap-4 rounded-xl border border-line p-3">
            <div>
              <p className="font-medium">{t('necessaryTitle')}</p>
              <p className="mt-0.5 text-[0.8125rem] text-fg-soft">{t('necessaryText')}</p>
            </div>
            <span className="shrink-0 pt-0.5 text-[0.8125rem] text-fg-soft">{t('always')}</span>
          </div>
          <div className="flex items-start justify-between gap-4 rounded-xl border border-line p-3">
            <div>
              <label htmlFor="consent-preferences" className="font-medium">
                {t('preferencesTitle')}
              </label>
              <p className="mt-0.5 text-[0.8125rem] text-fg-soft">{t('preferencesText')}</p>
            </div>
            <input
              id="consent-preferences"
              type="checkbox"
              role="switch"
              checked={preferences}
              onChange={(e) => setPreferences(e.target.checked)}
              className="mk-switch mt-0.5 shrink-0"
            />
          </div>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {detail ? (
          <button type="button" onClick={() => decide(preferences)} className={cn(button, 'mk-btn-primary')}>
            {t('save')}
          </button>
        ) : (
          <button type="button" onClick={() => setDetail(true)} className={cn(button, 'mk-btn-ghost')}>
            {t('customize')}
          </button>
        )}
        <button type="button" onClick={() => decide(false)} className={cn(button, 'mk-btn-primary')}>
          {t('rejectAll')}
        </button>
        <button type="button" onClick={() => decide(true)} className={cn(button, 'mk-btn-primary')}>
          {t('acceptAll')}
        </button>
      </div>
    </div>
  )
}
