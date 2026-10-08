import { NextResponse } from 'next/server'
import { requireOwnedAgent } from '@/lib/agents/route-helpers'
import { syncAgentKnowledge } from '@/lib/agents/sync-knowledge'
import { getAvailabilityRows } from '@/lib/bookings/availability'
import { availabilitySettingsSchema } from '@/lib/bookings/schema'
import { toMinutes } from '@/lib/bookings/time'
import { createAdminClient } from '@/lib/supabase/admin'

type Ctx = { params: Promise<{ id: string }> }

const DEFAULT_START = '09:00'
const DEFAULT_END = '17:00'

// GET – týdenní rozvrh (7 dní), ruční blokace (bez importovaných z kalendářů) a režim rezervací
export async function GET(_request: Request, { params }: Ctx) {
  const ctx = await requireOwnedAgent(params)
  if ('response' in ctx) return ctx.response
  try {
    const rows = await getAvailabilityRows(ctx.agent.id)
    const recurring = rows.filter((r) => r.date === null && r.is_available)
    const weekly = Array.from({ length: 7 }, (_, day) => {
      const r = recurring.find((x) => x.day_of_week === day)
      return r
        ? { day_of_week: day, enabled: true, start_time: r.start_time, end_time: r.end_time, slot_duration_minutes: r.slot_duration_minutes }
        : { day_of_week: day, enabled: false, start_time: DEFAULT_START, end_time: DEFAULT_END, slot_duration_minutes: 30 }
    })
    const blocks = rows
      .filter((r) => r.date !== null && !r.is_available && r.external_source === null)
      .sort((a, b) => `${a.date}${a.start_time}`.localeCompare(`${b.date}${b.start_time}`))
      .map((r) => ({ date: r.date as string, start_time: r.start_time, end_time: r.end_time, note: r.note }))
    return NextResponse.json({ bookingEnabled: ctx.agent.booking_enabled, autoConfirm: ctx.agent.booking_auto_confirm, notifyCustomer: ctx.agent.booking_notify_customer ?? true, weekly, blocks })
  } catch (e) {
    console.error('Failed to load availability settings', e)
    return NextResponse.json({ error: 'Failed to load availability settings' }, { status: 500 })
  }
}

// PUT – uloží rozvrh, blokace a režim; při změně zapnutí rezervací přenastaví nástroje agenta ve Vapi
export async function PUT(request: Request, { params }: Ctx) {
  const ctx = await requireOwnedAgent(params)
  if ('response' in ctx) return ctx.response
  const { workspace, agent } = ctx

  const parsed = availabilitySettingsSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid body', issues: parsed.error.issues }, { status: 400 })
  const s = parsed.data
  if (new Set(s.weekly.map((d) => d.day_of_week)).size !== 7) return NextResponse.json({ error: 'Invalid weekly schedule' }, { status: 400 })
  for (const d of s.weekly) {
    if (d.enabled && toMinutes(d.start_time) >= toMinutes(d.end_time)) return NextResponse.json({ error: 'Start must be before end' }, { status: 400 })
  }
  for (const b of s.blocks) {
    if (toMinutes(b.start_time) >= toMinutes(b.end_time)) return NextResponse.json({ error: 'Start must be before end' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const base = { agent_id: agent.id, workspace_id: workspace.id }

  // Nahrazení: smažou se opakující okna a ruční blokace (blokace importované z kalendářů zůstávají).
  const del = await supabase.from('availability_slots').delete().eq('agent_id', agent.id).is('external_source', null)
  if (del.error) {
    console.error('Failed to clear availability', del.error)
    return NextResponse.json({ error: 'Failed to save availability' }, { status: 500 })
  }
  const rows = [
    ...s.weekly
      .filter((d) => d.enabled)
      .map((d) => ({ ...base, day_of_week: d.day_of_week, date: null, start_time: d.start_time, end_time: d.end_time, slot_duration_minutes: d.slot_duration_minutes, is_available: true })),
    ...s.blocks.map((b) => ({ ...base, day_of_week: null, date: b.date, start_time: b.start_time, end_time: b.end_time, slot_duration_minutes: 30, is_available: false, note: b.note ?? null })),
  ]
  if (rows.length > 0) {
    const ins = await supabase.from('availability_slots').insert(rows)
    if (ins.error) {
      console.error('Failed to save availability', ins.error)
      return NextResponse.json({ error: 'Failed to save availability' }, { status: 500 })
    }
  }

  const modeUpdate = { booking_enabled: s.bookingEnabled, booking_auto_confirm: s.autoConfirm }
  const save = (extra: Record<string, unknown>) => supabase.from('agents').update({ ...modeUpdate, ...extra }).eq('id', agent.id).eq('workspace_id', workspace.id).select('*').single()
  let { data: updated, error } = await save(s.notifyCustomer === undefined ? {} : { booking_notify_customer: s.notifyCustomer })
  // Sloupec přibyl migrací 031; bez ní se uloží zbytek nastavení.
  if (error?.code === '42703') ({ data: updated, error } = await save({}))
  if (error) {
    console.error('Failed to save booking mode', error)
    return NextResponse.json({ error: 'Failed to save availability' }, { status: 500 })
  }

  // Prompt a nástroje ve Vapi závisí na booking_enabled, proto se agent vždy znovu synchronizuje.
  return NextResponse.json({ ok: true, sync: await syncAgentKnowledge(updated) })
}
