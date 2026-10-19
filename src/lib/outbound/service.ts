import 'server-only'
import { withDisclosure } from '@/lib/agents/disclosure'
import { checkMinutesLimit } from '@/lib/billing/check-limit'
import { effectivePlan } from '@/lib/billing/get-workspace-plan'
import { normalizeTestPhone } from '@/lib/phone'
import { createAdminClient } from '@/lib/supabase/admin'
import { compileAgentPrompt, getRedirectRules } from '@/lib/agents/sync-knowledge'
import { buildRedirectTools } from '@/lib/vapi/agents'
import { createOutboundCall, OutboundCallError } from '@/lib/vapi/outbound'
import type { Agent, Booking, Workspace } from '@/types'
import { nextAllowedStart, formatWhen } from './window'
import { DEFAULT_MESSAGE, MAX_CALL_SECONDS, outboundAllowedFor, renderTemplate } from './schema'

const HOUR = 3_600_000
const MINUTE = 60_000

interface CallRow {
  id: string
  agent_id: string
  workspace_id: string
  template_id: string | null
  booking_id: string | null
  phone_number: string
  customer_name: string
  scheduled_at: string
  status: string
  is_test: boolean
}

interface TemplateRow {
  id: string
  agent_id: string
  workspace_id: string
  trigger_type: 'after_booking' | 'before_booking'
  delay_hours: number
  message_template: string
  allowed_hours_from: number
  allowed_hours_to: number
  active: boolean
  active_since: string
}

async function loadContext(agentId: string) {
  const supabase = createAdminClient()
  const { data: agent } = await supabase.from('agents').select('*').eq('id', agentId).maybeSingle()
  if (!agent) return null
  const [{ data: workspace }, { data: number }, { data: settings }] = await Promise.all([
    supabase.from('workspaces').select('*').eq('id', agent.workspace_id).maybeSingle(),
    supabase.from('phone_numbers').select('vapi_phone_number_id').eq('agent_id', agentId).limit(1).maybeSingle(),
    supabase.from('outbound_settings').select('gdpr_confirmed').eq('agent_id', agentId).maybeSingle(),
  ])
  if (!workspace) return null
  return {
    agent: agent as Agent,
    workspace: workspace as Workspace,
    phoneNumberId: (number?.vapi_phone_number_id as string | null | undefined) ?? null,
    gdprConfirmed: settings?.gdpr_confirmed === true,
  }
}

// Pokyny pro hovor, který agent sám zahajuje. Záměrně bez jména zákazníka: jména jsou nedůvěryhodný vstup
// a do system promptu nepatří (jméno zazní jen v první větě).
const REMINDER_INSTRUCTIONS = `## Outbound reminder call
This is an outbound call that YOU placed to a customer; they did not call you. Your opening message already told them the purpose of the call.
- Keep the call very short, under two minutes. Do not act as the inbound receptionist: do not offer new bookings and do not discuss unrelated topics at length.
- If the customer confirms or has no questions, thank them and end the call.
- If they want to cancel or change the appointment, say that the business will contact them to arrange it, then end the call politely. You cannot change bookings on this call.
- If you reach a voicemail or answering machine, leave a one-sentence reminder and end the call.
- If they ask who is calling, say you are the automated AI assistant of the business.`

/** Prompt a nástroje připomínacího hovoru: znalosti a pravidla agenta + pokyny pro odchozí hovor. Chyba vrací null (pak platí prompt asistenta). */
async function reminderModel(agent: Agent) {
  if (!agent.system_prompt?.trim()) return null
  try {
    const systemPrompt = await compileAgentPrompt(agent, `${agent.system_prompt}\n\n${REMINDER_INSTRUCTIONS}`)
    const tools = buildRedirectTools(await getRedirectRules(agent.workspace_id, agent.id))
    if (!tools.some((t) => t.type === 'endCall')) tools.push({ type: 'endCall' })
    return { systemPrompt, tools }
  } catch (e) {
    console.error('Outbound: failed to build reminder prompt, using the assistant prompt', e)
    return null
  }
}

