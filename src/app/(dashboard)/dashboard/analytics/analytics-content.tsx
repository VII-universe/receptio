import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { CallsByDayChart, CallsByHourChart } from '@/components/analytics/charts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { getAnalytics, type Range } from '@/lib/analytics'
import { formatClock } from '@/lib/calls'
import { cn } from '@/lib/utils'
import type { Workspace } from '@/types'

/** ▲ zelená / ▼ červená podle znaménka změny proti předchozímu stejně dlouhému období. */
async function Delta({ current, previous, suffix = '' }: { current: number; previous: number; suffix?: string }) {
  const t = await getTranslations('dashboard')
  if (previous === 0) {
    return <span className="text-muted-foreground">{current > 0 ? t('new') : '—'}</span>
  }
  const pct = Math.round(((current - previous) / previous) * 100)
  if (pct === 0) return <span className="text-muted-foreground">→ 0 %{suffix}</span>
  return pct > 0 ? (
    <span className="text-green-600">▲ {pct} %{suffix}</span>
  ) : (
    <span className="text-red-600">▼ {Math.abs(pct)} %{suffix}</span>
  )
}

function Kpi({ label, value, children }: { label: string; value: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-2xl">{value}</CardTitle>
      </CardHeader>
      <CardContent className="text-xs">{children}</CardContent>
    </Card>
  )
}

export async function AnalyticsContent({
  workspace,
  range,
  canOpenAgents,
}: {
  workspace: Workspace
  range: Range
  canOpenAgents: boolean
}) {
  const t = await getTranslations('analytics')
  const td = await getTranslations('dashboard')
  let data
  try {
    data = await getAnalytics(workspace, range)
  } catch (e) {
    console.error('Analytics: failed to load', e)
    return <p className="text-sm text-muted-foreground">{t('loadFailed')}</p>
  }

  const { kpis, planUsage } = data
  const unlimited = planUsage.limit === -1
  const percent = unlimited ? 0 : Math.round((planUsage.used / Math.max(1, planUsage.limit)) * 100)
  const barColor = percent >= 100 ? 'bg-red-500' : percent > 80 ? 'bg-orange-500' : 'bg-blue-500'
  const vs = ` ${t('vsPrevious')}`

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi label={t('totalCalls')} value={String(kpis.calls)}>
          <Delta current={kpis.calls} previous={kpis.prevCalls} suffix={vs} />
        </Kpi>
        <Kpi label={t('totalDuration')} value={t('minutesShort', { value: kpis.totalMinutes })}>
          <Delta current={kpis.totalMinutes} previous={kpis.prevMinutes} suffix={vs} />
        </Kpi>
        <Kpi label={td('avgDuration')} value={kpis.avgDuration > 0 ? formatClock(kpis.avgDuration) : '—'}>
          <Delta current={kpis.avgDuration} previous={kpis.prevAvgDuration} suffix={vs} />
        </Kpi>
        <Kpi label={t('completionRate')} value={`${Math.round(kpis.completionRate)}%`}>
          <Delta current={kpis.completionRate} previous={kpis.prevCompletionRate} suffix={vs} />
        </Kpi>
      </div>

      {kpis.calls === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="font-medium">{t('noCalls')}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {t('noCallsDesc', { count: range })}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>{t('callsOverTime')}</CardTitle>
            </CardHeader>
            <CardContent>
              <CallsByDayChart data={data.callsByDay} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('busiestHours')}</CardTitle>
              <CardDescription>{t('busiestHoursDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              <CallsByHourChart data={data.callsByHour} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('agentPerformance')}</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{td('colAgent')}</TableHead>
                    <TableHead>{t('colCalls')}</TableHead>
                    <TableHead>{t('colTotalMin')}</TableHead>
                    <TableHead>{t('colAvgDuration')}</TableHead>
                    <TableHead>{t('colSuccess')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.agentStats.map((a) => (
                    <TableRow key={a.agentId}>
                      <TableCell className="font-medium">
                        {canOpenAgents ? (
                          <Link href={`/dashboard/agents/${a.agentId}`} className="hover:underline">
                            {a.name}
                          </Link>
                        ) : (
                          a.name
                        )}
                      </TableCell>
                      <TableCell>{a.calls}</TableCell>
                      <TableCell>{a.totalMinutes}</TableCell>
                      <TableCell>{a.avgDuration > 0 ? formatClock(a.avgDuration) : '—'}</TableCell>
                      <TableCell>{a.calls > 0 ? `${Math.round(a.completionRate)} %` : '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t('planUsage')}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {unlimited ? (
            <p className="text-sm">{t('usedUnlimited', { used: planUsage.used })}</p>
          ) : (
            <>
              <div
                className="h-3 w-full overflow-hidden rounded-full bg-muted"
                role="progressbar"
                aria-valuenow={Math.min(100, percent)}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div className={cn('h-full', barColor)} style={{ width: `${Math.min(100, percent)}%` }} />
              </div>
              <p className="text-sm">
                {t('usedOfLimit', { used: planUsage.used, limit: planUsage.limit, percent })}
              </p>
              {percent >= 100 ? (
                <p className="text-sm font-medium text-red-600">{t('limitReached')}</p>
              ) : percent > 80 ? (
                <p className="text-sm font-medium text-orange-600">{t('approaching')}</p>
              ) : null}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
