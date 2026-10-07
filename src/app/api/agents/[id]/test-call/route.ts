import { NextResponse } from 'next/server'
import { requireOwnedAgent } from '@/lib/agents/route-helpers'
import { normalizeTestPhone } from '@/lib/phone'
import { createAdminClient } from '@/lib/supabase/admin'
import { createOutboundCall, OutboundCallError } from '@/lib/vapi/outbound'

const LIMIT_PER_HOUR = 3

// POST /api/agents/:id/test-call  Body: { phoneNumber }
// Zavolá uživateli s jeho agentem. Jen admin workspace (hovor stojí minuty a peníze).
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireOwnedAgent(params)
  if ('response' in ctx) return ctx.response
  const { workspace, agent } = ctx

  if (!process.env.VAPI_API_KEY) {
    return NextResponse.json({ error: 'Vapi není nakonfigurované' }, { status: 503 })
  }

  const body = await request.json().catch(() => null)
  const phone = normalizeTestPhone(typeof body?.phoneNumber === 'string' ? body.phoneNumber : '')
  if (!phone.ok) return NextResponse.json({ error: phone.error }, { status: 400 })

  if (!agent.vapi_agent_id) {
    return NextResponse.json({ error: 'Agent ještě není propojený s Vapi' }, { status: 409 })
  }

  const supabase = createAdminClient()

  // Číslo agenta (čísla jsou v tabulce phone_numbers, vazba na agenta)
  const { data: number, error: numberError } = await supabase
    .from('phone_numbers')
    .select('vapi_phone_number_id')
    .eq('workspace_id', workspace.id)
    .eq('agent_id', agent.id)
    .maybeSingle()
  if (numberError) {
    console.error('Test call: number lookup failed', numberError)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
  if (!number?.vapi_phone_number_id) {
    return NextResponse.json(
      { error: 'Nemáte přiřazené telefonní číslo. Přidejte číslo v sekci Telefonní čísla.' },
      { status: 422 }
    )
  }

  // Limit: 3 testovací hovory za hodinu na workspace. Hovor se do call_logs zapisuje hned po vytočení
  // (ne až z webhooku), takže ho nejde obejít rychlým opakováním ani nezvednutým hovorem.
  const since = new Date(Date.now() - 3600_000).toISOString()
  const { count, error: countError } = await supabase
    .from('call_logs')
    .select('id', { count: 'exact', head: true })
    .eq('workspace_id', workspace.id)
    .eq('metadata->>source', 'test')
    .gt('created_at', since)
  if (countError) {
    console.error('Test call: rate limit lookup failed', countError)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
  if ((count ?? 0) >= LIMIT_PER_HOUR) {
    return NextResponse.json(
      { error: 'Překročen limit testovacích hovorů (3 za hodinu). Zkuste to za chvíli.' },
      { status: 429 }
    )
  }

  let callId: string
  try {
    callId = await createOutboundCall({
      assistantId: agent.vapi_agent_id,
      phoneNumberId: number.vapi_phone_number_id,
      customerNumber: phone.number,
    })
  } catch (e) {
    if (e instanceof OutboundCallError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error('Test call failed', e)
    return NextResponse.json({ error: 'Hovor se nepodařilo zahájit' }, { status: 502 })
  }

  // Označení testovacího hovoru; webhook ho později doplní (status, délka, přepis) a metadata zachová.
  const { error: logError } = await supabase.from('call_logs').upsert(
    {
      vapi_call_id: callId,
      agent_id: agent.id,
      workspace_id: workspace.id,
      caller_number: phone.number,
      status: 'in_progress',
      metadata: { source: 'test' },
    },
    { onConflict: 'vapi_call_id' }
  )
  if (logError) console.error('Test call: failed to record call (call was placed)', callId, logError)

  return NextResponse.json({ callId })
}
