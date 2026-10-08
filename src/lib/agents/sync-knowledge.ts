import 'server-only'
import { appendLanguageInstruction } from '@/lib/agents/base-prompt'
import { compileBookingInstructions } from '@/lib/bookings/prompt'
import { compileKnowledge, compileWorkingHours } from '@/lib/agents/compile-knowledge'
import { withDisclosure } from '@/lib/agents/disclosure'
import { compileRedirectInstructions, ruleFromRow, type RedirectRule } from '@/lib/agents/redirect-rules'
import { DEFAULT_OUTSIDE_MESSAGE, normalizeTime } from '@/lib/agents/working-hours'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Agent, KnowledgeEntry, WorkingHour } from '@/types'

export async function getKnowledgeEntries(workspaceId: string, agentId: string): Promise<KnowledgeEntry[]> {
  const { data, error } = await createAdminClient()
    .from('knowledge_entries')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('agent_id', agentId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })
  if (error) throw error
  return data as KnowledgeEntry[]
}

export async function getWorkingHours(workspaceId: string, agentId: string): Promise<WorkingHour[]> {
  const { data, error } = await createAdminClient()
    .from('working_hours')
    .select('day_of_week, is_open, open_time, close_time')
    .eq('workspace_id', workspaceId)
    .eq('agent_id', agentId)
  if (error) throw error
  return data.map((r) => ({ ...r, open_time: normalizeTime(r.open_time), close_time: normalizeTime(r.close_time) }))
}

export async function getRedirectRules(workspaceId: string, agentId: string): Promise<RedirectRule[]> {
  const { data, error } = await createAdminClient()
    .from('redirect_rules')
    .select('trigger_type, trigger_config, action_type, action_config')
    .eq('workspace_id', workspaceId)
    .eq('agent_id', agentId)
    .order('priority', { ascending: true })
  if (error) throw error
  return data.flatMap((r) => ruleFromRow(r) ?? [])
}

/**
 * Finální prompt pro Vapi: základní prompt + znalostní báze + pracovní doba + pokyn k jazyku.
 * Pracovní doba se přidá, jen když ji agent má nastavenou (jinak by prompt tvrdil neexistující hodiny).
 */
export async function compileAgentPrompt(agent: Agent, basePrompt: string, language = agent.language): Promise<string> {
  const [entries, hours, rules] = await Promise.all([
    getKnowledgeEntries(agent.workspace_id, agent.id),
    getWorkingHours(agent.workspace_id, agent.id),
    getRedirectRules(agent.workspace_id, agent.id),
  ])
  const knowledge = compileKnowledge(basePrompt, entries)
  const withHours =
    hours.length === 0
      ? knowledge
      : `${knowledge}\n\n${compileWorkingHours(hours, agent.timezone ?? 'Europe/Prague', agent.outside_hours_message ?? DEFAULT_OUTSIDE_MESSAGE)}`
  const routing = compileRedirectInstructions(rules)
  const withRouting = routing ? `${withHours}\n\n${routing}` : withHours
  const booking = compileBookingInstructions(agent)
  const withBooking = booking ? `${withRouting}\n\n${booking}` : withRouting
  // Pokyn k jazyku je vždy úplně na konci promptu.
  return appendLanguageInstruction(withBooking, language)
}

export type SyncResult =
  | { ok: true; syncedAt: string; promptLength: number }
  | { ok: false; reason: 'not_configured' | 'failed' }

/**
 * Zkompiluje základní prompt agenta + znalostní bázi a pošle výsledek do Vapi.
 * Základní prompt je v agents.system_prompt (to, co uživatel edituje ve formuláři);
 * u starších agentů se při první synchronizaci doplní z Vapi.
 */
export async function syncAgentKnowledge(agent: Agent): Promise<SyncResult> {
  if (!agent.vapi_agent_id || !process.env.VAPI_API_KEY) return { ok: false, reason: 'not_configured' }

  try {
    const vapiLib = await import('@/lib/vapi/agents')
    const supabase = createAdminClient()

    let base = agent.system_prompt
    if (!base?.trim()) {
      const remote = await vapiLib.getVapiAgent(agent.vapi_agent_id)
      const messages = (remote.model as { messages?: { role: string; content?: string }[] } | undefined)?.messages
      base = messages?.find((m) => m.role === 'system')?.content ?? ''
      // Bez základního promptu by kompilace přepsala prompt ve Vapi jen znalostmi.
      if (!base.trim()) throw new Error('Agent has no base system prompt')
      await supabase.from('agents').update({ system_prompt: base }).eq('id', agent.id)
    }

    const prompt = await compileAgentPrompt(agent, base)
    const rules = await getRedirectRules(agent.workspace_id, agent.id)
    await vapiLib.updateVapiSystemPrompt(agent.vapi_agent_id, prompt, {
      tools: vapiLib.buildAgentTools(agent, rules),
      maxCallDurationMinutes: agent.max_call_duration_minutes,
      // I synchronizace pozdravu: oznámení o AI se tak dostane i k agentům vytvořeným dřív.
      firstMessage: agent.greeting_message ? withDisclosure(agent.language, agent.greeting_message, agent.ai_disclosure_enabled) : undefined,
    })

    const syncedAt = new Date().toISOString()
    const { error } = await supabase.from('agents').update({ knowledge_synced_at: syncedAt }).eq('id', agent.id)
    if (error) console.error('Failed to store knowledge_synced_at', error)
    return { ok: true, syncedAt, promptLength: prompt.length }
  } catch (e) {
    console.error('Knowledge sync failed', agent.id, e)
    return { ok: false, reason: 'failed' }
  }
}