/** Má agent číslo, ze kterého může volat? (Odchozí hovory jdou z čísla agenta.) */
export async function agentHasOutboundNumber(agentId: string): Promise<boolean> {
  const { data } = await createAdminClient().from('phone_numbers').select('vapi_phone_number_id').eq('agent_id', agentId).not('vapi_phone_number_id', 'is', null).limit(1).maybeSingle()
  return Boolean(data)
}

/** Odkud hovor pochází pro historii hovorů: připomínka z fronty ("reminder"), jinak testovací hovor ("test"). */
export async function outboundCallSource(callSid: string): Promise<'reminder' | 'test'> {
  const { data } = await createAdminClient().from('outbound_calls').select('is_test').eq('call_sid', callSid).maybeSingle()
  return data && data.is_test === false ? 'reminder' : 'test'
}

export const planAllowsOutbound = (w: Pick<Workspace, 'plan' | 'plan_status' | 'trial_ends_at'>) =>
  outboundAllowedFor(effectivePlan(w.plan, w.plan_status, w.trial_ends_at))

async function failCall(id: string, message: string) {
  await createAdminClient().from('outbound_calls').update({ status: 'failed', error_message: message.slice(0, 500) }).eq('id', id)
}

/**
 * Provede hovor z fronty: zamkne řádek (pending -> calling), ověří podmínky a zavolá přes Vapi.
 * Zamknutí brání dvojímu volání, když se dva běhy cronu potkají. Chyba se uloží do řádku (status failed).
 */
export async function placeOutboundCall(row: CallRow, template: TemplateRow | null, booking: Booking | null): Promise<{ ok: boolean; error?: string }> {
  const supabase = createAdminClient()
  const { data: claimed } = await supabase.from('outbound_calls').update({ status: 'calling', called_at: new Date().toISOString() }).eq('id', row.id).eq('status', 'pending').select('id')
  if (!claimed?.length) return { ok: false, error: 'Již zpracováno' }

  const fail = async (message: string) => {
    await failCall(row.id, message)
    return { ok: false, error: message }
  }

  const ctx = await loadContext(row.agent_id)
  if (!ctx) return fail('Agent neexistuje')
  const { agent, workspace } = ctx
  if (!planAllowsOutbound(workspace)) return fail('Odchozí hovory vyžadují plán Business nebo Pro')
  if (!row.is_test && !ctx.gdprConfirmed) return fail('Chybí potvrzení informování zákazníků o automatických hovorech')
  if (!agent.vapi_agent_id) return fail('Agent není propojený s Vapi')
  if (!ctx.phoneNumberId) return fail('Agent nemá přiřazené telefonní číslo, ze kterého by volal')

  const minutes = await checkMinutesLimit(workspace.id).catch(() => null)
  if (minutes && (!minutes.allowed || minutes.paused)) return fail('Je vyčerpaný limit minut')

  const phone = normalizeTestPhone(row.phone_number)
  if (!phone.ok) return fail('Telefonní číslo není platné nebo není v podporované zemi')

  const tz = agent.timezone ?? 'Europe/Prague'
  const when = new Date(booking?.starts_at ?? row.scheduled_at)
  const message = renderTemplate(template?.message_template ?? DEFAULT_MESSAGE, {
    customer_name: row.customer_name,
    business_name: workspace.business_name ?? workspace.name,
    time: formatWhen(when, tz, agent.language),
  })

  try {
    // Oznámení o AI a nahrávání se předřazuje i u odchozích hovorů (přepsání firstMessage ho jinak vynechá).
    const callSid = await createOutboundCall({
      assistantId: agent.vapi_agent_id,
      phoneNumberId: ctx.phoneNumberId,
      customerNumber: phone.number,
      firstMessage: withDisclosure(agent.language, message, agent.ai_disclosure_enabled),
      maxDurationSeconds: MAX_CALL_SECONDS,
      model: (await reminderModel(agent)) ?? undefined,
    })
    await supabase.from('outbound_calls').update({ call_sid: callSid }).eq('id', row.id)
    return { ok: true }
  } catch (e) {
    return fail(e instanceof OutboundCallError ? e.message : 'Volání se nepodařilo zahájit')
  }
}

