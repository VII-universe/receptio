import 'server-only'
import { compileKnowledge } from '@/lib/agents/compile-knowledge'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Agent, KnowledgeEntry } from '@/types'

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

    const prompt = compileKnowledge(base, await getKnowledgeEntries(agent.workspace_id, agent.id))
    await vapiLib.updateVapiSystemPrompt(agent.vapi_agent_id, prompt)

    const syncedAt = new Date().toISOString()
    const { error } = await supabase.from('agents').update({ knowledge_synced_at: syncedAt }).eq('id', agent.id)
    if (error) console.error('Failed to store knowledge_synced_at', error)
    return { ok: true, syncedAt, promptLength: prompt.length }
  } catch (e) {
    console.error('Knowledge sync failed', agent.id, e)
    return { ok: false, reason: 'failed' }
  }
}
