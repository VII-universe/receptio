import type { Booking, BookingStatus } from '@/types'

export const STATUS_STYLES: Record<BookingStatus, string> = {
  confirmed: 'border-emerald-500/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-200 hover:bg-emerald-500/25',
  pending: 'border-amber-500/40 bg-amber-500/15 text-amber-700 dark:text-amber-200 hover:bg-amber-500/25',
  cancelled: 'border-border bg-muted text-muted-foreground line-through opacity-70 hover:opacity-100',
}

export const STATUS_DOT: Record<BookingStatus, string> = {
  confirmed: 'bg-emerald-500',
  pending: 'bg-amber-500',
  cancelled: 'bg-muted-foreground/60',
}

export type BookingWithAgent = Booking & { agentName?: string }

/** Rozloží překrývající se rezervace v jednom dni do sloupců ("lanes"), aby se karty nepřekrývaly. */
export function layoutLanes<T extends { startMin: number; endMin: number }>(items: T[]): (T & { lane: number; lanes: number })[] {
  const sorted = [...items].sort((a, b) => a.startMin - b.startMin || b.endMin - a.endMin)
  const result: (T & { lane: number; lanes: number })[] = []
  let group: (T & { lane: number; lanes: number })[] = []
  let groupEnd = -1
  const flush = () => {
    const lanes = Math.max(1, ...group.map((g) => g.lane + 1))
    group.forEach((g) => (g.lanes = lanes))
    result.push(...group)
    group = []
  }
  for (const it of sorted) {
    if (group.length > 0 && it.startMin >= groupEnd) flush()
    const used = new Set(group.filter((g) => g.endMin > it.startMin).map((g) => g.lane))
    let lane = 0
    while (used.has(lane)) lane++
    group.push({ ...it, lane, lanes: 1 })
    groupEnd = Math.max(groupEnd, it.endMin)
  }
  flush()
  return result
}
