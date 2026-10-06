import 'server-only'
import type { Vapi } from '@vapi-ai/server-sdk'
import { DAYS } from '@/lib/constants'
import type { BusinessHours, FaqItem } from '@/types'
import { vapi } from './client'

type Language = 'cs' | 'sk' | 'en'

export interface VapiAgentParams {
  name: string
  language: Language
  greetingMessage: string
  customInstructions: string
  faq: FaqItem[]
  fallbackPhone?: string
  businessHours?: BusinessHours
}

const LANGUAGE_NAMES: Record<Language, string> = {
  cs: 'česky',
  sk: 'slovensky',
  en: 'anglicky',
}

export function getVoiceId(language: Language): string {
  switch (language) {
    case 'en':
      return '21m00Tcm4TlvDq8ikWAM' // Rachel
    case 'cs':
    case 'sk': // slovenský hlas zatím není, používáme český
      return 'cgSgspJ2msm6clMCkdW9'
  }
}

export function buildSystemPrompt(params: VapiAgentParams): string {
  const faq =
    params.faq.length > 0
      ? `Časté otázky a odpovědi:\n${params.faq
          .map((f) => `Q: ${f.question}\nA: ${f.answer}`)
          .join('\n\n')}`
      : ''
  const fallback = params.fallbackPhone
    ? `Při urgentních situacích nebo na výslovnou žádost zákazníka předej hovor na: ${params.fallbackPhone}`
    : ''

  const hours = params.businessHours
    ? `Otevírací doba:\n${DAYS.map(({ key, label }) => {
        const d = params.businessHours![key]
        return `${label}: ${d.open ? `${d.from}–${d.to}` : 'zavřeno'}`
      }).join('\n')}`
    : ''

  return [
    `Jsi ${params.name}, AI recepční. Mluvíš POUZE ${LANGUAGE_NAMES[params.language]}.`,
    'Tvůj úkol je přijímat hovory profesionálně a přátelsky.',
    params.customInstructions,
    faq,
    hours,
    fallback,
    [
      'Pravidla:',
      '- Mluv přirozeně, ne jako robot',
      '- Nikdy nevymýšlej informace, které nemáš',
      '- Buď stručný a konkrétní',
      '- Při nejistotě nabídni zavolat zpět nebo zanechat vzkaz',
    ].join('\n'),
  ]
    .filter(Boolean)
    .join('\n\n')
}

function buildAssistantConfig(params: VapiAgentParams) {
  const webhookSecret = process.env.VAPI_WEBHOOK_SECRET
  if (!webhookSecret) {
    throw new Error('VAPI_WEBHOOK_SECRET is not set')
  }
  return {
    name: params.name,
    model: {
      provider: 'openai',
      model: 'gpt-4o-mini',
      messages: [{ role: 'system', content: buildSystemPrompt(params) }],
    },
    voice: {
      provider: '11labs',
      voiceId: getVoiceId(params.language),
      model: 'eleven_multilingual_v2',
    },
    transcriber: {
      provider: 'deepgram',
      model: 'nova-2',
      language: params.language === 'en' ? 'en' : 'cs',
    },
    firstMessage: params.greetingMessage,
    endCallMessage: 'Nashledanou, hezký den.',
    endCallPhrases: ['nashledanou', 'na shledanou', 'čau', 'bye', 'goodbye'],
    // Webhook ověřujeme sdíleným tajemstvím v hlavičce (viz api/webhooks/vapi).
    server: {
      url: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/vapi`,
      headers: { 'x-vapi-secret': webhookSecret },
    },
  } satisfies Vapi.CreateAssistantDto
}

export async function createVapiAgent(params: VapiAgentParams) {
  return vapi.assistants.create(buildAssistantConfig(params))
}

export async function updateVapiAgent(vapiAgentId: string, params: VapiAgentParams) {
  return vapi.assistants.update({ id: vapiAgentId, ...buildAssistantConfig(params) })
}

export async function deleteVapiAgent(vapiAgentId: string) {
  return vapi.assistants.delete({ id: vapiAgentId })
}
