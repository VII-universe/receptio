import { Suspense } from 'react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { AnalyticsSkeleton } from '@/components/analytics/analytics-skeleton'
import { buttonVariants } from '@/components/ui/button'
import { getWorkspaceContext } from '@/lib/auth'
import { parseRange, RANGES } from '@/lib/analytics'
import { cn } from '@/lib/utils'
import { AnalyticsContent } from './analytics-content'

export async function generateMetadata() {
  return { title: (await getTranslations('nav'))('analytics') }
}

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const t = await getTranslations('analytics')
  const ctx = await getWorkspaceContext()
  if (!ctx) redirect('/onboarding')
  const range = parseRange((await searchParams).range)

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">{t('title')}</h1>
        <nav className="flex gap-1" aria-label={t('period')}>
          {RANGES.map((r) => (
            <Link
              key={r}
              href={`/dashboard/analytics?range=${r}`}
              aria-current={r === range ? 'page' : undefined}
              className={cn(buttonVariants({ variant: r === range ? 'default' : 'outline', size: 'sm' }))}
            >
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
