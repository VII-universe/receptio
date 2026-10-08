// Telefonní čísla u rezervací: smí obsahovat jen číslice, mezery a znaky + ( ) - . / ; písmena se nepřijmou.
// Soubor je bez serverových závislostí, používá ho formulář i API.

const ALLOWED = /^\+?[0-9 ()./-]+$/

/** Odstraní z psaného textu vše kromě číslic, mezer a + ( ) - . / ("+" jen na začátku); pro políčka formulářů. */
export function sanitizePhoneInput(value: string): string {
  const cleaned = value.replace(/[^0-9+ ()./-]/g, '')
  return cleaned.replace(/(?!^)\+/g, '')
}

/** Platné číslo: povolené znaky a 7 až 15 číslic (mezinárodní limit E.164). */
export function isValidPhone(value: string): boolean {
  const v = value.trim()
  if (!ALLOWED.test(v)) return false
  const digits = v.replace(/\D/g, '').length
  return digits >= 7 && digits <= 15
}

/** Uložená podoba: oříznuté, jednoduché mezery, "00…" jako "+…". */
export function normalizePhoneValue(value: string): string {
  return value.trim().replace(/\s+/g, ' ').replace(/^00(?=\d)/, '+')
}
