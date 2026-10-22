'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { MARKETING_PLANS, formatMoney, type Currency, type PaidPlanId } from '@/lib/marketing/plans'
import { cn } from '@/lib/utils'
import { CurrencyToggle, useCurrency } from './currency'
import { SectionHeading } from './section-heading'

// Rozsahy a výchozí útrata zákazníka podle měny (stejné jako v předchozí kalkulačce).
const VALUE_RANGE: Record<Currency, { initial: number; min: number; max: number; step: number }> = {
  CZK: { initial: 800, min: 100, max: 10000, step: 50 },
  EUR: { initial: 40, min: 5, max: 500, step: 5 },
}

function Slider({
  id,
  label,
  value,
  display,
  min,
  max,
  step,
  onChange,
}: {
  id: string
  label: string
  value: number
  display: string
  min: number
  max: number
  step: number
  onChange: (v: number) => void
}) {
  const pct = ((value - min) / (max - min)) * 100
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-end justify-between gap-6">
        <label htmlFor={id} className="max-w-[24ch] text-[0.9375rem] font-medium leading-snug md:text-base">
          {label}
        </label>
        <output htmlFor={id} className="mk-display mk-tnum shrink-0 text-[clamp(1.75rem,3vw,2.5rem)]">
          {display}
        </output>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-valuetext={display}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ '--pct': `${pct}%` } as React.CSSProperties}
        className="mk-range"
      />
    </div>
  )
}

/** Kalkulačka zmeškaných hovorů: zmeškané týdně × 4 × útrata × konverze, porovnaná s cenou plánu z ceníku. */
export function Calculator() {
  const t = useTranslations('marketing.calculator')
  const locale = useLocale()
  const [currency] = useCurrency()
  const range = VALUE_RANGE[currency]
  const [missed, setMissed] = useState(10)
  const [values, setValues] = useState<Record<Currency, number>>({ CZK: VALUE_RANGE.CZK.initial, EUR: VALUE_RANGE.EUR.initial })
  const [conversion, setConversion] = useState(30)
  const [planId, setPlanId] = useState<PaidPlanId>('starter')

  const value = values[currency]
  const plan = MARKETING_PLANS.find((p) => p.id === planId) ?? MARKETING_PLANS[0]
  const price = plan.price[currency]
  const monthly = (missed * 4 * value * conversion) / 100
  const yearly = monthly * 12
  const paybackDays = monthly > 0 ? Math.ceil(price / (monthly / 30)) : Infinity
  const money = (n: number) => formatMoney(Math.round(n), currency, locale)

  return (
    <section id="kalkulacka" data-tone="light" aria-labelledby="calc-title" className="phase-dusk mk-section scroll-mt-16">
      <div className="mk-container">
        <div className="flex flex-wrap items-end justify-between gap-8">
          <SectionHeading eyebrow={t('eyebrow')} title={t('title')} titleId="calc-title" />
          <CurrencyToggle />
        </div>

        <div className="mt-14 grid gap-6 lg:grid-cols-[1.1fr_1fr] md:mt-20">
          <div className="flex flex-col gap-10 rounded-[1.75rem] bg-surface-2 p-6 md:p-10">
            <Slider id="calc-missed" label={t('missed')} value={missed} display={`${missed}`} min={1} max={100} step={1} onChange={setMissed} />
            <Slider
              id="calc-value"
              label={t('value')}
              value={value}
              display={money(value)}
              min={range.min}
              max={range.max}
              step={range.step}
              onChange={(v) => setValues((s) => ({ ...s, [currency]: v }))}
            />
            <Slider id="calc-conversion" label={t('conversion')} value={conversion} display={`${conversion} %`} min={5} max={80} step={1} onChange={setConversion} />
          </div>

          <div className="flex flex-col gap-6 rounded-[1.75rem] bg-night p-6 text-moon md:p-10">
            <div aria-live="polite" aria-atomic="true">
              <p className="text-moon/75">{t('monthlyLoss')}</p>
              <p className="mk-display mk-tnum mt-2 text-[clamp(3rem,7vw,5.5rem)] text-aida">{money(monthly)}</p>
              <p className="mt-3 text-moon/75">
                {t('yearlyLoss')}: <span className="mk-tnum font-semibold text-moon">{money(yearly)}</span>
              </p>
            </div>

            <fieldset className="border-t border-moon/12 pt-6">
              <legend className="mk-mono mb-3 text-xs uppercase tracking-[0.08em] text-moon/75">{t('plan')}</legend>
              <div className="flex flex-wrap gap-2">
                {MARKETING_PLANS.map((p) => (
                  <label
                    key={p.id}
                    className={cn(
                      'inline-flex min-h-11 cursor-pointer items-center rounded-full px-4 text-[0.9375rem] font-medium transition-colors has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-aida',
                      planId === p.id ? 'bg-moon text-ink' : 'bg-moon/8 text-moon hover:bg-moon/14'
                    )}
                  >
                    <input type="radio" name="mk-calc-plan" value={p.id} checked={planId === p.id} onChange={() => setPlanId(p.id)} className="sr-only" />
                    {p.name}
                  </label>
                ))}
              </div>
              <p className="mt-4 text-moon/75">{t('planCost', { plan: plan.name, price: money(price) })}</p>
              <p className="mt-1 text-lg font-semibold">{Number.isFinite(paybackDays) && paybackDays <= 30 ? t('payback', { count: paybackDays }) : t('noPayback')}</p>
            </fieldset>

            <Link href="/sign-up" className="mk-btn mt-auto bg-aida text-ink hover:bg-[#ff9d66]">
              {t('cta')}
            </Link>
          </div>
        </div>
        <p className="mt-6 max-w-[70ch] text-sm text-fg-soft">{t('note')}</p>
      </div>
    </section>
  )
}
