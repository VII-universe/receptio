'use client'

import { useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { DEMO_INDUSTRIES, type DemoIndustry, type DemoSource, type Speaker } from '@/lib/marketing/demo'
import { cn } from '@/lib/utils'
import { IconPlay } from './icons'
import { INDUSTRY_META } from './industry'
import { OrbStatic } from './orb-static'

/** Přehrávač ukázkového hovoru v hero: orb, výběr odvětví, titulky a celý přepis jako text. */
export function HeroDemo({ sources }: { sources: DemoSource[] }) {
  const t = useTranslations('marketing.demo')
  const tc = useTranslations('marketing.common')
  const locale = useLocale()
  const [industry, setIndustry] = useState<DemoIndustry>('restaurant')
  const source = sources.find((s) => s.industry === industry)
  const script = t.raw(`scripts.${industry}`) as { s: Speaker; t: string }[]
  const { tint } = INDUSTRY_META[industry]

  return (
    <div id="aida-demo" className="flex scroll-mt-28 flex-col items-center gap-6">
      <div className="relative w-full max-w-[30rem]">
        <OrbStatic tint={tint} />
        <button
          type="button"
          disabled={!source}
          aria-label={`${tc('listen')}: ${t(`industries.${industry}`)}`}
          className="absolute left-1/2 top-1/2 flex size-24 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-ink text-day shadow-[0_20px_50px_-12px_rgb(20_22_31/0.6)] transition-transform hover:scale-105 disabled:cursor-not-allowed disabled:opacity-90"
        >
          <IconPlay size={30} className="translate-x-0.5" />
        </button>
      </div>

      <div
        role="group"
        aria-label={t('industryLabel')}
        className="grid w-full max-w-[30rem] grid-cols-2 gap-1.5 rounded-[1.75rem] border border-line bg-surface-2 p-1.5 sm:flex sm:w-auto sm:justify-center sm:rounded-full"
      >
        {DEMO_INDUSTRIES.map((id) => (
          <button
            key={id}
            type="button"
            aria-pressed={industry === id}
            onClick={() => setIndustry(id)}
            className={cn(
              'min-h-11 rounded-full px-4 text-[0.9375rem] font-medium transition-colors',
              industry === id ? 'bg-ink text-day' : 'text-fg-soft hover:text-fg'
            )}
          >
            {t(`industries.${id}`)}
          </button>
        ))}
      </div>

      <div className="w-full max-w-[30rem] text-center" aria-live="polite">
        <p className="mk-mono text-xs uppercase tracking-[0.08em] text-accent-text">{t('aida')}</p>
        <p className="mt-2 text-balance text-lg leading-snug">{script[0]?.t}</p>
        {!source && <p className="mt-3 text-sm text-fg-soft">{t('unavailable')}</p>}
      </div>

      <details className="mk-faq w-full max-w-[30rem] rounded-2xl border border-line bg-surface-2 px-5 py-4 text-left">
        <summary className="flex items-center justify-between text-[0.9375rem] font-medium">{t('transcript')}</summary>
        <ol className="mt-4 flex flex-col gap-3 text-[0.9375rem] leading-relaxed">
          {script.map((line, i) => (
            <li key={i}>
              <span className={cn('font-semibold', line.s === 'aida' ? 'text-accent-text' : 'text-fg')}>
                {line.s === 'aida' ? t('aida') : t('caller')}:
              </span>{' '}
              <span className="text-fg-soft">{line.t}</span>
            </li>
          ))}
        </ol>
        <p className="mt-4 text-xs text-fg-soft">
          {t('note')}
          {source && source.lang !== locale && <> {t('otherLanguage')}</>}
        </p>
      </details>
    </div>
  )
}
