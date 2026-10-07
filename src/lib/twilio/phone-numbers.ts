import 'server-only'
import { getTwilioClient } from './client'

export interface AvailableNumber {
  phoneNumber: string
  friendlyName: string
  locality: string | null
  region: string | null
}

export interface NumberPrice {
  amount: number
  currency: string // Twilio fakturuje v USD
}

/** Měsíční cena lokálního čísla v dané zemi z Twilio Pricing API (null, pokud ji nelze zjistit). */
export async function getLocalNumberPrice(countryCode: string): Promise<NumberPrice | null> {
  try {
    const res = await getTwilioClient().pricing.v1.phoneNumbers.countries(countryCode).fetch()
    const local = res.phoneNumberPrices.find((p) => p.numberType === 'local')
    const amount = Number(local?.currentPrice ?? local?.basePrice)
    return Number.isFinite(amount) ? { amount, currency: res.priceUnit || 'USD' } : null
  } catch (e) {
    console.error('Twilio: pricing lookup failed', countryCode, e)
    return null
  }
}

/**
 * Země, kterou Twilio pro tento typ čísel nepodporuje, vrací 404 – bereme to jako "není dostupné",
 * ne jako chybu serveru.
 */
export const isCountryUnavailable = (e: unknown) => (e as { status?: number }).status === 404

export async function searchAvailableNumbers(countryCode: string, limit = 10): Promise<AvailableNumber[]> {
  const numbers = await getTwilioClient()
    .availablePhoneNumbers(countryCode)
    .local.list({ voiceEnabled: true, limit })
  return numbers.map((n) => ({
    phoneNumber: n.phoneNumber,
    friendlyName: n.friendlyName,
    locality: n.locality || null,
    region: n.region || null,
  }))
}

/** Zakoupí číslo (reálná platba na Twilio účtu!). Vrací jeho SID. */
export async function purchasePhoneNumber(phoneNumber: string): Promise<{ sid: string; phoneNumber: string }> {
  const n = await getTwilioClient().incomingPhoneNumbers.create({ phoneNumber })
  return { sid: n.sid, phoneNumber: n.phoneNumber }
}

/** Uvolní (smaže) číslo z Twilio účtu – používá se k rollbacku neúspěšné koupě. */
export async function releasePhoneNumber(sid: string): Promise<void> {
  try {
    await getTwilioClient().incomingPhoneNumbers(sid).remove()
  } catch (e) {
    // 404 = číslo už v Twilio neexistuje, cíl (uvolněno) je splněn.
    if ((e as { status?: number }).status === 404) return
    throw e
  }
}
