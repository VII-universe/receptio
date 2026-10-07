'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Check } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { formatPrice, PLAN_PRICES, PLANS, type Currency, type PlanId } from '@/lib/stripe/plans'
import { cn } from '@/lib/utils'

const PLAN_ORDER: PlanId[] = ['free', 'starter', 'business', 'pro']
const OPTIONS: { value: Currency; label: string }[] = [
  { value: 'CZK', label: 'CZK' },
  { value: 'EUR', label: 'EUR' },
]

/** Ceník s přepínačem CZK / EUR (stav jen v prohlížeči, výchozí CZK). */
export function Pricing() {
  const [currency, setCurrency] = useState<Currency>('CZK')

  return (
    <div className="mx-auto max-w-6xl px-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-3xl font-bold tracking-tight">Ceník</h2>
        <div role="group" aria-label="Měna" className="flex rounded-lg border bg-background p-0.5">
          {OPTIONS.map((o) => (
            <button
              key={o.value}
              type="button"
              aria-pressed={currency === o.value}
              onClick={() => setCurrency(o.value)}
              className={cn(
                'rounded-md px-3 py-1 text-sm font-medium transition-colors',
                currency === o.value ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {PLAN_ORDER.map((id) => {
          const plan = PLANS[id]
          const amount = PLAN_PRICES[id][currency]
          return (
            <div key={id} className="flex flex-col gap-5 rounded-2xl border bg-card p-6">
              <div>
                <h3 className="text-lg font-semibold">{plan.nameCs}</h3>
                <p className="mt-2">
                  <span className="text-3xl font-bold">{formatPrice(amount, currency)}</span>
                  <span className="text-sm text-muted-foreground">/měsíc</span>
                </p>
              </div>
              <ul className="flex flex-1 flex-col gap-2 text-sm">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check className="mt-0.5 size-4 shrink-0 text-green-600" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link href="/sign-up" className={cn(buttonVariants({ variant: id === 'free' ? 'outline' : 'default' }))}>
                {id === 'free' ? 'Začít zdarma' : `Vybrat ${plan.nameCs}`}
              </Link>
            </div>
          )
        })}
      </div>
    </div>
  )
}
