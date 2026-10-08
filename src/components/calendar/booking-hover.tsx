'use client'

import { useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLocale, useTranslations } from 'next-intl'
import { Bot, Clock, Phone, Sparkles, StickyNote, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Booking } from '@/types'
import { STATUS_DOT } from './booking-utils'

const GAP = 10
const MARGIN = 8

export interface HoverTarget {
  id: string
  rect: DOMRect
}

/** Vznášející se karta se všemi údaji rezervace při najetí myší (nezachytává kliknutí, kliknutí otevře detail). */
export function BookingHoverCard({ booking, anchor, agentName, timezone }: { booking: Booking; anchor: DOMRect; agentName: string; timezone: string }) {
  const t = useTranslations('calendar')
  const locale = useLocale()
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null)

  // Po vykreslení se změří a umístí: vpravo od karty, při nedostatku místa vlevo; svisle se drží uvnitř okna.
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const w = el.offsetWidth
    const h = el.offsetHeight
    const vw = window.innerWidth
    const vh = window.innerHeight
    let left = anchor.right + GAP
    if (left + w > vw - MARGIN) left = anchor.left - GAP - w
    if (left < MARGIN) left = Math.max(MARGIN, Math.min(vw - w - MARGIN, anchor.left))
    let top = anchor.top
    if (top + h > vh - MARGIN) top = vh - h - MARGIN
    setPos({ left, top: Math.max(MARGIN, top) })
  }, [anchor, booking.id])

  const start = new Date(booking.starts_at)
  const end = new Date(booking.ends_at)
  const day = new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long', timeZone: timezone }).format(start)
  const clock = new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit', timeZone: timezone })
  const minutes = Math.round((end.getTime() - start.getTime()) / 60_000)

  const row = (Icon: typeof User, content: React.ReactNode) => (
    <div className="flex items-start gap-2.5 text-xs">
      <Icon className="mt-0.5 size-3.5 shrink-0 text-primary" strokeWidth={1.75} aria-hidden />
      <div className="min-w-0 break-words">{content}</div>
    </div>
  )

  return createPortal(
    <div
      ref={ref}
      role="tooltip"
      className={cn('pointer-events-none fixed z-[60] flex w-72 flex-col gap-2.5 rounded-xl border border-border bg-popover p-3.5 text-popover-foreground shadow-2xl ring-1 ring-foreground/5 transition-opacity duration-100', pos ? 'opacity-100' : 'opacity-0')}
      style={{ left: pos?.left ?? anchor.right + GAP, top: pos?.top ?? anchor.top }}
    >
      <div className="flex items-center gap-2 text-[11px] font-medium text-muted-foreground">
        <span className={cn('size-2 rounded-full', STATUS_DOT[booking.status])} aria-hidden />
        {t(`status.${booking.status}`)}
      </div>
      <p className="text-sm font-semibold leading-snug tracking-tight">{booking.title}</p>
      <div className="flex flex-col gap-1.5 border-t border-border pt-2.5">
        {row(
          Clock,
          <span className="capitalize">
            {day}, {clock.format(start)} – {clock.format(end)} <span className="normal-case text-muted-foreground">({t('minutes', { count: minutes })})</span>
          </span>
        )}
        {row(User, booking.caller_name)}
        {booking.caller_phone && row(Phone, booking.caller_phone)}
        {row(Bot, agentName)}
        {booking.notes && row(StickyNote, <span className="line-clamp-4 whitespace-pre-line">{booking.notes}</span>)}
        {booking.call_log_id && row(Sparkles, t('bookedByAi'))}
      </div>
    </div>,
    document.body
  )
}
