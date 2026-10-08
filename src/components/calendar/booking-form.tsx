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
import { zonedToUtc } from '@/lib/bookings/time'

const DURATIONS = [15, 30, 45, 60, 90, 120]

/** Ruční přidání rezervace (např. telefonát na pobočku). Rezervace z dashboardu je rovnou potvrzená. */
export function BookingForm({
  open,
  onOpenChange,
  agents,
  defaultAgentId,
  defaultDate,
  defaultTime = '09:00',
  defaultDuration = 30,
  timezone,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  agents: { id: string; name: string }[]
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
    setError(null)
  }, [open, defaultAgentId, defaultDate, defaultTime, defaultDuration])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!agentId) return
    setSaving(true)
    setError(null)
    try {
      const start = zonedToUtc(date, time, timezone)
      const res = await fetch(`/api/agents/${agentId}/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caller_name: name,
          caller_phone: phone || null,
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
              <select id="bf-agent" value={agentId} onChange={(e) => setAgentId(e.target.value)} className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm dark:bg-white/5">
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
              <Input id="bf-phone" type="tel" maxLength={40} value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
          </div>
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
