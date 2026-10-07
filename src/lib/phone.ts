import { countryOfNumber } from '@/lib/countries'

// Normalizace čísel pro testovací hovor. Test volá jen čísla v podporovaných evropských zemích a
// blokuje zpoplatněné linky: platforma nese náklady odchozích hovorů, takže volné číslo by šlo zneužít.
// Seznam prémiových rozsahů je střízlivý odhad, ne úplný výčet.

const PREMIUM: { pattern: RegExp; label: string }[] = [
  { pattern: /^\+42090/, label: 'CZ 90x' },
  { pattern: /^\+49900/, label: 'DE 0900' },
  { pattern: /^\+44(9|87)/, label: 'GB 09xx / 087x' },
  { pattern: /^\+338/, label: 'FR 08xx' },
  { pattern: /^\+43(900|901|930|939)/, label: 'AT 090x / 093x' },
  { pattern: /^\+31(900|906)/, label: 'NL 090x' },
  { pattern: /^\+32(900|70)/, label: 'BE 0900 / 070' },
  { pattern: /^\+3989/, label: 'IT 89x' },
  { pattern: /^\+34(80|90)/, label: 'ES 80x / 90x' },
  { pattern: /^\+4870/, label: 'PL 70x' },
  { pattern: /^\+3690/, label: 'HU 90' },
  { pattern: /^\+40900/, label: 'RO 0900' },
]

const MIN_SUBSCRIBER_DIGITS = 7 // kratší číslo po předvolbě není platné

export type PhoneCheck = { ok: true; number: string } | { ok: false; error: string }

/** "777 123 456" -> "+420777123456"; "00420 777 123 456" -> "+420777123456"; jiné země vyžadují předvolbu. */
export function normalizeTestPhone(input: string): PhoneCheck {
  let n = input.replace(/[\s().-]/g, '')
  if (n.startsWith('00')) n = `+${n.slice(2)}`
  if (/^\d{9}$/.test(n)) n = `+420${n}` // české číslo bez předvolby

  if (!/^\+[1-9]\d{7,14}$/.test(n)) {
    return { ok: false, error: 'Zadejte číslo v mezinárodním formátu, např. +420777123456 nebo +4915112345678.' }
  }
  const country = countryOfNumber(n)
  if (!country) {
    return { ok: false, error: 'Na toto číslo test volat nelze. Podporované jsou evropské země (EU, Spojené království).' }
  }
  if (n.length - country.prefix.length < MIN_SUBSCRIBER_DIGITS) {
    return { ok: false, error: 'Telefonní číslo je příliš krátké.' }
  }
  if (PREMIUM.some((p) => p.pattern.test(n))) {
    return { ok: false, error: 'Na zpoplatněná čísla test volat nelze.' }
  }
  return { ok: true, number: n }
}
