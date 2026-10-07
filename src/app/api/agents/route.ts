import { NextResponse } from 'next/server'
import { requireWorkspace, requireWorkspaceAdmin } from '@/lib/api-auth'
import { agentSchema } from '@/lib/agent-schema'
import { seedWorkingHours } from '@/lib/agents/default-working-hours'
import { syncAgentKnowledge } from '@/lib/agents/sync-knowledge'
import { DEFAULT_OUTSIDE_MESSAGE } from '@/lib/agents/working-hours'
import { getLanguage } from '@/lib/languages'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAgentsByWorkspaceId } from '@/lib/supabase/queries'
import { agentsLimitFor } from '@/lib/stripe/plans'
import { checkAgentLimit } from '@/lib/billing/check-limit'
import { limitReachedResponse } from '@/lib/billing/limit-response'
import type { Agent } from '@/types'

const vapiEnabled = () => Boolean(process.env.VAPI_API_KEY && process.env.VAPI_WEBHOOK_SECRET)

// GET /api/agents – agenti workspace + limit plánu
export async function GET() {
  const ctx = await requireWorkspace()
  if ('response' in ctx) return ctx.response
  try {
    const agents = await getAgentsByWorkspaceId(ctx.workspace.id)
    return NextResponse.json({ agents, limit: agentsLimitFor(ctx.workspace.plan) })
  } catch (e) {
    console.error('Failed to load agents', e)
    return NextResponse.json({ error: 'Failed to load agents' }, { status: 500 })
  }
}

// POST /api/agents – ověří limit plánu, vytvoří asistenta ve Vapi a uloží ho do Supabase
export async function POST(request: Request) {
  const ctx = await requireWorkspaceAdmin()
  if ('response' in ctx) return ctx.response
  const { workspace } = ctx

  if (!vapiEnabled()) {
    return NextResponse.json({ error: 'Vapi is not configured' }, { status: 503 })
  }

  const parsed = agentSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid body', issues: parsed.error.issues }, { status: 400 })
  }
  const input = parsed.data

  const supabase = createAdminClient()
  // Limit se kontroluje před voláním Vapi, ať nevznikají osiřelí asistenti.
  let agentLimit
  try {
    agentLimit = await checkAgentLimit(workspace.id)
  } catch (e) {
    console.error('Failed to check agent limit', e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
  if (!agentLimit.allowed) return limitReachedResponse('agents', agentLimit)

  const { createVapiAgent, deleteVapiAgent } = await import('@/lib/vapi/agents')

  let vapiAgentId: string
  try {
    vapiAgentId = (await createVapiAgent(input)).id
  } catch (e) {
    console.error('Vapi: create failed', e)
    return NextResponse.json({ error: 'Creating the agent in Vapi failed' }, { status: 502 })
  }

  const { data, error } = await supabase
    .from('agents')
    .insert({
      workspace_id: workspace.id,
      vapi_agent_id: vapiAgentId,
      name: input.name,
      language: input.language,
      language_name: getLanguage(input.language).name,
      greeting_message: input.firstMessage,
      system_prompt: input.systemPrompt,
      voice_id: input.voiceId,
      end_call_phrases: input.endCallPhrases,
      timezone: workspace.timezone ?? 'Europe/Prague', // výchozí zóna workspace
      outside_hours_message: DEFAULT_OUTSIDE_MESSAGE, // výchozí hodnota v DB je česky
    })
    .select('*')
    .single()

  if (error) {
    await deleteVapiAgent(vapiAgentId).catch((e) =>
      console.error('Failed to roll back Vapi agent', vapiAgentId, e)
    )
    console.error('Failed to save agent', error)
    return NextResponse.json({ error: 'Failed to save agent' }, { status: 500 })
  }

  // Výchozí pracovní doba a její odeslání do Vapi; chyba nesmí zrušit už vytvořeného agenta.
  try {
    await seedWorkingHours(data.id, workspace.id)
    await syncAgentKnowledge(data as Agent)
  } catch (e) {
    console.error('Failed to seed working hours', e)
  }

  return NextResponse.json({ agent: data as Agent }, { status: 201 })
}
