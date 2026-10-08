import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { getOverview } from '@/lib/admin/workspace-admin'

export const metadata = { title: 'Admin' }
export const dynamic = 'force-dynamic'

const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Europe/Prague' }) : '–')

export default async function AdminOverviewPage() {
  const o = await getOverview() // ověří admina (requireAdmin) i při přímém vstupu na stránku

  const cards = [
    { label: 'Workspaces', value: o.workspaces },
    { label: 'Active subscriptions', value: o.paid, hint: 'plan other than Free' },
    { label: 'Trials running', value: o.trials },
    { label: 'Minutes this period', value: o.minutes },
    { label: 'Calls paused', value: o.paused },
    {
      label: 'MRR estimate',
      value: `${o.mrr.EUR.toLocaleString('en-GB')} €`,
      hint: `+ ${o.mrr.CZK.toLocaleString('cs-CZ')} Kč (from the price list)`,
    },
  ]

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="app-title text-2xl font-semibold tracking-tight">Admin</h1>
        <Link href="/dashboard/admin/workspaces" className="text-sm underline">
          All workspaces →
        </Link>
        <Link href="/dashboard/admin/production-checklist" className="text-sm underline">
          Production checklist →
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardHeader>
              <CardDescription>{c.label}</CardDescription>
              <CardTitle className="text-2xl">{c.value}</CardTitle>
            </CardHeader>
            {c.hint && <CardContent className="text-xs text-muted-foreground">{c.hint}</CardContent>}
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Latest workspaces</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Minutes</TableHead>
                <TableHead>Trial ends</TableHead>
                <TableHead>Calls paused</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {o.recent.map((w) => (
                <TableRow key={w.id}>
                  <TableCell className="font-mono text-xs">{w.id.slice(0, 8)}</TableCell>
                  <TableCell className="font-medium">
                    <Link href={`/dashboard/admin/workspaces/${w.id}`} className="hover:underline">
                      {w.name}
                    </Link>
                  </TableCell>
                  <TableCell>{w.plan}</TableCell>
                  <TableCell>
                    {w.minutesUsed} / {w.minutesLimit}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{fmt(w.trial_ends_at)}</TableCell>
                  <TableCell>{w.calls_paused ? <Badge variant="destructive">paused</Badge> : '–'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
