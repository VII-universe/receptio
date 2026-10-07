import type { KnowledgeEntry, WorkingHour } from '@/types'
import { DAY_ORDER } from './working-hours'
import { KNOWLEDGE_CATEGORIES } from './knowledge'

/**
 * Sestaví finální system prompt: nejdřív basePrompt, pak sekce "Informace o firmě"
 * se záznamy seskupenými podle kategorie ("**title**: content"). Bez záznamů vrací basePrompt.
 */
export function compileKnowledge(basePrompt: string, entries: KnowledgeEntry[]): string {
  const base = basePrompt.trim()
  if (entries.length === 0) return base

  const sections = KNOWLEDGE_CATEGORIES.map((cat) => {
    const items = entries
      .filter((e) => e.category === cat.id)
      .sort((a, b) => a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at))
    if (items.length === 0) return null
    return `### ${cat.heading}\n${items.map((e) => `**${e.title.trim()}**: ${e.content.trim()}`).join('\n')}`
  }).filter((s): s is string => s !== null)

  return `${base}\n\n## Informace o firmě\n\n${sections.join('\n\n')}`
}

/**
 * Sekce s pracovní dobou pro konec system promptu. Vapi dosazuje do promptu aktuální čas
 * (proměnná `now` s časovou zónou), podle ní se agent rozhoduje, zda je otevřeno.
 * Časová zóna musí pocházet z povoleného seznamu (viz isTimezone), nikdy z volného vstupu.
 */
export function compileWorkingHours(hours: WorkingHour[], timezone: string, outsideMessage: string): string {
  const byDay = new Map(hours.map((h) => [h.day_of_week, h]))
  const lines = DAY_ORDER.map(({ day, label }) => {
    const h = byDay.get(day)
    if (!h || !h.is_open) return `${label}: Zavřeno`
    return h.open_time && h.close_time ? `${label}: ${h.open_time}–${h.close_time}` : `${label}: Otevřeno celý den`
  })
  return [
    '## Pracovní doba',
    `Aktuální časová zóna: ${timezone}`,
    `Aktuální čas: {{"now" | date: "%A %d.%m.%Y %H:%M", "${timezone}"}}`,
    '',
    ...lines,
    '',
    `Mimo pracovní dobu: ${outsideMessage}`,
  ].join('\n')
}
