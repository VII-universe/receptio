'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useLocale, useTranslations } from 'next-intl'
import { Armchair, Bot, Check, Clock, Copy, Loader2, Mail, Pencil, Phone, Sparkles, StickyNote, Trash2, User, UserX, Users, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/components/ui/toast'
import { isValidPhone, sanitizePhoneInput } from '@/lib/bookings/phone'
import { addDays, fromMinutes, localDate, localTime, toMinutes, zonedToUtc } from '@/lib/bookings/time'
import { cn } from '@/lib/utils'
import type { Booking, BookingResource, BookingStatus } from '@/types'
import { STATUS_DOT } from './booking-utils'

const STATUSES: BookingStatus[] = ['pending', 'confirmed', 'no_show', 'cancelled']
const DURATIONS = [15, 30, 45, 60, 90, 120]

/** Detail rezervace v panelu zprava: rychlé akce a plná úprava všech údajů (jméno, telefon, důvod, poznámky, čas, délka, agent, stav). */
export function BookingDetail({
  booking,
  agents,
  resources,
  timezone,
  onChanged,
  onClose,
}: {
  booking: Booking
  agents: { id: string; name: string }[]
  resources: BookingResource[]
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
  const agentName = agents.find((a) => a.id === booking.agent_id)?.name ?? '–'

  const initial = () => ({
    name: booking.caller_name,
    phone: booking.caller_phone ?? '',
    title: booking.title,
    notes: booking.notes ?? '',
    date: localDate(start, timezone),
    from: localTime(start, timezone),
    to: localTime(end, timezone),
    agentId: booking.agent_id,
    status: booking.status,
    party: String(booking.party_size ?? 1),
    email: booking.customer_email ?? '',
    resourceId: booking.resource_id ?? '',
  })
  const [f, setF] = useState(initial)
  const set = <K extends keyof ReturnType<typeof initial>>(k: K, v: ReturnType<typeof initial>[K]) => setF((x) => ({ ...x, [k]: v }))

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
      return true
    } catch (e) {
      toast.add({ type: 'error', title: t('saveFailed'), description: e instanceof Error ? e.message : undefined })
      return false
    } finally {
      setBusy(false)
    }
  }

  async function saveAll() {
    if (toMinutes(f.to) <= toMinutes(f.from)) return toast.add({ type: 'error', title: t('timeInvalid') })
    if (f.phone.trim() && !isValidPhone(f.phone)) return toast.add({ type: 'error', title: t('invalidPhone') })
    await patch(
      {
        caller_name: f.name.trim(),
        caller_phone: f.phone.trim() || null,
        title: f.title.trim(),
        notes: f.notes.trim() || null,
        starts_at: zonedToUtc(f.date, f.from, timezone).toISOString(),
        ends_at: zonedToUtc(f.date, f.to, timezone).toISOString(),
        agent_id: f.agentId,
        status: f.status,
        party_size: Math.max(1, Math.min(1000, Math.round(Number(f.party)) || 1)),
        customer_email: f.email.trim() || null,
        resource_id: f.agentId === booking.agent_id ? f.resourceId || null : null,
      },
      t('saved')
    )
  }

  async function duplicate() {
    setBusy(true)
    try {
      const shift = (iso: string) => zonedToUtc(addDays(localDate(new Date(iso), timezone), 7), localTime(new Date(iso), timezone), timezone).toISOString()
      const res = await fetch(`/api/agents/${booking.agent_id}/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caller_name: booking.caller_name,
          caller_phone: booking.caller_phone,
          customer_email: booking.customer_email ?? null,
          party_size: booking.party_size ?? 1,
          resource_id: booking.resource_id ?? null,
          title: booking.title,
          notes: booking.notes,
          starts_at: shift(booking.starts_at),
          ends_at: shift(booking.ends_at),
          status: booking.status === 'cancelled' || booking.status === 'no_show' ? 'confirmed' : booking.status,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.code === 'conflict' ? t('conflict') : t('saveFailed'))
      onChanged(null, t('duplicated'))
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

  const statusControl = (value: BookingStatus, onPick: (s: BookingStatus) => void) => (
    <div role="group" aria-label={t('status_label')} className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-0.5 sm:grid-cols-4">
      {STATUSES.map((s) => (
        <button
          key={s}
          type="button"
          aria-pressed={value === s}
          disabled={busy}
          onClick={() => onPick(s)}
          className={cn('flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition-colors', value === s ? 'bg-background shadow-sm ring-1 ring-primary/30' : 'text-muted-foreground hover:text-foreground')}
        >
          <span className={cn('size-1.5 rounded-full', STATUS_DOT[s])} aria-hidden />
          {t(`status.${s}`)}
        </button>
      ))}
    </div>
  )

  if (editing) {
    return (
      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault()
          void saveAll()
        }}
      >
        <p className="text-sm font-medium">{t('editTitle')}</p>
        <div className="flex flex-col gap-1.5">
          <Label>{t('status_label')}</Label>
          {statusControl(f.status, (s) => set('status', s))}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="bd-name">{t('name')}</Label>
            <Input id="bd-name" required maxLength={120} value={f.name} onChange={(e) => set('name', e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="bd-phone">{t('phone')}</Label>
            <Input id="bd-phone" type="tel" inputMode="tel" autoComplete="tel" maxLength={40} placeholder="+420 777 123 456" aria-invalid={!!f.phone.trim() && !isValidPhone(f.phone)} value={f.phone} onChange={(e) => set('phone', sanitizePhoneInput(e.target.value))} />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="bd-party">{t('partySize')}</Label>
            <Input id="bd-party" type="number" inputMode="numeric" min={1} max={1000} value={f.party} onChange={(e) => set('party', e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="bd-email">{t('email')}</Label>
            <Input id="bd-email" type="email" maxLength={200} value={f.email} onChange={(e) => set('email', e.target.value)} />
          </div>
        </div>
        {resources.length > 0 && f.agentId === booking.agent_id && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="bd-resource">{t('resource')}</Label>
            <select id="bd-resource" value={f.resourceId} onChange={(e) => set('resourceId', e.target.value)} className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm dark:bg-white/5">
              <option value="">–</option>
              {resources.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({r.capacity})
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="bd-title">{t('reason')}</Label>
          <Input id="bd-title" required maxLength={200} value={f.title} onChange={(e) => set('title', e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="bd-date">{t('date')}</Label>
          <Input id="bd-date" type="date" required value={f.date} onChange={(e) => set('date', e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="bd-from">{t('startTime')}</Label>
            <Input id="bd-from" type="time" step={900} required value={f.from} onChange={(e) => set('from', e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="bd-to">{t('endTime')}</Label>
            <Input id="bd-to" type="time" step={900} required value={f.to} onChange={(e) => set('to', e.target.value)} />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>{t('quickDuration')}</Label>
          <div className="flex flex-wrap gap-1.5">
            {DURATIONS.map((d) => {
              const current = toMinutes(f.to) - toMinutes(f.from)
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => set('to', fromMinutes(Math.min(24 * 60 - 1, toMinutes(f.from) + d)))}
                  className={cn('rounded-full border px-3 py-1 text-xs font-medium transition-colors', current === d ? 'border-primary/40 bg-primary/15' : 'border-border hover:bg-muted')}
                >
                  {t('minutes', { count: d })}
                </button>
              )
            })}
          </div>
        </div>
        {agents.length > 1 && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="bd-agent">{t('moveToAgent')}</Label>
            <select id="bd-agent" value={f.agentId} onChange={(e) => set('agentId', e.target.value)} className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm dark:bg-white/5">
              {agents.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="bd-notes">{t('notes')}</Label>
          <Textarea id="bd-notes" rows={3} maxLength={2000} value={f.notes} onChange={(e) => set('notes', e.target.value)} />
        </div>
        <div className="flex gap-2">
          <Button type="submit" disabled={busy}>
            {busy && <Loader2 className="animate-spin" />} {t('saveChanges')}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => {
              setF(initial())
              setEditing(false)
            }}
          >
            {t('cancelEdit')}
          </Button>
        </div>
      </form>
    )
  }

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

      <div className="flex flex-col gap-1.5">
        <Label>{t('status_label')}</Label>
        {statusControl(booking.status, (s) => s !== booking.status && void patch({ status: s }, t('saved')))}
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-border bg-muted/40 p-4">
        {row(User, booking.caller_name)}
        {booking.caller_phone && row(Phone, <a href={`tel:${booking.caller_phone}`} className="hover:underline">{booking.caller_phone}</a>)}
        {booking.customer_email && row(Mail, <a href={`mailto:${booking.customer_email}`} className="hover:underline">{booking.customer_email}</a>)}
        {(booking.party_size ?? 1) > 1 && row(Users, t('people', { count: booking.party_size ?? 1 }))}
        {booking.resource_id && row(Armchair, resources.find((r) => r.id === booking.resource_id)?.name ?? t('resource'))}
        {row(Bot, agentName)}
        {booking.source && row(Sparkles, t(`source.${booking.source}`))}
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

      <div className="flex flex-wrap gap-2">
        <Button
          disabled={busy}
          onClick={() => {
            setF(initial()) // čerstvé hodnoty (stav mohl být mezitím změněn rychlou akcí)
            setEditing(true)
          }}
        >
          <Pencil /> {t('edit')}
        </Button>
        {booking.status !== 'confirmed' && (
          <Button variant="outline" disabled={busy} onClick={() => patch({ status: 'confirmed' }, t('saved'))}>
            <Check /> {t('confirm')}
          </Button>
        )}
        {booking.status === 'confirmed' && new Date(booking.starts_at) < new Date() && (
          <Button variant="outline" disabled={busy} onClick={() => patch({ status: 'no_show' }, t('saved'))}>
            <UserX /> {t('markNoShow')}
          </Button>
        )}
        {booking.status !== 'cancelled' && booking.status !== 'no_show' && (
          <Button variant="outline" disabled={busy} onClick={() => patch({ status: 'cancelled' }, t('saved'))}>
            <X /> {t('cancelBooking')}
          </Button>
        )}
        <Button variant="outline" disabled={busy} onClick={duplicate}>
          {busy ? <Loader2 className="animate-spin" /> : <Copy />} {t('duplicate')}
        </Button>
      </div>

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
