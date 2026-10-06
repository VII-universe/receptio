import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { parseAgentInput, type AgentInput } from '@/lib/agent-input'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAgentByWorkspaceId, getWorkspaceByClerkUserId } from '@/lib/supabase/queries'
import type { Agent } from '@/types'

// Vapi se používá, jen když jsou vyplněné oba klíče; jinak se agent uloží jen do Supabase.
const vapiEnabled = () => Boolean(process.env.VAPI_API_KEY && process.env.VAPI_WEBHOOK_SECRET)

// Dynamický import: vapi/client.ts vyhazuje chybu, pokud chybí VAPI_API_KEY.
async function vapiAgents() {
  return import('@/lib/vapi/agents')
}

function vapiParams(input: AgentInput) {
  return {
    name: input.name,
    language: input.language,
    greetingMessage: input.greetingMessage,
    customInstructions: input.customInstructions,
    faq: input.faq,
    fallbackPhone: input.fallbackPhone ?? undefined,
    businessHours: input.businessHours,
  }
}

function dbFields(input: AgentInput) {
  return {
    name: input.name,
    language: input.language,
    greeting_message: input.greetingMessage,
    custom_instructions: input.customInstructions,
    faq: input.faq,
    fallback_phone: input.fallbackPhone,
    business_hours: input.businessHours,
  }
}

// Workspace se bere z přihlášeného uživatele (Clerk), ne z těla požadavku.
async function context(request: Request) {
  const { userId } = await auth()
  if (!userId) {
    return { response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }
  const workspace = await getWorkspaceByClerkUserId(userId)
  if (!workspace) {
    return { response: NextResponse.json({ error: 'Workspace not found' }, { status: 404 }) }
  }
  const input = parseAgentInput(await request.json().catch(() => null))
  if (!input) {
    return { response: NextResponse.json({ error: 'Invalid body' }, { status: 400 }) }
  }
  return { workspace, input }
}

// POST /api/agents – vytvoří agenta (Vapi + Supabase)
export async function POST(request: Request) {
  const ctx = await context(request)
  if ('response' in ctx) return ctx.response
  const { workspace, input } = ctx

  if (await getAgentByWorkspaceId(workspace.id)) {
    return NextResponse.json({ error: 'Agent already exists' }, { status: 409 })
  }

  let vapiAgentId: string | null = null
  if (vapiEnabled()) {
    try {
      vapiAgentId = (await (await vapiAgents()).createVapiAgent(vapiParams(input))).id
    } catch (e) {
      console.error('Vapi: create failed', e)
      return NextResponse.json({ error: 'Vytvoření agenta ve Vapi selhalo' }, { status: 502 })
    }
  }

  const { data, error } = await createAdminClient()
    .from('agents')
    .insert({ workspace_id: workspace.id, vapi_agent_id: vapiAgentId, ...dbFields(input) })
    .select('*')
    .single()

  if (error) {
    if (vapiAgentId) {
      // Nenechávej ve Vapi osiřelého agenta.
      await (await vapiAgents())
        .deleteVapiAgent(vapiAgentId)
        .catch((e) => console.error('Failed to roll back Vapi agent', vapiAgentId, e))
    }
    console.error('Failed to save agent', error)
    return NextResponse.json({ error: 'Failed to save agent' }, { status: 500 })
  }

  return NextResponse.json({ agent: data as Agent }, { status: 201 })
}

// PATCH /api/agents – upraví existujícího agenta workspace
export async function PATCH(request: Request) {
  const ctx = await context(request)
  if ('response' in ctx) return ctx.response
  const { workspace, input } = ctx

  const existing = await getAgentByWorkspaceId(workspace.id)
  if (!existing) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
  }

  let vapiAgentId = existing.vapi_agent_id
  if (vapiEnabled()) {
    try {
      const vapi = await vapiAgents()
      if (vapiAgentId) {
        await vapi.updateVapiAgent(vapiAgentId, vapiParams(input))
      } else {
        // Agent vznikl dřív, než byl Vapi nastavený.
        vapiAgentId = (await vapi.createVapiAgent(vapiParams(input))).id
      }
    } catch (e) {
      console.error('Vapi: update failed', e)
      return NextResponse.json({ error: 'Úprava agenta ve Vapi selhala' }, { status: 502 })
    }
  }

  const { data, error } = await createAdminClient()
    .from('agents')
    .update({ vapi_agent_id: vapiAgentId, ...dbFields(input) })
    .eq('id', existing.id)
    .eq('workspace_id', workspace.id)
    .select('*')
    .single()

  if (error) {
    console.error('Failed to update agent', error)
    return NextResponse.json({ error: 'Failed to update agent' }, { status: 500 })
  }
  return NextResponse.json({ agent: data as Agent })
}
