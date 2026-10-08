import { after } from 'next/server'
import { redirect } from 'next/navigation'
import { CalendarCheck, CheckCircle2, CircleSlash, TriangleAlert } from 'lucide-react'
import { ForceDark } from '@/components/theme/theme-provider'
import { LogoMark } from '@/components/layout/logo-mark'
import { verifyActionToken, type BookingAction } from '@/lib/bookings/action-token'
import { customerKindForChange } from '@/lib/bookings/messages'
import { notifyCustomer } from '@/lib/bookings/notify'
import { BookingError, getBookingById, updateBooking } from '@/lib/bookings/service'
import { pushBookingToCalendars } from '@/lib/calendar/sync'
import { pickLocale } from '@/emails/i18n'
import { getWorkspaceEmailLocale } from '@/lib/email/get-workspace-locale'
import { createAdminClient } from '@/lib/supabase/admin'

export const metadata = { title: 'Receptio', robots: { index: false, follow: false } }
export const dynamic = 'force-dynamic'

// Veřejná stránka (bez přihlášení) pro odkazy z e-mailu a SMS: potvrzení nebo zamítnutí rezervace jedním tlačítkem.
// Akce se provede až POSTem (tlačítko), ne pouhým otevřením odkazu, aby ji nevyvolaly antivirové skenery e-mailů.

interface Texts {
  confirmTitle: string
  cancelTitle: string
  confirmButton: string
  cancelButton: string
  doneConfirmed: string
  doneCancelled: string
  already: string
  invalid: string
  conflict: string
  when: string
  who: string
  what: string
  phone: string
}
const T: Record<string, Texts> & { en: Texts } = {
  cs: { confirmTitle: 'Potvrdit rezervaci?', cancelTitle: 'Zamítnout rezervaci?', confirmButton: 'Potvrdit rezervaci', cancelButton: 'Zamítnout rezervaci', doneConfirmed: 'Rezervace je potvrzena. Zákazník dostane SMS, pokud je zapnutá.', doneCancelled: 'Rezervace byla zamítnuta.', already: 'Tato rezervace už byla vyřízena.', invalid: 'Odkaz je neplatný nebo vypršel. Otevřete rezervaci v kalendáři.', conflict: 'Tento čas se mezitím obsadil.', when: 'Termín', who: 'Zákazník', what: 'Důvod', phone: 'Telefon' },
  en: { confirmTitle: 'Confirm this booking?', cancelTitle: 'Decline this booking?', confirmButton: 'Confirm booking', cancelButton: 'Decline booking', doneConfirmed: 'The booking is confirmed. The customer gets an SMS if that is enabled.', doneCancelled: 'The booking was declined.', already: 'This booking has already been handled.', invalid: 'This link is invalid or has expired. Open the booking in your calendar.', conflict: 'That time has since been taken.', when: 'When', who: 'Customer', what: 'Reason', phone: 'Phone' },
}

async function perform(formData: FormData) {
  'use server'
  const token = String(formData.get('t') ?? '')
  const parsed = verifyActionToken(token)
  if (!parsed) redirect(`/booking-action?t=${encodeURIComponent(token)}`)
  const booking = await getBookingById(parsed.bookingId)
  if (!booking) redirect(`/booking-action?t=${encodeURIComponent(token)}`)
  const target = parsed.action === 'confirm' ? 'confirmed' : 'cancelled'
  if (booking.status === target) redirect(`/booking-action?t=${encodeURIComponent(token)}&done=${parsed.action}`)
  let result = 'done'
  try {
    const updated = await updateBooking(booking.workspace_id, booking.id, { status: target })
    after(async () => {
      await pushBookingToCalendars(updated).catch((e) => console.error('Calendar push failed', e))
      const kind = customerKindForChange(booking, updated)
      if (kind) await notifyCustomer(updated, kind)
    })
  } catch (e) {
    result = e instanceof BookingError && e.code === 'conflict' ? 'conflict' : 'invalid'
  }
  redirect(`/booking-action?t=${encodeURIComponent(token)}&${result === 'done' ? `done=${parsed.action}` : `error=${result}`}`)
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-zinc-950 p-4 text-white">
      <ForceDark />
      <div className="rc-aurora pointer-events-none absolute -left-40 -top-40 h-[520px] w-[520px] rounded-full bg-indigo-600/25 blur-[120px]" aria-hidden />
      <div className="glass-strong relative w-full max-w-md rounded-3xl p-7">
        <div className="mb-6 flex items-center gap-2.5 text-lg font-semibold tracking-tight">
          <LogoMark className="size-8" /> Receptio
        </div>
        {children}
      </div>
    </div>
  )
}

