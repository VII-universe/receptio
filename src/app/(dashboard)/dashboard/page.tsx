import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { Overview } from '@/components/dashboard/overview'
import { OverviewSkeleton } from '@/components/dashboard/overview-skeleton'
import { getCurrentWorkspace } from '@/lib/auth'

export const metadata = { title: 'Přehled' }

export default async function DashboardPage() {
  const workspace = await getCurrentWorkspace()
  if (!workspace) redirect('/onboarding')

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <h1 className="text-2xl font-semibold">{workspace.name}</h1>
      {/* Statistiky se streamují; do načtení je vidět skeleton. */}
      <Suspense fallback={<OverviewSkeleton />}>
        <Overview workspace={workspace} />
      </Suspense>
    </div>
  )
}
