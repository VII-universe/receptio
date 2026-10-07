'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { endedReasonBadge, formatClock, formatDateTime } from '@/lib/calls'
import { cn } from '@/lib/utils'
import type { CallListItem } from '@/lib/supabase/queries'

export function CallsTable({ calls }: { calls: CallListItem[] }) {
  const router = useRouter()
  const t = useTranslations('calls')
  const td = useTranslations('dashboard')
  const locale = useLocale()

  if (calls.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          {t('noCalls')}
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
              <TableHead>{td('colAgent')}</TableHead>
              <TableHead>{t('callerNumber')}</TableHead>
              <TableHead>{t('dateTime')}</TableHead>
              <TableHead>{td('colDuration')}</TableHead>
              <TableHead>{td('colEndReason')}</TableHead>
              <TableHead className="text-right">{t('actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {calls.map((c) => {
              const reason = endedReasonBadge(c.ended_reason)
              return (
                <TableRow
                  key={c.id}
                  className="cursor-pointer"
                  onClick={() => router.push(`/dashboard/calls/${c.id}`)}
                >
                  <TableCell>
                    {c.agent_name ?? '–'}{' '}
                    {c.metadata?.source === 'test' && <Badge variant="secondary">{td('test')}</Badge>}
                  </TableCell>
                  <TableCell>{c.caller_number ?? td('unknownNumber')}</TableCell>
                  <TableCell className="whitespace-nowrap">{formatDateTime(c.started_at ?? c.created_at, locale)}</TableCell>
                  <TableCell>{formatClock(c.duration_seconds)}</TableCell>
                  <TableCell>
                    {c.ended_reason || c.status !== 'in_progress' ? (
                      <Badge variant="outline" className={cn('border-transparent', reason.className)}>
                        {reason.labelKey ? t(`reason.${reason.labelKey}`) : reason.label}
                      </Badge>
                    ) : (
                      <Badge variant="secondary">{t('inProgress')}</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Link
                      href={`/dashboard/calls/${c.id}`}
                      className={buttonVariants({ variant: 'ghost', size: 'sm' })}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {t('details')}
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
