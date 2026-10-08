'use client'

import { useId, useMemo, useRef, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { Table2, LineChart } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Point {
  date: string
  calls: number
  bookings: number
}

const W = 640
const H = 240
const M = { top: 16, right: 44, bottom: 26, left: 32 }

/** Zaokrouhlí maximum na "hezké" číslo pro osu Y (1, 2, 5 × 10ⁿ). */
function niceMax(v: number): number {
  if (v <= 4) return 4
  const pow = 10 ** Math.floor(Math.log10(v))
  const n = v / pow
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * pow
}

/**
 * Hovory a nové rezervace po dnech. Dvě řady na jedné ose (kategorická paleta 1 a 2), čáry 2 px, plocha pod hovory
 * jen jako jemný nádech, koncový bod s prstencem a hodnotou. Svislá nitka sleduje ukazatel (i šipky na klávesnici)
 * a jeden tooltip ukazuje obě řady. Lze přepnout na tabulku se stejnými daty.
 */
export function ActivityChart({ data }: { data: Point[] }) {
  const t = useTranslations('dashboard.ov')
  const locale = useLocale()
  const uid = useId()
  const svgRef = useRef<SVGSVGElement>(null)
  const [active, setActive] = useState<number | null>(null)
  const [table, setTable] = useState(false)

  const model = useMemo(() => {
    const max = niceMax(Math.max(1, ...data.map((d) => Math.max(d.calls, d.bookings))))
    const iw = W - M.left - M.right
    const ih = H - M.top - M.bottom
    const x = (i: number) => M.left + (data.length <= 1 ? iw / 2 : (i / (data.length - 1)) * iw)
    const y = (v: number) => M.top + ih - (v / max) * ih
    const line = (key: 'calls' | 'bookings') => data.map((d, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(d[key]).toFixed(1)}`).join(' ')
    const area = `${line('calls')} L${x(data.length - 1).toFixed(1)},${y(0)} L${x(0).toFixed(1)},${y(0)} Z`
    return { max, x, y, line, area, ih }
  }, [data])

  const fmt = useMemo(() => new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', timeZone: 'UTC' }), [locale])
  const fmtLong = useMemo(() => new Intl.DateTimeFormat(locale, { weekday: 'short', day: 'numeric', month: 'long', timeZone: 'UTC' }), [locale])
  const label = (iso: string, long = false) => (long ? fmtLong : fmt).format(new Date(`${iso}T12:00:00Z`))

  const total = (k: 'calls' | 'bookings') => data.reduce((s, d) => s + d[k], 0)
  const last = data[data.length - 1]
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(model.max * f)).filter((v, i, a) => a.indexOf(v) === i)
  const step = Math.max(1, Math.ceil(data.length / 6))

  const indexAt = (clientX: number) => {
    const r = svgRef.current?.getBoundingClientRect()
    if (!r || r.width === 0) return null
    const px = ((clientX - r.left) / r.width) * W
    const rel = (px - M.left) / (W - M.left - M.right)
    return Math.max(0, Math.min(data.length - 1, Math.round(rel * (data.length - 1))))
  }

  const a = active !== null ? data[active] : null
  const tipLeft = active !== null ? (model.x(active) / W) * 100 : 0
  const flip = tipLeft > 62

  return (
    <div className="viz flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
        {/* legenda: klíč řady + souhrn za období; text zůstává v textových barvách */}
        {([['calls', 'var(--viz-1)'], ['bookings', 'var(--viz-2)']] as const).map(([k, color]) => (
          <span key={k} className="flex items-center gap-2 text-muted-foreground">
            <svg width="16" height="8" aria-hidden>
              <line x1="0" y1="4" x2="16" y2="4" stroke={color} strokeWidth="2" strokeLinecap="round" />
            </svg>
            {t(`series.${k}`)} <span className="font-semibold tabular-nums text-foreground">{total(k)}</span>
          </span>
        ))}
        <button
          type="button"
          onClick={() => setTable((v) => !v)}
          aria-pressed={table}
          className="ml-auto inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          {table ? <LineChart className="size-3.5" aria-hidden /> : <Table2 className="size-3.5" aria-hidden />}
          {table ? t('showChart') : t('showTable')}
        </button>
      </div>

      {table ? (
        <div className="max-h-60 overflow-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-card text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left font-medium">{t('date')}</th>
                <th className="px-3 py-2 text-right font-medium">{t('series.calls')}</th>
                <th className="px-3 py-2 text-right font-medium">{t('series.bookings')}</th>
              </tr>
            </thead>
            <tbody>
              {[...data].reverse().map((d) => (
                <tr key={d.date} className="border-t border-border/70">
                  <td className="px-3 py-1.5">{label(d.date, true)}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{d.calls}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{d.bookings}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="relative">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${W} ${H}`}
            className="h-auto w-full touch-pan-y select-none outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
            role="img"
            tabIndex={0}
            aria-label={`${t('series.calls')} / ${t('series.bookings')}`}
            aria-describedby={`${uid}-hint`}
            onPointerMove={(e) => setActive(indexAt(e.clientX))}
            onPointerLeave={() => setActive(null)}
            onFocus={() => setActive((v) => v ?? data.length - 1)}
            onBlur={() => setActive(null)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowLeft') setActive((v) => Math.max(0, (v ?? data.length) - 1))
              else if (e.key === 'ArrowRight') setActive((v) => Math.min(data.length - 1, (v ?? -1) + 1))
              else if (e.key === 'Escape') setActive(null)
            }}
          >
            <defs>
              <linearGradient id={`${uid}-fill`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="var(--viz-1)" stopOpacity="0.16" />
                <stop offset="1" stopColor="var(--viz-1)" stopOpacity="0" />
              </linearGradient>
            </defs>

            {/* mřížka a osa Y: hairline, nenápadné */}
            {ticks.map((v) => (
              <g key={v}>
                <line x1={M.left} x2={W - M.right} y1={model.y(v)} y2={model.y(v)} stroke="var(--viz-grid)" strokeWidth="1" />
                <text x={M.left - 8} y={model.y(v) + 3.5} textAnchor="end" fontSize="10" fill="var(--viz-axis)">
                  {v}
                </text>
              </g>
            ))}
            {data.map((d, i) =>
              i % step === 0 ? (
                <text key={d.date} x={model.x(i)} y={H - 6} textAnchor="middle" fontSize="10" fill="var(--viz-axis)">
                  {label(d.date)}
                </text>
              ) : null
            )}

            <path d={model.area} fill={`url(#${uid}-fill)`} />
            <path d={model.line('calls')} fill="none" stroke="var(--viz-1)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
            <path d={model.line('bookings')} fill="none" stroke="var(--viz-2)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />

            {/* koncové body (prstenec v barvě plochy) a hodnoty; druhá hodnota se vynechá, pokud by kolidovala */}
            {last && (
              <>
                <circle cx={model.x(data.length - 1)} cy={model.y(last.calls)} r="4" fill="var(--viz-1)" stroke="var(--viz-surface)" strokeWidth="2" />
                <circle cx={model.x(data.length - 1)} cy={model.y(last.bookings)} r="4" fill="var(--viz-2)" stroke="var(--viz-surface)" strokeWidth="2" />
                <text x={model.x(data.length - 1) + 9} y={model.y(last.calls) + 3.5} fontSize="11" fontWeight="600" fill="var(--foreground)">
                  {last.calls}
                </text>
                {Math.abs(model.y(last.calls) - model.y(last.bookings)) > 13 && (
                  <text x={model.x(data.length - 1) + 9} y={model.y(last.bookings) + 3.5} fontSize="11" fontWeight="600" fill="var(--foreground)">
                    {last.bookings}
                  </text>
                )}
              </>
            )}

            {/* hover: nitka a body na obou řadách */}
            {a && active !== null && (
              <g pointerEvents="none">
                <line x1={model.x(active)} x2={model.x(active)} y1={M.top} y2={H - M.bottom} stroke="var(--viz-axis)" strokeWidth="1" opacity="0.5" />
                <circle cx={model.x(active)} cy={model.y(a.calls)} r="4.5" fill="var(--viz-1)" stroke="var(--viz-surface)" strokeWidth="2" />
                <circle cx={model.x(active)} cy={model.y(a.bookings)} r="4.5" fill="var(--viz-2)" stroke="var(--viz-surface)" strokeWidth="2" />
              </g>
            )}
            <rect x={M.left} y={M.top} width={W - M.left - M.right} height={H - M.top - M.bottom} fill="transparent" />
          </svg>

          {a && (
            <div
              role="status"
              className={cn('pointer-events-none absolute top-2 z-10 w-44 rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-xl', flip ? '-translate-x-full' : '')}
              style={{ left: `calc(${tipLeft}% ${flip ? '- 12px' : '+ 12px'})` }}
            >
              <div className="mb-1.5 font-medium text-muted-foreground">{label(a.date, true)}</div>
              {(['calls', 'bookings'] as const).map((k) => (
                <div key={k} className="flex items-center justify-between gap-3 py-0.5">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <svg width="12" height="6" aria-hidden>
                      <line x1="0" y1="3" x2="12" y2="3" stroke={k === 'calls' ? 'var(--viz-1)' : 'var(--viz-2)'} strokeWidth="2" strokeLinecap="round" />
                    </svg>
                    {t(`series.${k}`)}
                  </span>
                  <span className="text-sm font-semibold tabular-nums text-foreground">{a[k]}</span>
                </div>
              ))}
            </div>
          )}
          <p id={`${uid}-hint`} className="sr-only">
            {t('chartHint')}
          </p>
        </div>
      )}
    </div>
  )
}
