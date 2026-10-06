import { timingSafeEqual } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { CallLog } from '@/types'

type Json = Record<string, unknown>

// Vapi posílá hlavičku x-vapi-secret, kterou jsme nastavili při vytvoření agenta (server.headers).
function isAuthorized(request: NextRequest): boolean {
  const expected = process.env.VAPI_WEBHOOK_SECRET
  const received = request.headers.get('x-vapi-secret')
  if (!expected || !received) return false
  const a = Buffer.from(expected)
  const b = Buffer.from(received)
  return a.length === b.length && timingSafeEqual(a, b)
}

function mapCallStatus(endedReason: string | undefined): CallLog['status'] {
  if (!endedReason) return 'completed'
  if (endedReason.includes('transfer')) return 'transferred'
  if (endedReason.includes('no-answer') || endedReason.includes('missed')) return 'missed'
  if (endedReason.includes('error') || endedReason.includes('failed')) return 'failed'
  return 'completed'
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = (await request.json().catch(() => null)) as { message?: Json } | null
  const message = body?.message
  if (!message || typeof message.type !== 'string') {
    return NextResponse.json({ received: true })
  }

  const call = message.call as (Json & { id?: string; assistantId?: string }) | undefined
  if (!call?.id || !call.assistantId) {
    return NextResponse.json({ received: true })
  }

  const supabase = createAdminClient()

  // Vapi assistantId -> náš agent a workspace
  const { data: agent, error: agentError } = await supabase
    .from('agents')
    .select('id, workspace_id')
    .eq('vapi_agent_id', call.assistantId)
    .maybeSingle()
  if (agentError) {
    console.error('Vapi webhook: agent lookup failed', agentError)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 }) // Vapi zkusí znovu
  }
  if (!agent) {
    // Neznámý agent (např. smazaný) – nemá smysl opakovat.
    return NextResponse.json({ received: true })
  }

  const customer = call.customer as { number?: string } | undefined
  const base = {
    vapi_call_id: call.id,
    agent_id: agent.id,
    workspace_id: agent.workspace_id,
    caller_number: customer?.number ?? null,
  }

  let error = null

  switch (message.type) {
    case 'status-update': {
      // Na začátku hovoru uložíme in_progress; konec řeší end-of-call-report.
      if (message.status === 'in-progress') {
        ;({ error } = await supabase
          .from('call_logs')
          .upsert({ ...base, status: 'in_progress' }, { onConflict: 'vapi_call_id', ignoreDuplicates: true }))
      }
      break
    }

    case 'end-of-call-report': {
      const endedReason = message.endedReason as string | undefined
      const artifact = (message.artifact ?? {}) as { recordingUrl?: string; transcript?: string }
      const analysis = (message.analysis ?? {}) as { summary?: string }
      const startedAt = message.startedAt as string | undefined
      const endedAt = message.endedAt as string | undefined
      const duration =
        startedAt && endedAt
          ? Math.max(0, Math.round((new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 1000))
          : 0
      const costUsd = typeof message.cost === 'number' ? message.cost : 0

      ;({ error } = await supabase.from('call_logs').upsert(
        {
          ...base,
          duration_seconds: duration,
          status: mapCallStatus(endedReason),
          ended_reason: endedReason ?? null,
          summary: analysis.summary ?? null,
          transcript: artifact.transcript ?? null,
          recording_url: artifact.recordingUrl ?? null,
          cost_cents: Math.round(costUsd * 100),
          metadata: { startedAt, endedAt },
        },
        { onConflict: 'vapi_call_id' }
      ))
      break
    }
  }

  if (error) {
    console.error('Vapi webhook: save failed', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
  return NextResponse.json({ received: true })
}
