import { getLanguage } from '@/lib/languages'
import type { Industry, KnowledgeCategory, WorkingHour } from '@/types'

export type BusinessType = 'restaurant' | 'dental' | 'autoservice' | 'beauty' | 'shop' | 'other'

export const BUSINESS_TYPES: { id: BusinessType; label: string; icon: string; industry: Industry }[] = [
  { id: 'restaurant', label: 'Restaurant / Café', icon: '🍽️', industry: 'restaurant' },
  { id: 'dental', label: 'Dental clinic', icon: '🦷', industry: 'dentist' },
  { id: 'autoservice', label: 'Auto repair shop', icon: '🔧', industry: 'auto_repair' },
  { id: 'beauty', label: 'Hair salon / Beauty', icon: '✂️', industry: 'hair_salon' },
  { id: 'shop', label: 'Retail / Shop', icon: '🏪', industry: 'other' },
  { id: 'other', label: 'General business', icon: '📋', industry: 'other' },
]

export const isBusinessType = (v: unknown): v is BusinessType =>
  typeof v === 'string' && BUSINESS_TYPES.some((t) => t.id === v)

interface Template {
  agentName: string
  firstMessage: string
  systemPrompt: string
}

// Systémové prompty jsou anglicky: agent mluví jazykem nastaveným u agenta (pokyn k jazyku se k promptu
// přidává automaticky), ne jazykem rozhraní. Česká úvodní věta je řeč agenta, ne text rozhraní.
const TEMPLATES: Record<'restaurant' | 'dental' | 'autoservice' | 'beauty' | 'other', Template> = {
  restaurant: {
    agentName: 'Alex',
    firstMessage: 'Dobrý den, restaurace [Name], jak vám mohu pomoci?',
    systemPrompt: `You are an AI receptionist for the restaurant [Name].
Your job is to take table reservations, tell callers the opening hours and answer questions about the menu.
Rules:
- Speak naturally, not like a robot
- For a reservation, ask for: date, time, number of guests, name and phone number
- Never make up information you do not have
- If you are unsure, offer to call back`,
  },
  dental: {
    agentName: 'Alex',
    firstMessage: 'Dobrý den, ordinace [Name], jak vám mohu pomoci?',
    systemPrompt: `You are an AI assistant for the dental clinic [Name].
Your job is to book appointments and answer basic questions.
Rules:
- When booking, ask for: name, date of birth, type of treatment, preferred time
- For acute pain, direct the caller to emergency care or offer the earliest available appointment
- Never make up prices or diagnoses`,
  },
  autoservice: {
    agentName: 'Alex',
    firstMessage: 'Dobrý den, autoservis [Name], co pro vás mohu udělat?',
    systemPrompt: `You are an AI dispatcher for the auto repair shop [Name].
You take repair orders and give updates on repair status.
Rules:
- When taking an order, ask for: make and model of the car, the problem, preferred date
- Do not quote prices; offer a quote after an inspection
- Check the repair status and call the customer back`,
  },
  beauty: {
    agentName: 'Alex',
    firstMessage: 'Dobrý den, salon [Name], jak vám mohu pomoci?',
    systemPrompt: `You are an AI receptionist for the hair and beauty salon [Name].
You take bookings and answer questions.
Rules:
- When booking, ask for: the service, the preferred stylist (if relevant), date and time
- Mention the approximate duration of the treatment
- Accept cancellations at least 24 hours in advance`,
  },
  other: {
    agentName: 'Alex',
    firstMessage: 'Dobrý den, [Name], jak vám mohu pomoci?',
    systemPrompt: `You are an AI assistant for the business [Name].
You answer calls and questions from customers.
Rules:
- Speak naturally and professionally
- Never make up information you do not have
- If you are unsure, offer to call back or take a message`,
  },
}

