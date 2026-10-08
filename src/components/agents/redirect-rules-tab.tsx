'use client'

import { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { ArrowDown, ArrowUp, Info, Loader2, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/components/ui/toast'
import {
  ACTION_TYPES,
  defaultAction,
  defaultTrigger,
  isEnforcedTrigger,
  MAX_REDIRECT_MESSAGE,
  MAX_RULES,
  redirectRuleSchema,
  TRIGGER_TYPES,
  type ActionType,
  type RedirectRule,
  type TriggerType,
} from '@/lib/agents/redirect-rules'

type Row = RedirectRule & { key: number }

function RulesEditor({ agentId, initial, vapiLinked }: { agentId: string; initial: RedirectRule[]; vapiLinked: boolean }) {
  const t = useTranslations('agents.redirect')
  const nextKey = useRef(0)
  const withKey = (r: RedirectRule): Row => ({ ...r, key: nextKey.current++ })
  const [rows, setRows] = useState<Row[]>(() => initial.map(withKey))
  const [invalid, setInvalid] = useState<Set<number>>(new Set())
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<{ type: 'ok' | 'warn' | 'error'; text: string } | null>(null)

  const update = (key: number, change: Partial<RedirectRule>) => {
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...change } : r)))
    setInvalid((s) => {
      const n = new Set(s)
      n.delete(key)
      return n
    })
  }
  const move = (index: number, delta: -1 | 1) =>
    setRows((rs) => {
      const target = index + delta
      if (target < 0 || target >= rs.length) return rs
      const copy = [...rs]
      ;[copy[index], copy[target]] = [copy[target], copy[index]]
      return copy
    })

  async function save() {
    // Kontrola předem; server ji provádí také.
    const bad = new Set(rows.filter((r) => !redirectRuleSchema.safeParse({ trigger: r.trigger, action: r.action }).success).map((r) => r.key))
    setInvalid(bad)
    if (bad.size > 0) {
      setStatus({ type: 'error', text: t('invalid') })
      return
    }
    setSaving(true)
    setStatus(null)
    try {
      const res = await fetch(`/api/agents/${agentId}/redirect-rules`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rules: rows.map(({ trigger, action }) => ({ trigger, action })) }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? t('saveFailed'))
      if (data.sync?.ok) {
        setStatus({ type: 'ok', text: t('synced') })
        toast.add({ type: 'success', title: t('savedToast') })
      } else {
        const text = vapiLinked ? t('syncFailed') : t('notLinked')
        setStatus({ type: 'warn', text })
        toast.add({ type: 'warning', title: t('saved'), description: text })
      }
    } catch (e) {
      const text = e instanceof Error ? e.message : t('saveFailed')
      setStatus({ type: 'error', text })
      toast.add({ type: 'error', title: t('saveFailed'), description: text })
    } finally {
      setSaving(false)
    }
  }

  const triggerItems = TRIGGER_TYPES.map((v) => ({ value: v, label: t(`trigger.${v}`) }))
  const actionItems = ACTION_TYPES.map((v) => ({ value: v, label: t(`action.${v}`) }))

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>{t('title')}</CardTitle>
          <CardDescription>{t('description')}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {rows.length === 0 && <p className="text-sm text-muted-foreground">{t('empty')}</p>}

          {rows.map((r, i) => (
            <div key={r.key} className={`flex flex-col gap-4 rounded-lg border p-4 ${invalid.has(r.key) ? 'border-destructive' : ''}`}>
              <div className="flex items-center gap-2">
                <span className="flex size-6 items-center justify-center rounded-full bg-muted text-xs font-medium">{i + 1}</span>
                <span className="text-sm font-medium">{t('rule')}</span>
                <div className="ml-auto flex items-center gap-1">
                  <Button type="button" variant="ghost" size="icon" disabled={i === 0} aria-label={t('moveUp')} onClick={() => move(i, -1)}>
                    <ArrowUp />
                  </Button>
                  <Button type="button" variant="ghost" size="icon" disabled={i === rows.length - 1} aria-label={t('moveDown')} onClick={() => move(i, 1)}>
                    <ArrowDown />
                  </Button>
                  <Button type="button" variant="ghost" size="icon" aria-label={t('remove')} onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))}>
                    <Trash2 />
                  </Button>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <Label>{t('when')}</Label>
                  <Select
                    value={r.trigger.type}
                    items={triggerItems}
                    onValueChange={(v) => v && update(r.key, { trigger: defaultTrigger(v as TriggerType) })}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {triggerItems.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {r.trigger.type === 'rings_no_answer' && (
                    <NumberField
                      label={t('rings')}
                      value={r.trigger.rings}
                      min={1}
                      max={10}
                      onChange={(rings) => update(r.key, { trigger: { type: 'rings_no_answer', rings } })}
                    />
                  )}
                  {r.trigger.type === 'call_duration' && (
                    <NumberField
                      label={t('minutes')}
                      value={r.trigger.minutes}
                      min={1}
                      max={60}
                      onChange={(minutes) => update(r.key, { trigger: { type: 'call_duration', minutes } })}
                    />
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  <Label>{t('then')}</Label>
                  <Select
                    value={r.action.type}
                    items={actionItems}
                    onValueChange={(v) => v && update(r.key, { action: defaultAction(v as ActionType) })}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {actionItems.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {r.action.type === 'play_message_hangup' ? (
                    <Textarea
                      rows={3}
                      maxLength={MAX_REDIRECT_MESSAGE}
                      placeholder={t('messagePlaceholder')}
                      aria-label={t('message')}
                      value={r.action.message}
                      onChange={(e) => update(r.key, { action: { type: 'play_message_hangup', message: e.target.value } })}
                    />
                  ) : (
                    <Input
                      type="tel"
                      inputMode="tel"
                      placeholder="+420123456789"
                      aria-label={t('number')}
                      value={r.action.number}
                      onChange={(e) => update(r.key, { action: { type: r.action.type as 'transfer_number' | 'voicemail', number: e.target.value } })}
                    />
                  )}
                </div>
              </div>

              {!isEnforcedTrigger(r.trigger) && (
                <p className="flex items-start gap-2 rounded-md bg-muted p-3 text-xs text-muted-foreground">
                  <Info className="mt-0.5 size-3.5 shrink-0" />
                  {t(`notEnforced.${r.trigger.type}`)}
                </p>
              )}
            </div>
          ))}

          <div>
            <Button
              type="button"
              variant="outline"
              disabled={rows.length >= MAX_RULES}
              onClick={() => setRows((rs) => [...rs, withKey({ trigger: defaultTrigger('human_request'), action: defaultAction('transfer_number') })])}
            >
              <Plus />
              {t('add')}
            </Button>
            {rows.length >= MAX_RULES && <p className="mt-2 text-xs text-muted-foreground">{t('limit', { count: MAX_RULES })}</p>}
          </div>
          <p className="text-xs text-muted-foreground">{t('orderHint')}</p>
        </CardContent>
      </Card>

      {status && (
        <p
          role="status"
          className={`text-sm ${status.type === 'ok' ? 'text-green-600' : status.type === 'warn' ? 'text-yellow-600' : 'text-destructive'}`}
        >
          {status.text}
        </p>
      )}
      <div>
        <Button type="button" onClick={save} disabled={saving}>
          {saving && <Loader2 className="animate-spin" />}
          {t('save')}
        </Button>
      </div>
    </div>
  )
}

