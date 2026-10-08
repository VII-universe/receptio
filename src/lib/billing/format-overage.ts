import { OVERAGE_RATE } from './plans'

/** Cena minuty nad limit zformátovaná v jazyce a měně uživatele, např. "0,15 €" nebo "4 Kč". */
export function formatOverageRate(locale: string, currency: 'CZK' | 'EUR'): string {
  const rate = OVERAGE_RATE[currency]
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: Number.isInteger(rate) ? 0 : 2,
    }).format(rate)
  } catch {
    return `${rate} ${currency}`
  }
}
