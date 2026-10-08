'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { Check } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { formatOverageRate } from '@/lib/billing/format-overage'
import { PLAN_LIMITS } from '@/lib/billing/plans'
import { formatPrice, PLAN_PRICES, type Currency, type PlanId } from '@/lib/stripe/plans'
import { Reveal } from '@/components/landing/reveal'
import { cn } from '@/lib/utils'

const PLAN_ORDER: PlanId[] = ['free', 'starter', 'business', 'pro']
const OPTIONS: { value: Currency; label: string }[] = [
  { value: 'CZK', label: 'CZK' },
  { value: 'EUR', label: 'EUR' },
]

/** Ceník s přepínačem CZK / EUR (stav jen v prohlížeči, výchozí CZK). */
export function Pricing() {
  const t = useTranslations('landing.pricing')
  const locale = useLocale()
  const [currency, setCurrency] = useState<Currency>(locale === 'cs' ? 'CZK' : 'EUR')

  return (
    <div className="mx-auto max-w-6xl px-4">
      <div className="mb-4 text-center text-sm font-semibold uppercase tracking-widest text-indigo-400">
        {t('eyebrow')}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="rc-heading text-4xl font-semibold tracking-[-0.035em] sm:text-5xl">{t('title')}</h2>
        <div role="group" aria-label={t('currency')} className="glass flex rounded-lg p-0.5">
          {OPTIONS.map((o) => (
            <button
              key={o.value}
              type="button"
              aria-pressed={currency === o.value}
              onClick={() => setCurrency(o.value)}
              className={cn(
                'rounded-md px-3 py-1 text-sm font-medium transition-colors',
                currency === o.value ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:text-white'
              )}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {PLAN_ORDER.map((id, i) => {
          const amount = PLAN_PRICES[id][currency]
          const isHighlighted = id === 'business'
          return (
            <Reveal key={id} delay={i * 90} className="h-full">
            <div
              className={cn(
                'glass flex h-full flex-col gap-5 rounded-2xl p-6 transition-transform duration-500 hover:-translate-y-1',
                isHighlighted && 'glass-strong border-indigo-400/40 ring-1 ring-indigo-400/30 lg:-translate-y-2 lg:hover:-translate-y-3',
                id === 'free' && 'border-dashed'
              )}
            >
              {isHighlighted && (
                <span className="-mt-1 self-start rounded-full bg-indigo-600 px-2.5 py-0.5 text-xs font-semibold text-white">
                  {t('popular')}
                </span>
              )}
              <div>
                <h3 className="text-lg font-semibold text-white">{t(`${id}.name`)}</h3>
                <p className="mt-2">
                  <span className="bg-gradient-to-r from-white to-zinc-200 bg-clip-text text-4xl font-semibold tabular-nums tracking-[-0.04em] text-transparent">{formatPrice(amount, currency)}</span>
                  {id !== 'free' && <span className="text-sm text-zinc-400">{t('perMonth')}</span>}
                </p>
              </div>
              <ul className="flex flex-1 flex-col gap-2 text-sm text-zinc-300">
                {id !== 'free' && (
                  <li className="flex items-start gap-2">
                    <Check className="mt-0.5 size-4 shrink-0 text-emerald-400" />
                    {t('minutesLine', { count: PLAN_LIMITS[id].minutesPerMonth, price: formatOverageRate(locale, currency) })}
                  </li>
                )}
                {(t.raw(`${id}.features`) as string[]).map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check className="mt-0.5 size-4 shrink-0 text-emerald-400" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/sign-up"
                className={cn(
                  buttonVariants({ variant: isHighlighted ? 'default' : 'outline' }),
                  'h-12 px-6',
                  isHighlighted
                    ? 'bg-indigo-600 shadow-lg shadow-indigo-600/30 hover:bg-indigo-500'
                    : 'border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white'
                )}
              >
                {id === 'free' ? t('startFree') : t('choose', { plan: t(`${id}.name`) })}
              </Link>
            </div>
            </Reveal>
          )
        })}
      </div>
    </div>
  )
}
