'use client'

import { useCallback, useEffect, useState } from 'react'
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

const fmt = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleString('en-GB', { timeZone: 'Europe/Prague', dateStyle: 'short', timeStyle: 'short' })
    : '–'

function statusOf(w: WebhookRow) {
  if (!w.is_active) return { label: 'Inactive', className: 'bg-muted text-muted-foreground', title: undefined }
  if (w.failure_count >= 5) {
    return {
      label: 'Failing',
      className: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300',
      title: '5 failures in a row – check your endpoint',
    }
  }
  return { label: 'Active', className: 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300', title: undefined }
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
      setLoadError(e instanceof Error ? e.message : 'Loading the webhooks failed.')
    }
  }, [])

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
      setFormError('Fill in the name and the URL.')
      return
    }
    setSaving(true)
    setFormError(null)
    try {
      const events = [...WEBHOOK_EVENTS]
      if (dialog?.mode === 'edit') {
        await api(`/api/webhooks/manage/${dialog.hook.id}`, 'PATCH', { name: name.trim(), url: url.trim(), events, is_active: active })
        toast.add({ type: 'success', title: 'Webhook saved' })
        closeDialog()
      } else {
        const data = await api('/api/webhooks/manage', 'POST', { name: name.trim(), url: url.trim(), events, is_active: active })
        setSecret(data.secret)
      }
      await load()
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Saving failed.')
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
      toast.add({ type: 'error', title: 'Copying failed, copy the key manually.' })
    }
  }

  async function test(w: WebhookRow) {
    setBusy(w.id)
    try {
      const r = await api(`/api/webhooks/manage/${w.id}/test`, 'POST')
      if (r.ok) {
        toast.add({
          type: r.status < 400 ? 'success' : 'warning',
          title: `Response: HTTP ${r.status}`,
          description: r.status < 400 ? 'The test event was delivered.' : 'Your endpoint returned an error.',
        })
      } else {
        toast.add({ type: 'error', title: 'Delivery failed', description: r.error })
      }
    } catch (e) {
      toast.add({ type: 'error', title: 'Test failed', description: e instanceof Error ? e.message : undefined })
    } finally {
      setBusy(null)
    }
  }

  async function remove(w: WebhookRow) {
    if (!window.confirm(`Delete the webhook "${w.name}"? Receptio will stop sending events to it.`)) return
    setBusy(w.id)
    try {
      await api(`/api/webhooks/manage/${w.id}`, 'DELETE')
      toast.add({ type: 'success', title: 'Webhook deleted' })
      await load()
    } catch (e) {
      toast.add({ type: 'error', title: 'Deleting failed', description: e instanceof Error ? e.message : undefined })
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Webhooks</CardTitle>
          <CardDescription>
            After every finished call Receptio sends a signed POST request to your URL (Zapier, Make, CRM…).
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Button className="self-start" onClick={openCreate}>
            <Plus /> Add webhook
          </Button>

          {loadError ? (
            <p className="text-sm text-destructive">{loadError}</p>
          ) : !hooks ? (
            <Skeleton className="h-24 rounded-xl" />
          ) : hooks.length === 0 ? (
            <p className="text-sm text-muted-foreground">You do not have any webhooks yet</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>URL</TableHead>
                  <TableHead>Events</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last call</TableHead>
                  <TableHead>Last code</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {hooks.map((w) => {
                  const st = statusOf(w)
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
                          {busy === w.id ? 'Waiting…' : 'Test'}
                        </Button>
                        <Button variant="ghost" size="sm" disabled={busy !== null} onClick={() => openEdit(w)}>
                          Edit
                        </Button>
                        <Button variant="ghost" size="sm" className="text-destructive" disabled={busy !== null} onClick={() => remove(w)}>
                          Delete
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
          <CardTitle>Verifying the signature</CardTitle>
          <CardDescription>
            Every request carries the header <code>X-Receptio-Signature: sha256=&lt;hmac&gt;</code> (HMAC-SHA256 of the body with
            the webhook secret), plus <code>X-Receptio-Event</code> and <code>X-Receptio-Delivery</code>.
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
                <DialogTitle>Webhook created</DialogTitle>
                <DialogDescription>
                  You will see this secret key only now. Store it – it is used to verify the signature.
                </DialogDescription>
              </DialogHeader>
              <div className="flex gap-2">
                <Input readOnly value={secret} className="font-mono text-xs" onFocus={(e) => e.currentTarget.select()} aria-label="Secret webhooku" />
                <Button variant="outline" onClick={copy}>
                  {copied ? <Check /> : <Copy />} {copied ? 'Copied' : 'Copy'}
                </Button>
              </div>
              <DialogFooter>
                <Button onClick={closeDialog}>Done</Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>{dialog?.mode === 'edit' ? 'Edit webhook' : 'Add webhook'}</DialogTitle>
                <DialogDescription>Receptio sends a POST to this address after every finished call.</DialogDescription>
              </DialogHeader>
              <div className="flex flex-col gap-2">
                <Label htmlFor="whName">Name</Label>
                <Input id="whName" value={name} maxLength={100} onChange={(e) => setName(e.target.value)} placeholder="e.g. Zapier – new calls" autoFocus />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="whUrl">URL</Label>
                <Input id="whUrl" type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com/receptio-webhook" />
                {url.trim().toLowerCase().startsWith('http://') && (
                  <p className="text-xs text-yellow-600">
                    The address does not use HTTPS, so data is sent unencrypted. We recommend https:// for production.
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <Label>Events</Label>
                {WEBHOOK_EVENTS.map((ev) => (
                  <label key={ev} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked disabled className="size-4" />
                    <code>{ev}</code> <span className="text-muted-foreground">– a call ended</span>
                  </label>
                ))}
              </div>
              <div className="flex items-center gap-3">
                <Switch id="whActive" checked={active} onCheckedChange={setActive} />
                <Label htmlFor="whActive">Active</Label>
              </div>
              {formError && <p className="text-sm text-destructive">{formError}</p>}
              <DialogFooter>
                <Button variant="outline" onClick={closeDialog} disabled={saving}>
                  Cancel
                </Button>
                <Button onClick={save} disabled={saving}>
                  {saving && <Loader2 className="animate-spin" />}
                  {dialog?.mode === 'edit' ? 'Save' : 'Create'}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
