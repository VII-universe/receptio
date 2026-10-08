'use client'

import { useRef, useState } from 'react'
import { Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Booking } from '@/types'
import { layoutLanes, STATUS_STYLES } from './booking-utils'

export interface ExternalBlock {
  id: string
  title: string | null
  startMin: number
  endMin: number
  source: string
}

export const ROW_PX = 14 // jedna řádka = 15 minut
export const SNAP_MIN = 15
const DEFAULT_CLICK_MIN = 30

const hhmm = (min: number) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`

interface Selection {
  col: number
  a: number // řádek, kde výběr začal
  c: number // řádek pod kurzorem
  moved: boolean
}

/**
 * Časová osa po 15 minutách (CSS Grid). Tažením myší po sloupci dne se označí přesný čas (přichytává po čtvrthodinách),
 * jedno kliknutí označí 30 minut od kliknutého místa. Po puštění se zavolá `onCreate`. Rezervace v mřížce otevírají detail.
 */
export function TimeGrid({
  days,
  today,
  fromHour,
  toHour,
  byDay,
  externalByDay,
  externalLabel = '',
  timezone,
  minutesOfDay,
  selectedId,
  canCreate,
  dayLabel,
  dayNumber,
  onDayClick,
  onSelectBooking,
  onHoverBooking,
  onCreate,
  timeFmt,
  createLabel,
  minWidth = 720,
}: {
  days: string[]
  today: string
  fromHour: number
  toHour: number
  byDay: Map<string, Booking[]>
  externalByDay?: Map<string, ExternalBlock[]>
  externalLabel?: string
  timezone: string
  minutesOfDay: (iso: string, tz: string) => number
  selectedId: string | null
  canCreate: boolean
  dayLabel: (d: string) => string
  dayNumber: (d: string) => number
  onDayClick?: (d: string) => void
  onSelectBooking: (id: string) => void
  onHoverBooking?: (id: string | null, el?: HTMLElement) => void
  onCreate: (date: string, startMin: number, endMin: number) => void
  timeFmt: Intl.DateTimeFormat
  createLabel: string
  minWidth?: number
}) {
  const rows = (toHour - fromHour) * 4
  const origin = fromHour * 60
  const [sel, setSel] = useState<Selection | null>(null)
  const [hover, setHover] = useState<{ col: number; row: number } | null>(null)
  const layers = useRef<(HTMLDivElement | null)[]>([])

  const rowAt = (col: number, clientY: number) => {
    const el = layers.current[col]
    if (!el) return 0
    const r = el.getBoundingClientRect()
    return Math.max(0, Math.min(rows - 1, Math.floor((clientY - r.top) / ROW_PX)))
  }

  const finish = (s: Selection) => {
    const lo = Math.min(s.a, s.c)
    const hi = Math.max(s.a, s.c)
    let start = origin + lo * SNAP_MIN
    let end = origin + (hi + 1) * SNAP_MIN
    if (!s.moved || end - start < SNAP_MIN * 2) end = Math.min(toHour * 60, start + (s.moved ? SNAP_MIN : DEFAULT_CLICK_MIN))
    if (end - start < SNAP_MIN) start = end - SNAP_MIN
    onCreate(days[s.col], start, end)
  }

  const selRows = sel ? { lo: Math.min(sel.a, sel.c), hi: Math.max(sel.a, sel.c) } : null

  return (
    <div className="overflow-x-auto rounded-2xl bg-card ring-1 ring-foreground/10 dark:backdrop-blur-xl">
      <div className="grid select-none" style={{ minWidth, gridTemplateColumns: `52px repeat(${days.length}, minmax(0, 1fr))`, gridTemplateRows: `auto repeat(${rows}, ${ROW_PX}px)` }}>
        <div className="border-b border-border" />
        {days.map((d, i) => {
          const content = (
            <>
              <span className="block uppercase tracking-wider text-muted-foreground">{dayLabel(d)}</span>
              <span className={cn('mt-0.5 inline-flex size-7 items-center justify-center rounded-full text-sm font-semibold', d === today && 'bg-primary text-primary-foreground')}>{dayNumber(d)}</span>
            </>
          )
          const cls = cn('border-b border-l border-border px-2 py-2 text-center text-xs', d === today && 'bg-primary/10')
          return onDayClick ? (
            <button key={d} type="button" onClick={() => onDayClick(d)} className={cn(cls, 'transition-colors hover:bg-muted')} style={{ gridColumn: i + 2, gridRow: 1 }}>
              {content}
            </button>
          ) : (
            <div key={d} className={cls} style={{ gridColumn: i + 2, gridRow: 1 }}>
              {content}
            </div>
          )
        })}

        {/* časová osa a linky */}
        {Array.from({ length: rows }, (_, r) => (
          <div key={`l${r}`} className="contents">
            <div className="pr-2 text-right text-[10px] text-muted-foreground" style={{ gridColumn: 1, gridRow: r + 2 }}>
              {r % 4 === 0 && <span className="relative -top-1.5">{String(fromHour + r / 4).padStart(2, '0')}:00</span>}
            </div>
            {days.map((d, i) => (
              <div
                key={d}
                className={cn('border-l border-border', r % 4 === 0 ? 'border-t' : r % 2 === 0 ? 'border-t border-t-border/40' : 'border-t border-t-border/15', d === today && 'bg-primary/5')}
                style={{ gridColumn: i + 2, gridRow: r + 2 }}
              />
            ))}
          </div>
        ))}

        {/* vrstva pro označování času (pod kartami rezervací) */}
        {days.map((d, i) => (
          <div
            key={`layer-${d}`}
            ref={(el) => {
              layers.current[i] = el
            }}
            role={canCreate ? 'application' : undefined}
            aria-label={canCreate ? `${createLabel}: ${d}` : undefined}
            className={cn('relative z-[1] touch-pan-y', canCreate && 'cursor-crosshair')}
            style={{ gridColumn: i + 2, gridRow: `2 / span ${rows}` }}
            onPointerDown={(e) => {
              if (!canCreate || e.button !== 0) return
              const row = rowAt(i, e.clientY)
              if (e.pointerType !== 'touch') e.currentTarget.setPointerCapture(e.pointerId)
              setSel({ col: i, a: row, c: row, moved: false })
            }}
            onPointerMove={(e) => {
              const row = rowAt(i, e.clientY)
              if (sel && sel.col === i) {
                if (e.pointerType !== 'touch' && row !== sel.c) setSel({ ...sel, c: row, moved: sel.moved || row !== sel.a })
              } else if (!sel && canCreate && e.pointerType === 'mouse') setHover({ col: i, row })
            }}
            onPointerUp={(e) => {
              if (!sel || sel.col !== i) return
              const final = { ...sel, c: e.pointerType === 'touch' ? sel.a : rowAt(i, e.clientY) }
              final.moved = final.moved || final.c !== final.a
              setSel(null)
              finish(final)
            }}
            onPointerCancel={() => setSel(null)}
            onPointerLeave={() => setHover((h) => (h?.col === i ? null : h))}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && canCreate) onCreate(d, 9 * 60, 9 * 60 + DEFAULT_CLICK_MIN)
            }}
            tabIndex={canCreate ? 0 : undefined}
          >
            {canCreate && hover?.col === i && !sel && (
              <div className="pointer-events-none absolute inset-x-0 flex items-center gap-1 border-t border-primary/60 bg-primary/10 px-1 text-[10px] font-medium text-primary" style={{ top: hover.row * ROW_PX, height: ROW_PX }}>
                <Plus className="size-3" aria-hidden /> {hhmm(origin + hover.row * SNAP_MIN)}
              </div>
            )}
            {sel && sel.col === i && selRows && (
              <div
                className="pointer-events-none absolute inset-x-0.5 rounded-md border border-primary bg-primary/25 px-1.5 text-[11px] font-semibold text-primary shadow-lg"
                style={{ top: selRows.lo * ROW_PX, height: (selRows.hi - selRows.lo + 1) * ROW_PX }}
              >
                {hhmm(origin + selRows.lo * SNAP_MIN)} – {hhmm(origin + (selRows.hi + 1) * SNAP_MIN)}
              </div>
            )}
          </div>
        ))}

        {/* události z napojených kalendářů: jen ke čtení, nebrání tažení */}
        {days.map((d, i) =>
          (externalByDay?.get(d) ?? []).map((e) => {
            const rowStart = Math.max(0, Math.floor((e.startMin - origin) / SNAP_MIN))
            const rowEnd = Math.min(rows, Math.max(rowStart + 1, Math.ceil((e.endMin - origin) / SNAP_MIN)))
            if (rowEnd <= 0 || rowStart >= rows) return null
            return (
              <div
                key={e.id}
                title={`${e.title ?? externalLabel}${e.source ? ` · ${e.source}` : ''}`}
                className="pointer-events-none z-[2] m-px overflow-hidden rounded-md border border-dashed border-border bg-[repeating-linear-gradient(135deg,transparent,transparent_5px,rgb(127_127_127/0.12)_5px,rgb(127_127_127/0.12)_10px)] px-1.5 py-0.5 text-[10px] leading-tight text-muted-foreground"
                style={{ gridColumn: i + 2, gridRow: `${rowStart + 2} / span ${rowEnd - rowStart}` }}
              >
                {rowEnd - rowStart > 1 && <span className="block truncate">{e.title ?? externalLabel}</span>}
              </div>
            )
          })
        )}

        {/* rezervace */}
        {days.map((d, i) =>
          layoutLanes(
            (byDay.get(d) ?? []).map((b) => {
              const startMin = minutesOfDay(b.starts_at, timezone)
              const endRaw = minutesOfDay(b.ends_at, timezone)
              return { b, startMin, endMin: endRaw <= startMin ? 1440 : endRaw }
            })
          ).map(({ b, startMin, endMin, lane, lanes }) => {
            const rowStart = Math.max(0, Math.floor((startMin - origin) / SNAP_MIN))
            const rowEnd = Math.min(rows, Math.max(rowStart + 1, Math.ceil((endMin - origin) / SNAP_MIN)))
            const span = rowEnd - rowStart
            return (
              <button
                key={b.id}
                type="button"
                onClick={() => onSelectBooking(b.id)}
                onPointerEnter={(e) => e.pointerType === 'mouse' && onHoverBooking?.(b.id, e.currentTarget)}
                onPointerLeave={() => onHoverBooking?.(null)}
                onFocus={(e) => onHoverBooking?.(b.id, e.currentTarget)}
                onBlur={() => onHoverBooking?.(null)}
                className={cn('z-10 m-px overflow-hidden rounded-lg border px-1.5 py-0.5 text-left text-[11px] leading-tight shadow-sm transition-colors', STATUS_STYLES[b.status], selectedId === b.id && 'ring-2 ring-primary')}
                style={{ gridColumn: i + 2, gridRow: `${rowStart + 2} / span ${span}`, width: `calc(${100 / lanes}% - 2px)`, marginLeft: `calc(${(100 / lanes) * lane}% + 1px)` }}
              >
                <span className="block font-semibold tabular-nums">{timeFmt.format(new Date(b.starts_at))}</span>
                {span > 2 && <span className="block truncate">{b.caller_name}</span>}
                {span > 4 && <span className="block truncate opacity-80">{b.title}</span>}
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}