/** Šablona pro typ podniku s dosazeným názvem; "Retail / Shop" používá obecnou šablonu. */
export function templateFor(type: BusinessType, businessName: string, language = 'cs'): Template {
  const t = TEMPLATES[type === 'shop' ? 'other' : type]
  const fill = (s: string) => s.replaceAll('[Name]', businessName)
  const cs = language === 'cs'
  return {
    // Pro češtinu je úvodní věta česká; pro jiné jazyky se použije obecný pozdrav z registru jazyků.
    agentName: t.agentName,
    firstMessage: cs ? fill(t.firstMessage) : getLanguage(language).greeting(businessName),
    systemPrompt: fill(t.systemPrompt),
  }
}

export interface KnowledgeSeed {
  category: KnowledgeCategory
  title: string
  content: string
}

const KNOWLEDGE_TEMPLATES: Record<'restaurant' | 'dental' | 'autoservice' | 'beauty', KnowledgeSeed[]> = {
  restaurant: [
    { category: 'basic_info', title: 'Business type', content: 'Restaurant' },
    { category: 'faq', title: 'Do you take reservations?', content: 'Yes, we take reservations by phone or online.' },
  ],
  dental: [
    { category: 'basic_info', title: 'Business type', content: 'Dental clinic' },
    { category: 'faq', title: 'How can I book an appointment?', content: 'We arrange appointments by phone. We need your name, date of birth and the type of treatment.' },
  ],
  autoservice: [
    { category: 'basic_info', title: 'Business type', content: 'Auto repair shop' },
    { category: 'faq', title: 'How do I book a service?', content: 'We arrange the appointment by phone. We need the make and model of your car and a description of the problem.' },
  ],
  beauty: [
    { category: 'basic_info', title: 'Business type', content: 'Hair and beauty salon' },
    { category: 'faq', title: 'How can I book an appointment?', content: 'We arrange appointments by phone. We need the service you want and your preferred day and time.' },
  ],
}

/** Úvodní záznamy znalostní báze pro nového agenta ("Retail / Shop" a "General business" mají jen název podniku). */
export function knowledgeSeedFor(type: BusinessType, businessName: string): KnowledgeSeed[] {
  const name: KnowledgeSeed = { category: 'basic_info', title: 'Business name', content: businessName }
  const key = type === 'shop' || type === 'other' ? null : type
  return [name, ...(key ? KNOWLEDGE_TEMPLATES[key] : [])]
}

const open = (days: number[], from: string, to: string): WorkingHour[] =>
  days.map((d) => ({ day_of_week: d, is_open: true, open_time: from, close_time: to }))
const shut = (days: number[]): WorkingHour[] =>
  days.map((d) => ({ day_of_week: d, is_open: false, open_time: null, close_time: null }))
const byDay = (rows: WorkingHour[]) => [...rows].sort((a, b) => a.day_of_week - b.day_of_week)

/** Typická pracovní doba oboru (dřív součást šablon promptu); uživatel ji upraví v detailu agenta. */
const WORKING_HOURS_TEMPLATES: Record<'restaurant' | 'dental' | 'autoservice' | 'beauty', WorkingHour[]> = {
  restaurant: byDay([...open([1, 2, 3, 4, 5], '11:00', '22:00'), ...open([6, 0], '12:00', '22:00')]),
  dental: byDay([...open([1, 2, 3, 4, 5], '08:00', '17:00'), ...shut([6, 0])]),
  autoservice: byDay([...open([1, 2, 3, 4, 5], '07:00', '17:00'), ...open([6], '08:00', '12:00'), ...shut([0])]),
  beauty: byDay([...open([1, 2, 3, 4, 5, 6], '09:00', '19:00'), ...shut([0])]),
}

/** Pracovní doba pro nového agenta; "Obchod" a "Jiné" nechávají výchozí (Po–Pá 8–17). */
export function workingHoursFor(type: BusinessType): WorkingHour[] | null {
  return type === 'shop' || type === 'other' ? null : WORKING_HOURS_TEMPLATES[type]
}
