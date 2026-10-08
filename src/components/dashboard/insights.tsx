import { getTranslations } from 'next-intl/server'
import { Bot, CalendarDays, Clock, PhoneCall } from 'lucide-react'
import type { CallInsights } from '@/lib/dashboard-overview'
import { cn } from '@/lib/utils'

const FROM_HOUR = 6
const TO_HOUR = 21

/** Z čeho se dá poučit: nejvytíženější hodina a den, nejaktivnější agent, průměr za den a rozložení hovorů v průběhu dne. */
export async function Insights({ insights, agentNames, days, locale }: { insights: CallInsights; agentNames: Record<string, string>; days: number; locale: string }) {
  const t = await getTranslations('dashboard.ov.insights')
  const total = insights.hours.reduce((s, n) => s + n, 0)
  if (total === 0) return <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">{t('empty')}</p>

  const maxHour = Math.max(...insights.hours)
  const peakHour = insights.hours.indexOf(maxHour)
  const peakDay = insights.weekdays.indexOf(Math.max(...insights.weekdays))
  const dayName = new Intl.DateTimeFormat(locale, { weekday: 'long', timeZone: 'UTC' }).format(new Date(Date.UTC(2024, 0, 7 + peakDay, 12))) // 7. 1. 2024 je neděle
  const top = Object.entries(insights.byAgent).sort((a, b) => b[1] - a[1])[0]
  const hh = (h: number) => `${String(h).padStart(2, '0')}:00`

  const tiles = [
    { icon: Clock, label: t('peakHour'), value: `${hh(peakHour)}–${hh((peakHour + 1) % 24)}`, sub: t('callsCount', { count: maxHour }) },
    { icon: CalendarDays, label: t('peakDay'), value: dayName, sub: t('callsCount', { count: insights.weekdays[peakDay] }), cap: true },
    { icon: Bot, label: t('topAgent'), value: top ? (agentNames[top[0]] ?? '–') : '–', sub: top ? t('share', { pct: Math.round((top[1] / total) * 100) }) : '' },
    { icon: PhoneCall, label: t('perDay'), value: (total / days).toFixed(total / days >= 10 ? 0 : 1), sub: t('callsCount', { count: total }) },
  ]
  const hours = Array.from({ length: TO_HOUR - FROM_HOUR + 1 }, (_, i) => FROM_HOUR + i)

  return (
    <div className="flex flex-col gap-4">
      <dl className="grid grid-cols-2 gap-2.5">
        {tiles.map((x) => (
          <div key={x.label} className="rounded-xl border border-border bg-muted/40 px-3 py-2.5">
            <dt className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <x.icon className="size-3.5 text-primary" aria-hidden /> {x.label}
            </dt>
            <dd className={cn('mt-1 truncate text-sm font-semibold tabular-nums', x.cap && 'capitalize')}>{x.value}</dd>
            <dd className="text-[11px] text-muted-foreground">{x.sub}</dd>
          </div>
        ))}
      </dl>

      {/* rozložení hovorů v průběhu dne: jedna barva, sloupce s 2px mezerou a 4px zaoblením nahoře; vrchol je výraznější */}
      <div>
        <p className="mb-2 text-xs font-medium text-muted-foreground">{t('byHour')}</p>
        <div className="flex h-16 items-end gap-0.5" role="img" aria-label={t('byHourLabel', { hour: hh(peakHour) })}>
          {hours.map((h) => {
            const n = insights.hours[h]
            return (
              <div key={h} className="group relative flex h-full flex-1 items-end" title={`${hh(h)} · ${t('callsCount', { count: n })}`}>
                <div
                  className={cn('w-full max-w-6 rounded-t-[4px] transition-opacity group-hover:opacity-100', h === peakHour ? 'bg-[var(--viz-1)]' : 'bg-[var(--viz-1)] opacity-35')}
                  style={{ height: `${Math.max(n > 0 ? 8 : 2, (n / maxHour) * 100)}%` }}
                />
              </div>
            )
          })}
        </div>
        <div className="mt-1 flex justify-between text-[10px] text-muted-foreground tabular-nums">
          <span>{hh(FROM_HOUR)}</span>
          <span>{hh(12)}</span>
          <span>{hh(18)}</span>
          <span>{hh(TO_HOUR)}</span>
        </div>
      </div>
    </div>
  )
}