export default async function BookingActionPage({ searchParams }: { searchParams: Promise<{ t?: string; done?: string; error?: string }> }) {
  const sp = await searchParams
  const parsed = verifyActionToken(sp.t)
  const booking = parsed ? await getBookingById(parsed.bookingId) : null
  const locale = booking ? await getWorkspaceEmailLocale(booking.workspace_id) : 'en'
  const t = pickLocale(T, locale)

  if (!parsed || !booking) {
    return (
      <Shell>
        <p className="flex items-start gap-3 text-sm text-zinc-300">
          <TriangleAlert className="mt-0.5 size-5 shrink-0 text-amber-400" aria-hidden /> {t.invalid}
        </p>
      </Shell>
    )
  }

  const { data: ws } = await createAdminClient().from('workspaces').select('timezone').eq('id', booking.workspace_id).maybeSingle()
  const when = new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: ws?.timezone ?? 'Europe/Prague' }).format(new Date(booking.starts_at))
  const action: BookingAction = parsed.action
  const target = action === 'confirm' ? 'confirmed' : 'cancelled'

  const details = (
    <dl className="mb-6 grid gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm">
      <div>
        <dt className="text-xs uppercase tracking-wider text-zinc-500">{t.when}</dt>
        <dd className="mt-0.5 font-medium capitalize">{when}</dd>
      </div>
      <div>
        <dt className="text-xs uppercase tracking-wider text-zinc-500">{t.who}</dt>
        <dd className="mt-0.5 font-medium">{booking.caller_name}</dd>
      </div>
      {booking.caller_phone && (
        <div>
          <dt className="text-xs uppercase tracking-wider text-zinc-500">{t.phone}</dt>
          <dd className="mt-0.5 font-medium">{booking.caller_phone}</dd>
        </div>
      )}
      <div>
        <dt className="text-xs uppercase tracking-wider text-zinc-500">{t.what}</dt>
        <dd className="mt-0.5 font-medium">{booking.title}</dd>
      </div>
    </dl>
  )

  if (sp.done === 'confirm' || sp.done === 'cancel') {
    const ok = sp.done === 'confirm'
    return (
      <Shell>
        {details}
        <p className="flex items-start gap-3 text-sm text-zinc-200">
          {ok ? <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-400" aria-hidden /> : <CircleSlash className="mt-0.5 size-5 shrink-0 text-zinc-400" aria-hidden />}
          {ok ? t.doneConfirmed : t.doneCancelled}
        </p>
      </Shell>
    )
  }

  if (booking.status === target) {
    return (
      <Shell>
        {details}
        <p className="flex items-start gap-3 text-sm text-zinc-300">
          <CalendarCheck className="mt-0.5 size-5 shrink-0 text-indigo-300" aria-hidden /> {t.already}
        </p>
      </Shell>
    )
  }

  return (
    <Shell>
      <h1 className="mb-4 text-xl font-semibold tracking-tight">{action === 'confirm' ? t.confirmTitle : t.cancelTitle}</h1>
      {details}
      {sp.error && <p className="mb-4 text-sm text-red-400">{sp.error === 'conflict' ? t.conflict : t.invalid}</p>}
      <form action={perform}>
        <input type="hidden" name="t" value={sp.t} />
        <button
          type="submit"
          className={`h-12 w-full rounded-xl text-sm font-semibold text-white shadow-lg transition-colors ${action === 'confirm' ? 'bg-emerald-600 shadow-emerald-600/30 hover:bg-emerald-500' : 'bg-red-600 shadow-red-600/30 hover:bg-red-500'}`}
        >
          {action === 'confirm' ? t.confirmButton : t.cancelButton}
        </button>
      </form>
    </Shell>
  )
}
