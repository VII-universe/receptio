'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Label } from '@/components/ui/label'

// Čeština počítá v Kč, ostatní jazyky v eurech (cena plánu Starter a rozumná výchozí hodnota zákazníka).
const CURRENCY_CONFIG = {
  CZK: { price: 990, value: 800, min: 100, max: 10000, step: 50 },
  EUR: { price: 39, value: 40, min: 5, max: 500, step: 5 },
} as const

function Field({
  id,
  label,
  value,
  onChange,
  min,
  max,
  step,
  suffix,
}: {
  id: string
  label: string
  value: number
  onChange: (v: number) => void
  min: number
  max: number
  step: number
  suffix: string
}) {
  // Při psaní povolíme prázdné/rozepsané pole, hodnotu omezíme na rozsah až při opuštění pole.
  const [draft, setDraft] = useState<string | null>(null)
  const clamp = (v: number) => Math.min(max, Math.max(min, v))

  const pct = ((value - min) / (max - min)) * 100

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-end justify-between gap-4">
        <Label htmlFor={`${id}-number`} className="max-w-[55%] text-sm font-medium leading-snug text-zinc-300">
          {label}
        </Label>
        <div className="flex items-baseline gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 transition-colors focus-within:border-indigo-400/60 focus-within:bg-white/10">
          <input
            id={`${id}-number`}
            type="number"
            inputMode="numeric"
            className="rc-num w-20 bg-transparent text-right text-2xl font-semibold tabular-nums tracking-tight text-white outline-none"
            min={min}
            max={max}
            step={step}
            value={draft ?? value}
            onChange={(e) => {
              setDraft(e.target.value)
              const n = parseFloat(e.target.value)
              if (!Number.isNaN(n)) onChange(clamp(n))
            }}
            onBlur={() => setDraft(null)}
          />
          <span className="text-sm font-medium text-zinc-500">{suffix}</span>
        </div>
      </div>
      <input
        id={id}
        type="range"
        aria-label={label}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => {
          setDraft(null)
          onChange(Number(e.target.value))
        }}
        style={{ '--pct': `${pct}%` } as React.CSSProperties}
        className="rc-range mt-1"
      />
      <div className="-mt-2 flex justify-between text-xs tabular-nums text-zinc-600" aria-hidden>
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  )
}

export function RoiCalculator() {
  const t = useTranslations('landing.roi')
  const locale = useLocale()
  const currency = locale === 'cs' ? 'CZK' : 'EUR'
  const cfg = CURRENCY_CONFIG[currency]
  const money = (n: number) =>
    new Intl.NumberFormat(locale, { style: 'currency', currency, maximumFractionDigits: 0 }).format(Math.round(n))
  const [missedPerWeek, setMissedPerWeek] = useState(10)
  const [avgValue, setAvgValue] = useState<number>(cfg.value)
  const [conversion, setConversion] = useState(30)

  const monthlyLoss = (missedPerWeek * 4 * avgValue * conversion) / 100
  const yearlyLoss = monthlyLoss * 12
  const paybackDays = Math.max(1, Math.ceil(cfg.price / (monthlyLoss / 30)))

  return (
    <div className="glass-strong grid gap-10 rounded-3xl p-6 md:p-10 lg:grid-cols-2">
      <div className="flex flex-col gap-10">
        <Field
          id="missed"
          label={t('missed')}
          value={missedPerWeek}
          onChange={setMissedPerWeek}
          min={1}
          max={100}
          step={1}
          suffix={t('missedUnit')}
        />
        <Field
          id="value"
          label={t('value')}
          value={avgValue}
          onChange={setAvgValue}
          min={cfg.min}
          max={cfg.max}
          step={cfg.step}
          suffix={currency === 'CZK' ? 'Kč' : '€'}
        />
        <Field
          id="conversion"
          label={t('conversion')}
          value={conversion}
          onChange={setConversion}
          min={5}
          max={80}
          step={1}
          suffix="%"
        />
      </div>

      <div className="flex flex-col justify-between gap-6" aria-live="polite">
        <div>
          <p className="text-sm text-zinc-400">{t('monthlyLoss')}</p>
          <p className="bg-gradient-to-b from-rose-300 to-rose-500 bg-clip-text text-5xl font-semibold tabular-nums tracking-[-0.04em] text-transparent sm:text-7xl">{money(monthlyLoss)}</p>
        </div>
        <div>
          <p className="text-sm text-zinc-400">{t('yearlyLoss')}</p>
          <p className="text-3xl font-semibold tabular-nums tracking-[-0.03em] text-white sm:text-4xl">{money(yearlyLoss)}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <p className="text-sm text-zinc-400">
            {t('costs', { price: money(cfg.price) })}
          </p>
          <p className="mt-1 text-xl font-semibold text-white">
            {t('payback', { count: paybackDays })}
          </p>
        </div>
        <Link href="/sign-up" className={cn(buttonVariants({ size: 'lg' }), 'mt-2 h-14 bg-indigo-600 px-8 text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-500')}>
          {t('cta')}
        </Link>
        <p className="text-xs text-zinc-500">
          {t('note')}
        </p>
      </div>
    </div>
  )
}
