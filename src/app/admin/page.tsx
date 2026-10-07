import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Card, CardDescription, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { getAdminOverview } from '@/lib/admin/queries'
import { PLAN_BADGE } from '@/lib/plan-badge'
import { PLANS, type PlanId } from '@/lib/stripe/plans'

export const metadata = { title: 'Admin – Overview' }

export default async function AdminOverviewPage() {
  const o = await getAdminOverview()
  const tiles = [
    { label: 'Total workspaces', value: o.totalWorkspaces },
    { label: 'Active workspaces (30 days)', value: o.activeWorkspaces },
    { label: 'Calls today', value: o.callsToday },
    { label: 'Calls this month', value: o.callsThisMonth },
  ]

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <h1 className="text-2xl font-semibold">Overview</h1>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {tiles.map((t) => (
          <Card key={t.label}>
            <CardHeader>
              <CardDescription>{t.label}</CardDescription>
              <CardTitle className="text-2xl">{t.value}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Latest 10 workspaces</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Agents</TableHead>
                <TableHead>Total calls</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {o.recent.map((w) => (
                <TableRow key={w.id}>
                  <TableCell className="font-medium">
                    <Link href={`/admin/workspaces/${w.id}`} className="hover:underline">
                      {w.name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`border-transparent ${PLAN_BADGE[w.plan] ?? PLAN_BADGE.free}`}>
                      {PLANS[w.plan as PlanId]?.name ?? w.plan}
                    </Badge>{' '}
                    <Badge variant="outline">{w.currency ?? 'CZK'}</Badge>
                  </TableCell>
                  <TableCell>{w.agents}</TableCell>
                  <TableCell>{w.calls}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    {new Date(w.created_at).toLocaleDateString('en-GB', { timeZone: 'Europe/Prague', day: 'numeric', month: 'short', year: 'numeric' })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
