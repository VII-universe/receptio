'use client'

import { createContext, useCallback, useContext, useEffect, useState, useTransition, type ReactNode } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { ArrowDown, ArrowUp, Eye, EyeOff, RotateCcw, SlidersHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { canStorePreferences } from '@/lib/consent'
import type { AgendaBooking } from '@/lib/bookings/stats'
import { cn } from '@/lib/utils'

const STORAGE_KEY = 'receptio-dashboard-layout'

export interface WidgetDef {
  id: string
  label: string
  span: 'full' | 'wide' | 'narrow' // šířka v 12sloupcové mřížce (full 12, wide 7, narrow 5)
  node: ReactNode
}

interface Layout {
  order: string[]
  hidden: string[]
}

const SPAN: Record<WidgetDef['span'], string> = { full: 'lg:col-span-12', wide: 'lg:col-span-7', narrow: 'lg:col-span-5' }

const PendingContext = createContext(false)
export const useDashboardPending = () => useContext(PendingContext)

/** Sdílený stav agendy: rezervace a vybraný den. Agenda i přehled dne pod grafem čtou totéž, takže spolu reagují. */
interface AgendaState {
  items: AgendaBooking[]
  setItems: React.Dispatch<React.SetStateAction<AgendaBooking[]>>
  day: string | null // null = dnes
  setDay: (day: string | null) => void
  available: boolean // false, když se rezervace nepodařilo načíst
}
const AgendaContext = createContext<AgendaState | null>(null)
export function useAgenda(): AgendaState {
  const ctx = useContext(AgendaContext)
  if (!ctx) throw new Error('useAgenda must be used inside DashboardShell')
  return ctx
}

/**
 * Rámec přehledu: jedna řada filtrů nad obsahem (období a agent), která řídí všechno pod ní, a přizpůsobení
 * rozložení (skrýt / přesunout widgety; pamatuje se v prohlížeči, pokud to souhlas dovolí).
 * Při přenačítání zůstane předchozí obsah na místě mírně zprůhledněný, bez skeletonu a poskakování.
 */
export function DashboardShell({
  range,
  agentId,
  agents,
  widgets,
  agenda,
}: {
  range: number
  agentId: string
  agents: { id: string; name: string }[]
  widgets: WidgetDef[]
  agenda: AgendaBooking[] | null
}) {
  const t = useTranslations('dashboard.ov')
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const [pending, startTransition] = useTransition()
  const defaultOrder = widgets.map((w) => w.id)
  const [layout, setLayout] = useState<Layout>({ order: defaultOrder, hidden: [] })
  const [editing, setEditing] = useState(false)
  const [items, setItems] = useState<AgendaBooking[]>(agenda ?? [])
  const [day, setDay] = useState<string | null>(null)
  // Po obnovení dat ze serveru (filtr, potvrzení) se rezervace převezmou znovu.
  useEffect(() => setItems(agenda ?? []), [agenda])

  useEffect(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? 'null') as Layout | null
      if (saved && Array.isArray(saved.order) && Array.isArray(saved.hidden)) setLayout(saved)
    } catch {
      /* uložené rozložení nemusí být dostupné */
    }
  }, [])

  const save = useCallback((next: Layout) => {
    setLayout(next)
    if (!canStorePreferences()) return // bez souhlasu platí jen do obnovení stránky
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    } catch {
      /* platí jen do obnovení stránky */
    }
  }, [])

  const setParam = (key: string, value: string | null) => {
    const q = new URLSearchParams(params.toString())
    if (value) q.set(key, value)
    else q.delete(key)
    startTransition(() => router.replace(`${pathname}${q.size ? `?${q}` : ''}`, { scroll: false }))
  }

  // Pořadí: uložené, doplněné o nové widgety (a bez těch, které už neexistují).
  const known = new Set(defaultOrder)
  const order = [...layout.order.filter((id) => known.has(id)), ...defaultOrder.filter((id) => !layout.order.includes(id))]
  const byId = new Map(widgets.map((w) => [w.id, w]))
  const move = (id: string, dir: -1 | 1) => {
    const i = order.indexOf(id)
    const j = i + dir
    if (i < 0 || j < 0 || j >= order.length) return
    const next = [...order]
    ;[next[i], next[j]] = [next[j], next[i]]
    save({ ...layout, order: next })
  }
  const toggle = (id: string) => save({ ...layout, order, hidden: layout.hidden.includes(id) ? layout.hidden.filter((h) => h !== id) : [...layout.hidden, id] })

  return (
    <PendingContext.Provider value={pending}>
      <AgendaContext.Provider value={{ items, setItems, day, setDay, available: agenda !== null }}>
      <div className="flex flex-col gap-5">
        {/* jedna řada filtrů nad obsahem */}
        <div className="flex flex-wrap items-center gap-3">
          <div role="group" aria-label={t('period')} className="flex rounded-lg bg-muted p-0.5">
            {[7, 30, 90].map((r) => (
              <button
                key={r}
                type="button"
                aria-pressed={range === r}
                onClick={() => setParam('range', r === 30 ? null : String(r))}
                className={cn('rounded-md px-3 py-1 text-sm font-medium transition-colors', range === r ? 'bg-primary/15 text-foreground ring-1 ring-primary/25' : 'text-muted-foreground hover:text-foreground')}
              >
                {t('days', { count: r })}
              </button>
            ))}
          </div>
          {agents.length > 1 && (
            <select
              value={agentId}
              onChange={(e) => setParam('agent', e.target.value || null)}
              aria-label={t('agent')}
              className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm dark:bg-white/5"
            >
              <option value="">{t('allAgents')}</option>
              {agents.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          )}
          <Button variant={editing ? 'default' : 'outline'} size="sm" className="ml-auto" aria-expanded={editing} onClick={() => setEditing((e) => !e)}>
            <SlidersHorizontal /> {t('customize')}
          </Button>
        </div>

        {editing && (
          <div className="rounded-2xl border border-border bg-card p-4 ring-1 ring-foreground/5 dark:backdrop-blur-xl">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-sm font-medium">{t('customizeHint')}</p>
              <Button variant="ghost" size="sm" onClick={() => save({ order: defaultOrder, hidden: [] })}>
                <RotateCcw /> {t('reset')}
              </Button>
            </div>
            <ul className="grid gap-2 sm:grid-cols-2">
              {order.map((id, i) => {
                const w = byId.get(id)!
                const hidden = layout.hidden.includes(id)
                return (
                  <li key={id} className="flex items-center gap-2 rounded-xl border border-border bg-muted/40 px-3 py-2 text-sm">
                    <button type="button" onClick={() => toggle(id)} aria-pressed={!hidden} className="flex flex-1 items-center gap-2 text-left" aria-label={`${hidden ? t('show') : t('hide')}: ${w.label}`}>
                      {hidden ? <EyeOff className="size-4 text-muted-foreground" /> : <Eye className="size-4 text-primary" />}
                      <span className={cn(hidden && 'text-muted-foreground line-through')}>{w.label}</span>
                    </button>
                    <Button variant="ghost" size="icon-sm" disabled={i === 0} aria-label={t('moveUp')} onClick={() => move(id, -1)}>
                      <ArrowUp />
                    </Button>
                    <Button variant="ghost" size="icon-sm" disabled={i === order.length - 1} aria-label={t('moveDown')} onClick={() => move(id, 1)}>
                      <ArrowDown />
                    </Button>
                  </li>
                )
              })}
            </ul>
          </div>
        )}

        <div className={cn('grid grid-cols-1 gap-5 transition-opacity duration-200 lg:grid-cols-12', pending && 'pointer-events-none opacity-60')} aria-busy={pending}>
          {order
            .filter((id) => !layout.hidden.includes(id))
            .map((id) => {
              const w = byId.get(id)!
              return (
                <section key={id} id={`w-${id}`} aria-label={w.label} className={cn('min-w-0 scroll-mt-6', SPAN[w.span])}>
                  {w.node}
                </section>
              )
            })}
        </div>
      </div>
      </AgendaContext.Provider>
    </PendingContext.Provider>
  )
}