/** Hovor ukončený ve Vapi (z webhooku end-of-call-report): completed, nebo failed podle důvodu ukončení. */
export async function finishOutboundCall(callSid: string, endedReason: string | undefined): Promise<void> {
  const reason = endedReason ?? ''
  const unreached = /no-answer|did-not-answer|busy|failed|error|rejected|invalid|unreachable|timeout|not-connected/i.test(reason)
  await createAdminClient()
    .from('outbound_calls')
    .update(unreached ? { status: 'failed', error_message: reason || 'Hovor nebyl spojen' } : { status: 'completed' })
    .eq('call_sid', callSid)
    .eq('status', 'calling')
}

interface RunStats {
  scheduled: number
  called: number
  rescheduled: number
  cancelled: number
  failed: number
  recovered: number
}

/**
 * Jedna iterace cronu (každou minutu):
 * 1) z potvrzených rezervací vytvoří řádky fronty podle aktivních šablon (jen u agentů s potvrzeným GDPR a vhodným plánem),
 * 2) provede splatné hovory: znovu ověří rezervaci, respektuje povolené hodiny v čase agenta,
 * 3) hovory, které Vapi nikdy nepotvrdilo, po 20 minutách označí jako neúspěšné.
 */
export async function processOutbound(now = new Date()): Promise<RunStats> {
  const supabase = createAdminClient()
  const stats: RunStats = { scheduled: 0, called: 0, rescheduled: 0, cancelled: 0, failed: 0, recovered: 0 }

  // 1) Plánování z rezervací
  const { data: templates } = await supabase.from('outbound_templates').select('*').eq('active', true)
  const active = (templates ?? []) as TemplateRow[]
  if (active.length > 0) {
    const agentIds = [...new Set(active.map((t) => t.agent_id))]
    const [{ data: agents }, { data: settings }] = await Promise.all([
      supabase.from('agents').select('id, workspace_id').in('id', agentIds),
      supabase.from('outbound_settings').select('agent_id').in('agent_id', agentIds).eq('gdpr_confirmed', true),
    ])
    const gdpr = new Set((settings ?? []).map((s) => s.agent_id as string))
    const wsIds = [...new Set((agents ?? []).map((a) => a.workspace_id as string))]
    const { data: workspaces } = await supabase.from('workspaces').select('id, plan, plan_status, trial_ends_at').in('id', wsIds)
    const planOk = new Set((workspaces ?? []).filter((w) => planAllowsOutbound(w as Workspace)).map((w) => w.id as string))
    // Agent bez čísla nemá odkud volat: hovory se mu ani neplánují (na stránce je to vidět).
    const { data: numbers } = await supabase.from('phone_numbers').select('agent_id').in('agent_id', agentIds).not('vapi_phone_number_id', 'is', null)
    const hasNumber = new Set((numbers ?? []).map((n) => n.agent_id as string))
    const agentOk = new Set((agents ?? []).filter((a) => gdpr.has(a.id as string) && planOk.has(a.workspace_id as string) && hasNumber.has(a.id as string)).map((a) => a.id as string))

    for (const t of active.filter((x) => agentOk.has(x.agent_id))) {
      const { data: bookings } = await supabase
        .from('bookings')
        .select('id, caller_name, caller_phone, starts_at, created_at')
        .eq('agent_id', t.agent_id)
        .eq('status', 'confirmed')
        .not('caller_phone', 'is', null)
        .gt('starts_at', now.toISOString())
        .gte('created_at', t.active_since)
        .order('starts_at')
        .limit(500)
      if (!bookings?.length) continue
      const { data: existing } = await supabase.from('outbound_calls').select('booking_id').eq('template_id', t.id).in('booking_id', bookings.map((b) => b.id))
      const done = new Set((existing ?? []).map((e) => e.booking_id as string))

      const rows = bookings
        .filter((b) => !done.has(b.id as string))
        .flatMap((b) => {
          const starts = new Date(b.starts_at as string)
          const created = new Date(b.created_at as string)
          const at = t.trigger_type === 'after_booking' ? new Date(created.getTime() + t.delay_hours * HOUR) : new Date(starts.getTime() - t.delay_hours * HOUR)
          // Připomínka musí přijít před termínem, nesmí předcházet vzniku rezervace a nemá smysl volat s velkým zpožděním.
          if (at >= starts || at < created || at.getTime() < now.getTime() - 2 * HOUR) return []
          return [{ agent_id: t.agent_id, workspace_id: t.workspace_id, template_id: t.id, booking_id: b.id, phone_number: b.caller_phone, customer_name: b.caller_name, scheduled_at: at.toISOString() }]
        })
      if (rows.length > 0) {
        const { error } = await supabase.from('outbound_calls').insert(rows)
        if (error && error.code !== '23505') console.error('Outbound: scheduling failed', error)
        else stats.scheduled += rows.length
      }
    }
  }

  // 2) Splatné hovory
  const { data: due } = await supabase.from('outbound_calls').select('*').eq('status', 'pending').eq('is_test', false).lte('scheduled_at', now.toISOString()).order('scheduled_at').limit(25)
  for (const row of (due ?? []) as CallRow[]) {
    const { data: tpl } = row.template_id ? await supabase.from('outbound_templates').select('*').eq('id', row.template_id).maybeSingle() : { data: null }
    const template = (tpl as TemplateRow | null) ?? null
    const cancel = async (message: string) => {
      await supabase.from('outbound_calls').update({ status: 'cancelled', error_message: message }).eq('id', row.id).eq('status', 'pending')
      stats.cancelled++
    }
    if (template && !template.active) {
      await cancel('Šablona byla vypnuta')
      continue
    }

    let booking: Booking | null = null
    if (row.booking_id) {
      const { data } = await supabase.from('bookings').select('*').eq('id', row.booking_id).maybeSingle()
      booking = (data as Booking | null) ?? null
      if (!booking || booking.status !== 'confirmed') {
        await cancel('Rezervace byla zrušena')
        continue
      }
      if (new Date(booking.starts_at) <= now) {
        await cancel('Termín rezervace už začal')
        continue
      }
      // Rezervace se mohla posunout: připomínka "před termínem" se přepočítá.
      if (template?.trigger_type === 'before_booking') {
        const expected = new Date(new Date(booking.starts_at).getTime() - template.delay_hours * HOUR)
        if (Math.abs(expected.getTime() - new Date(row.scheduled_at).getTime()) > MINUTE) {
          await supabase.from('outbound_calls').update({ scheduled_at: expected.toISOString() }).eq('id', row.id).eq('status', 'pending')
          stats.rescheduled++
          continue
        }
      }
      if (booking.caller_phone && booking.caller_phone !== row.phone_number) row.phone_number = booking.caller_phone
    }

    // Povolené hodiny v místním čase agenta (výchozí 8–20).
    const { data: agent } = await supabase.from('agents').select('timezone').eq('id', row.agent_id).maybeSingle()
    const from = template?.allowed_hours_from ?? 8
    const to = template?.allowed_hours_to ?? 20
    const start = nextAllowedStart(now, (agent?.timezone as string | null) ?? 'Europe/Prague', from, to)
    if (start.getTime() > now.getTime()) {
      await supabase.from('outbound_calls').update({ scheduled_at: start.toISOString() }).eq('id', row.id).eq('status', 'pending')
      stats.rescheduled++
      continue
    }

    const result = await placeOutboundCall(row, template, booking)
    if (result.ok) stats.called++
    else stats.failed++
  }

  // 3) Hovory bez zprávy od Vapi
  const { data: stuck } = await supabase
    .from('outbound_calls')
    .update({ status: 'failed', error_message: 'Vapi hovor nepotvrdilo' })
    .eq('status', 'calling')
    .lt('called_at', new Date(now.getTime() - 20 * MINUTE).toISOString())
    .select('id')
  stats.recovered = stuck?.length ?? 0
  return stats
}
