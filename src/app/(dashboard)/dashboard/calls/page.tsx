import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { Button, buttonVariants } from '@/components/ui/button'
import { CheckCircle2, Clock, PhoneIncoming, Timer } from 'lucide-react'
import { StatTile } from '@/components/dashboard/stat-tile'
import { formatClock } from '@/lib/calls'
import { getCurrentWorkspace } from '@/lib/auth'
import {
  getAgentsByWorkspaceId,
  getCallLogsPage,
  getMonthlyCallStats,
  isUuid,
} from '@/lib/supabase/queries'
import { AgentFilter } from './agent-filter'
import { CallsTable } from './calls-table'

export async function generateMetadata() {
  return { title: (await getTranslations('nav'))('calls') }
}

const PAGE_SIZE = 20

export default async function CallsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; agent?: string }>
}) {
  const t = await getTranslations('calls')
  const workspace = await getCurrentWorkspace()
  if (!workspace) redirect('/onboarding')

  const sp = await searchParams
  const agentId = sp.agent && isUuid(sp.agent) ? sp.agent : undefined
  const requestedPage = Math.max(1, parseInt(sp.page ?? '1', 10) || 1)

  const [agents, stats] = await Promise.all([
    getAgentsByWorkspaceId(workspace.id),
    getMonthlyCallStats(workspace.id),
  ])
  const first = await getCallLogsPage(workspace.id, { page: requestedPage, limit: PAGE_SIZE, agentId })
  const total = first.total
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const page = Math.min(requestedPage, totalPages)
  // Stránka mimo rozsah (např. po smazání hovorů) se přesune na poslední.
  const calls =
    page === requestedPage
      ? first.calls
      : (await getCallLogsPage(workspace.id, { page, limit: PAGE_SIZE, agentId })).calls

  const href = (p: number) => {
    const q = new URLSearchParams()
    if (p > 1) q.set('page', String(p))
    if (agentId) q.set('agent', agentId)
    const qs = q.toString()
    return `/dashboard/calls${qs ? `?${qs}` : ''}`
  }

  const tiles = [
    { label: t('callsThisMonth'), value: String(stats.calls), icon: PhoneIncoming },
    {
      label: t('avgDuration'),
      value: stats.finishedCalls > 0 ? formatClock(stats.seconds / stats.finishedCalls) : '–',
      icon: Timer,
    },
    { label: t('totalMinutes'), value: String(Math.round(stats.seconds / 60)), icon: Clock },
    {
      label: t('completionRate'),
      value: stats.endedCalls > 0 ? `${Math.round((stats.completedCalls / stats.endedCalls) * 100)}%` : '–',
      icon: CheckCircle2,
    },
  ]

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="app-title text-2xl font-semibold tracking-tight">{t('title')}</h1>
        {agents.length > 1 && (
          <AgentFilter agents={agents.map((a) => ({ id: a.id, name: a.name }))} selected={agentId ?? null} />
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map((tile) => (
          <StatTile key={tile.label} label={tile.label} value={tile.value} icon={tile.icon} />
        ))}
      </div>

      <CallsTable calls={calls} />

      {total > 0 && (
        <div className="flex items-center justify-between gap-4">
          {page > 1 ? (
            <Link href={href(page - 1)} className={buttonVariants({ variant: 'outline' })}>
              {t('previous')}
            </Link>
          ) : (
            <Button variant="outline" disabled>
              {t('previous')}
            </Button>
          )}
          <span className="text-sm text-muted-foreground">
            {t('pageOf', { page, total: totalPages })}
          </span>
          {page < totalPages ? (
            <Link href={href(page + 1)} className={buttonVariants({ variant: 'outline' })}>
              {t('next')}
            </Link>
          ) : (
            <Button variant="outline" disabled>
              {t('next')}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
