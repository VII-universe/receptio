'use client'

import { useState } from 'react'
import { ArrowDown, ArrowUp, Check, Loader2, Pencil, Plus, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/components/ui/toast'
import { KNOWLEDGE_CATEGORIES, MAX_CONTENT, MAX_TITLE } from '@/lib/agents/knowledge'
import { cn } from '@/lib/utils'
import type { KnowledgeCategory, KnowledgeEntry } from '@/types'

type Sync = { ok: true; syncedAt: string } | { ok: false; reason: string }

export function KnowledgeManager({
  agentId,
  initialEntries,
  initialSyncedAt,
  vapiLinked,
}: {
  agentId: string
  initialEntries: KnowledgeEntry[]
  initialSyncedAt: string | null
  vapiLinked: boolean
}) {
  const [entries, setEntries] = useState(initialEntries)
  const [category, setCategory] = useState<KnowledgeCategory>('basic_info')
  const [syncedAt, setSyncedAt] = useState(initialSyncedAt)
  const [busy, setBusy] = useState<string | null>(null) // id záznamu / 'add' / 'sync' / 'reorder'

  const [editing, setEditing] = useState<{ id: string; title: string; content: string } | null>(null)
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState({ title: '', content: '' })

  const base = `/api/agents/${agentId}`
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
    if (!res.ok) throw new Error(data.error ?? 'Operace se nezdařila.')
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
          ? 'Synchronizace s Vapi selhala, zkuste ji spustit ručně.'
          : 'Agent není propojený s Vapi, změna se neodeslala.',
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
      handleSync(data.sync, 'Záznam přidán')
    } catch (e) {
      fail('Záznam se nepodařilo přidat', e)
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
      handleSync(data.sync, 'Záznam uložen')
    } catch (e) {
      fail('Uložení se nepodařilo', e)
    } finally {
      setBusy(null)
    }
  }

  async function remove(entry: KnowledgeEntry) {
    if (!window.confirm(`Smazat záznam „${entry.title}“?`)) return
    setBusy(entry.id)
    try {
      const data = await call(`${base}/knowledge/${entry.id}`, { method: 'DELETE' })
      setEntries((es) => es.filter((e) => e.id !== entry.id))
      handleSync(data.sync, 'Záznam smazán')
    } catch (e) {
      fail('Smazání se nepodařilo', e)
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
      handleSync(data.sync, 'Pořadí změněno')
    } catch (e) {
      fail('Změna pořadí se nepodařila', e)
    } finally {
      setBusy(null)
    }
  }

  async function syncNow() {
    setBusy('sync')
    try {
      const data = await call(`${base}/sync-vapi`, { method: 'POST' })
      setSyncedAt(data.synced_at)
      toast.add({ type: 'success', title: 'Synchronizováno s Vapi' })
    } catch (e) {
      fail('Synchronizace selhala', e)
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
                <span className="text-sm font-medium">{c.label}</span>
                <span className="text-xs text-muted-foreground">{c.hint}</span>
              </span>
              <span className="text-xs text-muted-foreground">{count(c.id)}</span>
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-3 md:col-span-2">
          <h2 className="text-lg font-semibold">
            {cat.icon} {cat.label}
          </h2>

          {list.length === 0 && !adding && (
            <p className="text-sm text-muted-foreground">V této sekci zatím nejsou žádné záznamy.</p>
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
                      aria-label="Název"
                    />
                    <Textarea
                      rows={4}
                      value={editing.content}
                      maxLength={MAX_CONTENT}
                      onChange={(ev) => setEditing({ ...editing, content: ev.target.value })}
                      aria-label="Obsah"
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={saveEdit} disabled={busy !== null}>
                        {busy === e.id ? <Loader2 className="animate-spin" /> : <Check />} Uložit
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setEditing(null)} disabled={busy !== null}>
                        <X /> Zrušit
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
                        aria-label="Posunout nahoru"
                        disabled={i === 0 || busy !== null}
                        onClick={() => move(i, -1)}
                      >
                        <ArrowUp />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Posunout dolů"
                        disabled={i === list.length - 1 || busy !== null}
                        onClick={() => move(i, 1)}
                      >
                        <ArrowDown />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Upravit"
                        disabled={busy !== null}
                        onClick={() => setEditing({ id: e.id, title: e.title, content: e.content })}
                      >
                        <Pencil />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Smazat"
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

          {adding ? (
            <Card>
              <CardContent className="flex flex-col gap-2">
                <Input
                  placeholder={category === 'faq' ? 'Otázka' : 'Název (např. Adresa)'}
                  value={draft.title}
                  maxLength={MAX_TITLE}
                  onChange={(ev) => setDraft({ ...draft, title: ev.target.value })}
                  aria-label="Název"
                  autoFocus
                />
                <Textarea
                  placeholder={category === 'faq' ? 'Odpověď' : 'Obsah'}
                  rows={4}
                  value={draft.content}
                  maxLength={MAX_CONTENT}
                  onChange={(ev) => setDraft({ ...draft, content: ev.target.value })}
                  aria-label="Obsah"
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={add} disabled={busy !== null || !draft.title.trim() || !draft.content.trim()}>
                    {busy === 'add' && <Loader2 className="animate-spin" />} Přidat
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setAdding(false)} disabled={busy !== null}>
                    Zrušit
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Button variant="outline" className="self-start" onClick={() => setAdding(true)} disabled={busy !== null}>
              <Plus /> Přidat záznam
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4 text-sm">
        <span className="text-muted-foreground">
          Vapi synchronizace:{' '}
          {syncedAt
            ? new Date(syncedAt).toLocaleString('cs-CZ', { timeZone: 'Europe/Prague', dateStyle: 'short', timeStyle: 'short' })
            : 'zatím neproběhla'}
        </span>
        <Button size="sm" variant="outline" onClick={syncNow} disabled={busy !== null || !vapiLinked}>
          {busy === 'sync' && <Loader2 className="animate-spin" />}
          Synchronizovat s Vapi
        </Button>
      </div>
    </div>
  )
}
