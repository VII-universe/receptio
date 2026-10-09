import 'server-only'
import type { Vapi } from '@vapi-ai/server-sdk'
import { withDisclosure } from '@/lib/agents/disclosure'
import { enforcedRules, type RedirectRule } from '@/lib/agents/redirect-rules'
import { getLanguage } from '@/lib/languages'
import { vapi } from './client'
import { getVapiLocale } from './locale-map'

export interface AssistantParams {
  name: string
  language: string // kód z lib/languages.ts
  firstMessage: string
  systemPrompt: string
  voiceId: string
  endCallPhrases: string[]
  /** Minuty do automatického ukončení hovoru; null = bez limitu, undefined = nechat výchozí Vapi. */
  maxCallDurationMinutes?: number | null
  /** Oznámení o AI a nahrávání před pozdravem; výchozí zapnuto. */
  aiDisclosure?: boolean
  /** Nástroje modelu (přepojení, ukončení hovoru) odvozené z pravidel přesměrování. */
  tools?: Vapi.OpenAiModelToolsItem[]
}

/** Vapi povoluje nejvýše 12 hodin; to používáme pro "bez limitu". */
const UNLIMITED_SECONDS = 43200
const maxDurationSeconds = (minutes: number | null | undefined) =>
  minutes === undefined ? undefined : minutes === null ? UNLIMITED_SECONDS : Math.min(minutes * 60, UNLIMITED_SECONDS)

/** Nástroje z pravidel přesměrování: jeden transferCall se všemi cíli a endCall pro "přehrát zprávu a zavěsit". */
export function buildRedirectTools(rules: RedirectRule[]): Vapi.OpenAiModelToolsItem[] {
  const active = enforcedRules(rules)
  const tools: Vapi.OpenAiModelToolsItem[] = []
  const destinations = active.flatMap((r) =>
    r.action.type === 'play_message_hangup'
      ? []
      : [
          {
            type: 'number' as const,
            number: r.action.number,
            description: r.trigger.type === 'human_request' ? 'Customer asks to speak to a human' : 'Call outside business hours',
          },
        ]
  )
  if (destinations.length > 0) tools.push({ type: 'transferCall', destinations })
  if (active.some((r) => r.action.type === 'play_message_hangup')) tools.push({ type: 'endCall' })
  return tools
}

/** Nástroje pro rezervace; Vapi je volá na stejný webhook jako události hovoru (zpráva `tool-calls`). */
export function buildBookingTools(): Vapi.OpenAiModelToolsItem[] {
  const secret = process.env.VAPI_WEBHOOK_SECRET
  if (!secret) throw new Error('VAPI_WEBHOOK_SECRET is not set')
  const server = { url: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/vapi`, headers: { 'x-vapi-secret': secret } }
  return [
    {
      type: 'function',
      async: false,
      server,
      function: {
        name: 'checkAvailability',
        description: 'Checks the free appointment times for a given day.',
        parameters: {
          type: 'object',
          properties: {
            date: { type: 'string', description: 'The day to check, in YYYY-MM-DD format.' },
            party_size: { type: 'number', description: 'Number of people the booking is for (default 1).' },
          },
          required: ['date'],
        },
      },
    },
    {
      type: 'function',
      async: false,
      server,
      function: {
        name: 'createBooking',
        description: 'Creates an appointment after the caller has agreed to a time.',
        parameters: {
          type: 'object',
          properties: {
            caller_name: { type: 'string', description: 'Full name of the caller.' },
            caller_phone: { type: 'string', description: 'Phone number of the caller (omit to use the number they are calling from).' },
            starts_at: { type: 'string', description: 'Start of the appointment, ISO 8601 with time zone offset, as returned by checkAvailability.' },
            title: { type: 'string', description: 'Reason for the visit / type of service.' },
            party_size: { type: 'number', description: 'Number of people (default 1).' },
            resource_id: { type: 'string', description: 'ID of the chosen table / seat / room, exactly as returned by checkAvailability (only when it lists free resources).' },
            notes: { type: 'string', description: 'Anything the caller asked to be noted.' },
          },
          required: ['caller_name', 'starts_at'],
        },
      },
    },
  ]
}

/** Všechny nástroje agenta: přesměrování podle pravidel + rezervace, pokud je má agent zapnuté. */
export function buildAgentTools(agent: { booking_enabled?: boolean }, rules: RedirectRule[]): Vapi.OpenAiModelToolsItem[] {
  return [...buildRedirectTools(rules), ...(agent.booking_enabled ? buildBookingTools() : [])]
}

function buildAssistantConfig(params: AssistantParams) {
  const webhookSecret = process.env.VAPI_WEBHOOK_SECRET
  if (!webhookSecret) {
    throw new Error('VAPI_WEBHOOK_SECRET is not set')
  }
  const lang = getLanguage(params.language)
  const locale = getVapiLocale(params.language) // přepis a model hlasu podle jazyka agenta (viz locale-map)
  return {
    name: params.name,
    model: {
      provider: 'openai',
      model: 'gpt-4o-mini',
      messages: [{ role: 'system', content: params.systemPrompt }],
      tools: params.tools ?? [],
    },
    voice: {
      provider: '11labs',
      voiceId: params.voiceId,
      model: locale.voiceModel,
    },
    transcriber: {
      provider: 'deepgram',
      model: 'nova-2',
      language: locale.transcriberLanguage as 'cs', // kód jazyka přepisu; všechny kódy v registru Vapi SDK zná
    },
    firstMessage: withDisclosure(params.language, params.firstMessage, params.aiDisclosure ?? true),
    endCallMessage: lang.goodbye,
    endCallPhrases: params.endCallPhrases,
    ...(maxDurationSeconds(params.maxCallDurationMinutes) !== undefined
      ? { maxDurationSeconds: maxDurationSeconds(params.maxCallDurationMinutes) }
      : {}),
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
export async function updateVapiSystemPrompt(
  vapiAgentId: string,
  systemPrompt: string,
  extra: { tools?: Vapi.OpenAiModelToolsItem[]; maxCallDurationMinutes?: number | null; firstMessage?: string } = {}
) {
  const seconds = maxDurationSeconds(extra.maxCallDurationMinutes)
  return vapi.assistants.update({
    id: vapiAgentId,
    // Aktualizace modelu přepisuje celý objekt, proto vždy posíláme i nástroje.
    model: { provider: 'openai', model: 'gpt-4o-mini', messages: [{ role: 'system', content: systemPrompt }], tools: extra.tools ?? [] },
    ...(seconds !== undefined ? { maxDurationSeconds: seconds } : {}),
    ...(extra.firstMessage ? { firstMessage: extra.firstMessage } : {}),
  })
}
