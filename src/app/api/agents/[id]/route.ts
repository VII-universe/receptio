import { NextResponse } from 'next/server'
import { VapiError } from '@vapi-ai/server-sdk'
import { requireWorkspace } from '@/lib/api-auth'
import { agentSchema } from '@/lib/agent-schema'
import { compileKnowledge } from '@/lib/agents/compile-knowledge'
import { getKnowledgeEntries } from '@/lib/agents/sync-knowledge'
import { loadAgentFormData } from '@/lib/agents-service'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAgentById } from '@/lib/supabase/queries'
import type { Agent } from '@/types'

type Params = { params: Promise<{ id: string }> }

const vapiEnabled = () => Boolean(process.env.VAPI_API_KEY && process.env.VAPI_WEBHOOK_SECRET)
const notFound = () => NextResponse.json({ error: 'Agent not found' }, { status: 404 })

// GET /api/agents/:id – data z Vapi (zdroj pravdy) + záznam ze Supabase
export async function GET(_request: Request, { params }: Params) {
  const ctx = await requireWorkspace()
  if ('response' in ctx) return ctx.response
  const agent = await getAgentById(ctx.workspace.id, (await params).id)
  if (!agent) return notFound()

  const { form, source } = await loadAgentFormData(agent)
  return NextResponse.json({ agent, form, source })
}

// PATCH /api/agents/:id – aktualizuje Vapi i Supabase
export async function PATCH(request: Request, { params }: Params) {
  const ctx = await requireWorkspace()
  if ('response' in ctx) return ctx.response
  const agent = await getAgentById(ctx.workspace.id, (await params).id)
  if (!agent) return notFound()

  if (!vapiEnabled()) {
    return NextResponse.json({ error: 'Vapi není nakonfigurované' }, { status: 503 })
  }
  const parsed = agentSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid body', issues: parsed.error.issues }, { status: 400 })
  }
  const input = parsed.data

  let vapiAgentId = agent.vapi_agent_id
  try {
    const vapi = await import('@/lib/vapi/agents')
    // Ve Vapi je základní prompt + znalostní báze; v DB zůstává jen základní prompt.
    const withKnowledge = {
      ...input,
      systemPrompt: compileKnowledge(input.systemPrompt, await getKnowledgeEntries(ctx.workspace.id, agent.id)),
    }
    if (vapiAgentId) {
      await vapi.updateVapiAgent(vapiAgentId, withKnowledge)
    } else {
      // Agent vznikl dřív, než byl Vapi nastavený.
      vapiAgentId = (await vapi.createVapiAgent(withKnowledge)).id
    }
  } catch (e) {
    console.error('Vapi: update failed', e)
    return NextResponse.json({ error: 'Úprava agenta ve Vapi selhala' }, { status: 502 })
  }

  const { data, error } = await createAdminClient()
    .from('agents')
    .update({
      vapi_agent_id: vapiAgentId,
      name: input.name,
      language: input.language,
      greeting_message: input.firstMessage,
      system_prompt: input.systemPrompt,
      voice_id: input.voiceId,
      end_call_phrases: input.endCallPhrases,
      knowledge_synced_at: new Date().toISOString(),
    })
    .eq('id', agent.id)
    .eq('workspace_id', ctx.workspace.id)
    .select('*')
    .single()
  if (error) {
    console.error('Failed to update agent', error)
    return NextResponse.json({ error: 'Failed to update agent' }, { status: 500 })
  }
  return NextResponse.json({ agent: data as Agent })
}

// DELETE /api/agents/:id – smaže z Vapi i ze Supabase (včetně historie hovorů agenta, FK cascade)
export async function DELETE(_request: Request, { params }: Params) {
  const ctx = await requireWorkspace()
  if ('response' in ctx) return ctx.response
  const agent = await getAgentById(ctx.workspace.id, (await params).id)
  if (!agent) return notFound()

  // Placené číslo by zůstalo viset bez agenta.
  const { count: numberCount } = await createAdminClient()
    .from('phone_numbers')
    .select('id', { count: 'exact', head: true })
    .eq('agent_id', agent.id)
  if ((numberCount ?? 0) > 0) {
    return NextResponse.json(
      { error: 'Agent má přiřazené telefonní číslo, nejprve ho odeberte.' },
      { status: 409 }
    )
  }

  if (agent.vapi_agent_id && vapiEnabled()) {
    try {
      const { deleteVapiAgent } = await import('@/lib/vapi/agents')
      await deleteVapiAgent(agent.vapi_agent_id)
    } catch (e) {
      // 404 = ve Vapi už neexistuje, můžeme pokračovat.
      if (!(e instanceof VapiError && e.statusCode === 404)) {
        console.error('Vapi: delete failed', e)
        return NextResponse.json({ error: 'Smazání agenta ve Vapi selhalo' }, { status: 502 })
      }
    }
  }

  const { error } = await createAdminClient()
    .from('agents')
    .delete()
    .eq('id', agent.id)
    .eq('workspace_id', ctx.workspace.id)
  if (error) {
    console.error('Failed to delete agent', error)
    return NextResponse.json({ error: 'Failed to delete agent' }, { status: 500 })
  }
  return NextResponse.json({ deleted: true })
}
