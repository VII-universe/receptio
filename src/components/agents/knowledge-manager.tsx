'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { ArrowDown, ArrowUp, Check, Loader2, Pencil, Plus, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/components/ui/toast'
import { UpgradePrompt } from '@/components/upgrade-prompt'
import { ApiError } from '@/lib/api-error'
import { parseLimitError, type LimitInfo } from '@/lib/billing/limit-error'
import { KNOWLEDGE_CATEGORIES, MAX_CONTENT, MAX_TITLE } from '@/lib/agents/knowledge'
import { DAY_ORDER, fillWorkingHours } from '@/lib/agents/working-hours'
import { cn } from '@/lib/utils'
import type { KnowledgeCategory, KnowledgeEntry, WorkingHour } from '@/types'

type Sync = { ok: true; syncedAt: string } | { ok: false; reason: string }

export function KnowledgeManager({
  agentId,
  initialEntries,
  initialSyncedAt,
  vapiLinked,
  onOpenWorkingHours,
  refreshToken = 0,
}: {
  agentId: string
  initialEntries: KnowledgeEntry[]
  initialSyncedAt: string | null
  vapiLinked: boolean
  /** Přepne na záložku Pracovní doba; bez něj se zobrazí odkaz s ?tab=pracovni-doba. */
  onOpenWorkingHours?: () => void
  /** Změna hodnoty vyvolá znovunačtení pracovní doby (např. po návratu na záložku). */
  refreshToken?: number
}) {
  const t = useTranslations('knowledge')
  const tc = useTranslations('common')
  const ta = useTranslations('agents')
  const locale = useLocale()
  const [entries, setEntries] = useState(initialEntries)
  const [category, setCategory] = useState<KnowledgeCategory>('basic_info')
  const [syncedAt, setSyncedAt] = useState(initialSyncedAt)
  const [busy, setBusy] = useState<string | null>(null) // id záznamu / 'add' / 'sync' / 'reorder'

  const [editing, setEditing] = useState<{ id: string; title: string; content: string } | null>(null)
  const [adding, setAdding] = useState(false)
  const [limit, setLimit] = useState<LimitInfo | null>(null)
  const [draft, setDraft] = useState({ title: '', content: '' })

  const base = `/api/agents/${agentId}`

  // Pracovní doba jen pro čtení (upravuje se v záložce Pracovní doba).
  const [hoursView, setHoursView] = useState<WorkingHour[] | null>(null)
  const [hoursError, setHoursError] = useState(false)
  useEffect(() => {
    let cancelled = false
    fetch(`/api/agents/${agentId}/working-hours`)
      .then(async (res) => {
        if (!res.ok) throw new Error()
        const body = await res.json()
        if (!cancelled) {
          setHoursView(fillWorkingHours(body.hours))
          setHoursError(false)
        }
      })
      .catch(() => {
        if (!cancelled) setHoursError(true)
      })
    return () => {
      cancelled = true
    }
  }, [agentId, refreshToken])
  const list = entries
    .filter((e) => e.category === category)
    .sort((a, b) => a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at))
  const cat = KNOWLEDGE_CATEGORIES.find((c) => c.id === category)!

  async function call(url: string, init?: RequestInit) {
    const res = await fetch(url, {
      ...init,
      headers: { 'Content-Type': 'application/json' },
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new ApiError(data.error ?? t('operationFailed'), data, res.status)
    return data
  }

  // Záznam je uložený i při selhání synchronizace – uživatele jen upozorníme.
  function handleSync(sync: Sync | undefined, okTitle: string) {
    if (sync?.ok) {
      setSyncedAt(sync.syncedAt)
      toast.add({ type: 'success', title: okTitle })
    } else {
      toast.add({
        type: 'warning',
        title: okTitle,
        description: vapiLinked
          ? t('syncFailedManual')
          : t('notLinked'),
      })
    }
  }

  function fail(title: string, e: unknown) {
    toast.add({ type: 'error', title, description: e instanceof Error ? e.message : undefined })
  }

  async function add() {
    if (!draft.title.trim() || !draft.content.trim()) return
    setBusy('add')
    try {
      const data = await call(`${base}/knowledge`, {
        method: 'POST',
        body: JSON.stringify({ category, title: draft.title, content: draft.content }),
      })
      setEntries((es) => [...es, data.entry])
      setDraft({ title: '', content: '' })
      setAdding(false)
      setLimit(null)
      handleSync(data.sync, t('entryAdded'))
    } catch (e) {
      const limitInfo = e instanceof ApiError ? parseLimitError(e.body) : null
      if (limitInfo) setLimit(limitInfo)
      else fail(t('addFailed'), e)
    } finally {
      setBusy(null)
    }
  }

  async function saveEdit() {
    if (!editing || !editing.title.trim() || !editing.content.trim()) return
    setBusy(editing.id)
    try {
      const data = await call(`${base}/knowledge/${editing.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ title: editing.title, content: editing.content }),
      })
      setEntries((es) => es.map((e) => (e.id === editing.id ? data.entry : e)))
      setEditing(null)
      handleSync(data.sync, t('entrySaved'))
    } catch (e) {
      fail(ta('saveFailed'), e)
    } finally {
      setBusy(null)
    }
  }

  async function remove(entry: KnowledgeEntry) {
    if (!window.confirm(t('deleteConfirm', { title: entry.title }))) return
    setBusy(entry.id)
    try {
      const data = await call(`${base}/knowledge/${entry.id}`, { method: 'DELETE' })
      setEntries((es) => es.filter((e) => e.id !== entry.id))
      handleSync(data.sync, t('entryDeleted'))
    } catch (e) {
      fail(ta('deleteFailed'), e)
    } finally {
      setBusy(null)
    }
  }

  async function move(index: number, dir: -1 | 1) {
    const ids = list.map((e) => e.id)
    const target = index + dir
    if (target < 0 || target >= ids.length) return
    ;[ids[index], ids[target]] = [ids[target], ids[index]]
    setBusy('reorder')
    try {
      const data = await call(`${base}/knowledge/reorder`, { method: 'POST', body: JSON.stringify({ orderedIds: ids }) })
      setEntries(data.entries)
      handleSync(data.sync, t('orderChanged'))
    } catch (e) {
      fail(t('orderFailed'), e)
    } finally {
      setBusy(null)
    }
  }

  async function syncNow() {
    setBusy('sync')
    try {
      const data = await call(`${base}/sync-vapi`, { method: 'POST' })
      setSyncedAt(data.synced_at)
      toast.add({ type: 'success', title: ta('hoursSyncedToast') })
    } catch (e) {
      fail(t('syncFailed'), e)
    } finally {
      setBusy(null)
    }
  }

  const count = (id: KnowledgeCategory) => entries.filter((e) => e.category === id).length

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-6 md:grid-cols-3">
        <div className="flex flex-col gap-2">
          {KNOWLEDGE_CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => {
                setCategory(c.id)
                setEditing(null)
                setAdding(false)
              }}
              aria-pressed={category === c.id}
              className={cn(
                'flex items-center gap-3 rounded-xl border-2 p-3 text-left transition-colors hover:bg-muted/60',
                category === c.id ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/30' : 'border-border'
              )}
            >
              <span className="text-xl" aria-hidden>
                {c.icon}
              </span>
              <span className="flex flex-1 flex-col">
                <span className="text-sm font-medium">{t(`cat.${c.id}.label`)}</span>
                <span className="text-xs text-muted-foreground">{t(`cat.${c.id}.hint`)}</span>
              </span>
              <span className="text-xs text-muted-foreground">{count(c.id)}</span>
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-3 md:col-span-2">
          <h2 className="text-lg font-semibold">
            {cat.icon} {t(`cat.${cat.id}.label`)}
          </h2>

          {category === 'hours' && (
            <p className="text-sm text-muted-foreground">
              {t('hoursHint')}
            </p>
          )}

          {list.length === 0 && !adding && (
            <p className="text-sm text-muted-foreground">
              {category === 'hours' ? t('noExceptions') : t('noEntries')}
            </p>
          )}

          {list.map((e, i) => (
            <Card key={e.id}>
              <CardContent className="flex flex-col gap-2">
                {editing?.id === e.id ? (
                  <>
                    <Input
                      value={editing.title}
                      maxLength={MAX_TITLE}
                      onChange={(ev) => setEditing({ ...editing, title: ev.target.value })}
                      aria-label={t('titleLabel')}
                    />
                    <Textarea
                      rows={4}
                      value={editing.content}
                      maxLength={MAX_CONTENT}
                      onChange={(ev) => setEditing({ ...editing, content: ev.target.value })}
                      aria-label={t('contentLabel')}
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={saveEdit} disabled={busy !== null}>
                        {busy === e.id ? <Loader2 className="animate-spin" /> : <Check />} {tc('save')}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setEditing(null)} disabled={busy !== null}>
                        <X /> {tc('cancel')}
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold">{e.title}</div>
                      <div className="whitespace-pre-line text-sm text-muted-foreground">{e.content}</div>
                    </div>
                    <div className="flex shrink-0 items-center">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={t('moveUp')}
                        disabled={i === 0 || busy !== null}
                        onClick={() => move(i, -1)}
                      >
                        <ArrowUp />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={t('moveDown')}
                        disabled={i === list.length - 1 || busy !== null}
                        onClick={() => move(i, 1)}
                      >
                        <ArrowDown />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={tc('edit')}
                        disabled={busy !== null}
                        onClick={() => setEditing({ id: e.id, title: e.title, content: e.content })}
                      >
                        <Pencil />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={tc('delete')}
                        className="text-destructive"
                        disabled={busy !== null}
                        onClick={() => remove(e)}
                      >
                        {busy === e.id ? <Loader2 className="animate-spin" /> : <Trash2 />}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}

          {category === 'hours' && (
            <Card>
              <CardContent className="flex flex-col gap-2 text-sm">
                {hoursError ? (
                  <p className="text-muted-foreground">{t('hoursLoadFailed')}</p>
                ) : !hoursView ? (
                  <p className="text-muted-foreground">{t('hoursLoading')}</p>
                ) : (
                  <ul className="flex flex-col gap-1" aria-label={t('hoursAria')}>
                    {DAY_ORDER.map(({ day }) => {
                      const h = hoursView.find((x) => x.day_of_week === day)!
                      return (
                        <li key={day} className="flex gap-2">
                          <span className="w-8 font-medium">{ta(`daysShort.${day}`)}:</span>
                          <span className={h.is_open ? undefined : 'text-muted-foreground'}>
                            {!h.is_open
                              ? ta('closed')
                              : h.open_time && h.close_time
                                ? `${h.open_time}–${h.close_time}`
                                : t('openAllDay')}
                          </span>
                        </li>
                      )
                    })}
                  </ul>
                )}
                <p className="text-xs text-muted-foreground">
                  {onOpenWorkingHours ? (
                    <button type="button" className="underline hover:text-foreground" onClick={onOpenWorkingHours}>
                      {t('editHours')}
                    </button>
                  ) : (
                    <Link href={`/dashboard/agents/${agentId}?tab=pracovni-doba`} className="underline hover:text-foreground">
                      {t('editHours')}
                    </Link>
                  )}
                </p>
              </CardContent>
            </Card>
          )}

          {limit && <UpgradePrompt {...limit} />}

          {adding ? (
            <Card>
              <CardContent className="flex flex-col gap-2">
                <Input
                  placeholder={category === 'faq' ? t('question') : t('titlePlaceholder')}
                  value={draft.title}
                  maxLength={MAX_TITLE}
                  onChange={(ev) => setDraft({ ...draft, title: ev.target.value })}
                  aria-label={t('titleLabel')}
                  autoFocus
                />
                <Textarea
                  placeholder={category === 'faq' ? t('answer') : t('contentLabel')}
                  rows={4}
                  value={draft.content}
                  maxLength={MAX_CONTENT}
                  onChange={(ev) => setDraft({ ...draft, content: ev.target.value })}
                  aria-label={t('contentLabel')}
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={add} disabled={busy !== null || !draft.title.trim() || !draft.content.trim()}>
                    {busy === 'add' && <Loader2 className="animate-spin" />} {tc('add')}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setAdding(false)} disabled={busy !== null}>
                    {tc('cancel')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Button variant="outline" className="self-start" onClick={() => setAdding(true)} disabled={busy !== null}>
              <Plus /> {t('addEntry')}
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4 text-sm">
        <span className="text-muted-foreground">
          {t('syncLabel')}{' '}
          {syncedAt
            ? new Date(syncedAt).toLocaleString(locale, { timeZone: 'Europe/Prague', dateStyle: 'short', timeStyle: 'short' })
            : t('notSynced')}
        </span>
        <Button size="sm" variant="outline" onClick={syncNow} disabled={busy !== null || !vapiLinked}>
          {busy === 'sync' && <Loader2 className="animate-spin" />}
          {t('syncNow')}
        </Button>
      </div>
    </div>
  )
}
