'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/components/ui/toast'
import { useAvailability } from '@/hooks/use-bookings'
import { isValidPhone, sanitizePhoneInput } from '@/lib/bookings/phone'
import { cn } from '@/lib/utils'
import type { BookingResource } from '@/types'
import { zonedToUtc } from '@/lib/bookings/time'

const DURATIONS = [15, 30, 45, 60, 90, 120]

/** Ruční přidání rezervace (např. telefonát na pobočku). Rezervace z dashboardu je rovnou potvrzená. */
export function BookingForm({
  open,
  onOpenChange,
  agents,
  resources = {},
  defaultAgentId,
  defaultDate,
  defaultTime = '09:00',
  defaultDuration = 30,
  timezone,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  agents: { id: string; name: string; mode?: 'capacity' | 'resource' }[]
  resources?: Record<string, BookingResource[]>
  defaultAgentId: string
  defaultDate: string
  defaultTime?: string
  defaultDuration?: number
  timezone: string
  onCreated: () => void
}) {
  const t = useTranslations('calendar')
  const [agentId, setAgentId] = useState(defaultAgentId)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [date, setDate] = useState(defaultDate)
  const [time, setTime] = useState('09:00')
  const [duration, setDuration] = useState(30)
  const [party, setParty] = useState('1')
  const [email, setEmail] = useState('')
  const [resourceId, setResourceId] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Při otevření se předvyplní datum a agent a smažou se zbytky předchozího zadání.
  useEffect(() => {
    if (!open) return
    setAgentId(defaultAgentId)
    setDate(defaultDate)
    setTime(defaultTime)
    setDuration(defaultDuration)
    setName('')
    setPhone('')
    setTitle('')
    setNotes('')
    setParty('1')
    setEmail('')
    setResourceId('')
    setError(null)
  }, [open, defaultAgentId, defaultDate, defaultTime, defaultDuration])

  const agent = agents.find((a) => a.id === agentId)
  const agentMode = agent?.mode ?? 'capacity'
  const agentResources = (resources[agentId] ?? []).filter((r) => r.is_active)
  const people = Math.max(1, Math.round(Number(party)) || 1)
  const free = useAvailability(open && agentId ? agentId : null, open ? date : null, people)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!agentId) return
    if (phone.trim() && !isValidPhone(phone)) {
      setError(t('invalidPhone'))
      return
    }
    setSaving(true)
    setError(null)
    try {
      const start = zonedToUtc(date, time, timezone)
      const people = Math.max(1, Math.min(1000, Math.round(Number(party)) || 1))
      const res = await fetch(`/api/agents/${agentId}/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caller_name: name,
          caller_phone: phone || null,
          customer_email: email.trim() || null,
          party_size: people,
          resource_id: agentMode === 'resource' && resourceId ? resourceId : null,
          title,
          notes: notes || null,
          starts_at: start.toISOString(),
          ends_at: new Date(start.getTime() + duration * 60_000).toISOString(),
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.code === 'conflict' ? t('conflict') : t('saveFailed'))
      onCreated()
    } catch (err) {
      const message = err instanceof Error ? err.message : t('saveFailed')
      setError(message)
      toast.add({ type: 'error', title: t('saveFailed'), description: message })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('createTitle')}</DialogTitle>
          <DialogDescription>{t('bookedManually')}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-3">
          {agents.length > 1 && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="bf-agent">{t('agent')}</Label>
              <select id="bf-agent" value={agentId} onChange={(e) => {
                  setAgentId(e.target.value)
                  setResourceId("")
                }} className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm dark:bg-white/5">
                {agents.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="bf-name">{t('name')}</Label>
              <Input id="bf-name" required maxLength={120} value={name} onChange={(e) => setName(e.target.value)} autoFocus />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="bf-phone">{t('phone')}</Label>
              <Input id="bf-phone" type="tel" inputMode="tel" autoComplete="tel" maxLength={40} placeholder="+420 777 123 456" aria-invalid={!!phone.trim() && !isValidPhone(phone)} value={phone} onChange={(e) => setPhone(sanitizePhoneInput(e.target.value))} />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="bf-email">{t('email')}</Label>
              <Input id="bf-email" type="email" maxLength={200} value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="bf-party">{t('partySize')}</Label>
              <Input id="bf-party" type="number" inputMode="numeric" min={1} max={1000} value={party} onChange={(e) => setParty(e.target.value)} />
            </div>
          </div>
          {agentMode === 'resource' && agentResources.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="bf-resource">{t('resource')}</Label>
              <select id="bf-resource" value={resourceId} onChange={(e) => setResourceId(e.target.value)} className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm dark:bg-white/5">
                <option value="">{t('resourceAny')}</option>
                {agentResources.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.capacity})
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="bf-title">{t('reason')}</Label>
            <Input id="bf-title" required maxLength={200} value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-3 flex flex-col gap-1.5 sm:col-span-1">
              <Label htmlFor="bf-date">{t('date')}</Label>
              <Input id="bf-date" type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="bf-time">{t('startTime')}</Label>
              <Input id="bf-time" type="time" step={900} required value={time} onChange={(e) => setTime(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="bf-dur">{t('duration')}</Label>
              <select id="bf-dur" value={duration} onChange={(e) => setDuration(Number(e.target.value))} className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm dark:bg-white/5">
                {(DURATIONS.includes(duration) ? DURATIONS : [...DURATIONS, duration].sort((x, y) => x - y)).map((d) => (
                  <option key={d} value={d}>
                    {t('minutes', { count: d })}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {free.slots.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">{t('freeTimes')} <span className="font-normal">· {t('freeTimesPick')}</span></span>
              <div className="flex max-h-20 flex-wrap gap-1.5 overflow-y-auto">
                {free.slots.slice(0, 40).map((s) => (
                  <button
                    key={s.starts_at}
                    type="button"
                    onClick={() => {
                      setTime(s.time)
                      setDuration(Math.round((new Date(s.ends_at).getTime() - new Date(s.starts_at).getTime()) / 60_000))
                      if (agentMode === 'resource' && s.resources?.length && !s.resources.some((r) => r.id === resourceId)) setResourceId('')
                    }}
                    className={cn('rounded-md border px-2 py-0.5 text-xs font-medium tabular-nums transition-colors', time === s.time ? 'border-primary/50 bg-primary/15' : 'border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20')}
                    title={s.remaining !== undefined ? `${s.remaining}` : s.resources?.map((r) => r.name).join(', ')}
                  >
                    {s.time}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="bf-notes">{t('notes')}</Label>
            <Textarea id="bf-notes" rows={2} maxLength={2000} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              {t('close')}
            </Button>
            <Button type="submit" disabled={saving || !agentId}>
              {saving && <Loader2 className="animate-spin" />} {t('save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
