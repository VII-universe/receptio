import type { KnowledgeCategory } from '@/types'

export const KNOWLEDGE_CATEGORIES: {
  id: KnowledgeCategory
  label: string // název v UI
  heading: string // nadpis v promptu
  icon: string
  hint: string
}[] = [
  { id: 'basic_info', label: 'Basic information', heading: 'Basic information', icon: '🏢', hint: 'Address, phone, website, company ID' },
  { id: 'hours', label: 'Opening hours', heading: 'Opening hours', icon: '🕐', hint: 'Mon–Fri, Sat, Sun, holidays' },
  { id: 'services', label: 'Services & pricing', heading: 'Services and pricing', icon: '💼', hint: 'What the business offers' },
  { id: 'faq', label: 'FAQ', heading: 'FAQ', icon: '❓', hint: 'Questions and answers' },
  { id: 'custom', label: 'Custom section', heading: 'Other', icon: '✏️', hint: 'Anything else' },
]

export const isKnowledgeCategory = (v: unknown): v is KnowledgeCategory =>
  typeof v === 'string' && KNOWLEDGE_CATEGORIES.some((c) => c.id === v)

// Meze, aby výsledný prompt nenarůstal bez omezení.
export const MAX_TITLE = 200
export const MAX_CONTENT = 2000
export const MAX_ENTRIES_PER_AGENT = 100
