import type { Booking } from '@/types'

// Texty SMS a stránky pro zákazníka. Jazyk podle jazyka agenta (cs, sk, en, de, pl; ostatní angličtina).

export type CustomerMessageKind = 'confirmed' | 'cancelled' | 'rescheduled' | 'reminder'

interface Vars {
  business: string
  title: string
  when: string
}

const SMS: Record<string, Record<CustomerMessageKind, (v: Vars) => string>> & { en: Record<CustomerMessageKind, (v: Vars) => string> } = {
  cs: {
    confirmed: (v) => `${v.business}: Vaše rezervace „${v.title}“ na ${v.when} je potvrzena. Změnu nebo zrušení nám prosím zavolejte.`,
    cancelled: (v) => `${v.business}: Vaše rezervace „${v.title}“ na ${v.when} byla zrušena. Rádi vám domluvíme nový termín.`,
    rescheduled: (v) => `${v.business}: Vaše rezervace „${v.title}“ byla přesunuta na ${v.when}. Pokud vám nevyhovuje, zavolejte nám.`,
    reminder: (v) => `${v.business}: připomínáme Vaši rezervaci „${v.title}“ – ${v.when}. Těšíme se na vás!`,
  },
  sk: {
    confirmed: (v) => `${v.business}: Vaša rezervácia „${v.title}“ na ${v.when} je potvrdená. Zmenu alebo zrušenie nám prosím zavolajte.`,
    cancelled: (v) => `${v.business}: Vaša rezervácia „${v.title}“ na ${v.when} bola zrušená. Radi vám dohodneme nový termín.`,
    rescheduled: (v) => `${v.business}: Vaša rezervácia „${v.title}“ bola presunutá na ${v.when}. Ak vám nevyhovuje, zavolajte nám.`,
    reminder: (v) => `${v.business}: pripomíname Vašu rezerváciu „${v.title}“ – ${v.when}. Tešíme sa na vás!`,
  },
  en: {
    confirmed: (v) => `${v.business}: your booking "${v.title}" on ${v.when} is confirmed. Please call us to change or cancel it.`,
    cancelled: (v) => `${v.business}: your booking "${v.title}" on ${v.when} was cancelled. We'd be happy to find you a new time.`,
    rescheduled: (v) => `${v.business}: your booking "${v.title}" was moved to ${v.when}. If that doesn't suit you, please call us.`,
    reminder: (v) => `${v.business}: reminder of your booking "${v.title}" – ${v.when}. See you soon!`,
  },
  de: {
    confirmed: (v) => `${v.business}: Ihr Termin „${v.title}“ am ${v.when} ist bestätigt. Für Änderungen oder Absagen rufen Sie uns bitte an.`,
    cancelled: (v) => `${v.business}: Ihr Termin „${v.title}“ am ${v.when} wurde abgesagt. Gerne vereinbaren wir einen neuen Termin.`,
    rescheduled: (v) => `${v.business}: Ihr Termin „${v.title}“ wurde auf ${v.when} verschoben. Passt das nicht, rufen Sie uns bitte an.`,
    reminder: (v) => `${v.business}: Erinnerung an Ihren Termin „${v.title}“ – ${v.when}. Wir freuen uns auf Sie!`,
  },
  pl: {
    confirmed: (v) => `${v.business}: Twoja rezerwacja „${v.title}” na ${v.when} jest potwierdzona. Zmiany lub odwołanie – prosimy o telefon.`,
    cancelled: (v) => `${v.business}: Twoja rezerwacja „${v.title}” na ${v.when} została odwołana. Chętnie umówimy nowy termin.`,
    rescheduled: (v) => `${v.business}: Twoja rezerwacja „${v.title}” została przeniesiona na ${v.when}. Jeśli to nie pasuje, zadzwoń do nas.`,
    reminder: (v) => `${v.business}: przypominamy o rezerwacji „${v.title}” – ${v.when}. Do zobaczenia!`,
  },
}

const baseLang = (language: string) => language.split('-')[0]

export const smsLocale = (language: string) => (Object.prototype.hasOwnProperty.call(SMS, baseLang(language)) ? baseLang(language) : 'en')

export function customerSms(kind: CustomerMessageKind, language: string, vars: Vars): string {
  return SMS[smsLocale(language)][kind](vars)
}

/** "čt 8. 10. 15:30" v zóně a jazyce rezervace. */
export function formatWhen(iso: string, language: string, timezone: string): string {
  return new Intl.DateTimeFormat(smsLocale(language), { weekday: 'short', day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: timezone }).format(new Date(iso))
}

/** Číslo pro SMS ve formátu E.164; jinak null (nesrozumitelná čísla z hovoru se nepoužijí). */
export function toE164(raw: string | null | undefined): string | null {
  if (!raw) return null
  const cleaned = raw.replace(/[\s().-]/g, '').replace(/^00/, '+')
  return /^\+[1-9]\d{7,14}$/.test(cleaned) ? cleaned : null
}

/** Co poslat zákazníkovi po změně rezervace (nebo null, když se nic neposílá). */
export function customerKindForChange(before: Pick<Booking, 'status' | 'starts_at'>, after: Pick<Booking, 'status' | 'starts_at'>): CustomerMessageKind | null {
  if (after.status === 'cancelled' && before.status !== 'cancelled') return 'cancelled'
  if (after.status === 'confirmed' && before.status !== 'confirmed') return 'confirmed'
  if (after.status === 'confirmed' && before.status === 'confirmed' && new Date(after.starts_at).getTime() !== new Date(before.starts_at).getTime()) return 'rescheduled'
  return null
}
