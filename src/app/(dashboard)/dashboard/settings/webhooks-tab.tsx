'use client'

import { useCallback, useEffect, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { Check, Copy, Loader2, Plus } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { toast } from '@/components/ui/toast'
import { WEBHOOK_EVENTS } from '@/lib/webhooks/events'

interface WebhookRow {
  id: string
  name: string
  url: string
  events: string[]
  is_active: boolean
  created_at: string
  last_triggered_at: string | null
  last_status_code: number | null
  failure_count: number
}

const SIGNATURE_EXAMPLE = `// Node.js (Express) – verifying the signature
const crypto = require('crypto')

// The signature is computed from the original request body, so read it as "raw":
app.post('/receptio-webhook', express.raw({ type: 'application/json' }), (req, res) => {
  const received = req.headers['x-receptio-signature'] || ''
  const expected = 'sha256=' + crypto
    .createHmac('sha256', process.env.RECEPTIO_WEBHOOK_SECRET)
    .update(req.body) // Buffer with the original body
    .digest('hex')

  const ok =
    received.length === expected.length &&
    crypto.timingSafeEqual(Buffer.from(received), Buffer.from(expected))
  if (!ok) return res.status(401).send('Invalid signature')

  const event = JSON.parse(req.body.toString())
  // event.event === 'call.completed', event.data.callId, ...
  res.sendStatus(200)
})`

type Translate = (key: string) => string

function statusOf(w: WebhookRow, t: Translate) {
  if (!w.is_active) return { label: t('hookInactive'), className: 'bg-muted text-muted-foreground', title: undefined }
  if (w.failure_count >= 5) {
    return {
      label: t('hookFailing'),
      className: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300',
      title: t('hookFailingTitle'),
    }
  }
  return { label: t('keyActive'), className: 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300', title: undefined }
}

async function api(url: string, method: string, body?: unknown) {
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error ?? 'The operation failed.')
  return data
}

export function WebhooksTab() {
  const t = useTranslations('settings')
  const tc = useTranslations('common')
  const locale = useLocale()
  const fmt = (iso: string | null) =>
    iso ? new Date(iso).toLocaleString(locale, { timeZone: 'Europe/Prague', dateStyle: 'short', timeStyle: 'short' }) : '–'
  const [hooks, setHooks] = useState<WebhookRow[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  const [dialog, setDialog] = useState<{ mode: 'create' } | { mode: 'edit'; hook: WebhookRow } | null>(null)
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [active, setActive] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const [secret, setSecret] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const load = useCallback(async () => {
    try {
      const data = await api('/api/webhooks/manage', 'GET')
      setHooks(data.webhooks)
      setLoadError(null)
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : t('hooksLoadFailed'))
    }
  }, [t])

  useEffect(() => {
    load()
  }, [load])

  function openCreate() {
    setName('')
    setUrl('')
    setActive(true)
    setFormError(null)
    setSecret(null)
    setCopied(false)
    setDialog({ mode: 'create' })
  }

  function openEdit(hook: WebhookRow) {
    setName(hook.name)
    setUrl(hook.url)
    setActive(hook.is_active)
    setFormError(null)
    setDialog({ mode: 'edit', hook })
  }

  function closeDialog() {
    setDialog(null)
    setSecret(null) // secret už nikdy nezobrazíme
  }

  async function save() {
    if (!name.trim() || !url.trim()) {
      setFormError(t('fillNameUrl'))
      return
    }
    setSaving(true)
    setFormError(null)
    try {
      const events = [...WEBHOOK_EVENTS]
      if (dialog?.mode === 'edit') {
        await api(`/api/webhooks/manage/${dialog.hook.id}`, 'PATCH', { name: name.trim(), url: url.trim(), events, is_active: active })
        toast.add({ type: 'success', title: t('hookSaved') })
        closeDialog()
      } else {
        const data = await api('/api/webhooks/manage', 'POST', { name: name.trim(), url: url.trim(), events, is_active: active })
        setSecret(data.secret)
      }
      await load()
    } catch (e) {
      setFormError(e instanceof Error ? e.message : t('saveFailed'))
    } finally {
      setSaving(false)
    }
  }

  async function copy() {
    if (!secret) return
    try {
      await navigator.clipboard.writeText(secret)
      setCopied(true)
    } catch {
      toast.add({ type: 'error', title: t('copyFailed') })
    }
  }

  async function test(w: WebhookRow) {
    setBusy(w.id)
    try {
      const r = await api(`/api/webhooks/manage/${w.id}/test`, 'POST')
      if (r.ok) {
        toast.add({
          type: r.status < 400 ? 'success' : 'warning',
          title: t('hookResponse', { status: r.status }),
          description: r.status < 400 ? t('hookDelivered') : t('hookEndpointError'),
        })
      } else {
        toast.add({ type: 'error', title: t('hookDeliveryFailed'), description: r.error })
      }
    } catch (e) {
      toast.add({ type: 'error', title: t('hookTestFailed'), description: e instanceof Error ? e.message : undefined })
    } finally {
      setBusy(null)
    }
  }

  async function remove(w: WebhookRow) {
    if (!window.confirm(t('hookDeleteConfirm', { name: w.name }))) return
    setBusy(w.id)
    try {
      await api(`/api/webhooks/manage/${w.id}`, 'DELETE')
      toast.add({ type: 'success', title: t('hookDeleted') })
      await load()
    } catch (e) {
      toast.add({ type: 'error', title: t('hookDeleteFailed'), description: e instanceof Error ? e.message : undefined })
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>{t('webhooks')}</CardTitle>
          <CardDescription>{t('webhooksDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Button className="self-start" onClick={openCreate}>
            <Plus /> {t('newWebhook')}
          </Button>

          {loadError ? (
            <p className="text-sm text-destructive">{loadError}</p>
          ) : !hooks ? (
            <Skeleton className="h-24 rounded-xl" />
          ) : hooks.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('noHooks')}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('colName')}</TableHead>
                  <TableHead>{t('webhookUrl')}</TableHead>
                  <TableHead>{t('webhookEvents')}</TableHead>
                  <TableHead>{t('colStatus')}</TableHead>
                  <TableHead>{t('hookLastCall')}</TableHead>
                  <TableHead>{t('hookLastCode')}</TableHead>
                  <TableHead className="text-right">{t('colActions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {hooks.map((w) => {
                  const st = statusOf(w, t as Translate)
                  return (
                    <TableRow key={w.id}>
                      <TableCell className="font-medium">{w.name}</TableCell>
                      <TableCell className="max-w-48 truncate font-mono text-xs" title={w.url}>
                        {w.url}
                      </TableCell>
                      <TableCell className="text-xs">{w.events.join(', ')}</TableCell>
                      <TableCell>
                        <span title={st.title}>
                          <Badge variant="outline" className={`border-transparent ${st.className}`}>
                            {st.label}
                          </Badge>
                        </span>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{fmt(w.last_triggered_at)}</TableCell>
                      <TableCell>{w.last_status_code ?? '–'}</TableCell>
                      <TableCell className="whitespace-nowrap text-right">
                        <Button variant="ghost" size="sm" disabled={busy !== null} onClick={() => test(w)}>
                          {busy === w.id ? t('hookWaiting') : t('hookTest')}
                        </Button>
                        <Button variant="ghost" size="sm" disabled={busy !== null} onClick={() => openEdit(w)}>
                          {tc('edit')}
                        </Button>
                        <Button variant="ghost" size="sm" className="text-destructive" disabled={busy !== null} onClick={() => remove(w)}>
                          {tc('delete')}
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('verifyTitle')}</CardTitle>
          <CardDescription>
            {t.rich('verifyDesc', { code: (chunks) => <code>{chunks}</code> })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="overflow-x-auto rounded-lg border bg-muted p-4 text-xs leading-relaxed">
            <code>{SIGNATURE_EXAMPLE}</code>
          </pre>
        </CardContent>
      </Card>

      <Dialog open={dialog !== null} onOpenChange={(o) => !o && !saving && closeDialog()}>
        <DialogContent>
          {secret ? (
            <>
              <DialogHeader>
                <DialogTitle>{t('hookCreated')}</DialogTitle>
                <DialogDescription>
                  {t('secretOnce')}
                </DialogDescription>
              </DialogHeader>
              <div className="flex gap-2">
                <Input readOnly value={secret} className="font-mono text-xs" onFocus={(e) => e.currentTarget.select()} aria-label={t('webhookSecret')} />
                <Button variant="outline" onClick={copy}>
                  {copied ? <Check /> : <Copy />} {copied ? tc('copied') : tc('copy')}
                </Button>
              </div>
              <DialogFooter>
                <Button onClick={closeDialog}>{tc('done')}</Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>{dialog?.mode === 'edit' ? t('editWebhook') : t('newWebhook')}</DialogTitle>
                <DialogDescription>{t('hookDialogDesc')}</DialogDescription>
              </DialogHeader>
              <div className="flex flex-col gap-2">
                <Label htmlFor="whName">{t('colName')}</Label>
                <Input id="whName" value={name} maxLength={100} onChange={(e) => setName(e.target.value)} placeholder={t('hookNamePlaceholder')} autoFocus />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="whUrl">{t('webhookUrl')}</Label>
                <Input id="whUrl" type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com/receptio-webhook" />
                {url.trim().toLowerCase().startsWith('http://') && (
                  <p className="text-xs text-yellow-600">
                    {t('httpWarning')}
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <Label>{t('webhookEvents')}</Label>
                {WEBHOOK_EVENTS.map((ev) => (
                  <label key={ev} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked disabled className="size-4" />
                    <code>{ev}</code> <span className="text-muted-foreground">{t('eventCallEnded')}</span>
                  </label>
                ))}
              </div>
              <div className="flex items-center gap-3">
                <Switch id="whActive" checked={active} onCheckedChange={setActive} />
                <Label htmlFor="whActive">{t('keyActive')}</Label>
              </div>
              {formError && <p className="text-sm text-destructive">{formError}</p>}
              <DialogFooter>
                <Button variant="outline" onClick={closeDialog} disabled={saving}>
                  {tc('cancel')}
                </Button>
                <Button onClick={save} disabled={saving}>
                  {saving && <Loader2 className="animate-spin" />}
                  {dialog?.mode === 'edit' ? tc('save') : tc('create')}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
