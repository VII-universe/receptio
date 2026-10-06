import { DAYS } from '@/lib/constants'
import type { BusinessHours, FaqItem } from '@/types'

export interface AgentInput {
  name: string
  language: 'cs' | 'sk' | 'en'
  greetingMessage: string
  customInstructions: string
  faq: FaqItem[]
  fallbackPhone: string | null
  businessHours: BusinessHours
}

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/

function parseBusinessHours(value: unknown): BusinessHours | null {
  if (typeof value !== 'object' || value === null) return null
  const v = value as Record<string, { open?: unknown; from?: unknown; to?: unknown }>
  const out = {} as BusinessHours
  for (const { key } of DAYS) {
    const d = v[key]
    if (
      typeof d?.open !== 'boolean' ||
      typeof d.from !== 'string' ||
      typeof d.to !== 'string' ||
      !TIME.test(d.from) ||
      !TIME.test(d.to)
    ) {
      return null
    }
    out[key] = { open: d.open, from: d.from, to: d.to }
  }
  return out
}

/** Zvaliduje tělo POST/PATCH /api/agents. Vrací null při neplatném vstupu. */
export function parseAgentInput(body: unknown): AgentInput | null {
  if (typeof body !== 'object' || body === null) return null
  const b = body as Record<string, unknown>

  const name = typeof b.name === 'string' ? b.name.trim() : ''
  const greeting = typeof b.greetingMessage === 'string' ? b.greetingMessage.trim() : ''
  if (!name || !greeting) return null
  if (b.language !== 'cs' && b.language !== 'sk' && b.language !== 'en') return null
  if (typeof b.customInstructions !== 'string') return null

  const rawFaq = b.faq ?? []
  if (
    !Array.isArray(rawFaq) ||
    !rawFaq.every((f) => typeof f?.question === 'string' && typeof f?.answer === 'string')
  ) {
    return null
  }

  if (b.fallbackPhone != null && typeof b.fallbackPhone !== 'string') return null
  const businessHours = parseBusinessHours(b.businessHours)
  if (!businessHours) return null

  return {
    name,
    language: b.language,
    greetingMessage: greeting,
    customInstructions: b.customInstructions.trim(),
    faq: rawFaq as FaqItem[],
    fallbackPhone: (b.fallbackPhone as string | null | undefined)?.trim() || null,
    businessHours,
  }
}
