import Link from 'next/link'
import { CreditCard } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { getOwners, listWorkspaces, PAGE_SIZE, parseListParams, type ListParams } from '@/lib/admin/workspace-admin'
import { PLAN_LIMITS } from '@/lib/billing/plans'
import { cn } from '@/lib/utils'

export const metadata = { title: 'Admin – workspaces' }
export const dynamic = 'force-dynamic'

const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('en-GB', { timeZone: 'Europe/Prague' }) : '–')
const selectClass = 'h-9 rounded-md border bg-background px-2 text-sm'

/** Adresa stránky s upravenými parametry (filtry a řazení jsou v URL, ne ve stavu klienta). */
function href(p: ListParams, change: Partial<ListParams>) {
  const n = { ...p, ...change }
  const q = new URLSearchParams()
  if (n.q) q.set('q', n.q)
  if (n.plan) q.set('plan', n.plan)
  if (n.paused) q.set('paused', '1')
  if (n.sub) q.set('sub', n.sub)
  if (n.sort !== 'created_at') q.set('sort', n.sort)
  if (n.dir !== 'desc') q.set('dir', n.dir)
  if (n.page > 1) q.set('page', String(n.page))
  const s = q.toString()
  return `/dashboard/admin/workspaces${s ? `?${s}` : ''}`
}

export default async function AdminWorkspacesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const p = parseListParams(await searchParams)
  const { rows, total } = await listWorkspaces(p)
  const owners = await getOwners(rows.map((r) => r.clerk_user_id))
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const sortLink = (key: ListParams['sort'], label: string) => (
    <Link href={href(p, { sort: key, dir: p.sort === key && p.dir === 'desc' ? 'asc' : 'desc', page: 1 })} className="underline-offset-2 hover:underline">
      {label}
      {p.sort === key ? (p.dir === 'desc' ? ' ↓' : ' ↑') : ''}
    </Link>
  )

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">
          Workspaces <span className="text-base font-normal text-muted-foreground">({total})</span>
        </h1>
        <Link href="/dashboard/admin" className="text-sm underline">
          ← Overview
        </Link>
      </div>

      <form method="get" className="flex flex-wrap items-end gap-3">
        <Input name="q" defaultValue={p.q} placeholder="Search by name" className="w-56" />
        <select name="plan" defaultValue={p.plan} className={selectClass} aria-label="Plan">
          <option value="">All plans</option>
          {Object.keys(PLAN_LIMITS).map((id) => (
            <option key={id} value={id}>
              {id}
            </option>
          ))}
        </select>
        <select name="sub" defaultValue={p.sub} className={selectClass} aria-label="Subscription">
          <option value="">Any subscription</option>
          <option value="1">With subscription</option>
          <option value="0">Without subscription</option>
        </select>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="paused" value="1" defaultChecked={p.paused} className="size-4" /> Calls paused
        </label>
        <input type="hidden" name="sort" value={p.sort} />
        <input type="hidden" name="dir" value={p.dir} />
        <Button type="submit" size="sm">
          Filter
        </Button>
        <Link href="/dashboard/admin/workspaces" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
          Reset
        </Link>
      </form>

      <Card>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>{sortLink('plan', 'Plan')}</TableHead>
                <TableHead>{sortLink('minutes_used', 'Minutes')}</TableHead>
                <TableHead>Trial ends</TableHead>
                <TableHead>Calls paused</TableHead>
                <TableHead>Stripe</TableHead>
                <TableHead>{sortLink('created_at', 'Created')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                    No workspaces match.
                  </TableCell>
                </TableRow>
              )}
              {rows.map((w) => {
                const owner = owners.get(w.clerk_user_id)
                return (
                  // Celý řádek je klikací: odkaz ve jméně se přes ::after roztáhne přes řádek.
                  <TableRow key={w.id} className="relative hover:bg-muted/50">
                    <TableCell className="font-medium">
                      <Link href={`/dashboard/admin/workspaces/${w.id}`} className="after:absolute after:inset-0">
                        {w.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm">{owner?.email ?? '–'}</TableCell>
                    <TableCell>{w.plan}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      {w.minutesUsed} / {w.minutesLimit}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{fmt(w.trial_ends_at)}</TableCell>
                    <TableCell>{w.calls_paused ? <Badge variant="destructive">paused</Badge> : '–'}</TableCell>
                    <TableCell>
                      {w.stripe_customer_id ? <CreditCard className="size-4" aria-label="Has a Stripe customer" /> : <span className="text-muted-foreground">–</span>}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{fmt(w.created_at)}</TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between gap-4">
        <Link href={href(p, { page: p.page - 1 })} aria-disabled={p.page <= 1} className={cn(buttonVariants({ variant: 'outline' }), p.page <= 1 && 'pointer-events-none opacity-50')}>
          Previous
        </Link>
        <span className="text-sm text-muted-foreground">
          Page {Math.min(p.page, pages)} of {pages}
        </span>
        <Link href={href(p, { page: p.page + 1 })} aria-disabled={p.page >= pages} className={cn(buttonVariants({ variant: 'outline' }), p.page >= pages && 'pointer-events-none opacity-50')}>
          Next
        </Link>
      </div>
    </div>
  )
}
