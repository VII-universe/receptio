import type { KnowledgeEntry } from '@/types'
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
