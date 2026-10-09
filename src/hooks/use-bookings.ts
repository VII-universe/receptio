'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { Booking, BookingMode, BookingResource } from '@/types'

// Jednoduché datové hooky pro rezervace nad fetch (projekt nepoužívá React Query): načtení, chyba, znovunačtení a zápis.

export interface BookingSettingsData {
  bookingEnabled: boolean
  autoConfirm: boolean
  notifyCustomer: boolean
  bookingMode: BookingMode
  capacity: number
  advanceDays: number
  weekly: { day_of_week: number; enabled: boolean; start_time: string; end_time: string; slot_duration_minutes: number }[]
  blocks: { date: string; start_time: string; end_time: string; note: string | null }[]
}

function useFetched<T>(url: string | null) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(!!url)
  const seq = useRef(0)

  const reload = useCallback(async () => {
    if (!url) return
    const mine = ++seq.current
    setLoading(true)
    setError(false)
    try {
      const res = await fetch(url)
      if (!res.ok) throw new Error()
      const json = (await res.json()) as T
      if (mine === seq.current) setData(json)
    } catch {
      if (mine === seq.current) setError(true)
    } finally {
      if (mine === seq.current) setLoading(false)
    }
  }, [url])

  useEffect(() => {
    void reload()
  }, [reload])
  return { data, setData, error, loading, reload }
}

/** Nastavení rezervací agenta (režim, kapacita, dopředu, rozvrh) a jeho uložení. */
export function useBookingSettings(agentId: string) {
  const state = useFetched<BookingSettingsData>(`/api/agents/${agentId}/availability-settings`)
  const save = useCallback(
    async (next: BookingSettingsData) => {
      const res = await fetch(`/api/agents/${agentId}/availability-settings`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...next, blocks: next.blocks.map((b) => ({ ...b, note: b.note || null })) }) })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error ?? 'Save failed')
      return body as { ok: boolean; sync?: { ok: boolean } }
    },
    [agentId]
  )
  return { ...state, save }
}

/** Zdroje agenta (stoly, křesla, místnosti…) a jejich správa. */
export function useBookingResources(agentId: string) {
  const { data, setData, error, loading, reload } = useFetched<{ resources: BookingResource[] }>(`/api/agents/${agentId}/booking-resources`)
  const resources = data?.resources ?? []

  const call = async (url: string, method: string, body?: unknown) => {
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(json.error ?? 'Request failed')
    return json
  }
  const base = `/api/agents/${agentId}/booking-resources`

  return {
    resources,
    error,
    loading,
    reload,
    create: async (input: Pick<BookingResource, 'name' | 'type' | 'capacity'> & { description?: string | null }) => {
      const { resource } = (await call(base, 'POST', input)) as { resource: BookingResource }
      setData({ resources: [...resources, resource] })
      return resource
    },
    update: async (id: string, patch: Partial<Pick<BookingResource, 'name' | 'type' | 'capacity' | 'description' | 'is_active' | 'sort_order'>>) => {
      const { resource } = (await call(`${base}/${id}`, 'PATCH', patch)) as { resource: BookingResource }
      setData({ resources: resources.map((r) => (r.id === id ? resource : r)) })
      return resource
    },
    remove: async (id: string) => {
      await call(`${base}/${id}`, 'DELETE')
      setData({ resources: resources.filter((r) => r.id !== id) })
    },
    /** Přeuspořádá zdroje (uloží nové sort_order všem změněným). */
    reorder: async (ordered: BookingResource[]) => {
      setData({ resources: ordered.map((r, i) => ({ ...r, sort_order: i })) })
      await Promise.all(ordered.map((r, i) => (r.sort_order === i ? null : call(`${base}/${r.id}`, 'PATCH', { sort_order: i }))).filter(Boolean))
    },
  }
}

/** Rezervace agenta v rozsahu (stránkování kurzorem se prochází automaticky). */
export function useBookings(agentId: string, range: { from: string; to: string }) {
  const url = `/api/agents/${agentId}/bookings?${new URLSearchParams({ date_from: range.from, date_to: range.to, limit: '500' })}`
  const { data, error, loading, reload } = useFetched<{ bookings: Booking[]; nextCursor: string | null }>(url)
  return { bookings: data?.bookings ?? [], hasMore: !!data?.nextCursor, error, loading, reload }
}

export interface AvailabilitySlotView {
  time: string
  starts_at: string
  ends_at: string
  available: boolean
  remaining?: number
  resources?: { id: string; name: string; capacity: number }[]
}

/** Volné sloty agenta pro den a počet osob. */
export function useAvailability(agentId: string | null, date: string | null, partySize = 1) {
  const url = agentId && date ? `/api/agents/${agentId}/bookings/availability?${new URLSearchParams({ date, party_size: String(partySize) })}` : null
  const { data, error, loading, reload } = useFetched<{ slots: AvailabilitySlotView[]; mode: BookingMode }>(url)
  return { slots: data?.slots ?? [], mode: data?.mode ?? 'capacity', error, loading, reload }
}
