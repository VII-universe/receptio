'use client'

import Link from 'next/link'
import { useLocale, useTranslations } from 'next-intl'
import { MARKETING_PLANS, OVERAGE, TRIAL_DAYS, formatMoney } from '@/lib/marketing/plans'
import { cn } from '@/lib/utils'
import { CurrencyToggle, useCurrency } from './currency'
import { IconCheck, IconPlus } from './icons'
import { RollingText } from './rolling-text'
import { SectionHeading } from './section-heading'

const PRICE_FAQ = ['overage', 'forwarding', 'cancel'] as const

/** Cena, jejíž číslice se při změně měny protočí; symbol měny stojí podle zvyklostí jazyka. */
function Price({ amount, currency, locale }: { amount: number; currency: 'CZK' | 'EUR'; locale: string }) {
  const parts = new Intl.NumberFormat(locale, { style: 'currency', currency, maximumFractionDigits: 0 }).formatToParts(amount)
  const number = parts
    .filter((x) => x.type === 'integer' || x.type === 'group')
    .map((x) => x.value)
    .join('')
  const symbol = parts.find((x) => x.type === 'currency')?.value ?? currency
  const symbolFirst = parts.findIndex((x) => x.type === 'currency') < parts.findIndex((x) => x.type === 'integer')
  return (
    <span className="inline-flex items-baseline">
      <span className="sr-only">{formatMoney(amount, currency, locale)}</span>
      <span aria-hidden className="inline-flex items-baseline">
        {symbolFirst && <span key={symbol} className="mk-fade-in mr-[0.08em]">{symbol}</span>}
        <RollingText value={number} fromEnd stagger={35} />
        {!symbolFirst && <span key={symbol} className="mk-fade-in ml-[0.2em]">{symbol}</span>}
      </span>
    </span>
  )
}

/** Ceník z konfigurace plánů (ceny, minuty, limity), přepínač CZK / EUR a otázky k ceně. */
export function Pricing({ headingLevel = 2 }: { headingLevel?: 1 | 2 }) {
  const t = useTranslations('marketing.pricing')
  const tc = useTranslations('marketing.common')
  const locale = useLocale()
  const [currency] = useCurrency()
  const overage = formatMoney(OVERAGE[currency], currency, locale)
  // podnadpisy o úroveň níž než nadpis sekce (na samostatné stránce ceníku je nadpis h1)
  const Sub = headingLevel === 1 ? 'h2' : 'h3'

  return (
    <section id="cenik" data-tone="dark" aria-labelledby="pricing-title" className="phase-evening mk-section scroll-mt-16">
      <div className="mk-container">
        <div className="flex flex-wrap items-end justify-between gap-8">
          {headingLevel === 1 ? (
            <div className="flex flex-col gap-6">
              <p className="mk-eyebrow">{t('eyebrow')}</p>
              <h1 id="pricing-title" className="mk-display mk-h1 max-w-[14ch]">
                {t('title')}
              </h1>
            </div>
          ) : (
            <SectionHeading eyebrow={t('eyebrow')} title={t('title')} titleId="pricing-title" />
          )}
          <CurrencyToggle dark />
        </div>

        <div className="mk-card mt-14 flex flex-col gap-6 p-6 md:mt-20 md:flex-row md:items-center md:justify-between md:p-8">
          <div className="flex items-start gap-5">
            <span className="mk-display mk-tnum shrink-0 text-[3.5rem] leading-none text-aida">{TRIAL_DAYS}</span>
            <div>
              <p className="mk-display mk-h3">{t('trial.title')}</p>
              <p className="mt-2 max-w-[60ch] text-fg-soft">{t('trial.text')}</p>
            </div>
          </div>
          <Link href="/sign-up" className="mk-btn mk-btn-primary shrink-0">
            {t('trial.cta')}
          </Link>
        </div>

        <ul className="mt-6 grid gap-5 lg:grid-cols-3">
          {MARKETING_PLANS.map((p) => {
            const features = [
              t('minutes', { count: p.minutes }),
              t('overage', { price: overage }),
              t('agents', { count: p.agents }),
              t('numbers', { count: p.phoneNumbers }),
              t('team', { count: p.teamMembers }),
              t(`notifications.${p.notifications}`),
              t('transcripts'),
              ...p.extras.map((e) => t(`extras.${e}` as 'extras.prioritySupport')),
            ]
            return (
              <li
                key={p.id}
                className={cn(
                  'relative flex flex-col gap-7 rounded-[1.75rem] p-7 md:p-9',
                  p.recommended ? 'bg-moon text-ink shadow-[0_40px_80px_-40px_rgb(255_138_76/0.55)]' : 'mk-card'
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <Sub className="mk-display mk-h3">{p.name}</Sub>
                  {p.recommended && <span className="rounded-full bg-aida px-3 py-1 text-[0.8125rem] font-semibold text-ink">{t('recommended')}</span>}
                </div>
                <p className="flex items-baseline gap-1.5">
                  <span className="mk-display mk-tnum text-[clamp(2.75rem,4.5vw,3.75rem)]">
                    <Price amount={p.price[currency]} currency={currency} locale={locale} />
                  </span>
                  <span className={p.recommended ? 'text-ink-soft' : 'text-fg-soft'}>{tc('perMonth')}</span>
                </p>
                <ul className="flex flex-col gap-3 text-[0.9375rem]">
                  {features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5">
                      <IconCheck size={18} className={cn('mt-0.5 shrink-0', p.recommended ? 'text-[#b0441a]' : 'text-aida')} />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/sign-up"
                  className={cn('mk-btn mt-auto', p.recommended ? 'bg-ink text-day hover:bg-[#2a2d3b]' : 'mk-btn-ghost')}
                >
                  {t('choose', { plan: p.name })}
                </Link>
              </li>
            )
          })}
        </ul>

        <div className="mt-20 grid gap-8 md:grid-cols-[1fr_2fr]">
          <Sub className="mk-display mk-h3">{t('faqTitle')}</Sub>
          <div className="border-t border-line">
            {PRICE_FAQ.map((k) => (
              <details key={k} className="mk-faq border-b border-line">
                <summary className="flex min-h-16 items-center justify-between gap-6 py-4 text-lg font-medium">
                  {t(`faq.${k}.q`)}
                  <IconPlus className="mk-faq-icon shrink-0 text-accent-text" />
                </summary>
                <p className="max-w-[62ch] pb-6 text-fg-soft">{t(`faq.${k}.a`, { price: overage })}</p>
              </details>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
