import { NextResponse } from 'next/server'
import { requireAgentAccess, requireOwnedAgent } from '@/lib/agents/route-helpers'
import { createAdminClient } from '@/lib/supabase/admin'

type Ctx = { params: Promise<{ id: string }> }

import { resourceSchema } from '@/lib/bookings/resource-schema'

// GET /api/agents/:id/booking-resources – zdroje agenta podle pořadí (čtení smí i člen týmu)
export async function GET(_request: Request, { params }: Ctx) {
  const ctx = await requireAgentAccess(params)
  if ('response' in ctx) return ctx.response
  const { data, error } = await createAdminClient().from('booking_resources').select('*').eq('agent_id', ctx.agent.id).order('sort_order').order('created_at')
  if (error) {
    console.error('Failed to load booking resources (is migration 034 applied?)', error)
    return NextResponse.json({ error: 'Failed to load resources' }, { status: 500 })
  }
  return NextResponse.json({ resources: data })
}

// POST – nový zdroj (jen správce)
export async function POST(request: Request, { params }: Ctx) {
  const ctx = await requireOwnedAgent(params)
  if ('response' in ctx) return ctx.response
  const parsed = resourceSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid body', issues: parsed.error.issues }, { status: 400 })
  const supabase = createAdminClient()
  const { data: last } = await supabase.from('booking_resources').select('sort_order').eq('agent_id', ctx.agent.id).order('sort_order', { ascending: false }).limit(1).maybeSingle()
  const { data, error } = await supabase
    .from('booking_resources')
    .insert({ ...parsed.data, description: parsed.data.description ?? null, agent_id: ctx.agent.id, workspace_id: ctx.workspace.id, sort_order: (last?.sort_order ?? -1) + 1 })
    .select('*')
    .single()
  if (error) {
    console.error('Failed to create booking resource', error)
    return NextResponse.json({ error: 'Failed to create resource' }, { status: 500 })
  }
  return NextResponse.json({ resource: data }, { status: 201 })
}
