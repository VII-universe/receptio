'use client'

import { useEffect, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { OPEN_SETTINGS_EVENT, readConsent, writeConsent } from '@/lib/consent'
import { cn } from '@/lib/utils'
import { IconCookie } from './icons'

/**
 * Lišta se souhlasem s cookies ve stylu veřejného webu. Logika, cookie i texty jsou stejné jako
 * u lišty aplikace (components/consent): „Odmítnout vše“ a „Přijmout vše“ mají stejnou váhu,
 * podrobnosti jsou v „Nastavit“, z patičky se otevře událostí OPEN_SETTINGS_EVENT.
 *
 * Nesmí stát přes scénu v hero: na začátku je to tenký proužek dole, po prvním scrollu se stáhne
 * do malého pruhu v rohu (stále s volbou Odmítnout / Přijmout); podrobnosti se otevřou na kliknutí.
 *
 * Vykreslí se už na serveru, aby nepřibyla až po hydrataci (pozdní LCP). Když je souhlas uložený,
 * schová ji před prvním vykreslením skript v layoutu (html[data-consent]) a po hydrataci zmizí úplně.
 */
export function ConsentBanner() {
  const t = useTranslations('consent')
  const locale = useLocale()
  const [hydrated, setHydrated] = useState(false)
  const [open, setOpen] = useState(true)
  const [mode, setMode] = useState<'bar' | 'mini' | 'detail'>('bar')
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
      setMode('detail')
      setOpen(true)
    }
    window.addEventListener(OPEN_SETTINGS_EVENT, reopen)
    return () => window.removeEventListener(OPEN_SETTINGS_EVENT, reopen)
  }, [])

  // po prvním scrollu se proužek stáhne do rohu
  useEffect(() => {
    if (!open || mode !== 'bar') return
    const onScroll = () => window.scrollY > 80 && setMode('mini')
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [open, mode])

  if (!open) return null

  function decide(prefs: boolean) {
    writeConsent(prefs)
    setOpen(false)
    setMode('bar')
  }

  const policy = (
    <a href={`/${locale}/cookies`} className="underline underline-offset-4 hover:text-fg">
      {t('policy')}
    </a>
  )
  const reject = (cls: string) => (
    <button type="button" onClick={() => decide(false)} className={cls}>
      {t('rejectAll')}
    </button>
  )
  const accept = (cls: string) => (
    <button type="button" onClick={() => decide(true)} className={cls}>
      {t('acceptAll')}
    </button>
  )
  const base = 'mk-consent tone-light fixed z-[100] bg-white text-[0.9375rem] ring-1 ring-ink/10'
  const ssr = hydrated ? undefined : ''

  if (mode === 'mini') {
    const small = 'min-h-11 whitespace-nowrap rounded-full px-3 text-sm font-semibold hover:bg-ink/6'
    return (
      <div role="region" aria-labelledby="cookie-title" data-ssr={ssr} className={cn(base, 'bottom-3 left-3 flex items-center gap-0.5 rounded-full p-1 shadow-[0_12px_30px_-14px_rgb(20_22_31/0.5)]')}>
        <button type="button" onClick={() => setMode('detail')} className="flex size-11 items-center justify-center rounded-full text-fg-soft hover:bg-ink/6">
          <IconCookie size={20} />
          <span id="cookie-title" className="sr-only">
            {t('title')}
          </span>
        </button>
        {reject(small)}
        {accept(small)}
      </div>
    )
  }

  const button = 'mk-btn mk-btn-sm min-h-11 px-4'
  // na mobilu ve dvou řádcích: titulek s odkazem, pod ním tři menší tlačítka vedle sebe
  const barButton = 'mk-btn mk-btn-sm min-h-10 whitespace-nowrap px-4 max-sm:px-3 max-sm:text-[0.8125rem]'
  if (mode === 'bar') {
    return (
      <div role="dialog" aria-modal="false" aria-labelledby="cookie-title" data-ssr={ssr} className={cn(base, 'inset-x-0 bottom-0 border-t border-line px-[max(1rem,env(safe-area-inset-left))] py-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] ring-0')}>
        <div className="mx-auto flex max-w-[82rem] flex-wrap items-center justify-between gap-x-6 gap-y-2">
          <p className="text-sm">
            <span id="cookie-title" className="font-semibold">
              {t('title')}
            </span>{' '}
            <span className="text-fg-soft">· {policy}</span>
          </p>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button type="button" onClick={() => setMode('detail')} className={cn(barButton, 'mk-btn-ghost')}>
              {t('customize')}
            </button>
            {reject(cn(barButton, 'mk-btn-primary'))}
            {accept(cn(barButton, 'mk-btn-primary'))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby="cookie-title"
      data-ssr={ssr}
      className={cn(base, 'inset-x-3 bottom-3 max-w-[30rem] rounded-[1.25rem] p-5 shadow-[0_24px_60px_-20px_rgb(20_22_31/0.45)] sm:inset-x-auto sm:bottom-5 sm:left-5')}
    >
      <h2 id="cookie-title" className="font-semibold">
        {t('title')}
      </h2>
      <p className="mt-1.5 text-sm leading-relaxed text-fg-soft">
        {t('description')} {policy}
      </p>

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

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => decide(preferences)} className={cn(button, 'mk-btn-primary')}>
          {t('save')}
        </button>
        {reject(cn(button, 'mk-btn-primary'))}
        {accept(cn(button, 'mk-btn-primary'))}
      </div>
    </div>
  )
}
