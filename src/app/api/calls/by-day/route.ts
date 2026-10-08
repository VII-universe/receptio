import { NextResponse } from 'next/server'
import { requireWorkspace } from '@/lib/api-auth'
import { compactMessages } from '@/lib/calls'
import { addDays, isDate, zonedToUtc } from '@/lib/bookings/time'
import { createAdminClient } from '@/lib/supabase/admin'
import { isUuid } from '@/lib/supabase/queries'

const COLUMNS = 'id, agent_id, caller_number, duration_seconds, status, summary, ended_reason, metadata, started_at, created_at, transcript_json, agent:agents(name)'

// GET /api/calls/by-day?date=YYYY-MM-DD&agent_id= – hovory jednoho dne (v časové zóně workspace) s přepisem pro náhled v kalendáři
export async function GET(request: Request) {
  const ctx = await requireWorkspace()
  if ('response' in ctx) return ctx.response
  const sp = new URL(request.url).searchParams
  const date = sp.get('date')
  const agentId = sp.get('agent_id')
  if (!isDate(date)) return NextResponse.json({ error: 'date must be YYYY-MM-DD' }, { status: 400 })
  if (agentId && !isUuid(agentId)) return NextResponse.json({ error: 'Invalid agent_id' }, { status: 400 })

  const tz = ctx.workspace.timezone ?? 'Europe/Prague'
  let q = createAdminClient()
    .from('call_logs')
    .select(COLUMNS)
    .eq('workspace_id', ctx.workspace.id)
    .gte('created_at', zonedToUtc(date, '00:00', tz).toISOString())
    .lt('created_at', zonedToUtc(addDays(date, 1), '00:00', tz).toISOString())
    .order('created_at', { ascending: true })
    .limit(100)
  if (agentId) q = q.eq('agent_id', agentId)
  const { data, error } = await q
  if (error) {
    console.error('Failed to load calls for day', error)
    return NextResponse.json({ error: 'Failed to load calls' }, { status: 500 })
  }
  const calls = (data ?? []).map((row) => {
    const { agent, transcript_json, ...rest } = row as typeof row & { agent?: { name: string } | { name: string }[] | null }
    const a = Array.isArray(agent) ? agent[0] : agent
    return { ...rest, agent_name: a?.name ?? null, messages: compactMessages(transcript_json) }
  })
  return NextResponse.json({ calls })
}
