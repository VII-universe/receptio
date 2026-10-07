'use client'

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/components/ui/toast'
import { DAY_ORDER, MAX_OUTSIDE_MESSAGE, TIMEZONES } from '@/lib/agents/working-hours'
import type { WorkingHour } from '@/types'

function WorkingHoursEditor({
  agentId,
  initialHours,
  initialTimezone,
  initialMessage,
  vapiLinked,
}: {
  agentId: string
  initialHours: WorkingHour[]
  initialTimezone: string
  initialMessage: string
  vapiLinked: boolean
}) {
  const [hours, setHours] = useState(initialHours)
  const [timezone, setTimezone] = useState(initialTimezone)
  const [message, setMessage] = useState(initialMessage)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<{ type: 'ok' | 'warn' | 'error'; text: string } | null>(null)

  const patch = (day: number, change: Partial<WorkingHour>) =>
    setHours((hs) => hs.map((h) => (h.day_of_week === day ? { ...h, ...change } : h)))

  function toggle(day: number, open: boolean) {
    const h = hours.find((x) => x.day_of_week === day)!
    // Při zapnutí bez časů nabídneme běžnou pracovní dobu.
    patch(day, { is_open: open, open_time: h.open_time ?? '08:00', close_time: h.close_time ?? '17:00' })
  }

  async function save() {
    // Kontrola předem; server ji provádí také.
    const bad = DAY_ORDER.find(({ day }) => {
      const h = hours.find((x) => x.day_of_week === day)!
      return h.is_open && (!h.open_time || !h.close_time || h.open_time >= h.close_time)
    })
    if (bad) {
      setStatus({ type: 'error', text: `${bad.label}: čas „od“ musí být dřív než „do“.` })
      return
    }
    if (!message.trim()) {
      setStatus({ type: 'error', text: 'Zadejte zprávu mimo pracovní dobu.' })
      return
    }

    setSaving(true)
    setStatus(null)
    try {
      const res = await fetch(`/api/agents/${agentId}/working-hours`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hours, timezone, outsideHoursMessage: message }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? 'Uložení se nepodařilo.')
      if (data.sync?.ok) {
        setStatus({ type: 'ok', text: 'Uloženo a synchronizováno s Vapi.' })
        toast.add({ type: 'success', title: 'Synchronizováno s Vapi' })
      } else {
        const text = vapiLinked
          ? 'Uloženo, ale synchronizace s Vapi selhala. Zkuste ji spustit ve Znalostní bázi.'
          : 'Uloženo. Agent není propojený s Vapi, změna se neodeslala.'
        setStatus({ type: 'warn', text })
        toast.add({ type: 'warning', title: 'Pracovní doba uložena', description: text })
      }
    } catch (e) {
      const text = e instanceof Error ? e.message : 'Uložení se nepodařilo.'
      setStatus({ type: 'error', text })
      toast.add({ type: 'error', title: 'Uložení se nepodařilo', description: text })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Pracovní doba</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {DAY_ORDER.map(({ day, label }) => {
            const h = hours.find((x) => x.day_of_week === day)!
            return (
              <div key={day} className="flex flex-wrap items-center gap-3">
                <span className="w-24 text-sm">{label}</span>
                <Switch checked={h.is_open} onCheckedChange={(open) => toggle(day, open)} aria-label={`${label} otevřeno`} />
                {h.is_open ? (
                  <div className="flex items-center gap-2">
                    <Input
                      type="time"
                      className="w-28"
                      value={h.open_time ?? ''}
                      onChange={(e) => patch(day, { open_time: e.target.value })}
                      aria-label={`${label} od`}
                    />
                    <span>–</span>
                    <Input
                      type="time"
                      className="w-28"
                      value={h.close_time ?? ''}
                      onChange={(e) => patch(day, { close_time: e.target.value })}
                      aria-label={`${label} do`}
                    />
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">Zavřeno</span>
                )}
              </div>
            )
          })}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-4 pt-6">
          <div className="flex flex-col gap-2">
            <Label>Časová zóna</Label>
            <Select
              value={timezone}
              onValueChange={(v) => v && setTimezone(v)}
              items={TIMEZONES.map((t) => ({ value: t, label: t }))}
            >
              <SelectTrigger className="w-full sm:w-72">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIMEZONES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="outside">Zpráva mimo pracovní dobu</Label>
            <Textarea
              id="outside"
              rows={3}
              maxLength={MAX_OUTSIDE_MESSAGE}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
            <span className="text-xs text-muted-foreground">
              {message.length} / {MAX_OUTSIDE_MESSAGE}
            </span>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center gap-4">
        <Button onClick={save} disabled={saving}>
          {saving && <Loader2 className="animate-spin" />}
          Uložit
        </Button>
        {status && (
          <p
            className={
              status.type === 'ok'
                ? 'text-sm text-green-600'
                : status.type === 'warn'
                  ? 'text-sm text-yellow-600'
                  : 'text-sm text-destructive'
            }
          >
            {status.text}
          </p>
        )}
      </div>
    </div>
  )
}

interface LoadedHours {
  hours: WorkingHour[]
  timezone: string
  outsideHoursMessage: string
}

/** Záložka Pracovní doba: načte data přes GET /api/agents/:id/working-hours a ukládá přes PUT. */
export function WorkingHoursTab({ agentId, vapiLinked }: { agentId: string; vapiLinked: boolean }) {
  const [data, setData] = useState<LoadedHours | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    fetch(`/api/agents/${agentId}/working-hours`)
      .then(async (res) => {
        const body = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(body.error ?? 'Načtení pracovní doby selhalo.')
        if (!cancelled) setData(body)
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Načtení pracovní doby selhalo.')
      })
    return () => {
      cancelled = true
    }
  }, [agentId, attempt])

  if (error) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-sm text-destructive">{error}</p>
        <Button
          variant="outline"
          onClick={() => {
            setError(null)
            setAttempt((n) => n + 1)
          }}
        >
          Zkusit znovu
        </Button>
      </div>
    )
  }
  if (!data) {
    return (
      <div className="flex flex-col gap-3" aria-busy="true">
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-40 rounded-xl" />
      </div>
    )
  }
  return (
    <WorkingHoursEditor
      agentId={agentId}
      initialHours={data.hours}
      initialTimezone={data.timezone}
      initialMessage={data.outsideHoursMessage}
      vapiLinked={vapiLinked}
    />
  )
}
