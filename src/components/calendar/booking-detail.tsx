'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useLocale, useTranslations } from 'next-intl'
import { Bot, Check, Clock, Loader2, Phone, StickyNote, Trash2, User, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from '@/components/ui/toast'
import { localDate, localTime, zonedToUtc } from '@/lib/bookings/time'
import { cn } from '@/lib/utils'
import type { Booking } from '@/types'
import { STATUS_DOT } from './booking-utils'

/** Detail rezervace v panelu zprava: údaje, potvrzení / zrušení, změna času a smazání. */
export function BookingDetail({
  booking,
  agentName,
  timezone,
  onChanged,
  onClose,
}: {
  booking: Booking
  agentName: string
  timezone: string
  onChanged: (b: Booking | null, message?: string) => void
  onClose: () => void
}) {
  const t = useTranslations('calendar')
  const locale = useLocale()
  const [busy, setBusy] = useState(false)
  const [editing, setEditing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const start = new Date(booking.starts_at)
  const end = new Date(booking.ends_at)
  const [date, setDate] = useState(localDate(start, timezone))
  const [from, setFrom] = useState(localTime(start, timezone))
  const [to, setTo] = useState(localTime(end, timezone))

  const when = new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long', timeZone: timezone }).format(start)
  const clock = new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit', timeZone: timezone })

  async function patch(body: Record<string, unknown>, message: string) {
    setBusy(true)
    try {
      const res = await fetch(`/api/bookings/${booking.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.code === 'conflict' ? t('conflict') : (data.error ?? t('saveFailed')))
      setEditing(false)
      onChanged(data.booking, message)
    } catch (e) {
      toast.add({ type: 'error', title: t('saveFailed'), description: e instanceof Error ? e.message : undefined })
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    setBusy(true)
    try {
      const res = await fetch(`/api/bookings/${booking.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      onClose()
      onChanged(null, t('deleted'))
    } catch {
      toast.add({ type: 'error', title: t('saveFailed') })
      setBusy(false)
    }
  }

  const row = (Icon: typeof User, content: React.ReactNode) => (
    <div className="flex items-start gap-3 text-sm">
      <Icon className="mt-0.5 size-4 shrink-0 text-primary" strokeWidth={1.75} aria-hidden />
      <div className="min-w-0 break-words">{content}</div>
    </div>
  )

  return (
    <div className="flex flex-col gap-5">
      <div>
        <div className="mb-2 flex items-center gap-2">
          <Badge variant="outline" className="gap-1.5">
            <span className={cn('size-1.5 rounded-full', STATUS_DOT[booking.status])} aria-hidden />
            {t(`status.${booking.status}`)}
          </Badge>
        </div>
        <p className="text-lg font-semibold tracking-tight">{booking.title}</p>
        <p className="mt-1 text-sm capitalize text-muted-foreground">
          {when}, {clock.format(start)} – {clock.format(end)}
        </p>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-border bg-muted/40 p-4">
        {row(User, booking.caller_name)}
        {booking.caller_phone && row(Phone, <a href={`tel:${booking.caller_phone}`} className="hover:underline">{booking.caller_phone}</a>)}
        {row(Bot, agentName)}
        {booking.notes && row(StickyNote, <span className="whitespace-pre-line">{booking.notes}</span>)}
        {booking.call_log_id && (
          <div className="flex items-center gap-3 text-sm">
            <Clock className="size-4 shrink-0 text-primary" aria-hidden />
            <span className="text-muted-foreground">{t('bookedByAi')}</span>
            <Link href={`/dashboard/calls/${booking.call_log_id}`} className="font-medium text-primary hover:underline">
              {t('viewCall')}
            </Link>
          </div>
        )}
      </div>

      {editing ? (
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault()
            const s = zonedToUtc(date, from, timezone)
            const en = zonedToUtc(date, to, timezone)
            void patch({ starts_at: s.toISOString(), ends_at: en.toISOString() }, t('saved'))
          }}
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="bd-date">{t('date')}</Label>
            <Input id="bd-date" type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="bd-from">{t('startTime')}</Label>
              <Input id="bd-from" type="time" required value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="bd-to">{t('endTime')}</Label>
              <Input id="bd-to" type="time" required value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={busy || to <= from}>
              {busy && <Loader2 className="animate-spin" />} {t('save')}
            </Button>
            <Button type="button" variant="outline" onClick={() => setEditing(false)} disabled={busy}>
              {t('close')}
            </Button>
          </div>
        </form>
      ) : (
        <div className="flex flex-wrap gap-2">
          {booking.status !== 'confirmed' && (
            <Button disabled={busy} onClick={() => patch({ status: 'confirmed' }, t('saved'))}>
              <Check /> {t('confirm')}
            </Button>
          )}
          {booking.status !== 'cancelled' && (
            <Button variant="outline" disabled={busy} onClick={() => patch({ status: 'cancelled' }, t('saved'))}>
              <X /> {t('cancelBooking')}
            </Button>
          )}
          <Button variant="outline" disabled={busy} onClick={() => setEditing(true)}>
            <Clock /> {t('edit')}
          </Button>
        </div>
      )}

      <div className="mt-auto border-t border-border pt-4">
        {confirmDelete ? (
          <div className="flex flex-col gap-2">
            <p className="text-sm text-muted-foreground">{t('deleteConfirm')}</p>
            <div className="flex gap-2">
              <Button variant="destructive" disabled={busy} onClick={remove}>
                {busy && <Loader2 className="animate-spin" />} {t('delete')}
              </Button>
              <Button variant="outline" disabled={busy} onClick={() => setConfirmDelete(false)}>
                {t('close')}
              </Button>
            </div>
          </div>
        ) : (
          <Button variant="ghost" className="text-destructive" onClick={() => setConfirmDelete(true)}>
            <Trash2 /> {t('delete')}
          </Button>
        )}
      </div>
    </div>
  )
}
