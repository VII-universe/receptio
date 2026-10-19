import { z } from 'zod'
import type { PlanId } from '@/lib/billing/plans'
import { isValidPhone } from '@/lib/bookings/phone'

// Sdílené mezi serverem a UI (bez serverových závislostí).

export const OUTBOUND_PLANS: PlanId[] = ['business', 'pro'] // "Growth" v zadání = plán Business
export const outboundAllowedFor = (plan: PlanId) => OUTBOUND_PLANS.includes(plan)

export const MAX_MESSAGE = 400
export const MAX_TEMPLATES_PER_AGENT = 10
export const TEMPLATE_VARIABLES = ['customer_name', 'business_name', 'time'] as const
export const MAX_CALL_SECONDS = 120 // jen připomínka, ne konverzace

export const DEFAULT_MESSAGE =
  'Dobrý den, {{customer_name}}, volám z {{business_name}} s připomínkou vaší rezervace {{time}}. Pokud vám termín nevyhovuje, dejte nám prosím vědět.'

export type TriggerKind = 'after_booking' | 'before_booking'
export type OutboundStatus = 'pending' | 'calling' | 'completed' | 'failed' | 'cancelled'

export const templateInputSchema = z
  .object({
    name: z.string().trim().min(1).max(80),
    trigger_type: z.enum(['after_booking', 'before_booking']),
    delay_hours: z.number().int().min(0).max(720),
    message_template: z.string().trim().min(5).max(MAX_MESSAGE),
    allowed_hours_from: z.number().int().min(0).max(23),
    allowed_hours_to: z.number().int().min(1).max(24),
    active: z.boolean(),
  })
  .refine((t) => t.allowed_hours_to > t.allowed_hours_from, { message: 'Invalid time window', path: ['allowed_hours_to'] })
export type TemplateInput = z.infer<typeof templateInputSchema>

export interface OutboundTemplate extends TemplateInput {
  id: string
  agent_id: string
  created_at: string
}

export interface OutboundCallItem {
  id: string
  agent_id: string
  customer_name: string
  phone_number: string
  scheduled_at: string
  status: OutboundStatus
  error_message: string | null
  is_test: boolean
  created_at: string
}

export const triggerSchema = z.object({
  agent_id: z.string().uuid(),
  template_id: z.string().uuid(),
  phone_number: z.string().trim().refine(isValidPhone, 'Invalid phone number'),
  customer_name: z.string().trim().min(1).max(100),
  scheduled_at: z.string().datetime({ offset: true }).optional(),
})

export const testSchema = z.object({
  agent_id: z.string().uuid(),
  phone_number: z.string().trim().refine(isValidPhone, 'Invalid phone number'),
})

/** Dosadí proměnné {{customer_name}}, {{business_name}}, {{time}}; neznámé proměnné zmizí. */
export function renderTemplate(message: string, vars: Record<string, string>): string {
  return message.replace(/\{\{\s*([a-z_]+)\s*\}\}/gi, (_, key: string) => vars[key.toLowerCase()] ?? '').replace(/\s{2,}/g, ' ').trim()
}
