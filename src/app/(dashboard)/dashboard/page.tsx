import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { getCurrentWorkspace } from '@/lib/auth'
import {
  getAgentByWorkspaceId,
  getCallLogs,
  getMonthlyCallStats,
} from '@/lib/supabase/queries'
import { callOutcome, formatDateTime, formatDuration } from '@/lib/calls'

export default async function DashboardPage() {
  const workspace = await getCurrentWorkspace()
  if (!workspace) redirect('/dashboard/setup')

  const [agent, stats, calls] = await Promise.all([
    getAgentByWorkspaceId(workspace.id),
    getMonthlyCallStats(workspace.id),
    getCallLogs(workspace.id, 5),
  ])

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <h1 className="text-2xl font-semibold">{workspace.name}</h1>

      {!agent ? (
        <Card>
          <CardHeader>
            <CardTitle>Vytvořte svého prvního AI asistenta</CardTitle>
            <CardDescription>
              Asistent zvedne telefon, odpoví na časté dotazy a předá vám shrnutí hovoru.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard/agent" className={buttonVariants()}>
              Vytvořit asistenta
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader>
              <CardDescription>Stav</CardDescription>
              <CardTitle>
                <Badge variant={agent.is_active ? 'default' : 'secondary'}>
                  {agent.is_active ? 'Aktivní' : 'Neaktivní'}
                </Badge>
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Telefonní číslo</CardDescription>
              <CardTitle>{agent.phone_number ?? 'Nepřiřazeno'}</CardTitle>
            </CardHeader>
          </Card>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription>Hovory tento měsíc</CardDescription>
            <CardTitle>{stats.calls}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Minuty tento měsíc</CardDescription>
            <CardTitle>{Math.round(stats.seconds / 60)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Průměrná délka hovoru</CardDescription>
            <CardTitle>
              {stats.finishedCalls > 0 ? formatDuration(stats.seconds / stats.finishedCalls) : '–'}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Posledních 5 hovorů</CardTitle>
        </CardHeader>
        <CardContent>
          {!calls || calls.length === 0 ? (
            <p className="text-sm text-muted-foreground">Zatím žádné hovory.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Čas</TableHead>
                  <TableHead>Délka</TableHead>
                  <TableHead>Stav</TableHead>
                  <TableHead>Shrnutí</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {calls.map((c) => {
                  const status = callOutcome(c)
                  return (
                    <TableRow key={c.id}>
                      <TableCell className="whitespace-nowrap">
                        <Link href={`/dashboard/calls/${c.id}`} className="hover:underline">{formatDateTime(c.created_at)}</Link>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{formatDuration(c.duration_seconds)}</TableCell>
                      <TableCell>
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </TableCell>
                      <TableCell className="max-w-md truncate">{c.summary ?? '–'}</TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
