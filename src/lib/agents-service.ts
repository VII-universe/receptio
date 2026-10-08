import 'server-only'
import type { AgentFormData } from '@/lib/agent-schema'
import { stripDisclosure } from '@/lib/agents/disclosure'
import { defaultVoiceFor } from '@/lib/agents/voices'
import { getLanguage } from '@/lib/languages'
import type { Agent } from '@/types'

/** Data formuláře z Vapi (zdroj pravdy); při výpadku nebo chybějícím propojení z kopie v DB. */
export async function loadAgentFormData(agent: Agent): Promise<{ form: AgentFormData; source: 'vapi' | 'db' }> {
  const fromDb: AgentFormData = {
    name: agent.name,
    language: agent.language,
    firstMessage: agent.greeting_message ?? '',
    systemPrompt: agent.system_prompt ?? agent.custom_instructions ?? '',
    voiceId: agent.voice_id ?? defaultVoiceFor(agent.language),
    endCallPhrases: agent.end_call_phrases?.length ? agent.end_call_phrases : getLanguage(agent.language).endPhrases,
    aiDisclosure: agent.ai_disclosure_enabled ?? true,
    ringsBeforeAnswer: agent.rings_before_answer ?? 0,
    maxCallDurationMinutes: agent.max_call_duration_minutes ?? null,
  }

  if (!agent.vapi_agent_id || !process.env.VAPI_API_KEY) return { form: fromDb, source: 'db' }

  try {
    const { getVapiAgent } = await import('@/lib/vapi/agents')
    const a = await getVapiAgent(agent.vapi_agent_id)
    const messages = (a.model as { messages?: { role: string; content?: string }[] } | undefined)?.messages
    return {
      source: 'vapi',
      form: {
        name: a.name ?? fromDb.name,
        language: agent.language, // jazyk se ve Vapi neukládá 1:1, bereme z DB
        // Oznámení o AI se přidává automaticky, ve formuláři ho nechceme duplikovat.
        firstMessage: a.firstMessage ? stripDisclosure(a.firstMessage) : fromDb.firstMessage,
        // Ve Vapi je prompt včetně znalostní báze, formulář edituje jen základní prompt z DB.
        systemPrompt: agent.system_prompt ?? messages?.find((m) => m.role === 'system')?.content ?? fromDb.systemPrompt,
        voiceId: (a.voice as { voiceId?: string } | undefined)?.voiceId ?? fromDb.voiceId,
        endCallPhrases: a.endCallPhrases ?? fromDb.endCallPhrases,
        // Tato dvě nastavení jsou v DB (zdroj pravdy); ve Vapi se jen promítají.
        aiDisclosure: fromDb.aiDisclosure,
        ringsBeforeAnswer: fromDb.ringsBeforeAnswer,
        maxCallDurationMinutes: fromDb.maxCallDurationMinutes,
      },
    }
  } catch (e) {
    console.error('Vapi: failed to load assistant, using DB copy', agent.vapi_agent_id, e)
    return { form: fromDb, source: 'db' }
  }
}
