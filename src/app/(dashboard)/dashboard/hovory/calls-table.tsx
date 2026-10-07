'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { endedReasonBadge, formatClock, formatDateTime } from '@/lib/calls'
import { cn } from '@/lib/utils'
import type { CallListItem } from '@/lib/supabase/queries'

export function CallsTable({ calls }: { calls: CallListItem[] }) {
  const router = useRouter()

  if (calls.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          Zatím žádné hovory. Jakmile proběhne první hovor, zobrazí se zde.
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Agent</TableHead>
              <TableHead>Volající číslo</TableHead>
              <TableHead>Datum a čas</TableHead>
              <TableHead>Délka</TableHead>
              <TableHead>Důvod ukončení</TableHead>
              <TableHead className="text-right">Akce</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {calls.map((c) => {
              const reason = endedReasonBadge(c.ended_reason)
              return (
                <TableRow
                  key={c.id}
                  className="cursor-pointer"
                  onClick={() => router.push(`/dashboard/hovory/${c.id}`)}
                >
                  <TableCell>{c.agent_name ?? '–'}</TableCell>
                  <TableCell>{c.caller_number ?? 'Neznámé číslo'}</TableCell>
                  <TableCell className="whitespace-nowrap">{formatDateTime(c.started_at ?? c.created_at)}</TableCell>
                  <TableCell>{formatClock(c.duration_seconds)}</TableCell>
                  <TableCell>
                    {c.ended_reason || c.status !== 'in_progress' ? (
                      <Badge variant="outline" className={cn('border-transparent', reason.className)}>
                        {reason.label}
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Probíhá</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Link
                      href={`/dashboard/hovory/${c.id}`}
                      className={buttonVariants({ variant: 'ghost', size: 'sm' })}
                      onClick={(e) => e.stopPropagation()}
                    >
                      Detail
                    </Link>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
