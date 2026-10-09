'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Armchair, Bed, DoorOpen, GripVertical, Loader2, Plus, Shapes, Table2, Trash2, type LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardIcon, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { toast } from '@/components/ui/toast'
import { useBookingResources } from '@/hooks/use-bookings'
import { cn } from '@/lib/utils'
import type { BookingResource, ResourceType } from '@/types'

export const RESOURCE_TYPES: { id: ResourceType; icon: LucideIcon }[] = [
  { id: 'table', icon: Table2 },
  { id: 'chair', icon: Armchair },
  { id: 'room', icon: DoorOpen },
  { id: 'seat', icon: Bed },
  { id: 'custom', icon: Shapes },
]

/** Barva zdroje v kalendáři (podle pořadí); text a ikona zůstávají v textových barvách. */
export const RESOURCE_COLORS = ['#2a78d6', '#eb6834', '#1baf7a', '#e87ba4', '#4a3aa7', '#eda100', '#008300', '#e34948']
export const resourceColor = (index: number) => RESOURCE_COLORS[((index % RESOURCE_COLORS.length) + RESOURCE_COLORS.length) % RESOURCE_COLORS.length]

/**
 * Správa zdrojů (zdrojový režim): řazení tažením za úchyt (nebo tlačítky), úprava názvu, typu, kapacity a popisu přímo v řádku,
 * zapnutí / vypnutí a smazání. Nový zdroj se přidává v dialogu.
 */
export function BookingResourcesPanel({ agentId }: { agentId: string }) {
  const t = useTranslations('calendar')
  const r = useBookingResources(agentId)
  const [addOpen, setAddOpen] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [dragId, setDragId] = useState<string | null>(null)
  const [overId, setOverId] = useState<string | null>(null)

  async function run(id: string, fn: () => Promise<unknown>) {
    setBusy(id)
    try {
      await fn()
    } catch (e) {
      toast.add({ type: 'error', title: t('res.failed'), description: e instanceof Error ? e.message : undefined })
      void r.reload()
    } finally {
      setBusy(null)
    }
  }

  const move = (from: number, to: number) => {
    if (to < 0 || to >= r.resources.length || from === to) return
    const next = [...r.resources]
    const [item] = next.splice(from, 1)
    next.splice(to, 0, item)
    void run(item.id, () => r.reorder(next))
  }
  const commit = (res: BookingResource, field: 'name' | 'description' | 'capacity', value: string) => {
    const trimmed = value.trim()
    if (field === 'name' && !trimmed) return
    const next = field === 'capacity' ? Math.max(1, Math.min(1000, Math.round(Number(value)) || 1)) : field === 'description' ? trimmed || null : trimmed
    if (next === res[field]) return
    void run(res.id, () => r.update(res.id, { [field]: next }))
  }

  const total = r.resources.filter((x) => x.is_active).reduce((s, x) => s + x.capacity, 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-3">
          <CardIcon icon={Table2} />
          {t('res.title')}
          {r.resources.length > 0 && <span className="text-sm font-normal text-muted-foreground">{t('res.summary', { count: r.resources.filter((x) => x.is_active).length, seats: total })}</span>}
        </CardTitle>
        <CardDescription>{t('res.description')}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {r.error ? (
          <div className="flex flex-col items-start gap-3">
            <p className="text-sm text-destructive">{t('res.loadFailed')}</p>
            <Button variant="outline" onClick={() => void r.reload()}>
              {t('av.retry')}
            </Button>
          </div>
        ) : r.loading && r.resources.length === 0 ? (
          <Skeleton className="h-24 rounded-xl" />
        ) : r.resources.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">{t('res.empty')}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {r.resources.map((res, i) => {
              const Type = RESOURCE_TYPES.find((x) => x.id === res.type)?.icon ?? Shapes
              return (
                <li
                  key={res.id}
                  draggable
                  onDragStart={(e) => {
                    setDragId(res.id)
                    e.dataTransfer.effectAllowed = 'move'
                  }}
                  onDragOver={(e) => {
                    e.preventDefault()
                    setOverId(res.id)
                  }}
                  onDragEnd={() => {
                    setDragId(null)
                    setOverId(null)
                  }}
                  onDrop={(e) => {
                    e.preventDefault()
                    const from = r.resources.findIndex((x) => x.id === dragId)
                    setDragId(null)
                    setOverId(null)
                    move(from, i)
                  }}
                  className={cn('flex flex-wrap items-center gap-3 rounded-xl border bg-muted/40 p-3 transition-colors', overId === res.id && dragId !== res.id ? 'border-primary/60 bg-primary/10' : 'border-border', !res.is_active && 'opacity-60', dragId === res.id && 'opacity-50')}
                >
                  <span className="flex shrink-0 cursor-grab items-center text-muted-foreground active:cursor-grabbing" aria-hidden title={t('res.drag')}>
                    <GripVertical className="size-4" />
                  </span>
                  <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: resourceColor(i) }} aria-hidden />
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/12 text-primary ring-1 ring-primary/20" aria-hidden>
                    <Type className="size-4" strokeWidth={1.75} />
                  </span>
                  <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-[minmax(8rem,1.2fr)_9rem_5.5rem_minmax(8rem,1.5fr)]">
                    <Input defaultValue={res.name} maxLength={100} aria-label={t('res.name')} onBlur={(e) => commit(res, 'name', e.target.value)} onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()} />
                    <select
                      value={res.type}
                      aria-label={t('res.type')}
                      onChange={(e) => void run(res.id, () => r.update(res.id, { type: e.target.value as ResourceType }))}
                      className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm dark:bg-white/5"
                    >
                      {RESOURCE_TYPES.map((x) => (
                        <option key={x.id} value={x.id}>
                          {t(`res.types.${x.id}`)}
                        </option>
                      ))}
                    </select>
                    <Input type="number" inputMode="numeric" min={1} max={1000} defaultValue={res.capacity} aria-label={t('res.capacity')} title={t('res.capacity')} onBlur={(e) => commit(res, 'capacity', e.target.value)} onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()} />
                    <Input defaultValue={res.description ?? ''} maxLength={300} placeholder={t('res.descriptionPlaceholder')} aria-label={t('res.descriptionLabel')} onBlur={(e) => commit(res, 'description', e.target.value)} onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()} />
                  </div>
                  <div className="flex items-center gap-1">
                    <Switch checked={res.is_active} disabled={busy === res.id} onCheckedChange={(v) => void run(res.id, () => r.update(res.id, { is_active: v }))} aria-label={`${res.name}: ${t('res.active')}`} />
                    <Button type="button" variant="ghost" size="icon-sm" disabled={i === 0 || busy !== null} aria-label={t('res.moveUp')} onClick={() => move(i, i - 1)}>
                      <span aria-hidden>↑</span>
                    </Button>
                    <Button type="button" variant="ghost" size="icon-sm" disabled={i === r.resources.length - 1 || busy !== null} aria-label={t('res.moveDown')} onClick={() => move(i, i + 1)}>
                      <span aria-hidden>↓</span>
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="text-destructive"
                      disabled={busy === res.id}
                      aria-label={t('res.delete')}
                      onClick={() => {
                        if (window.confirm(t('res.deleteConfirm', { name: res.name }))) void run(res.id, () => r.remove(res.id))
                      }}
                    >
                      {busy === res.id ? <Loader2 className="animate-spin" /> : <Trash2 />}
                    </Button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
        <div>
          <Button type="button" variant="outline" onClick={() => setAddOpen(true)}>
            <Plus /> {t('res.add')}
          </Button>
        </div>
      </CardContent>
      <AddResourceDialog open={addOpen} onOpenChange={setAddOpen} onCreate={r.create} />
    </Card>
  )
}

