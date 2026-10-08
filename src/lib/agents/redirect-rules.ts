import { z } from 'zod'

export const MAX_RULES = 10
export const MAX_REDIRECT_MESSAGE = 300

/** Telefonní číslo v mezinárodním formátu (E.164), jak ho vyžaduje Vapi i Twilio. */
export const E164 = /^\+[1-9]\d{6,14}$/

const phone = z.string().trim().regex(E164, 'Invalid phone number')

export const triggerSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('rings_no_answer'), rings: z.number().int().min(1).max(10) }),
  z.object({ type: z.literal('call_duration'), minutes: z.number().int().min(1).max(60) }),
  z.object({ type: z.literal('human_request') }),
  z.object({ type: z.literal('outside_hours') }),
])

export const actionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('transfer_number'), number: phone }),
  z.object({ type: z.literal('play_message_hangup'), message: z.string().trim().min(1).max(MAX_REDIRECT_MESSAGE) }),
  z.object({ type: z.literal('voicemail'), number: phone }),
])

export const redirectRuleSchema = z.object({ trigger: triggerSchema, action: actionSchema })
export const redirectRulesSchema = z.array(redirectRuleSchema).max(MAX_RULES)

export type Trigger = z.infer<typeof triggerSchema>
export type Action = z.infer<typeof actionSchema>
export type RedirectRule = z.infer<typeof redirectRuleSchema>
export type TriggerType = Trigger['type']
export type ActionType = Action['type']

export const TRIGGER_TYPES: TriggerType[] = ['rings_no_answer', 'call_duration', 'human_request', 'outside_hours']
export const ACTION_TYPES: ActionType[] = ['transfer_number', 'play_message_hangup', 'voicemail']

/**
 * Které spouštěče umí platforma skutečně vynutit. Zvonění bez odpovědi a délka hovoru se uloží,
 * ale Vapi pro ně nemá podporu (první se odehrává u operátora, druhé nemá model jak měřit).
 */
export const isEnforcedTrigger = (t: Trigger) => t.type === 'human_request' || t.type === 'outside_hours'

export function defaultTrigger(type: TriggerType): Trigger {
  switch (type) {
    case 'rings_no_answer':
      return { type, rings: 4 }
    case 'call_duration':
      return { type, minutes: 5 }
    default:
      return { type }
  }
}

export function defaultAction(type: ActionType): Action {
  switch (type) {
    case 'play_message_hangup':
      return { type, message: '' }
    default:
      return { type, number: '' }
  }
}

/** Řádek z tabulky redirect_rules → pravidlo (neplatná data z DB se přeskočí, ať jedna vadná řádka neshodí agenta). */
export function ruleFromRow(row: {
  trigger_type: string
  trigger_config: unknown
  action_type: string
  action_config: unknown
}): RedirectRule | null {
  const parsed = redirectRuleSchema.safeParse({
    trigger: { type: row.trigger_type, ...(row.trigger_config as object) },
    action: { type: row.action_type, ...(row.action_config as object) },
  })
  return parsed.success ? parsed.data : null
}

export function rowFromRule(rule: RedirectRule) {
  const { type: triggerType, ...triggerConfig } = rule.trigger
  const { type: actionType, ...actionConfig } = rule.action
  return { trigger_type: triggerType, trigger_config: triggerConfig, action_type: actionType, action_config: actionConfig }
}

/** Pravidla, která se promítnou do Vapi (v zadaném pořadí). */
export const enforcedRules = (rules: RedirectRule[]) => rules.filter((r) => isEnforcedTrigger(r.trigger))

/** Textový pokyn do system promptu; prázdný řetězec, když není co vynucovat. */
export function compileRedirectInstructions(rules: RedirectRule[]): string {
  const active = enforcedRules(rules)
  if (active.length === 0) return ''
  const lines = active.map((r, i) => {
    const when = r.trigger.type === 'human_request' ? 'the customer asks to speak to a human or a real person' : 'the call arrives outside the business hours described above'
    const what =
      r.action.type === 'play_message_hangup'
        ? `say exactly this message: "${r.action.message}" and then end the call`
        : `use the transferCall tool to transfer the call to ${r.action.number}`
    return `${i + 1}. When ${when}: ${what}.`
  })
  return `## Call routing rules\nApply the first rule below that matches the situation. Never invent other transfers.\n${lines.join('\n')}`
}
