'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'

const DISMISS_KEY = 'receptio_trial_banner_dismissed'

/**
 * Banner zkušební verze: žlutý a zavíratelný; při ≤ 3 dnech (nebo po skončení) červený a nezavíratelný.
 * Zavření se pamatuje jen v prohlížeči (localStorage může být nedostupné).
 */
export function TrialBanner({ daysLeft, expired, canManage }: { daysLeft: number; expired: boolean; canManage: boolean }) {
  const t = useTranslations('billing.trial')
  const urgent = expired || daysLeft <= 3
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    try {
      setDismissed(window.localStorage.getItem(DISMISS_KEY) === '1')
    } catch {
      /* bez uložení se banner prostě ukáže */
    }
  }, [])

  if (!urgent && dismissed) return null

  function dismiss() {
    setDismissed(true)
    try {
      window.localStorage.setItem(DISMISS_KEY, '1')
    } catch {
      /* zavření platí jen do obnovení stránky */
    }
  }

  return (
    <div
      role={urgent ? 'alert' : 'status'}
      className={cn(
        'mb-6 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border px-4 py-3 text-sm',
        urgent ? 'border-red-500/40 bg-red-500/10 text-red-900 dark:text-red-200' : 'border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-200'
      )}
    >
      <span className="flex-1 font-medium">{expired ? t('expired') : t('banner', { days: daysLeft })}</span>
      {canManage && (
        <Link href="/dashboard/billing" className="font-semibold underline underline-offset-2">
          {expired ? t('upgrade') : t('addCard')} →
        </Link>
      )}
      {!urgent && (
        <button type="button" onClick={dismiss} aria-label={t('dismiss')} className="rounded p-1 hover:bg-black/10">
          <X className="size-4" />
        </button>
      )}
    </div>
  )
}
