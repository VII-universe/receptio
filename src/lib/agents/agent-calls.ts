import 'server-only'
import { maskPhone } from '@/lib/phone'
import { createAdminClient } from '@/lib/supabase/admin'
import type { CallLog } from '@/types'

export const CALLS_PAGE_SIZE = 50
// Pojistka pro souhrn: víc hovorů v jednom měsíci u jednoho agenta se do součtu nezapočítá.
const STATS_ROW_CAP = 20000

type Row = Pick<CallLog, 'id' | 'started_at' | 'duration_seconds' | 'caller_number' | 'status' | 'ended_reason' | 'cost' | 'cost_cents' | 'metadata' | 'summary' | 'transcript'> & {
  created_at: string
}

export interface AgentCallItem {
  id: string
  createdAt: string
  startedAt: string | null
  durationSeconds: number
  callerMasked: string | null // celé číslo se klientovi nevrací
  status: CallLog['status']
  endedReason: string | null
  costUsd: number
  hasTranscript: boolean
}

export interface AgentCallStats {
  calls: number
  seconds: number
  costUsd: number
}

/** Cena hovoru v USD: přesná hodnota z Vapi, jinak z metadat, jinak zaokrouhlená z centů. */
export function costOf(r: Pick<Row, 'cost' | 'cost_cents' | 'metadata'>): number {
  if (typeof r.cost === 'number') return r.cost
  const exact = r.metadata?.cost_usd
  if (typeof exact === 'number') return exact
  return (r.cost_cents ?? 0) / 100
}

const encodeCursor = (createdAt: string, id: string) => Buffer.from(JSON.stringify([createdAt, id])).toString('base64url')

export function decodeCursor(cursor: string): { createdAt: string; id: string } | null {
  try {
    const [createdAt, id] = JSON.parse(Buffer.from(cursor, 'base64url').toString()) as [unknown, unknown]
    if (typeof createdAt !== 'string' || typeof id !== 'string' || Number.isNaN(Date.parse(createdAt))) return null
    // Hodnoty jdou do filtru dotazu, proto jen striktní tvar časové značky a UUID.
    if (!/^[0-9T:.+\-Z]+$/.test(createdAt) || !/^[0-9a-f-]{36}$/i.test(id)) return null
    return { createdAt, id }
  } catch {
    return null
  }
}

/** Hovory agenta od nejnovějšího; stránkování kurzorem (created_at, id), aby nové hovory stránky neposouvaly. */
export async function getAgentCallsPage(
  workspaceId: string,
  agentId: string,
  cursor: { createdAt: string; id: string } | null,
  limit = CALLS_PAGE_SIZE
): Promise<{ calls: AgentCallItem[]; nextCursor: string | null }> {
  let query = createAdminClient()
    .from('call_logs')
    .select('id, created_at, started_at, duration_seconds, caller_number, status, ended_reason, cost, cost_cents, metadata, summary, transcript')
    .eq('workspace_id', workspaceId)
    .eq('agent_id', agentId)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(limit + 1)
  if (cursor) {
    query = query.or(`created_at.lt.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},id.lt.${cursor.id})`)
  }
  const { data, error } = await query
  if (error) throw error

  const rows = (data ?? []) as Row[]
  const page = rows.slice(0, limit)
  const last = page[page.length - 1]
  return {
    calls: page.map((r) => ({
      id: r.id,
      createdAt: r.created_at,
      startedAt: r.started_at,
      durationSeconds: r.duration_seconds ?? 0,
      callerMasked: maskPhone(r.caller_number),
      status: r.status,
      endedReason: r.ended_reason,
      costUsd: costOf(r),
      hasTranscript: !!r.transcript?.trim() || r.summary != null,
    })),
    nextCursor: rows.length > limit && last ? encodeCursor(last.created_at, last.id) : null,
  }
}

/** Souhrn za aktuální kalendářní měsíc (UTC, stejně jako statistiky na stránce Hovory). */
export async function getAgentMonthlyStats(workspaceId: string, agentId: string): Promise<AgentCallStats> {
  const start = new Date()
  start.setUTCDate(1)
  start.setUTCHours(0, 0, 0, 0)
  const { data, error } = await createAdminClient()
    .from('call_logs')
    .select('duration_seconds, cost, cost_cents, metadata')
    .eq('workspace_id', workspaceId)
    .eq('agent_id', agentId)
    .gte('created_at', start.toISOString())
    .limit(STATS_ROW_CAP)
  if (error) throw error
  const rows = (data ?? []) as Row[]
  return {
    calls: rows.length,
    seconds: rows.reduce((s, r) => s + (r.duration_seconds ?? 0), 0),
    costUsd: rows.reduce((s, r) => s + costOf(r), 0),
  }
}
