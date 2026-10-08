'use client'

import { useCallback, useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { CalendarClock, CalendarOff, Loader2, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardIcon, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { toast } from '@/components/ui/toast'
import { SLOT_DURATIONS } from '@/lib/bookings/schema'
import { cn } from '@/lib/utils'

interface Day {
  day_of_week: number
  enabled: boolean
  start_time: string
  end_time: string
  slot_duration_minutes: number
}
interface Block {
  date: string
  start_time: string
  end_time: string
  note: string | null
}
interface Settings {
  bookingEnabled: boolean
  autoConfirm: boolean
  notifyCustomer: boolean
  weekly: Day[]
  blocks: Block[]
}

const ORDER = [1, 2, 3, 4, 5, 6, 0] // od pondělí

/** Záložka Dostupnost: kdy se lze objednat, délka slotu, blokované časy a režim potvrzování. */
export function AvailabilityTab({ agentId }: { agentId: string }) {
  const t = useTranslations('calendar')
  const [data, setData] = useState<Settings | null>(null)
  const [error, setError] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const load = useCallback(() => {
    setError(false)
    fetch(`/api/agents/${agentId}/availability-settings`)
      .then(async (res) => {
        if (!res.ok) throw new Error()
        setData(await res.json())
      })
      .catch(() => setError(true))
  }, [agentId])

  useEffect(() => {
    load()
  }, [load])

  if (error) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-sm text-destructive">{t('av.loadFailed')}</p>
        <Button variant="outline" onClick={load}>
          {t('av.retry')}
        </Button>
      </div>
    )
  }
  if (!data) return <Skeleton className="h-80 rounded-2xl" />

  const patchDay = (day: number, p: Partial<Day>) => setData({ ...data, weekly: data.weekly.map((d) => (d.day_of_week === day ? { ...d, ...p } : d)) })
  const patchBlock = (i: number, p: Partial<Block>) => setData({ ...data, blocks: data.blocks.map((b, idx) => (idx === i ? { ...b, ...p } : b)) })

  async function save() {
    if (!data) return
    if (data.weekly.some((d) => d.enabled && d.start_time >= d.end_time) || data.blocks.some((b) => b.start_time >= b.end_time)) {
      setFormError(t('av.invalidRange'))
      return
    }
    setFormError(null)
    setSaving(true)
    try {
      const res = await fetch(`/api/agents/${agentId}/availability-settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, blocks: data.blocks.map((b) => ({ ...b, note: b.note || null })) }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(t('av.saveFailed'))
      toast.add(body.sync?.ok ? { type: 'success', title: t('av.saved') } : { type: 'warning', title: t('av.saved'), description: t('av.savedSyncFailed') })
    } catch (e) {
      toast.add({ type: 'error', title: t('av.saveFailed'), description: e instanceof Error ? e.message : undefined })
    } finally {
      setSaving(false)
    }
  }

  const today = new Date().toISOString().slice(0, 10)

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <CardIcon icon={CalendarClock} />
            {t('av.title')}
          </CardTitle>
          <CardDescription>{t('av.description')}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-muted/40 p-4">
            <div className="flex flex-col gap-1">
              <Label htmlFor="av-enabled" className="text-sm font-medium">{t('av.enable')}</Label>
              <p className="text-xs text-muted-foreground">{t('av.enableHint')}</p>
            </div>
            <Switch id="av-enabled" checked={data.bookingEnabled} onCheckedChange={(v) => setData({ ...data, bookingEnabled: v })} />
          </div>
          <div className={cn('flex items-center justify-between gap-4 rounded-xl border border-border bg-muted/40 p-4 transition-opacity', !data.bookingEnabled && 'opacity-60')}>
            <div className="flex flex-col gap-1">
              <Label htmlFor="av-auto" className="text-sm font-medium">{t('av.autoConfirm')}</Label>
              <p className="text-xs text-muted-foreground">{t('av.autoConfirmHint')}</p>
            </div>
            <Switch id="av-auto" checked={data.autoConfirm} disabled={!data.bookingEnabled} onCheckedChange={(v) => setData({ ...data, autoConfirm: v })} />
          </div>
          <div className={cn('flex items-center justify-between gap-4 rounded-xl border border-border bg-muted/40 p-4 transition-opacity', !data.bookingEnabled && 'opacity-60')}>
            <div className="flex flex-col gap-1">
              <Label htmlFor="av-notify" className="text-sm font-medium">{t('av.notifyCustomer')}</Label>
              <p className="text-xs text-muted-foreground">{t('av.notifyCustomerHint')}</p>
            </div>
            <Switch id="av-notify" checked={data.notifyCustomer} disabled={!data.bookingEnabled} onCheckedChange={(v) => setData({ ...data, notifyCustomer: v })} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('av.weekly')}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {ORDER.map((day) => {
            const d = data.weekly.find((x) => x.day_of_week === day)!
            const name = t(`av.days.${day}`)
            return (
              <div key={day} className={cn('flex flex-wrap items-center gap-3 rounded-xl border border-border px-4 py-2.5 transition-colors', d.enabled ? 'bg-muted/40' : 'opacity-70')}>
                <span className="w-24 text-sm font-medium">{name}</span>
                <Switch checked={d.enabled} onCheckedChange={(v) => patchDay(day, { enabled: v })} aria-label={`${name}: ${t('av.open')}`} />
                {d.enabled ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <Input type="time" className="w-28" value={d.start_time} onChange={(e) => patchDay(day, { start_time: e.target.value })} aria-label={`${name} – ${t('startTime')}`} />
                    <span>–</span>
                    <Input type="time" className="w-28" value={d.end_time} onChange={(e) => patchDay(day, { end_time: e.target.value })} aria-label={`${name} – ${t('endTime')}`} />
                    <select
                      value={d.slot_duration_minutes}
                      onChange={(e) => patchDay(day, { slot_duration_minutes: Number(e.target.value) })}
                      aria-label={`${name} – ${t('av.slotLength')}`}
                      className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm dark:bg-white/5"
                    >
                      {SLOT_DURATIONS.map((m) => (
                        <option key={m} value={m}>
                          {t('minutes', { count: m })}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">{t('av.closed')}</span>
                )}
              </div>
            )
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <CardIcon icon={CalendarOff} />
            {t('av.blocks')}
          </CardTitle>
          <CardDescription>{t('av.blocksHint')}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {data.blocks.length === 0 && <p className="text-sm text-muted-foreground">{t('av.noBlocks')}</p>}
          {data.blocks.map((b, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-muted/40 p-3">
              <Input type="date" className="w-40" min={today} value={b.date} onChange={(e) => patchBlock(i, { date: e.target.value })} aria-label={t('date')} />
              <Input type="time" className="w-28" value={b.start_time} onChange={(e) => patchBlock(i, { start_time: e.target.value })} aria-label={t('startTime')} />
              <span>–</span>
              <Input type="time" className="w-28" value={b.end_time} onChange={(e) => patchBlock(i, { end_time: e.target.value })} aria-label={t('endTime')} />
              <Input className="min-w-40 flex-1" maxLength={200} placeholder={t('av.blockNote')} value={b.note ?? ''} onChange={(e) => patchBlock(i, { note: e.target.value })} aria-label={t('notes')} />
              <Button type="button" variant="ghost" size="icon" aria-label={t('av.remove')} onClick={() => setData({ ...data, blocks: data.blocks.filter((_, idx) => idx !== i) })}>
                <Trash2 />
              </Button>
            </div>
          ))}
          <div>
            <Button type="button" variant="outline" onClick={() => setData({ ...data, blocks: [...data.blocks, { date: today, start_time: '09:00', end_time: '17:00', note: null }] })} disabled={data.blocks.length >= 200}>
              <Plus /> {t('av.addBlock')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {formError && <p className="text-sm text-destructive">{formError}</p>}
      <div>
        <Button onClick={save} disabled={saving}>
          {saving && <Loader2 className="animate-spin" />} {t('save')}
        </Button>
      </div>
    </div>
  )
}
