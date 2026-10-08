'use client'

import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { CalendarDays, Check, Cloud, Copy, Link2, Loader2, Plus, RefreshCw, Rss, Server, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardIcon, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { toast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'
import type { CalendarConnection, CalendarProvider } from '@/types'

const ICONS: Record<CalendarProvider, typeof Cloud> = { google: CalendarDays, ical: Link2, caldav: Server }
const TILE: Record<CalendarProvider, string> = {
  google: 'from-sky-400/25 to-blue-600/10 text-sky-500 ring-sky-400/25',
  ical: 'from-orange-400/25 to-orange-600/10 text-orange-500 ring-orange-400/25',
  caldav: 'from-violet-400/25 to-fuchsia-600/10 text-violet-500 ring-violet-400/25',
}

/** Napojené kalendáře workspace (Google, iCal feed, CalDAV): přidání, synchronizace, odpojení. */
export function CalendarsTab() {
  const t = useTranslations('calendar')
  const locale = useLocale()
  const params = useSearchParams()
  const [connections, setConnections] = useState<CalendarConnection[] | null>(null)
  const [googleAvailable, setGoogleAvailable] = useState(false)
  const [error, setError] = useState(false)
  const [syncing, setSyncing] = useState<string | null>(null)
  const [removing, setRemoving] = useState<string | null>(null)
  const [dialog, setDialog] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/workspace/calendar-connections')
      if (!res.ok) throw new Error()
      const data = await res.json()
      setConnections(data.connections)
      setGoogleAvailable(data.googleAvailable)
      setError(false)
    } catch {
      setError(true)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  // Výsledek návratu z Google OAuth (?calendar=connected|cancelled|failed|denied).
  const oauth = params.get('calendar')
  useEffect(() => {
    if (oauth && ['connected', 'cancelled', 'failed', 'denied'].includes(oauth)) {
      toast.add({ type: oauth === 'connected' ? 'success' : 'error', title: t(`cal.oauth.${oauth}` as 'cal.oauth.connected') })
    }
  }, [oauth, t])

  async function sync(c: CalendarConnection) {
    setSyncing(c.id)
    try {
      const res = await fetch(`/api/workspace/calendar-connections/${c.id}/sync`, { method: 'POST' })
      toast.add(res.ok ? { type: 'success', title: t('cal.syncOk') } : { type: 'error', title: t('cal.syncFailed') })
    } catch {
      toast.add({ type: 'error', title: t('cal.syncFailed') })
    } finally {
      setSyncing(null)
      void load()
    }
  }

  async function toggle(c: CalendarConnection, enabled: boolean) {
    setConnections((list) => list?.map((x) => (x.id === c.id ? { ...x, sync_enabled: enabled } : x)) ?? null)
    const res = await fetch(`/api/workspace/calendar-connections/${c.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sync_enabled: enabled }) })
    if (!res.ok) {
      toast.add({ type: 'error', title: t('saveFailed') })
      void load()
    }
  }

  async function remove(c: CalendarConnection) {
    if (!window.confirm(t('cal.disconnectConfirm'))) return
    setRemoving(c.id)
    try {
      const res = await fetch(`/api/workspace/calendar-connections/${c.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      toast.add({ type: 'success', title: t('cal.disconnected') })
      await load()
    } catch {
      toast.add({ type: 'error', title: t('saveFailed') })
    } finally {
      setRemoving(null)
    }
  }

  const fmt = (iso: string) => new Intl.DateTimeFormat(locale, { dateStyle: 'short', timeStyle: 'short' }).format(new Date(iso))

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <CardIcon icon={CalendarDays} />
            {t('cal.title')}
          </CardTitle>
          <CardDescription>{t('cal.description')}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Button className="self-start" onClick={() => setDialog(true)}>
            <Plus /> {t('cal.add')}
          </Button>

          {error ? (
            <p className="text-sm text-destructive">{t('loadFailed')}</p>
          ) : !connections ? (
            <Skeleton className="h-24 rounded-xl" />
          ) : connections.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('cal.empty')}</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {connections.map((c) => {
                const Icon = ICONS[c.provider]
                return (
                  <li key={c.id} className="flex flex-wrap items-center gap-4 rounded-xl border border-border bg-muted/40 p-4">
                    <span className={cn('flex size-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ring-1', TILE[c.provider])} aria-hidden>
                      <Icon className="size-5" strokeWidth={1.75} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="truncate font-medium">{c.name}</span>
                        <Badge variant="outline">{t(`cal.provider.${c.provider}`)}</Badge>
                        {c.provider === 'ical' && <Badge variant="secondary">{t('cal.readOnly')}</Badge>}
                      </div>
                      <p className={cn('mt-1 text-xs', c.last_sync_error ? 'text-destructive' : 'text-muted-foreground')}>
                        {c.last_sync_error ? t('cal.syncError', { error: c.last_sync_error }) : c.last_synced_at ? t('cal.lastSync', { time: fmt(c.last_synced_at) }) : t('cal.neverSynced')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch checked={c.sync_enabled} onCheckedChange={(v) => toggle(c, v)} aria-label={c.sync_enabled ? t('cal.syncOn') : t('cal.syncOff')} />
                      <Button variant="outline" size="sm" disabled={syncing === c.id} onClick={() => sync(c)}>
                        {syncing === c.id ? <Loader2 className="animate-spin" /> : <RefreshCw />}
                        {syncing === c.id ? t('cal.syncing') : t('cal.syncNow')}
                      </Button>
                      <Button variant="ghost" size="icon" className="text-destructive" aria-label={t('cal.disconnect')} disabled={removing === c.id} onClick={() => remove(c)}>
                        <Trash2 />
                      </Button>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <FeedCard />

      <AddCalendarDialog
        open={dialog}
        onOpenChange={setDialog}
        googleAvailable={googleAvailable}
        onAdded={() => {
          setDialog(false)
          toast.add({ type: 'success', title: t('cal.connected') })
          void load()
        }}
      />
    </div>
  )
}

function AddCalendarDialog({ open, onOpenChange, googleAvailable, onAdded }: { open: boolean; onOpenChange: (o: boolean) => void; googleAvailable: boolean; onAdded: () => void }) {
  const t = useTranslations('calendar')
  const [provider, setProvider] = useState<CalendarProvider | null>(null)
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setProvider(null)
      setName('')
      setUrl('')
      setUsername('')
      setPassword('')
      setError(null)
    }
  }, [open])

  async function submit(body: Record<string, unknown>) {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/workspace/calendar-connections', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? t('cal.connectFailed'))
      if (data.authUrl) {
        window.location.href = data.authUrl // Google: přesměrování na souhlas
        return
      }
      onAdded()
    } catch (e) {
      setError(e instanceof Error ? e.message : t('cal.connectFailed'))
    } finally {
      setBusy(false)
    }
  }

  const options: { id: CalendarProvider; hint: string; disabled?: boolean }[] = [
    { id: 'google', hint: googleAvailable ? t('cal.googleHint') : t('cal.googleMissing'), disabled: !googleAvailable },
    { id: 'ical', hint: t('cal.icalHint') },
    { id: 'caldav', hint: t('cal.caldavHint') },
  ]

  return (
    <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('cal.add')}</DialogTitle>
          <DialogDescription>{provider ? t(`cal.provider.${provider}`) : t('cal.chooseProvider')}</DialogDescription>
        </DialogHeader>

        {!provider ? (
          <div className="flex flex-col gap-2">
            {options.map((o) => {
              const Icon = ICONS[o.id]
              return (
                <button
                  key={o.id}
                  type="button"
                  disabled={o.disabled}
                  onClick={() => (o.id === 'google' ? void submit({ provider: 'google' }) : setProvider(o.id))}
                  className="flex items-center gap-3 rounded-xl border border-border p-3 text-left transition-colors hover:border-primary/40 hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ring-1', TILE[o.id])} aria-hidden>
                    <Icon className="size-5" strokeWidth={1.75} />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">{t(`cal.provider.${o.id}`)}</span>
                    <span className="block text-xs text-muted-foreground">{o.hint}</span>
                  </span>
                  {busy && o.id === 'google' && <Loader2 className="ml-auto animate-spin" />}
                </button>
              )
            })}
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
        ) : (
          <form
            className="flex flex-col gap-3"
            onSubmit={(e) => {
              e.preventDefault()
              void submit(provider === 'ical' ? { provider, name, url } : { provider, name, url, username, password })
            }}
          >
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cal-name">{t('cal.displayName')}</Label>
              <Input id="cal-name" required maxLength={80} value={name} onChange={(e) => setName(e.target.value)} autoFocus />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cal-url">{provider === 'ical' ? t('cal.icalUrl') : t('cal.caldavUrl')}</Label>
              <Input id="cal-url" required type="text" inputMode="url" placeholder="https://" value={url} onChange={(e) => setUrl(e.target.value)} />
              <p className="text-xs text-muted-foreground">{provider === 'ical' ? t('cal.icalHint') : t('cal.caldavHint')}</p>
            </div>
            {provider === 'caldav' && (
              <>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="cal-user">{t('cal.username')}</Label>
                  <Input id="cal-user" required autoComplete="off" value={username} onChange={(e) => setUsername(e.target.value)} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="cal-pass">{t('cal.password')}</Label>
                  <Input id="cal-pass" required type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
              </>
            )}
            {error && <p className="text-sm text-destructive">{error}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" disabled={busy} onClick={() => setProvider(null)}>
                {t('close')}
              </Button>
              <Button type="submit" disabled={busy}>
                {busy && <Loader2 className="animate-spin" />} {busy ? t('cal.connecting') : t('cal.connect')}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}

/** Odkaz pro odběr kalendáře Receptio v jiných aplikacích (živý iCal feed). */
function FeedCard() {
  const t = useTranslations('calendar')
  const [links, setLinks] = useState<{ https: string; webcal: string } | null>(null)
  const [error, setError] = useState(false)
  const [copied, setCopied] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    fetch('/api/workspace/calendar-feed')
      .then(async (res) => {
        if (!res.ok) throw new Error()
        setLinks(await res.json())
      })
      .catch(() => setError(true))
  }, [])

  async function regenerate() {
    if (!window.confirm(t('sub.regenerateConfirm'))) return
    setBusy(true)
    try {
      const res = await fetch('/api/workspace/calendar-feed', { method: 'POST' })
      if (!res.ok) throw new Error()
      setLinks(await res.json())
      toast.add({ type: 'success', title: t('sub.regenerated') })
    } catch {
      toast.add({ type: 'error', title: t('saveFailed') })
    } finally {
      setBusy(false)
    }
  }

  async function copy() {
    if (!links) return
    try {
      await navigator.clipboard.writeText(links.https)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* schránka nemusí být dostupná; odkaz je v poli k ručnímu zkopírování */
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          <CardIcon icon={Rss} />
          {t('sub.title')}
        </CardTitle>
        <CardDescription>{t('sub.description')}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {error ? (
          <p className="text-sm text-destructive">{t('sub.failed')}</p>
        ) : !links ? (
          <Skeleton className="h-10 rounded-lg" />
        ) : (
          <>
            <Label htmlFor="feed-link">{t('sub.link')}</Label>
            <div className="flex gap-2">
              <Input id="feed-link" readOnly value={links.https} className="font-mono text-xs" onFocus={(e) => e.currentTarget.select()} />
              <Button type="button" variant="outline" onClick={copy}>
                {copied ? <Check /> : <Copy />} {copied ? t('sub.copied') : t('sub.copy')}
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <a href={links.webcal} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border px-2.5 text-sm font-medium transition-colors hover:bg-muted">
                <CalendarDays className="size-4" aria-hidden /> {t('sub.open')}
              </a>
              <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={regenerate}>
                {busy ? <Loader2 className="animate-spin" /> : <RefreshCw />} {t('sub.regenerate')}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">{t('sub.googleHow')}</p>
            <p className="text-xs text-amber-600 dark:text-amber-300">{t('sub.privacy')}</p>
          </>
        )}
      </CardContent>
    </Card>
  )
}
