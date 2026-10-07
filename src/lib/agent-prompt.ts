import { DAYS } from '@/lib/constants'
import type { BusinessHours, FaqItem } from '@/types'

type Language = 'cs' | 'sk' | 'en'

const LANGUAGE_NAMES: Record<Language, string> = {
  cs: 'česky',
  sk: 'slovensky',
  en: 'anglicky',
}

export interface PromptParams {
  name: string
  language: Language
  customInstructions: string
  faq: FaqItem[]
  fallbackPhone?: string
  businessHours?: BusinessHours
}

export function buildSystemPrompt(params: PromptParams): string {
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

