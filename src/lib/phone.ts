// Normalizace telefonních čísel pro testovací hovor. Test volá jen české a slovenské čísla:
// platforma má vlastní odchozí náklady a volné číslo by šlo zneužít k volání prémiových linek.

const E164_CZ_SK = /^\+42[01]\d{9}$/
const CZ_PREMIUM = /^\+42090/ // české linky 90x jsou zpoplatněné

export type PhoneCheck = { ok: true; number: string } | { ok: false; error: string }

/** "777 123 456" -> "+420777123456"; "00420 777 123 456" -> "+420777123456". */
export function normalizeTestPhone(input: string): PhoneCheck {
  let n = input.replace(/[\s().-]/g, '')
  if (n.startsWith('00')) n = `+${n.slice(2)}`
  if (/^\d{9}$/.test(n)) n = `+420${n}` // české číslo bez předvolby
  if (!E164_CZ_SK.test(n)) {
    return { ok: false, error: 'Zadejte české nebo slovenské číslo, např. +420777123456 nebo 777123456.' }
  }
  if (CZ_PREMIUM.test(n)) return { ok: false, error: 'Na zpoplatněná čísla (90x) test volat nelze.' }
  return { ok: true, number: n }
}
