'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { callOutcome, formatCost, formatDateTime, formatDuration } from '@/lib/calls'
import type { CallListItem } from '@/lib/supabase/queries'

export function CallsList({
  initialCalls,
  total,
  pageSize,
}: {
  initialCalls: CallListItem[]
  total: number
  pageSize: number
}) {
  const router = useRouter()
  const [calls, setCalls] = useState(initialCalls)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function loadMore() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/calls?page=${page + 1}&limit=${pageSize}`)
      if (!res.ok) throw new Error()
      const data = (await res.json()) as { calls: CallListItem[] }
      // Při nově příchozích hovorech by se stránky mohly překrývat – odfiltruj duplicity.
      setCalls((prev) => {
        const seen = new Set(prev.map((c) => c.id))
        return [...prev, ...data.calls.filter((c) => !seen.has(c.id))]
      })
      setPage((p) => p + 1)
    } catch {
      setError('Další hovory se nepodařilo načíst.')
    } finally {
      setLoading(false)
    }
  }

  if (calls.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="font-medium">Zatím žádné hovory</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Jakmile váš asistent přijme první hovor, objeví se zde včetně shrnutí a přepisu.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Datum a čas</TableHead>
                <TableHead>Volající</TableHead>
                <TableHead>Délka</TableHead>
                <TableHead>Výsledek</TableHead>
                <TableHead className="text-right">Náklady</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {calls.map((c) => {
                const outcome = callOutcome(c)
                return (
                  <TableRow
                    key={c.id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/dashboard/calls/${c.id}`)}
                  >
                    <TableCell className="whitespace-nowrap">
                      <Link href={`/dashboard/calls/${c.id}`} className="hover:underline">
                        {formatDateTime(c.created_at)}
                      </Link>
                    </TableCell>
                    <TableCell>{c.caller_number ?? 'Neznámé'}</TableCell>
                    <TableCell className="whitespace-nowrap">{formatDuration(c.duration_seconds)}</TableCell>
                    <TableCell>
                      <Badge variant={outcome.variant}>{outcome.label}</Badge>
                    </TableCell>
                    <TableCell className="text-right">{formatCost(c)}</TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {calls.length < total && (
        <Button variant="outline" className="self-center" onClick={loadMore} disabled={loading}>
          {loading ? 'Načítám…' : 'Načíst další'}
        </Button>
      )}
    </div>
  )
}
