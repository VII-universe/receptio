import { Suspense } from 'react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { AnalyticsSkeleton } from '@/components/analytics/analytics-skeleton'
import { buttonVariants } from '@/components/ui/button'
import { getWorkspaceContext } from '@/lib/auth'
import { parseRange, RANGES } from '@/lib/analytics'
import { effectivePlan } from '@/lib/billing/get-workspace-plan'
import { PLAN_LIMITS } from '@/lib/billing/plans'
import { cn } from '@/lib/utils'
import { AnalyticsContent } from './analytics-content'

export async function generateMetadata() {
  return { title: (await getTranslations('nav'))('analytics') }
}

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const t = await getTranslations('analytics')
  const ctx = await getWorkspaceContext()
  if (!ctx) redirect('/onboarding')
  // Historie analytiky podle plánu: delší období jsou zamčená (odkaz na upgrade) a požadované se zkrátí.
  const retention = PLAN_LIMITS[effectivePlan(ctx.workspace.plan, ctx.workspace.plan_status)].analyticsRetentionDays
  const allowed = RANGES.filter((r) => r <= retention)
  const requested = parseRange((await searchParams).range)
  const range = requested <= retention ? requested : allowed[allowed.length - 1]

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">{t('title')}</h1>
        <nav className="flex gap-1" aria-label={t('period')}>
          {RANGES.map((r) => (
            <Link
              key={r}
              href={r <= retention ? `/dashboard/analytics?range=${r}` : '/dashboard/billing'}
              title={r <= retention ? undefined : t('locked')}
              aria-current={r === range ? 'page' : undefined}
              className={cn(buttonVariants({ variant: r === range ? 'default' : 'outline', size: 'sm' }), r > retention && 'opacity-60')}
            >
              {r > retention && '🔒 '}
              {t('days', { count: r })}
            </Link>
          ))}
        </nav>
      </div>
      <Suspense key={range} fallback={<AnalyticsSkeleton />}>
        <AnalyticsContent workspace={ctx.workspace} range={range} canOpenAgents={ctx.role === 'admin'} />
      </Suspense>
    </div>
  )
}
