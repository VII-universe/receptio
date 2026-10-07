import { NextResponse } from 'next/server'
import { requireOwnedAgent } from '@/lib/agents/route-helpers'
import { syncAgentKnowledge } from '@/lib/agents/sync-knowledge'

// POST /api/agents/:id/sync-vapi – ruční synchronizace znalostní báze do Vapi
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireOwnedAgent(params)
  if ('response' in ctx) return ctx.response

  const result = await syncAgentKnowledge(ctx.agent)
  if (!result.ok) {
    return NextResponse.json(
      { error: result.reason === 'not_configured' ? 'The agent is not linked to Vapi' : 'Synchronization failed' },
      { status: result.reason === 'not_configured' ? 409 : 502 }
    )
  }
  return NextResponse.json({ synced_at: result.syncedAt, prompt_length: result.promptLength })
}
