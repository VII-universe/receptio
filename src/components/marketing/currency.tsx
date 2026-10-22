'use client'

import { useSyncExternalStore } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { CURRENCIES, defaultCurrency, type Currency } from '@/lib/marketing/plans'
import { cn } from '@/lib/utils'

// Měna sdílená ceníkem a kalkulačkou (přepnutí v jednom se projeví i ve druhém). Jen v paměti stránky.
let current: Currency | null = null
const listeners = new Set<() => void>()

function setCurrency(c: Currency) {
  current = c
  listeners.forEach((l) => l())
}

export function useCurrency(): [Currency, (c: Currency) => void] {
  const locale = useLocale()
  const fallback = defaultCurrency(locale)
  const value = useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => current ?? fallback,
    () => fallback
  )
  return [value, setCurrency]
}

/** Přepínač CZK / EUR jako skupina přepínacích tlačítek. */
export function CurrencyToggle({ className, dark = false }: { className?: string; dark?: boolean }) {
  const t = useTranslations('marketing.pricing')
  const [currency, set] = useCurrency()
  return (
    <div role="group" aria-label={t('currency')} className={cn('inline-flex rounded-full border border-line p-1', className)}>
      {CURRENCIES.map((c) => (
        <button
          key={c}
          type="button"
          aria-pressed={currency === c}
          onClick={() => set(c)}
          className={cn(
            'mk-mono min-h-10 min-w-16 rounded-full px-4 text-sm font-medium transition-colors',
            currency === c ? (dark ? 'bg-moon text-ink' : 'bg-ink text-day') : 'text-fg-soft hover:text-fg'
          )}
        >
          {c}
        </button>
      ))}
    </div>
  )
}
