'use client'

import Link from 'next/link'
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
  { value: 'never', days: null },
  { value: '30', days: 30 },
  { value: '90', days: 90 },
  { value: '365', days: 365 },
]

export function ApiKeysTab() {
  const t = useTranslations('settings')
  const tc = useTranslations('common')
  const locale = useLocale()
  const fmt = (iso: string | null) =>
    iso ? new Date(iso).toLocaleString(locale, { timeZone: 'Europe/Prague', dateStyle: 'short', timeStyle: 'short' }) : '–'
  const expiryOptions = EXPIRY_OPTIONS.map((o) => ({ ...o, label: t(`expiry.${o.value}`) }))
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
      if (!res.ok) throw new Error(data.error ?? t('keysLoadFailed'))
      setKeys(data.keys)
      setLoadError(null)
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : t('keysLoadFailed'))
    }
  }, [t])

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
      setCreateError(t('enterKeyName'))
      return
    }
    setCreating(true)
    setCreateError(null)
    try {
      const days = expiryOptions.find((o) => o.value === expiry)?.days ?? null
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
      if (!res.ok) throw new Error(data.error ?? t('keyCreateFailed'))
      setNewKey(data.key)
      await load()
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : t('keyCreateFailed'))
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
      toast.add({ type: 'error', title: t('copyFailed') })
    }
  }

  async function revoke(k: ApiKeyRow) {
    if (!window.confirm(t('revokeConfirm', { name: k.name }))) return
    setRevoking(k.id)
    try {
      const res = await fetch(`/api/api-keys/${k.id}`, { method: 'DELETE' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? t('revokeFailed'))
      toast.add({ type: 'success', title: t('keyRevoked') })
      await load()
    } catch (e) {
      toast.add({
        type: 'error',
        title: t('revokeFailed'),
        description: e instanceof Error ? e.message : undefined,
      })
    } finally {
      setRevoking(null)
    }
  }

  const statusOf = (k: ApiKeyRow) =>
    !k.is_active
      ? { id: 'revoked', label: t('keyRevokedStatus'), variant: 'outline' as const }
      : k.expires_at && new Date(k.expires_at) <= new Date()
        ? { id: 'expired', label: t('keyExpired'), variant: 'outline' as const }
        : { id: 'active', label: t('keyActive'), variant: 'default' as const }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>{t('apiKeys')}</CardTitle>
          <CardDescription>
            {t('apiKeysDesc')}{' '}
            <Link href="/api-docs" target="_blank" className="underline">
              {t('apiDocs')}
            </Link>
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Button className="self-start" onClick={openDialog}>
            <Plus /> {t('newApiKey')}
          </Button>

          {loadError ? (
            <p className="text-sm text-destructive">{loadError}</p>
          ) : !keys ? (
            <Skeleton className="h-24 rounded-xl" />
          ) : keys.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('noKeys')}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('colName')}</TableHead>
                  <TableHead>{t('colPrefix')}</TableHead>
                  <TableHead>{t('colScope')}</TableHead>
                  <TableHead>{t('colCreated')}</TableHead>
                  <TableHead>{t('colLastUsed')}</TableHead>
                  <TableHead className="text-right">{t('colActions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {keys.map((k) => {
                  const st = statusOf(k)
                  return (
                    <TableRow key={k.id} className={st.id === 'active' ? undefined : 'opacity-60'}>
                      <TableCell className="font-medium">
                        {k.name} <Badge variant={st.variant}>{st.label}</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{k.key_prefix}…</TableCell>
                      <TableCell>{k.scopes.map((s) => (s === 'read' || s === 'write' ? t(`scope.${s}`) : s)).join(', ')}</TableCell>
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
                            {revoking === k.id ? t('revoking') : t('revoke')}
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
                <DialogTitle>{t('keyCreatedTitle')}</DialogTitle>
                <DialogDescription>{t('keyCreated')}</DialogDescription>
              </DialogHeader>
              <div className="flex gap-2">
                <Input readOnly value={newKey} className="font-mono text-xs" onFocus={(e) => e.currentTarget.select()} aria-label={t('apiKeyLabel')} />
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
                <DialogTitle>{t('newApiKey')}</DialogTitle>
                <DialogDescription>{t('newKeyDesc')}</DialogDescription>
              </DialogHeader>
              <div className="flex flex-col gap-2">
                <Label htmlFor="keyName">{t('keyName')}</Label>
                <Input id="keyName" value={name} maxLength={100} onChange={(e) => setName(e.target.value)} placeholder={t('keyNamePlaceholder')} autoFocus />
              </div>
              <div className="flex flex-col gap-2">
                <Label>{t('colScope')}</Label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={canRead} disabled className="size-4" />
                  {t('scope.read')}
                </label>
              </div>
              <div className="flex flex-col gap-2">
                <Label>{t('expires')}</Label>
                <Select value={expiry} items={expiryOptions} onValueChange={(v) => v && setExpiry(v)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {expiryOptions.map((o) => (
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
                  {tc('cancel')}
                </Button>
                <Button onClick={create} disabled={creating}>
                  {creating && <Loader2 className="animate-spin" />}
                  {t('createKey')}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
