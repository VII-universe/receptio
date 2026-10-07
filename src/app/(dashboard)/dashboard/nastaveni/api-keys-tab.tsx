'use client'

import Link from 'next/link'
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { toast } from '@/components/ui/toast'

interface ApiKeyRow {
  id: string
  name: string
  key_prefix: string
  scopes: string[]
  last_used_at: string | null
  expires_at: string | null
  is_active: boolean
  created_at: string
}

const EXPIRY_OPTIONS = [
  { value: 'never', label: 'Never', days: null },
  { value: '30', label: '30 days', days: 30 },
  { value: '90', label: '90 days', days: 90 },
  { value: '365', label: '1 year', days: 365 },
]

const SCOPE_LABELS: Record<string, string> = { read: 'Read', write: 'Write' }

const fmt = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleString('en-GB', { timeZone: 'Europe/Prague', dateStyle: 'short', timeStyle: 'short' })
    : '–'

export function ApiKeysTab() {
  const [keys, setKeys] = useState<ApiKeyRow[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [revoking, setRevoking] = useState<string | null>(null)

  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [canRead] = useState(true) // zatím jediný dostupný scope
  const [expiry, setExpiry] = useState('never')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [newKey, setNewKey] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/api-keys')
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? 'Loading the keys failed.')
      setKeys(data.keys)
      setLoadError(null)
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Loading the keys failed.')
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  function openDialog() {
    setName('')
    setExpiry('never')
    setCreateError(null)
    setNewKey(null)
    setCopied(false)
    setOpen(true)
  }

  function closeDialog() {
    setOpen(false)
    setNewKey(null) // plný klíč už nikdy nezobrazíme
  }

  async function create() {
    if (!name.trim()) {
      setCreateError('Enter a key name.')
      return
    }
    setCreating(true)
    setCreateError(null)
    try {
      const days = EXPIRY_OPTIONS.find((o) => o.value === expiry)?.days ?? null
      const res = await fetch('/api/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          scopes: canRead ? ['read'] : [],
          expires_at: days ? new Date(Date.now() + days * 86400000).toISOString() : null,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? 'Creating the key failed.')
      setNewKey(data.key)
      await load()
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : 'Creating the key failed.')
    } finally {
      setCreating(false)
    }
  }

  async function copy() {
    if (!newKey) return
    try {
      await navigator.clipboard.writeText(newKey)
      setCopied(true)
    } catch {
      toast.add({ type: 'error', title: 'Copying failed, copy the key manually.' })
    }
  }

  async function revoke(k: ApiKeyRow) {
    if (!window.confirm(`Revoke the key "${k.name}"? Applications using it will stop working.`)) return
    setRevoking(k.id)
    try {
      const res = await fetch(`/api/api-keys/${k.id}`, { method: 'DELETE' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? 'Revoking failed.')
      toast.add({ type: 'success', title: 'Key revoked' })
      await load()
    } catch (e) {
      toast.add({
        type: 'error',
        title: 'Revoking failed',
        description: e instanceof Error ? e.message : undefined,
      })
    } finally {
      setRevoking(null)
    }
  }

  const statusOf = (k: ApiKeyRow) =>
    !k.is_active
      ? { label: 'Revoked', variant: 'outline' as const }
      : k.expires_at && new Date(k.expires_at) <= new Date()
        ? { label: 'Expired', variant: 'outline' as const }
        : { label: 'Active', variant: 'default' as const }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>API keys</CardTitle>
          <CardDescription>
            Access your Receptio data from your own applications.{' '}
            <Link href="/api-docs" target="_blank" className="underline">
              API documentation
            </Link>
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Button className="self-start" onClick={openDialog}>
            <Plus /> Create API key
          </Button>

          {loadError ? (
            <p className="text-sm text-destructive">{loadError}</p>
          ) : !keys ? (
            <Skeleton className="h-24 rounded-xl" />
          ) : keys.length === 0 ? (
            <p className="text-sm text-muted-foreground">You do not have any API keys yet</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Prefix</TableHead>
                  <TableHead>Scope</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Last used</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {keys.map((k) => {
                  const st = statusOf(k)
                  return (
                    <TableRow key={k.id} className={st.label === 'Active' ? undefined : 'opacity-60'}>
                      <TableCell className="font-medium">
                        {k.name} <Badge variant={st.variant}>{st.label}</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{k.key_prefix}…</TableCell>
                      <TableCell>{k.scopes.map((s) => SCOPE_LABELS[s] ?? s).join(', ')}</TableCell>
                      <TableCell className="whitespace-nowrap">{fmt(k.created_at)}</TableCell>
                      <TableCell className="whitespace-nowrap">{fmt(k.last_used_at)}</TableCell>
                      <TableCell className="text-right">
                        {k.is_active && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive"
                            disabled={revoking !== null}
                            onClick={() => revoke(k)}
                          >
                            {revoking === k.id ? 'Revoking…' : 'Revoke'}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={(o) => !o && !creating && closeDialog()}>
        <DialogContent>
          {newKey ? (
            <>
              <DialogHeader>
                <DialogTitle>API key created</DialogTitle>
                <DialogDescription>This key is shown only once. Store it in a safe place.</DialogDescription>
              </DialogHeader>
              <div className="flex gap-2">
                <Input readOnly value={newKey} className="font-mono text-xs" onFocus={(e) => e.currentTarget.select()} aria-label="API key" />
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
                <DialogTitle>Create API key</DialogTitle>
                <DialogDescription>The key lets you read your calls and agents through the REST API.</DialogDescription>
              </DialogHeader>
              <div className="flex flex-col gap-2">
                <Label htmlFor="keyName">Key name</Label>
                <Input id="keyName" value={name} maxLength={100} onChange={(e) => setName(e.target.value)} placeholder="e.g. Booking system" autoFocus />
              </div>
              <div className="flex flex-col gap-2">
                <Label>Scope</Label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={canRead} disabled className="size-4" />
                  Read
                </label>
              </div>
              <div className="flex flex-col gap-2">
                <Label>Expires</Label>
                <Select value={expiry} items={EXPIRY_OPTIONS} onValueChange={(v) => v && setExpiry(v)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPIRY_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {createError && <p className="text-sm text-destructive">{createError}</p>}
              <DialogFooter>
                <Button variant="outline" onClick={closeDialog} disabled={creating}>
                  Cancel
                </Button>
                <Button onClick={create} disabled={creating}>
                  {creating && <Loader2 className="animate-spin" />}
                  Create key
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
