'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { buttonVariants } from '@/components/ui/button'
import type { LimitType } from '@/lib/billing/limit-error'

/** Upozornění na vyčerpaný limit plánu s odkazem na upgrade (zobrazí se místo obecné chybové hlášky). */
export function UpgradePrompt({
  limitType,
  max,
  plan,
}: {
  limitType: LimitType
  current?: number
  max: number
  plan: string
}) {
  const t = useTranslations('errors.limitReached')
  const tp = useTranslations('landing.pricing')
  const planName = ['free', 'starter', 'business', 'pro'].includes(plan) ? tp(`${plan}.name`) : plan

  return (
    <div role="alert" className="flex flex-col items-start gap-3 rounded-lg border border-yellow-500/40 bg-yellow-500/10 p-4 text-sm">
      <p>{t(limitType, { max, plan: planName })}</p>
      <Link href="/dashboard/billing" className={buttonVariants({ size: 'sm' })}>
        {t('upgrade')} →
      </Link>
    </div>
  )
}