function NumberField({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (n: number) => void }) {
  return (
    <div className="flex items-center gap-2">
      <Input
        type="number"
        className="w-24"
        min={min}
        max={max}
        aria-label={label}
        value={value}
        onChange={(e) => {
          const n = Math.round(Number(e.target.value))
          if (Number.isFinite(n)) onChange(Math.min(max, Math.max(min, n)))
        }}
      />
      <span className="text-sm text-muted-foreground">{label}</span>
    </div>
  )
}

/** Záložka Přesměrování: pravidla se načtou přes fetch a ukládají se najednou (pořadí = priorita). */
export function RedirectRulesTab({ agentId, vapiLinked }: { agentId: string; vapiLinked: boolean }) {
  const t = useTranslations('agents.redirect')
  const [rules, setRules] = useState<RedirectRule[] | null>(null)
  const [error, setError] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    fetch(`/api/agents/${agentId}/redirect-rules`)
      .then(async (res) => {
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error()
        if (!cancelled) setRules(data.rules)
      })
      .catch(() => !cancelled && setError(true))
    return () => {
      cancelled = true
    }
  }, [agentId, attempt])

  if (error) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-sm text-destructive">{t('loadFailed')}</p>
        <Button
          variant="outline"
          onClick={() => {
            setError(false)
            setAttempt((n) => n + 1)
          }}
        >
          {t('retry')}
        </Button>
      </div>
    )
  }
  if (!rules) return <Skeleton className="h-64 w-full" />
  return <RulesEditor agentId={agentId} initial={rules} vapiLinked={vapiLinked} />
}
