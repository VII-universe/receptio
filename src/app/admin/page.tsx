import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Card, CardDescription, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { getAdminOverview } from '@/lib/admin/queries'
import { PLAN_BADGE } from '@/lib/plan-badge'
import { PLANS, type PlanId } from '@/lib/stripe/plans'

export const metadata = { title: 'Admin – Přehled' }

export default async function AdminOverviewPage() {
  const o = await getAdminOverview()
  const tiles = [
    { label: 'Celkem workspace', value: o.totalWorkspaces },
    { label: 'Aktivní workspace (30 dní)', value: o.activeWorkspaces },
    { label: 'Hovorů dnes', value: o.callsToday },
    { label: 'Hovorů tento měsíc', value: o.callsThisMonth },
  ]

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <h1 className="text-2xl font-semibold">Přehled</h1>
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
          <CardTitle>Posledních 10 workspace</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Název</TableHead>
                <TableHead>Plán</TableHead>
                <TableHead>Agenti</TableHead>
                <TableHead>Hovory celkem</TableHead>
                <TableHead>Vytvořen</TableHead>
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
                      {PLANS[w.plan as PlanId]?.nameCs ?? w.plan}
                    </Badge>{' '}
                    <Badge variant="outline">{w.currency ?? 'CZK'}</Badge>
                  </TableCell>
                  <TableCell>{w.agents}</TableCell>
                  <TableCell>{w.calls}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    {new Date(w.created_at).toLocaleDateString('cs-CZ', { timeZone: 'Europe/Prague' })}
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
