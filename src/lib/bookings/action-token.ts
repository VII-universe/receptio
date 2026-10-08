import 'server-only'
import { createHmac, timingSafeEqual } from 'node:crypto'

// Podepsaný odkaz pro potvrzení / zrušení rezervace z e-mailu nebo SMS (bez přihlášení). Token nese ID rezervace,
// akci a platnost; podepsán je HMAC-SHA256, takže ho nejde padělat ani přepsat na jinou akci.

export type BookingAction = 'confirm' | 'cancel'

const secret = () => process.env.BOOKING_ACTION_SECRET ?? process.env.CLERK_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? 'receptio'
const sign = (payload: string) => createHmac('sha256', secret()).update(payload).digest('base64url')

export function createActionToken(bookingId: string, action: BookingAction, expiresAt: Date): string {
  const payload = `${bookingId}.${action}.${Math.floor(expiresAt.getTime() / 1000)}`
  return Buffer.from(`${payload}.${sign(payload)}`).toString('base64url')
}

export function verifyActionToken(token: string | null | undefined): { bookingId: string; action: BookingAction } | null {
  if (!token) return null
  let raw: string
  try {
    raw = Buffer.from(token, 'base64url').toString()
  } catch {
    return null
  }
  const [bookingId, action, exp, sig] = raw.split('.')
  if (!bookingId || !sig || (action !== 'confirm' && action !== 'cancel') || !/^\d+$/.test(exp ?? '')) return null
  const expected = sign(`${bookingId}.${action}.${exp}`)
  if (sig.length !== expected.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null
  if (Number(exp) * 1000 < Date.now()) return null
  return { bookingId, action }
}

/** Odkaz platí do konce rezervace (nejméně 24 h), nejvýše 30 dní. */
export function actionUrl(booking: { id: string; ends_at: string }, action: BookingAction): string {
  const end = new Date(booking.ends_at).getTime()
  const expires = new Date(Math.min(Math.max(end, Date.now() + 24 * 3600_000), Date.now() + 30 * 24 * 3600_000))
  return `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/booking-action?t=${createActionToken(booking.id, action, expires)}`
}
