const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// "2026-10-06" -> "6 Oct 2026"
const formatDate = (iso: string) => {
  const [y, m, d] = iso.split('-')
  return `${Number(d)} ${MONTHS[Number(m) - 1]} ${y}`
}

/** Sloupcový graf posledních 7 dní v SVG. Tooltip je nativní <title> (zobrazí se při najetí myší). */
export function ActivityChart({ data }: { data: { date: string; count: number }[] }) {
  const max = Math.max(...data.map((d) => d.count), 0)
  const W = 100 // šířka jednoho slotu, graf má viewBox 700 × 160
  const H = 160

  return (
    <div>
      <svg viewBox={`0 0 ${W * 7} ${H}`} className="h-40 w-full" role="img" aria-label="Number of calls in the last 7 days">
        {data.map((d, i) => {
          const h = max > 0 ? Math.max(d.count > 0 ? 6 : 0, (d.count / max) * (H - 8)) : 0
          const x = i * W + 18
          const label = `${formatDate(d.date)}: ${d.count} ${d.count === 1 ? 'call' : 'calls'}`
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
          <span key={d.date}>{WEEKDAYS[new Date(`${d.date}T12:00:00Z`).getUTCDay()]}</span>
        ))}
      </div>
    </div>
  )
}
