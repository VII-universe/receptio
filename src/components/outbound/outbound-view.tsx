'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { Copy, Loader2, PhoneOutgoing, Plus, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/components/ui/toast'
import { sanitizePhoneInput } from '@/lib/bookings/phone'
import { formatDateTime } from '@/lib/calls'
import { DEFAULT_MESSAGE, MAX_MESSAGE, TEMPLATE_VARIABLES, type OutboundCallItem, type OutboundStatus, type OutboundTemplate, type TemplateInput } from '@/lib/outbound/schema'
import { cn } from '@/lib/utils'

interface AgentItem {
  id: string
  name: string
  gdprConfirmed: boolean
  hasNumber: boolean
}

const STATUS_VARIANT: Record<OutboundStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  pending: 'secondary',
  calling: 'secondary',
  completed: 'default',
  failed: 'destructive',
  cancelled: 'outline',
}

const emptyTemplate = (): TemplateInput => ({
  name: '',
  trigger_type: 'before_booking',
  delay_hours: 24,
  message_template: DEFAULT_MESSAGE,
  allowed_hours_from: 8,
  allowed_hours_to: 20,
  active: true,
})

async function api<T>(url: string, init?: RequestInit): Promise<{ ok: boolean; status: number; data: T & { error?: string } }> {
  const res = await fetch(url, init && { ...init, headers: { 'Content-Type': 'application/json' } })
  return { ok: res.ok, status: res.status, data: (await res.json().catch(() => ({}))) as T & { error?: string } }
}

