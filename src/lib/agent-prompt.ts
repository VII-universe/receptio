import { DAYS } from '@/lib/constants'
import type { BusinessHours, FaqItem } from '@/types'

export interface PromptParams {
  name: string
  language?: string // jazyk se do promptu přidává automaticky (viz base-prompt.ts)
  customInstructions: string
  faq: FaqItem[]
  fallbackPhone?: string
  businessHours?: BusinessHours
}

export function buildSystemPrompt(params: PromptParams): string {
  const faq =
    params.faq.length > 0
      ? `Frequently asked questions:\n${params.faq
          .map((f) => `Q: ${f.question}\nA: ${f.answer}`)
          .join('\n\n')}`
      : ''
  const fallback = params.fallbackPhone
    ? `In urgent situations or when the customer explicitly asks, transfer the call to: ${params.fallbackPhone}`
    : ''

  const hours = params.businessHours
    ? `Opening hours:\n${DAYS.map(({ key, label }) => {
        const d = params.businessHours![key]
        return `${label}: ${d.open ? `${d.from}–${d.to}` : 'closed'}`
      }).join('\n')}`
    : ''

  return [
    `You are ${params.name}, an AI receptionist.`,
    'Your job is to answer calls professionally and in a friendly manner.',
    params.customInstructions,
    faq,
    hours,
    fallback,
    [
      'Rules:',
      '- Speak naturally, not like a robot',
      '- Never make up information you do not have',
      '- Be brief and specific',
      '- If you are unsure, offer to call back or take a message',
    ].join('\n'),
  ]
    .filter(Boolean)
    .join('\n\n')
}
