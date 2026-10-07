import type { Industry, KnowledgeCategory } from '@/types'

export type BusinessType = 'restaurant' | 'dental' | 'autoservice' | 'beauty' | 'shop' | 'other'

export const BUSINESS_TYPES: { id: BusinessType; label: string; icon: string; industry: Industry }[] = [
  { id: 'restaurant', label: 'Restaurace / Kavárna', icon: '🍽️', industry: 'restaurant' },
  { id: 'dental', label: 'Zdravotnictví / Zubař', icon: '🦷', industry: 'dentist' },
  { id: 'autoservice', label: 'Autoservis / Opravna', icon: '🔧', industry: 'auto_repair' },
  { id: 'beauty', label: 'Kadeřnictví / Kosmetika', icon: '✂️', industry: 'hair_salon' },
  { id: 'shop', label: 'Obchod / Prodejna', icon: '🏪', industry: 'other' },
  { id: 'other', label: 'Jiné', icon: '📋', industry: 'other' },
]

export const isBusinessType = (v: unknown): v is BusinessType =>
  typeof v === 'string' && BUSINESS_TYPES.some((t) => t.id === v)

interface Template {
  agentName: string
  firstMessage: string
  systemPrompt: string
}

const TEMPLATES: Record<'restaurant' | 'dental' | 'autoservice' | 'beauty' | 'other', Template> = {
  restaurant: {
    agentName: 'Recepční',
    firstMessage: 'Dobrý den, restaurace [Název], jak vám mohu pomoci?',
    systemPrompt: `Jsi AI recepční restaurace [Název]. Mluvíš POUZE česky.
Tvůj úkol je přijímat rezervace, informovat o otevírací době a odpovídat na dotazy k menu.
Pravidla:
- Mluv přirozeně, ne jako robot
- Při rezervaci zjisti: datum, čas, počet osob, jméno a telefon
- Nevymýšlej informace, které nemáš
- Při nejistotě nabídni zavolat zpět`,
  },
  dental: {
    agentName: 'Asistentka',
    firstMessage: 'Dobrý den, ordinace [Název], jak vám mohu pomoci?',
    systemPrompt: `Jsi AI asistentka zubní ordinace [Název]. Mluvíš POUZE česky.
Tvůj úkol je objednávat pacienty a odpovídat na základní dotazy.
Pravidla:
- Při objednání zjisti: jméno, datum narození, typ ošetření, preferovaný termín
- Urgentní bolest přesměruj na pohotovost nebo nabídni nejbližší volný termín
- Nevymýšlej ceny ani diagnózy`,
  },
  autoservice: {
    agentName: 'Dispečer',
    firstMessage: 'Dobrý den, autoservis [Název], co pro vás mohu udělat?',
    systemPrompt: `Jsi AI dispečer autoservisu [Název]. Mluvíš POUZE česky.
Přijímáš zakázky a informuješ o stavu oprav.
Pravidla:
- Při příjmu zakázky zjisti: značku a typ vozu, problém, preferovaný termín
- Orientační ceny nesděluj, nabídni kalkulaci po prohlídce
- Stav opravy ověř a zavolej zpět`,
  },
  beauty: {
    agentName: 'Recepční',
    firstMessage: 'Dobrý den, salon [Název], jak vám mohu pomoci?',
    systemPrompt: `Jsi AI recepční kadeřnického/kosmetického salonu [Název]. Mluvíš POUZE česky.
Přijímáš rezervace a odpovídáš na dotazy.
Pravidla:
- Při rezervaci zjisti: požadovanou službu, preferovaného stylistu (pokud relevantní), datum a čas
- Uveď přibližnou délku procedury
- Storna přijímej nejpozději 24 h předem`,
  },
  other: {
    agentName: 'Asistent',
    firstMessage: 'Dobrý den, [Název], jak vám mohu pomoci?',
    systemPrompt: `Jsi AI asistent firmy [Název]. Mluvíš POUZE česky.
Přijímáš hovory a odpovídáš na dotazy zákazníků.
Pravidla:
- Mluv přirozeně a profesionálně
- Nevymýšlej informace, které nemáš
- Při nejistotě nabídni zavolat zpět nebo zanechat vzkaz`,
  },
}

/** Šablona pro typ podniku s dosazeným názvem; "Obchod" používá obecnou šablonu. */
export function templateFor(type: BusinessType, businessName: string): Template {
  const t = TEMPLATES[type === 'shop' ? 'other' : type]
  const fill = (s: string) => s.replaceAll('[Název]', businessName)
  return { agentName: t.agentName, firstMessage: fill(t.firstMessage), systemPrompt: fill(t.systemPrompt) }
}

const LANGUAGE_WORD = { cs: 'česky', sk: 'slovensky', en: 'anglicky' } as const

/** Přepíše "Mluvíš POUZE <jazyk>" v promptu na vybraný jazyk. */
export function applyLanguage(prompt: string, language: keyof typeof LANGUAGE_WORD): string {
  return prompt.replace(/POUZE (česky|slovensky|anglicky)/, `POUZE ${LANGUAGE_WORD[language]}`)
}

export interface KnowledgeSeed {
  category: KnowledgeCategory
  title: string
  content: string
}

const KNOWLEDGE_TEMPLATES: Record<'restaurant' | 'dental' | 'autoservice' | 'beauty', KnowledgeSeed[]> = {
  restaurant: [
    { category: 'basic_info', title: 'Typ podniku', content: 'Restaurace' },
    { category: 'hours', title: 'Otevírací doba', content: 'Po–Pá 11:00–22:00, So–Ne 12:00–22:00' },
    { category: 'faq', title: 'Přijímáte rezervace?', content: 'Ano, rezervace přijímáme telefonicky nebo online.' },
  ],
  dental: [
    { category: 'basic_info', title: 'Typ podniku', content: 'Zubní ordinace' },
    { category: 'hours', title: 'Ordinační hodiny', content: 'Po–Pá 8:00–17:00' },
    { category: 'faq', title: 'Jak se mohu objednat?', content: 'Termín domluvíme telefonicky, potřebujeme vaše jméno, datum narození a typ ošetření.' },
  ],
  autoservice: [
    { category: 'basic_info', title: 'Typ podniku', content: 'Autoservis' },
    { category: 'hours', title: 'Pracovní doba', content: 'Po–Pá 7:00–17:00, So 8:00–12:00' },
    { category: 'faq', title: 'Jak se objednám na servis?', content: 'Termín domluvíme telefonicky, potřebujeme značku a typ vozu a popis problému.' },
  ],
  beauty: [
    { category: 'basic_info', title: 'Typ podniku', content: 'Kadeřnictví / kosmetický salon' },
    { category: 'hours', title: 'Otevírací doba', content: 'Po–So 9:00–19:00' },
    { category: 'faq', title: 'Jak se mohu objednat?', content: 'Termín domluvíme telefonicky, potřebujeme požadovanou službu a preferovaný den a čas.' },
  ],
}

/** Úvodní záznamy znalostní báze pro nového agenta (obor "Obchod" a "Jiné" mají jen název podniku). */
export function knowledgeSeedFor(type: BusinessType, businessName: string): KnowledgeSeed[] {
  const name: KnowledgeSeed = { category: 'basic_info', title: 'Název podniku', content: businessName }
  const key = type === 'shop' || type === 'other' ? null : type
  return [name, ...(key ? KNOWLEDGE_TEMPLATES[key] : [])]
}
