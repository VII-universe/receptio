import { NextResponse } from 'next/server'
import { requireOwnedAgent } from '@/lib/agents/route-helpers'
import { getWorkingHours, syncAgentKnowledge } from '@/lib/agents/sync-knowledge'
import {
  DEFAULT_OUTSIDE_MESSAGE,
  fillWorkingHours,
  isTimezone,
  MAX_OUTSIDE_MESSAGE,
} from '@/lib/agents/working-hours'
import { createAdminClient } from '@/lib/supabase/admin'
import type { WorkingHour } from '@/types'

type Ctx = { params: Promise<{ id: string }> }

// GET /api/agents/:id/working-hours – 7 záznamů (po jednom na den), chybějící dny z výchozích hodin
export async function GET(_request: Request, { params }: Ctx) {
  const ctx = await requireOwnedAgent(params)
  if ('response' in ctx) return ctx.response
  try {
    const rows = await getWorkingHours(ctx.workspace.id, ctx.agent.id)
    return NextResponse.json({
      hours: fillWorkingHours(rows),
      timezone: ctx.agent.timezone ?? 'Europe/Prague',
      outsideHoursMessage: ctx.agent.outside_hours_message ?? DEFAULT_OUTSIDE_MESSAGE,
    })
  } catch (e) {
    console.error('Failed to load working hours', e)
    return NextResponse.json({ error: 'Failed to load working hours' }, { status: 500 })
  }
}

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/

function parseHours(value: unknown): WorkingHour[] | null {
  if (!Array.isArray(value) || value.length !== 7) return null
  const out: WorkingHour[] = []
  for (const h of value) {
    if (typeof h !== 'object' || h === null) return null
    const { day_of_week, is_open, open_time, close_time } = h as Record<string, unknown>
    if (!Number.isInteger(day_of_week) || (day_of_week as number) < 0 || (day_of_week as number) > 6) return null
    if (typeof is_open !== 'boolean') return null
    const open = open_time == null || open_time === '' ? null : open_time
    const close = close_time == null || close_time === '' ? null : close_time
    if ((open !== null && (typeof open !== 'string' || !TIME.test(open))) || (close !== null && (typeof close !== 'string' || !TIME.test(close)))) return null
    // Buď obě hodnoty (od < do), nebo žádná (celý den).
    if ((open === null) !== (close === null)) return null
    if (is_open && open !== null && close !== null && open >= close) return null
    out.push({
      day_of_week: day_of_week as number,
      is_open,
      open_time: is_open ? (open as string | null) : null,
      close_time: is_open ? (close as string | null) : null,
    })
  }
  if (new Set(out.map((h) => h.day_of_week)).size !== 7) return null
  return out
}

// PUT /api/agents/:id/working-hours
// Body: { hours: [{ day_of_week, is_open, open_time?, close_time? }] (7 dnů), timezone?, outsideHoursMessage? }
export async function PUT(request: Request, { params }: Ctx) {
  const ctx = await requireOwnedAgent(params)
  if ('response' in ctx) return ctx.response
  const { workspace, agent } = ctx

  const body = await request.json().catch(() => null)
  const hours = parseHours(body?.hours)
  if (!hours) return NextResponse.json({ error: 'Invalid hours' }, { status: 400 })

  // Časová zóna jde do šablony promptu ve Vapi, proto jen z pevného seznamu.
  if (body.timezone != null && !isTimezone(body.timezone)) {
    return NextResponse.json({ error: 'Invalid timezone' }, { status: 400 })
  }
  let message: string | undefined
  if (body.outsideHoursMessage != null) {
    message = typeof body.outsideHoursMessage === 'string' ? body.outsideHoursMessage.trim() : ''
    if (!message || message.length > MAX_OUTSIDE_MESSAGE) {
      return NextResponse.json({ error: 'Invalid message' }, { status: 400 })
    }
  }

  const supabase = createAdminClient()
  const { error } = await supabase
    .from('working_hours')
    .upsert(
      hours.map((h) => ({ ...h, agent_id: agent.id, workspace_id: workspace.id })),
      { onConflict: 'agent_id,day_of_week' }
    )
  if (error) {
    console.error('Failed to save working hours', error)
    return NextResponse.json({ error: 'Failed to save working hours' }, { status: 500 })
  }

  const agentUpdate: Record<string, string> = {}
  if (body.timezone) agentUpdate.timezone = body.timezone
  if (message) agentUpdate.outside_hours_message = message
  let synced = { ...agent }
  if (Object.keys(agentUpdate).length > 0) {
    const { data, error: agentError } = await supabase
      .from('agents')
      .update(agentUpdate)
      .eq('id', agent.id)
      .eq('workspace_id', workspace.id)
      .select('*')
      .single()
    if (agentError) {
      console.error('Failed to save agent timezone/message', agentError)
      return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 })
    }
    synced = data
  }

  return NextResponse.json({ hours, sync: await syncAgentKnowledge(synced) })
}
