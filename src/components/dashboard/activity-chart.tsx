import { getLocale, getTranslations } from 'next-intl/server'

// "2026-10-06" -> "6 Oct 2026" (podle jazyka)
const formatDate = (iso: string, locale: string) =>
  new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(
    new Date(`${iso}T12:00:00Z`)
  )

/** Sloupcový graf posledních 7 dní v SVG. Tooltip je nativní <title> (zobrazí se při najetí myší). */
export async function ActivityChart({ data }: { data: { date: string; count: number }[] }) {
  const t = await getTranslations('dashboard')
  const locale = await getLocale()
  const weekday = new Intl.DateTimeFormat(locale, { weekday: 'short', timeZone: 'UTC' })
  const max = Math.max(...data.map((d) => d.count), 0)
  const W = 100 // šířka jednoho slotu, graf má viewBox 700 × 160
  const H = 160

  return (
    <div>
      <svg viewBox={`0 0 ${W * 7} ${H}`} className="h-40 w-full" role="img" aria-label={t('callsLast7')}>
        {data.map((d, i) => {
          const h = max > 0 ? Math.max(d.count > 0 ? 6 : 0, (d.count / max) * (H - 8)) : 0
          const x = i * W + 18
          const label = `${formatDate(d.date, locale)}: ${t('callsCount', { count: d.count })}`
          return (
            <g key={d.date}>
              <title>{label}</title>
              <rect x={x} y={0} width={W - 36} height={H} rx={8} className="fill-muted" />
              {h > 0 && <rect x={x} y={H - h} width={W - 36} height={h} rx={8} fill="#3b82f6" />}
            </g>
          )
        })}
      </svg>
      <div className="grid grid-cols-7 pt-2 text-center text-xs text-muted-foreground">
        {data.map((d) => (
          <span key={d.date}>{weekday.format(new Date(`${d.date}T12:00:00Z`))}</span>
        ))}
      </div>
    </div>
  )
}
