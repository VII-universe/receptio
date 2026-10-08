import 'server-only'
import { createElement } from 'react'
import { NewBookingEmail, newBookingSubject } from '@/emails/new-booking'
import { appBaseUrl } from '@/lib/email/format'
import { getWorkspaceEmailLocale } from '@/lib/email/get-workspace-locale'
import { getOwnerContact } from '@/lib/email/recipients'
import { sendEmail } from '@/lib/email/send'
import { createAdminClient } from '@/lib/supabase/admin'
import { getTwilioClient, isTwilioConfigured } from '@/lib/twilio/client'
import type { Agent, Booking } from '@/types'
import { actionUrl } from './action-token'
import { customerSms, formatWhen, toE164, type CustomerMessageKind } from './messages'

// Upozornění k rezervacím. Chyby se logují a nikdy nevyhazují: rezervace se kvůli nim nesmí rozbít.

const isDemo = (b: Booking) => !!b.external_id?.startsWith('demo:')

async function context(booking: Booking) {
  const supabase = createAdminClient()
  const [{ data: agent }, { data: ws }] = await Promise.all([
    supabase.from('agents').select('*').eq('id', booking.agent_id).maybeSingle(),
    supabase.from('workspaces').select('name, clerk_user_id, notification_email, notification_phone, notifications_enabled, timezone, locale').eq('id', booking.workspace_id).maybeSingle(),
  ])
  return { agent: agent as Agent | null, ws }
}

async function sendSms(to: string, body: string) {
  const service = process.env.TWILIO_MESSAGING_SERVICE_SID
  const from = process.env.TWILIO_PHONE_NUMBER
  if (!isTwilioConfigured() || (!service && !from)) {
    console.warn('Bookings: Twilio SMS sender is not configured (TWILIO_PHONE_NUMBER or TWILIO_MESSAGING_SERVICE_SID), skipping SMS')
    return false
  }
  await getTwilioClient().messages.create({ to, body, ...(service ? { messagingServiceSid: service } : { from }) })
  return true
}

/**
 * Majitel se dozví o nové rezervaci od AI: e-mail (s tlačítky Potvrdit / Zamítnout, pokud rezervace čeká na potvrzení)
 * a SMS na nastavené číslo oznámení. Používá nastavení z Nastavení → Notifikace.
 */
export async function notifyOwnerNewBooking(booking: Booking): Promise<void> {
  try {
    if (isDemo(booking)) return
    const { agent, ws } = await context(booking)
    if (!agent || !ws || !ws.notifications_enabled) return
    const needsConfirmation = booking.status === 'pending'
    const tz = ws.timezone ?? 'Europe/Prague'
    const locale = await getWorkspaceEmailLocale(booking.workspace_id)
    const when = new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: tz }).format(new Date(booking.starts_at))
    const confirmUrl = needsConfirmation ? actionUrl(booking, 'confirm') : null
    const cancelUrl = needsConfirmation ? actionUrl(booking, 'cancel') : null

    const emailTo = ws.notification_email || (await getOwnerContact(ws.clerk_user_id)).email
    const tasks: Promise<unknown>[] = []
    if (emailTo) {
      tasks.push(
        sendEmail({
          to: emailTo,
          subject: newBookingSubject(locale, needsConfirmation, booking.caller_name, when),
          element: createElement(NewBookingEmail, {
            locale,
            agentName: agent.name,
            callerName: booking.caller_name,
            callerPhone: booking.caller_phone,
            title: booking.title,
            when,
            notes: booking.notes,
            needsConfirmation,
            confirmUrl,
            cancelUrl,
            calendarUrl: `${appBaseUrl()}/dashboard/calendar`,
          }),
        })
      )
    }
    if (ws.notification_phone) {
      const short = formatWhen(booking.starts_at, agent.language, tz)
      const link = needsConfirmation ? `\n${confirmUrl}` : ''
      tasks.push(sendSms(ws.notification_phone, `Receptio: ${needsConfirmation ? 'booking request' : 'new booking'} – ${booking.caller_name}, ${short} (${booking.title}).${link}`))
    }
    for (const r of await Promise.allSettled(tasks)) if (r.status === 'rejected') console.error('Bookings: owner notification failed', r.reason)
  } catch (e) {
    console.error('Bookings: owner notification failed', e)
  }
}

/**
 * SMS zákazníkovi (potvrzeno / zrušeno / přesunuto / připomenutí), pokud má rezervace platné telefonní číslo
 * a agent má zapnuté "Informovat zákazníka". Potvrzení a zrušení se kvůli opakovaným úpravám neposílají dvakrát.
 */
export async function notifyCustomer(booking: Booking, kind: CustomerMessageKind): Promise<boolean> {
  try {
    if (isDemo(booking)) return false
    const to = toE164(booking.caller_phone)
    if (!to) return false
    const { agent, ws } = await context(booking)
    if (!agent || !ws || agent.booking_notify_customer === false) return false

    const supabase = createAdminClient()
    if (kind === 'confirmed' || kind === 'cancelled') {
      const { data } = await supabase.from('bookings').select('customer_notified_status').eq('id', booking.id).maybeSingle()
      if (data?.customer_notified_status === kind) return false
    }
    const body = customerSms(kind, agent.language, {
      business: ws.name,
      title: booking.title,
      when: formatWhen(booking.starts_at, agent.language, agent.timezone ?? ws.timezone ?? 'Europe/Prague'),
    })
    const sent = await sendSms(to, body)
    if (sent && (kind === 'confirmed' || kind === 'cancelled')) {
      const { error } = await supabase.from('bookings').update({ customer_notified_status: kind }).eq('id', booking.id)
      if (error) console.error('Bookings: failed to store notification status (is migration 031 applied?)', error.message)
    }
    return sent
  } catch (e) {
    console.error('Bookings: customer notification failed', e)
    return false
  }
}
