import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { Overview } from '@/components/dashboard/overview'
import { OverviewSkeleton } from '@/components/dashboard/overview-skeleton'
import { getWorkspaceContext } from '@/lib/auth'

export async function generateMetadata() {
  return { title: (await getTranslations('nav'))('overview') }
}

export default async function DashboardPage() {
  const ctx = await getWorkspaceContext()
  if (!ctx) redirect('/onboarding')
  const { workspace } = ctx

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <h1 className="text-2xl font-semibold">{workspace.name}</h1>
      {/* Statistiky se streamují; do načtení je vidět skeleton. */}
      <Suspense fallback={<OverviewSkeleton />}>
        <Overview workspace={workspace} role={ctx.role} />
      </Suspense>
    </div>
  )
}
