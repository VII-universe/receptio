import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { requireAdmin } from '@/lib/auth/require-admin'
import { runChecks, type Status } from '@/lib/admin/production-checks'
import { cn } from '@/lib/utils'

export const metadata = { title: 'Admin – production checklist', robots: { index: false, follow: false } }
export const dynamic = 'force-dynamic'

const LABEL: Record<Status, string> = { ok: '✅ OK', warn: '⚠️ Check', fail: '❌ Missing / failing' }
const TONE: Record<Status, string> = {
  ok: 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300',
  warn: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-300',
  fail: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300',
}

export default async function ProductionChecklistPage() {
  await requireAdmin() // stejně jako ostatní admin stránky
  const checks = await runChecks()
  const passed = checks.filter((c) => c.status === 'ok').length
  const warns = checks.filter((c) => c.status === 'warn').length
  const fails = checks.filter((c) => c.status === 'fail').length
  const overall: Status = fails > 0 ? 'fail' : warns > 0 ? 'warn' : 'ok'

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Production checklist</h1>
        <div className="flex items-center gap-3">
          <Link href="/dashboard/admin/production-checklist" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
            Re-run checks
          </Link>
          <Link href="/dashboard/admin" className="text-sm underline">
            ← Admin
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardDescription>Environment this server runs in: {process.env.NODE_ENV === 'production' ? 'production build' : 'development'}</CardDescription>
          <CardTitle className="flex flex-wrap items-center gap-3 text-2xl">
            {passed}/{checks.length} checks passed
            <Badge variant="outline" className={cn('border-transparent text-sm', TONE[overall])}>
              {overall === 'ok' ? '✅ Ready' : overall === 'warn' ? '⚠️ Warnings' : '❌ Not ready'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {fails} failing, {warns} warning{warns === 1 ? '' : 's'}. Values of environment variables are never shown, only whether they are set and valid.
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Service</TableHead>
                <TableHead>Item</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {checks.map((c, i) => (
                <TableRow key={`${c.service}-${c.item}-${i}`}>
                  <TableCell className="font-medium">{c.service}</TableCell>
                  <TableCell className="font-mono text-xs">{c.item}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cn('border-transparent', TONE[c.status])}>
                      {LABEL[c.status]}
                    </Badge>
                    {c.note && <span className="ml-2 text-xs text-muted-foreground">{c.note}</span>}
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
