import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { WorkspaceAvatar } from '@/components/workspace-avatar'
import { Overview } from '@/components/dashboard/overview'
import { OverviewSkeleton } from '@/components/dashboard/overview-skeleton'
import { getWorkspaceContext } from '@/lib/auth'
import { isRange } from '@/lib/dashboard-overview'
import { isUuid } from '@/lib/supabase/queries'

export async function generateMetadata() {
  return { title: (await getTranslations('nav'))('overview') }
}

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ range?: string; agent?: string }> }) {
  const to = await getTranslations('dashboard.ov')
  const ctx = await getWorkspaceContext()
  if (!ctx) redirect('/onboarding')
  const { workspace } = ctx
  const sp = await searchParams
  const range = isRange(sp.range) ? (Number(sp.range) as 7 | 30 | 90) : 30
  const agentId = sp.agent && isUuid(sp.agent) ? sp.agent : ''

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-5">
      <div className="flex items-center gap-4">
        <WorkspaceAvatar name={workspace.business_name ?? workspace.name} logoUrl={workspace.logo_url} />
        <div className="min-w-0">
          <h1 className="app-title truncate text-2xl font-semibold tracking-tight">{workspace.business_name ?? workspace.name}</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">{to('subtitle')}</p>
        </div>
      </div>
      {/* Statistiky se streamují; do načtení je vidět skeleton (při změně filtru zůstává původní obsah, viz DashboardShell). */}
      <Suspense fallback={<OverviewSkeleton />}>
        <Overview workspace={workspace} role={ctx.role} range={range} agentId={agentId} />
      </Suspense>
    </div>
  )
}
