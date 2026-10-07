'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PLAN_BADGE } from '@/lib/plan-badge'
import { PLANS, type PlanId } from '@/lib/stripe/plans'

interface Row {
  id: string
  name: string
  plan: string
  agents: number
  calls: number
  createdAt: string
}

export function WorkspacesTable({ rows }: { rows: Row[] }) {
  const router = useRouter()
  const [q, setQ] = useState('')
  const needle = q.trim().toLowerCase()
  const filtered = needle ? rows.filter((r) => r.name.toLowerCase().includes(needle)) : rows

  return (
    <div className="flex flex-col gap-4">
      <Input
        placeholder="Hledat podle názvu…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className="max-w-sm"
        aria-label="Hledat workspace"
      />
      <Card>
        <CardContent>
          {filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Žádný workspace nenalezen.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Název</TableHead>
                  <TableHead>Plán</TableHead>
                  <TableHead>Agenti</TableHead>
                  <TableHead>Hovory</TableHead>
                  <TableHead>Vytvořen</TableHead>
                  <TableHead className="text-right">Akce</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((w) => (
                  <TableRow key={w.id} className="cursor-pointer" onClick={() => router.push(`/admin/workspaces/${w.id}`)}>
                    <TableCell className="font-medium">{w.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`border-transparent ${PLAN_BADGE[w.plan] ?? PLAN_BADGE.free}`}>
                        {PLANS[w.plan as PlanId]?.nameCs ?? w.plan}
                      </Badge>
                    </TableCell>
                    <TableCell>{w.agents}</TableCell>
                    <TableCell>{w.calls}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      {new Date(w.createdAt).toLocaleDateString('cs-CZ', { timeZone: 'Europe/Prague' })}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link
                        href={`/admin/workspaces/${w.id}`}
                        className={buttonVariants({ variant: 'ghost', size: 'sm' })}
                        onClick={(e) => e.stopPropagation()}
                      >
                        Detail
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
