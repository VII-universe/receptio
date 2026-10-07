import 'server-only'
import type { Vapi } from '@vapi-ai/server-sdk'
import { getLanguage } from '@/lib/languages'
import { vapi } from './client'

export interface AssistantParams {
  name: string
  language: string // kód z lib/languages.ts
  firstMessage: string
  systemPrompt: string
  voiceId: string
  endCallPhrases: string[]
}

function buildAssistantConfig(params: AssistantParams) {
  const webhookSecret = process.env.VAPI_WEBHOOK_SECRET
  if (!webhookSecret) {
    throw new Error('VAPI_WEBHOOK_SECRET is not set')
  }
  const lang = getLanguage(params.language)
  return {
    name: params.name,
    model: {
      provider: 'openai',
      model: 'gpt-4o-mini',
      messages: [{ role: 'system', content: params.systemPrompt }],
    },
    voice: {
      provider: '11labs',
      voiceId: params.voiceId,
      model: 'eleven_multilingual_v2',
    },
    transcriber: {
      provider: 'deepgram',
      model: 'nova-2',
      language: lang.deepgram as 'cs', // kód jazyka přepisu; všechny kódy v registru Vapi SDK zná
    },
    firstMessage: params.firstMessage,
    endCallMessage: lang.goodbye,
    endCallPhrases: params.endCallPhrases,
    // Webhook ověřujeme sdíleným tajemstvím v hlavičce (viz api/webhooks/vapi).
    server: {
      url: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/vapi`,
      headers: { 'x-vapi-secret': webhookSecret },
    },
  } satisfies Vapi.CreateAssistantDto
}

export async function createVapiAgent(params: AssistantParams) {
  return vapi.assistants.create(buildAssistantConfig(params))
}

export async function updateVapiAgent(vapiAgentId: string, params: AssistantParams) {
  return vapi.assistants.update({ id: vapiAgentId, ...buildAssistantConfig(params) })
}

export async function getVapiAgent(vapiAgentId: string) {
  return vapi.assistants.get({ id: vapiAgentId })
}

export async function deleteVapiAgent(vapiAgentId: string) {
  return vapi.assistants.delete({ id: vapiAgentId })
}

/** Přepíše jen system prompt asistenta (ostatní nastavení ve Vapi zůstává). */
export async function updateVapiSystemPrompt(vapiAgentId: string, systemPrompt: string) {
  return vapi.assistants.update({
    id: vapiAgentId,
    model: { provider: 'openai', model: 'gpt-4o-mini', messages: [{ role: 'system', content: systemPrompt }] },
  })
}
