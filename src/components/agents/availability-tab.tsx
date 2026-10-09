'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { CalendarClock, CalendarOff, LayoutGrid, Loader2, Pencil, Plus, Trash2, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardIcon, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { toast } from '@/components/ui/toast'
import { useBookingSettings } from '@/hooks/use-bookings'
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
  bookingMode: 'capacity' | 'resource'
  capacity: number
  advanceDays: number
  weekly: Day[]
  blocks: Block[]
}

const ORDER = [1, 2, 3, 4, 5, 6, 0] // od pondělí
const ADVANCE = [7, 14, 30, 60, 90]

/** Záložka Dostupnost: kdy se lze objednat, délka slotu, blokované časy a režim potvrzování. */
export function AvailabilityTab({ agentId }: { agentId: string }) {
  const t = useTranslations('calendar')
  const settings = useBookingSettings(agentId)
  const { error } = settings
  const data = settings.data as Settings | null
  const setData = settings.setData as React.Dispatch<React.SetStateAction<Settings | null>>
  const load = settings.reload
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

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
      const body = await settings.save(data)
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

      {data.bookingEnabled && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>{t('av.mode')}</CardTitle>
              <CardDescription>{t('av.modeHint')}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-5">
              <div role="radiogroup" aria-label={t('av.mode')} className="grid gap-3 sm:grid-cols-2">
                {([['capacity', Users], ['resource', LayoutGrid]] as const).map(([m, Icon]) => (
                  <button
                    key={m}
                    type="button"
                    role="radio"
                    aria-checked={data.bookingMode === m}
                    onClick={() => setData({ ...data, bookingMode: m })}
                    className={cn('flex items-start gap-3 rounded-xl border p-4 text-left transition-colors', data.bookingMode === m ? 'border-primary/50 bg-primary/10 ring-1 ring-primary/30' : 'border-border bg-muted/40 hover:bg-muted')}
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/12 text-primary ring-1 ring-primary/20" aria-hidden>
                      <Icon className="size-4.5" strokeWidth={1.75} />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold">{t(`av.mode_${m}`)}</span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">{t(`av.mode_${m}_hint`)}</span>
                    </span>
                  </button>
                ))}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="av-slot-all">{t('av.slotAll')}</Label>
                  <select
                    id="av-slot-all"
                    value=""
                    onChange={(e) => {
                      const m = Number(e.target.value)
                      if (m) setData({ ...data, weekly: data.weekly.map((d) => ({ ...d, slot_duration_minutes: m })) })
                    }}
                    className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm dark:bg-white/5"
                  >
                    <option value="">{t('av.slotAllPick')}</option>
                    {SLOT_DURATIONS.map((m) => (
                      <option key={m} value={m}>
                        {t('minutes', { count: m })}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="av-advance">{t('av.advance')}</Label>
                  <select id="av-advance" value={data.advanceDays} onChange={(e) => setData({ ...data, advanceDays: Number(e.target.value) })} className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm dark:bg-white/5">
                    {(ADVANCE.includes(data.advanceDays) ? ADVANCE : [...ADVANCE, data.advanceDays].sort((a, b) => a - b)).map((d) => (
                      <option key={d} value={d}>
                        {t('av.advanceDays', { count: d })}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-muted-foreground">{t('av.advanceHint')}</p>
                </div>
              </div>

              {data.bookingMode === 'capacity' && <CapacityPanel capacity={data.capacity} onChange={(capacity) => setData({ ...data, capacity })} />}
            </CardContent>
          </Card>
        </>
      )}

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

/** Kapacitní režim: kolik míst je k dispozici na jeden čas (např. 20 míst v restauraci). */
function CapacityPanel({ capacity, onChange }: { capacity: number; onChange: (n: number) => void }) {
  const t = useTranslations('calendar')
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(String(capacity))
  const value = Math.round(Number(draft))
  const valid = Number.isFinite(value) && value >= 1 && value <= 1000

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-muted/40 p-4">
      <div>
        <p className="text-xs text-muted-foreground">{t('av.capacityTitle')}</p>
        <p className="text-2xl font-semibold tabular-nums tracking-tight">{t('av.capacityTotal', { count: capacity })}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{t('av.capacityHint')}</p>
      </div>
      <Button
        type="button"
        variant="outline"
        onClick={() => {
          setDraft(String(capacity))
          setOpen(true)
        }}
      >
        <Pencil /> {t('av.capacityEdit')}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('av.capacityEdit')}</DialogTitle>
            <DialogDescription>{t('av.capacityHelp')}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cap-input">{t('av.capacityTitle')}</Label>
            <Input id="cap-input" type="number" inputMode="numeric" min={1} max={1000} value={draft} onChange={(e) => setDraft(e.target.value)} autoFocus />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {t('close')}
            </Button>
            <Button
              type="button"
              disabled={!valid}
              onClick={() => {
                onChange(value)
                setOpen(false)
              }}
            >
              {t('save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
