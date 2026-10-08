import { NextResponse } from 'next/server'
import { requireOwnedAgent } from '@/lib/agents/route-helpers'
import { checkMinutesLimit } from '@/lib/billing/check-limit'
import { limitReachedResponse } from '@/lib/billing/limit-response'

// POST /api/agents/:id/web-call
// Údaje pro testovací hovor z prohlížeče (Vapi Web SDK): veřejný klíč Vapi a ID asistenta. Jen admin workspace
// a jen když workspace smí volat (zkušební doba / plán, minuty). Veřejný klíč je určen pro prohlížeč;
// ve Vapi ho omezte na naše domény (Allowed Origins), jinak by s ním šlo volat odjinud.
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireOwnedAgent(params)
  if ('response' in ctx) return ctx.response
  const { workspace, agent } = ctx

  const publicKey = process.env.VAPI_PUBLIC_KEY?.trim()
  if (!publicKey) return NextResponse.json({ error: 'Browser test calls are not configured', code: 'not_configured' }, { status: 503 })
  if (!agent.vapi_agent_id) return NextResponse.json({ error: 'The agent is not linked to Vapi yet' }, { status: 409 })

  const minutes = await checkMinutesLimit(workspace.id).catch(() => null)
  if (minutes && (!minutes.allowed || minutes.paused)) return limitReachedResponse('minutes', minutes)

  return NextResponse.json({ publicKey, assistantId: agent.vapi_agent_id })
}
