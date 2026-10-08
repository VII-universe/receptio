'use client'

import { useEffect, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { formatOverageRate } from '@/lib/billing/format-overage'
import { cn } from '@/lib/utils'

interface Usage {
  plan: string
  callsPaused: boolean
  currency: 'CZK' | 'EUR'
  overageMinutes: number
  minutes: { used: number; max: number }
  agents: { current: number; max: number }
  phoneNumbers: { current: number; max: number }
}

function Row({ label, value, max }: { label: string; value: number; max: number }) {
  const percent = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : value > 0 ? 100 : 0
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between text-sm">
        <span>{label}</span>
        <span className="tabular-nums text-muted-foreground">
          {value} / {max}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
        <div className={cn('h-full', percent >= 100 ? 'bg-red-500' : percent > 80 ? 'bg-orange-500' : 'bg-blue-500')} style={{ width: `${percent}%` }} />
      </div>
    </div>
  )
}

/** Využití limitů plánu (minuty tento měsíc, agenti, telefonní čísla) z GET /api/usage. */
export function UsageBar() {
  const t = useTranslations('usage')
  const locale = useLocale()
  const [usage, setUsage] = useState<Usage | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch('/api/usage')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error())))
      .then((d: Usage) => !cancelled && setUsage(d))
      .catch(() => !cancelled && setFailed(true))
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('title')}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {failed ? (
          <p className="text-sm text-muted-foreground">{t('failed')}</p>
        ) : !usage ? (
          <Skeleton className="h-24 rounded-xl" />
        ) : (
          <>
            {usage.callsPaused && <p className="text-sm font-medium text-red-600">{t('paused')}</p>}
            <Row label={t('minutes')} value={usage.minutes.used} max={usage.minutes.max} />
            {usage.overageMinutes > 0 && (
              <p className="text-sm text-muted-foreground">
                {t('overage', { count: usage.overageMinutes, price: formatOverageRate(locale, usage.currency) })}
              </p>
            )}
            <Row label={t('agents')} value={usage.agents.current} max={usage.agents.max} />
            <Row label={t('phoneNumbers')} value={usage.phoneNumbers.current} max={usage.phoneNumbers.max} />
          </>
        )}
      </CardContent>
    </Card>
  )
}
