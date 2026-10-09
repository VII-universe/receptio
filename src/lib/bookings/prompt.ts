import type { Agent } from '@/types'

/**
 * Pokyny k rezervacím pro konec system promptu. Aktuální datum doplní Vapi (šablona `now` s časovou zónou);
 * zóna pochází z povoleného seznamu (viz isTimezone), nikdy z volného vstupu.
 */
export function compileBookingInstructions(agent: Pick<Agent, 'booking_enabled' | 'booking_auto_confirm' | 'timezone' | 'booking_mode'>): string {
  if (!agent.booking_enabled) return ''
  const tz = agent.timezone ?? 'Europe/Prague'
  return [
    '## Appointment booking',
    `Today is {{"now" | date: "%A, %Y-%m-%d, %H:%M", "${tz}"}} (time zone ${tz}).`,
    'You can book appointments for callers using two tools:',
    '- `checkAvailability(date)` returns the free times for one day (date as YYYY-MM-DD). Always call it before offering a time; never invent free times.',
    '- `createBooking(caller_name, caller_phone, starts_at, title)` creates the booking. Call it only after the caller has explicitly agreed to one of the offered times.',
    'Workflow: find out what the caller needs (title) and the preferred day, check availability, offer two or three of the free times, ask for the caller\'s name, ' +
      'confirm the phone number (use the number they are calling from unless they give another), read the details back, and only then create the booking.',
    'Ask how many people the booking is for when it is not obvious, and pass it as party_size to both tools.',
    agent.booking_mode === 'resource'
      ? 'checkAvailability lists the free resources (e.g. tables, rooms) for each time. Offer the caller a choice when there are several, and pass the chosen resource_id to createBooking.'
      : 'Free times already account for how many seats remain; do not mention internal capacity numbers.',
    'Pass starts_at as ISO 8601 including the time zone offset, exactly matching one of the times returned by checkAvailability.',
    agent.booking_auto_confirm
      ? 'After a successful booking, tell the caller the appointment is confirmed.'
      : 'Bookings need manual confirmation by the business: after a successful booking, tell the caller the request was recorded and that the business will confirm it shortly. Do not say it is confirmed.',
    'If createBooking reports the time is no longer available, apologise and offer other free times.',
  ].join('\n')
}
