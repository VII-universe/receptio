import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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

export const metadata = { title: 'Hovory' }

const PAGE_SIZE = 20

export default async function HovoryPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; agent?: string }>
}) {
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
    return `/dashboard/hovory${qs ? `?${qs}` : ''}`
  }

  const tiles = [
    { label: 'Hovorů tento měsíc', value: String(stats.calls) },
    {
      label: 'Průměrná délka',
      value: stats.finishedCalls > 0 ? formatClock(stats.seconds / stats.finishedCalls) : '–',
    },
    { label: 'Celkem minut', value: String(Math.round(stats.seconds / 60)) },
    {
      label: 'Míra dokončení',
      value: stats.endedCalls > 0 ? `${Math.round((stats.completedCalls / stats.endedCalls) * 100)} %` : '–',
    },
  ]

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Hovory</h1>
        {agents.length > 1 && (
          <AgentFilter agents={agents.map((a) => ({ id: a.id, name: a.name }))} selected={agentId ?? null} />
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map((t) => (
          <Card key={t.label}>
            <CardHeader>
              <CardDescription>{t.label}</CardDescription>
              <CardTitle className="text-2xl">{t.value}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      <CallsTable calls={calls} />

      {total > 0 && (
        <div className="flex items-center justify-between gap-4">
          {page > 1 ? (
            <Link href={href(page - 1)} className={buttonVariants({ variant: 'outline' })}>
              Předchozí
            </Link>
          ) : (
            <Button variant="outline" disabled>
              Předchozí
            </Button>
          )}
          <span className="text-sm text-muted-foreground">
            Strana {page} z {totalPages}
          </span>
          {page < totalPages ? (
            <Link href={href(page + 1)} className={buttonVariants({ variant: 'outline' })}>
              Další
            </Link>
          ) : (
            <Button variant="outline" disabled>
              Další
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