function AddResourceDialog({ open, onOpenChange, onCreate }: { open: boolean; onOpenChange: (o: boolean) => void; onCreate: (input: { name: string; type: ResourceType; capacity: number; description: string | null }) => Promise<unknown> }) {
  const t = useTranslations('calendar')
  const [name, setName] = useState('')
  const [type, setType] = useState<ResourceType>('table')
  const [capacity, setCapacity] = useState('2')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await onCreate({ name: name.trim(), type, capacity: Math.max(1, Math.min(1000, Math.round(Number(capacity)) || 1)), description: description.trim() || null })
      setName('')
      setDescription('')
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('res.failed'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !saving && onOpenChange(o)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('res.add')}</DialogTitle>
          <DialogDescription>{t('res.addHint')}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="rs-name">{t('res.name')}</Label>
            <Input id="rs-name" required maxLength={100} value={name} onChange={(e) => setName(e.target.value)} autoFocus placeholder={t('res.namePlaceholder')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="rs-type">{t('res.type')}</Label>
              <select id="rs-type" value={type} onChange={(e) => setType(e.target.value as ResourceType)} className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm dark:bg-white/5">
                {RESOURCE_TYPES.map((x) => (
                  <option key={x.id} value={x.id}>
                    {t(`res.types.${x.id}`)}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="rs-cap">{t('res.capacity')}</Label>
              <Input id="rs-cap" type="number" inputMode="numeric" min={1} max={1000} value={capacity} onChange={(e) => setCapacity(e.target.value)} />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="rs-desc">{t('res.descriptionLabel')}</Label>
            <Input id="rs-desc" maxLength={300} value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t('res.descriptionPlaceholder')} />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" disabled={saving} onClick={() => onOpenChange(false)}>
              {t('close')}
            </Button>
            <Button type="submit" disabled={saving || !name.trim()}>
              {saving && <Loader2 className="animate-spin" />} {t('res.create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