/** Sekce Odchozí hovory: upsell, GDPR brána, šablony a historie. */
export function OutboundView({ allowed, agents, businessName }: { allowed: boolean; agents: AgentItem[]; businessName: string }) {
  const t = useTranslations('outbound')
  const [agentId, setAgentId] = useState(agents[0]?.id ?? '')
  const [confirmed, setConfirmed] = useState<Record<string, boolean>>(() => Object.fromEntries(agents.map((a) => [a.id, a.gdprConfirmed])))
  const [gateOpen, setGateOpen] = useState(false)

  const agent = agents.find((a) => a.id === agentId)
  const isConfirmed = agent ? confirmed[agent.id] === true : false

  // První návštěva agenta bez potvrzení: modal se otevře sám.
  useEffect(() => {
    if (allowed && agent && !isConfirmed) setGateOpen(true)
  }, [allowed, agent, isConfirmed])

  if (!allowed) {
    return (
      <Card>
        <CardContent className="flex flex-col items-start gap-4 py-8">
          <p className="text-lg font-medium">{t('upsell')}</p>
          <p className="text-sm text-muted-foreground">{t('upsellText')}</p>
          <Link href="/dashboard/billing" className={buttonVariants()}>
            {t('upgrade')}
          </Link>
        </CardContent>
      </Card>
    )
  }
  if (!agent) {
    return (
      <Card>
        <CardContent className="py-8 text-sm text-muted-foreground">{t('noAgents')}</CardContent>
      </Card>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {agents.length > 1 && (
        <div className="flex max-w-xs flex-col gap-2">
          <Label>{t('agent')}</Label>
          <Select value={agentId} items={agents.map((a) => ({ value: a.id, label: a.name }))} onValueChange={(v) => v && setAgentId(v)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {agents.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {isConfirmed ? (
        <>
        {!agent.hasNumber && (
          <div role="alert" className="flex flex-col gap-2 rounded-lg border border-yellow-500/40 bg-yellow-500/10 p-4 text-sm sm:flex-row sm:items-center sm:justify-between">
            <span>{t('noNumber')}</span>
            <Link href="/dashboard/phone-numbers" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
              {t('noNumberAction')}
            </Link>
          </div>
        )}
        <Tabs defaultValue="templates">
          <TabsList>
            <TabsTrigger value="templates">{t('tabTemplates')}</TabsTrigger>
            <TabsTrigger value="history">{t('tabHistory')}</TabsTrigger>
          </TabsList>
          <TabsContent value="templates" className="pt-4">
            <TemplatesTab agentId={agent.id} />
          </TabsContent>
          <TabsContent value="history" className="pt-4">
            <HistoryTab agentId={agent.id} canCall={agent.hasNumber} />
          </TabsContent>
        </Tabs>
        </>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-start gap-4 py-8">
            <p className="text-lg font-medium">{t('placeholderTitle')}</p>
            <p className="text-sm text-muted-foreground">{t('placeholderText')}</p>
            <Button onClick={() => setGateOpen(true)}>{t('setup')}</Button>
          </CardContent>
        </Card>
      )}

      <GdprGate
        open={gateOpen}
        agentId={agent.id}
        businessName={businessName}
        onClose={() => setGateOpen(false)}
        onConfirmed={() => {
          setConfirmed((c) => ({ ...c, [agent.id]: true }))
          setGateOpen(false)
        }}
      />
    </div>
  )
}

/** Brána před aktivací: nejde zavřít křížkem ani klikem mimo, jen potvrzením nebo "Teď ne". */
function GdprGate({ open, agentId, businessName, onClose, onConfirmed }: { open: boolean; agentId: string; businessName: string; onClose: () => void; onConfirmed: () => void }) {
  const t = useTranslations('outbound.gdpr')
  const [checked, setChecked] = useState(false)
  const [saving, setSaving] = useState(false)
  const sentence = t('sentence', { name: businessName })

  async function confirm() {
    setSaving(true)
    const res = await api('/api/outbound/gdpr', { method: 'POST', body: JSON.stringify({ agent_id: agentId }) })
    setSaving(false)
    if (!res.ok) return toast.add({ type: 'error', title: t('failed') })
    onConfirmed()
  }

  return (
    <Dialog open={open} onOpenChange={() => {}} disablePointerDismissal>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>{t('text')}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2 rounded-lg border bg-muted/40 p-3">
          <p className="text-sm">{sentence}</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="self-start"
            onClick={() => navigator.clipboard.writeText(sentence).then(() => toast.add({ type: 'success', title: t('copied') })).catch(() => toast.add({ type: 'error', title: t('copyFailed') }))}
          >
            <Copy />
            {t('copy')}
          </Button>
        </div>
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" className="mt-0.5 size-4" checked={checked} onChange={(e) => setChecked(e.target.checked)} />
          {t('checkbox')}
        </label>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            {t('notNow')}
          </Button>
          <Button onClick={confirm} disabled={!checked || saving}>
            {saving && <Loader2 className="animate-spin" />}
            {t('activate')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function TemplatesTab({ agentId }: { agentId: string }) {
  const t = useTranslations('outbound')
  const [templates, setTemplates] = useState<OutboundTemplate[] | null>(null)
  const [error, setError] = useState(false)
  const [editing, setEditing] = useState<{ id: string | null; value: TemplateInput } | null>(null)

  const load = useCallback(async () => {
    setError(false)
    const res = await api<{ templates: OutboundTemplate[] }>(`/api/outbound/templates?agentId=${agentId}`)
    if (res.ok) setTemplates(res.data.templates)
    else setError(true)
  }, [agentId])
  useEffect(() => {
    setTemplates(null)
    void load()
  }, [load])

  async function toggle(tpl: OutboundTemplate, active: boolean) {
    const { id, agent_id: _a, created_at: _c, ...rest } = tpl
    void _a
    void _c
    const res = await api(`/api/outbound/templates/${id}`, { method: 'PUT', body: JSON.stringify({ ...rest, active }) })
    if (!res.ok) return toast.add({ type: 'error', title: t('saveFailed') })
    setTemplates((l) => l?.map((x) => (x.id === id ? { ...x, active } : x)) ?? null)
  }

  async function remove(tpl: OutboundTemplate) {
    if (!window.confirm(t('deleteConfirm', { name: tpl.name }))) return
    const res = await api(`/api/outbound/templates/${tpl.id}`, { method: 'DELETE' })
    if (!res.ok) return toast.add({ type: 'error', title: t('deleteFailed') })
    setTemplates((l) => l?.filter((x) => x.id !== tpl.id) ?? null)
  }

  if (error) return <p className="text-sm text-destructive">{t('loadFailed')}</p>
  if (!templates) return <Skeleton className="h-40 w-full" />

  return (
    <div className="flex flex-col gap-4">
      {templates.length === 0 && (
        <Card>
          <CardContent className="py-8 text-sm text-muted-foreground">{t('noTemplates')}</CardContent>
        </Card>
      )}
      {templates.map((tpl) => (
        <Card key={tpl.id} className={cn(!tpl.active && 'opacity-70')}>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle>{tpl.name}</CardTitle>
                <CardDescription>
                  {t(`trigger.${tpl.trigger_type}`, { hours: tpl.delay_hours })} · {t('window', { from: tpl.allowed_hours_from, to: tpl.allowed_hours_to })}
                </CardDescription>
              </div>
              <Switch checked={tpl.active} onCheckedChange={(v) => toggle(tpl, v)} aria-label={t('active')} />
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <p className="whitespace-pre-wrap rounded-md bg-muted/50 p-3 text-sm">{tpl.message_template}</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setEditing({ id: tpl.id, value: { name: tpl.name, trigger_type: tpl.trigger_type, delay_hours: tpl.delay_hours, message_template: tpl.message_template, allowed_hours_from: tpl.allowed_hours_from, allowed_hours_to: tpl.allowed_hours_to, active: tpl.active } })}>
                {t('edit')}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => remove(tpl)}>
                <Trash2 />
                {t('delete')}
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
      <div>
        <Button variant="outline" onClick={() => setEditing({ id: null, value: emptyTemplate() })}>
          <Plus />
          {t('newTemplate')}
        </Button>
      </div>

      {editing && (
        <TemplateDialog
          key={editing.id ?? 'new'}
          agentId={agentId}
          editing={editing}
          onClose={() => setEditing(null)}
          onSaved={(tpl) => {
            setTemplates((l) => (l?.some((x) => x.id === tpl.id) ? l.map((x) => (x.id === tpl.id ? tpl : x)) : [...(l ?? []), tpl]))
            setEditing(null)
          }}
        />
      )}
    </div>
  )
}

function TemplateDialog({ agentId, editing, onClose, onSaved }: { agentId: string; editing: { id: string | null; value: TemplateInput }; onClose: () => void; onSaved: (t: OutboundTemplate) => void }) {
  const t = useTranslations('outbound')
  const [v, setV] = useState(editing.value)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const set = <K extends keyof TemplateInput>(k: K, value: TemplateInput[K]) => setV((s) => ({ ...s, [k]: value }))
  const num = (s: string, min: number, max: number, fallback: number) => {
    const n = Math.round(Number(s))
    return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback
  }

  async function save() {
    if (!v.name.trim() || v.message_template.trim().length < 5) return setError(t('invalid'))
    if (v.allowed_hours_to <= v.allowed_hours_from) return setError(t('invalidWindow'))
    setSaving(true)
    setError(null)
    const res = editing.id
      ? await api<{ template: OutboundTemplate }>(`/api/outbound/templates/${editing.id}`, { method: 'PUT', body: JSON.stringify(v) })
      : await api<{ template: OutboundTemplate }>('/api/outbound/templates', { method: 'POST', body: JSON.stringify({ ...v, agent_id: agentId }) })
    setSaving(false)
    if (!res.ok) return setError(res.status === 409 ? t('limitReached') : t('saveFailed'))
    onSaved(res.data.template)
  }

  return (
    <Dialog open onOpenChange={(o) => !o && !saving && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing.id ? t('editTemplate') : t('newTemplate')}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="tpl-name">{t('name')}</Label>
            <Input id="tpl-name" value={v.name} maxLength={80} onChange={(e) => set('name', e.target.value)} placeholder={t('namePlaceholder')} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label>{t('when')}</Label>
              <Select
                value={v.trigger_type}
                items={[
                  { value: 'before_booking', label: t('triggerOption.before_booking') },
                  { value: 'after_booking', label: t('triggerOption.after_booking') },
                ]}
                onValueChange={(x) => x && set('trigger_type', x as TemplateInput['trigger_type'])}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="before_booking">{t('triggerOption.before_booking')}</SelectItem>
                  <SelectItem value="after_booking">{t('triggerOption.after_booking')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="tpl-delay">{t('delayHours')}</Label>
              <Input id="tpl-delay" type="number" min={0} max={720} value={v.delay_hours} onChange={(e) => set('delay_hours', num(e.target.value, 0, 720, v.delay_hours))} />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="tpl-msg">{t('message')}</Label>
            <Textarea id="tpl-msg" rows={5} maxLength={MAX_MESSAGE} value={v.message_template} onChange={(e) => set('message_template', e.target.value)} />
            <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
              {t('variables')}
              {TEMPLATE_VARIABLES.map((name) => (
                <button key={name} type="button" className="rounded bg-muted px-1.5 py-0.5 font-mono hover:bg-muted/70" onClick={() => set('message_template', `${v.message_template} {{${name}}}`.trim())}>
                  {`{{${name}}}`}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">{t('messageHint')}</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="tpl-from">{t('allowedFrom')}</Label>
              <Input id="tpl-from" type="number" min={0} max={23} value={v.allowed_hours_from} onChange={(e) => set('allowed_hours_from', num(e.target.value, 0, 23, v.allowed_hours_from))} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="tpl-to">{t('allowedTo')}</Label>
              <Input id="tpl-to" type="number" min={1} max={24} value={v.allowed_hours_to} onChange={(e) => set('allowed_hours_to', num(e.target.value, 1, 24, v.allowed_hours_to))} />
            </div>
          </div>
          <p className="-mt-2 text-xs text-muted-foreground">{t('windowHint')}</p>
          <label className="flex items-center gap-3 text-sm">
            <Switch checked={v.active} onCheckedChange={(x) => set('active', x)} />
            {t('active')}
          </label>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            {t('cancel')}
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving && <Loader2 className="animate-spin" />}
            {t('save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function HistoryTab({ agentId, canCall }: { agentId: string; canCall: boolean }) {
  const t = useTranslations('outbound')
  const locale = useLocale()
  const [calls, setCalls] = useState<OutboundCallItem[] | null>(null)
  const [error, setError] = useState(false)
  const [testOpen, setTestOpen] = useState(false)

  const load = useCallback(async () => {
    setError(false)
    const res = await api<{ calls: OutboundCallItem[] }>(`/api/outbound/calls?agentId=${agentId}`)
    if (res.ok) setCalls(res.data.calls)
    else setError(true)
  }, [agentId])
  useEffect(() => {
    setCalls(null)
    void load()
  }, [load])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => setTestOpen(true)} disabled={!canCall} title={canCall ? undefined : t('noNumber')}>
          <PhoneOutgoing />
          {t('testCall')}
        </Button>
        <Button variant="outline" onClick={() => void load()}>
          {t('refresh')}
        </Button>
      </div>

      {error ? (
        <p className="text-sm text-destructive">{t('loadFailed')}</p>
      ) : !calls ? (
        <Skeleton className="h-40 w-full" />
      ) : calls.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-sm text-muted-foreground">{t('noCalls')}</CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="overflow-x-auto p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('time')}</TableHead>
                  <TableHead>{t('customer')}</TableHead>
                  <TableHead>{t('phone')}</TableHead>
                  <TableHead>{t('status')}</TableHead>
                  <TableHead>{t('error')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {calls.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="whitespace-nowrap">{formatDateTime(c.scheduled_at, locale)}</TableCell>
                    <TableCell>
                      {c.customer_name}
                      {c.is_test && <Badge variant="outline" className="ml-2">{t('testBadge')}</Badge>}
                    </TableCell>
                    <TableCell className="whitespace-nowrap tabular-nums">{c.phone_number}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[c.status]}>{t(`statusLabel.${c.status}`)}</Badge>
                    </TableCell>
                    <TableCell className="max-w-xs whitespace-normal text-xs text-muted-foreground">{c.error_message}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {testOpen && <TestDialog agentId={agentId} onClose={() => setTestOpen(false)} onDone={() => void load()} />}
    </div>
  )
}

function TestDialog({ agentId, onClose, onDone }: { agentId: string; onClose: () => void; onDone: () => void }) {
  const t = useTranslations('outbound')
  const [phone, setPhone] = useState('')
  const [calling, setCalling] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function call() {
    setCalling(true)
    setError(null)
    const res = await api<{ ok?: boolean }>('/api/outbound/test', { method: 'POST', body: JSON.stringify({ agent_id: agentId, phone_number: phone }) })
    setCalling(false)
    if (res.status === 429) return setError(t('testRateLimit'))
    if (res.status === 422) return setError(t('noNumber'))
    if (res.status === 400) return setError(t('testInvalidPhone'))
    if (!res.ok || res.data.ok === false) {
      onDone()
      return setError(res.data.error ?? t('testFailed'))
    }
    toast.add({ type: 'success', title: t('testStarted') })
    onDone()
    onClose()
  }

  return (
    <Dialog open onOpenChange={(o) => !o && !calling && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('testCall')}</DialogTitle>
          <DialogDescription>{t('testText')}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          <Label htmlFor="test-phone">{t('phone')}</Label>
          <Input id="test-phone" type="tel" inputMode="tel" placeholder="+420 777 123 456" value={phone} onChange={(e) => setPhone(sanitizePhoneInput(e.target.value))} autoFocus />
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={calling}>
            {t('cancel')}
          </Button>
          <Button onClick={call} disabled={calling || !phone.trim()}>
            {calling && <Loader2 className="animate-spin" />}
            {t('callNow')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
