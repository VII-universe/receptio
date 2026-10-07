import 'server-only'
import { getTwilioClient } from './client'

export interface AvailableNumber {
  phoneNumber: string
  friendlyName: string
  locality: string | null
  region: string | null
}

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
