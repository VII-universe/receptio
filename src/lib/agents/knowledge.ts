import type { KnowledgeCategory } from '@/types'

export const KNOWLEDGE_CATEGORIES: {
  id: KnowledgeCategory
  label: string // název v UI
  heading: string // nadpis v promptu
  icon: string
  hint: string
}[] = [
  { id: 'basic_info', label: 'Základní informace', heading: 'Základní informace', icon: '🏢', hint: 'Adresa, telefon, web, IČO' },
  { id: 'hours', label: 'Otevírací doba', heading: 'Otevírací doba', icon: '🕐', hint: 'Po–Pá, So, Ne, svátky' },
  { id: 'services', label: 'Služby a ceny', heading: 'Služby a ceny', icon: '💼', hint: 'Co firma nabízí' },
  { id: 'faq', label: 'FAQ', heading: 'FAQ', icon: '❓', hint: 'Otázky a odpovědi' },
  { id: 'custom', label: 'Vlastní sekce', heading: 'Ostatní', icon: '✏️', hint: 'Cokoli dalšího' },
]

export const isKnowledgeCategory = (v: unknown): v is KnowledgeCategory =>
  typeof v === 'string' && KNOWLEDGE_CATEGORIES.some((c) => c.id === v)

// Meze, aby výsledný prompt nenarůstal bez omezení.
export const MAX_TITLE = 200
export const MAX_CONTENT = 2000
export const MAX_ENTRIES_PER_AGENT = 100
