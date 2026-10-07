import 'server-only'
import type { CallListItem } from '@/lib/supabase/queries'
import type { Agent, CallLog } from '@/types'

// Veřejné tvary objektů: záměrně bez transcript_json, ceny, promptu a hlasu.
export const publicCall = (c: CallListItem | CallLog) => ({
  id: c.id,
  agent_id: c.agent_id,
  caller_number: c.caller_number,
  duration: c.duration_seconds,
  ended_reason: c.ended_reason,
  summary: c.summary,
  started_at: c.started_at ?? c.created_at,
  ended_at: c.ended_at ?? null,
})

export const publicAgent = (a: Agent) => ({
  id: a.id,
  name: a.name,
  is_active: a.is_active,
  created_at: a.created_at,
})
