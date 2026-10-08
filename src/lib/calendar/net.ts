import 'server-only'
import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'

const PRIVATE_V4 = [
  /^10\./, /^127\./, /^0\./, /^169\.254\./, /^192\.168\./, /^172\.(1[6-9]|2\d|3[01])\./, /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./, /^192\.0\.0\./, /^198\.1[89]\./, /^22[4-9]\.|^2[3-5]\d\./,
]

function isPrivateAddress(addr: string): boolean {
  if (isIP(addr) === 4) return PRIVATE_V4.some((re) => re.test(addr))
  const a = addr.toLowerCase()
  if (a === '::1' || a === '::' || a.startsWith('fe8') || a.startsWith('fe9') || a.startsWith('fea') || a.startsWith('feb') || a.startsWith('fc') || a.startsWith('fd')) return true
  const mapped = a.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)
  return mapped ? isPrivateAddress(mapped[1]) : false
}

/**
 * Adresu, kterou zadal uživatel (iCal feed, CalDAV server), smí server stáhnout jen pokud je veřejná:
 * https a hostname, který se nepřeloží na vnitřní síť (ochrana před SSRF). `webcal://` se bere jako https.
 */
export async function assertPublicUrl(raw: string): Promise<URL> {
  let url: URL
  try {
    url = new URL(raw.trim().replace(/^webcals?:\/\//i, 'https://'))
  } catch {
    throw new Error('Invalid URL')
  }
  if (url.protocol !== 'https:') throw new Error('Only https:// addresses are supported')
  const host = url.hostname.replace(/^\[|\]$/g, '')
  if (host === 'localhost' || host.endsWith('.local') || host.endsWith('.internal')) throw new Error('This address is not allowed')
  const addrs = isIP(host) ? [{ address: host }] : await lookup(host, { all: true }).catch(() => [])
  if (addrs.length === 0) throw new Error('Address could not be resolved')
  if (addrs.some((a) => isPrivateAddress(a.address))) throw new Error('This address is not allowed')
  return url
}

/** fetch s kontrolou veřejné adresy při každém přesměrování, s časovým limitem a limitem velikosti. */
export async function safeFetchText(raw: string, init: RequestInit = {}, maxBytes = 5_000_000): Promise<string> {
  let url = await assertPublicUrl(raw)
  for (let hop = 0; hop < 4; hop++) {
    const res = await fetch(url, { ...init, redirect: 'manual', signal: AbortSignal.timeout(15_000) })
    if (res.status >= 300 && res.status < 400 && res.headers.get('location')) {
      url = await assertPublicUrl(new URL(res.headers.get('location')!, url).toString())
      continue
    }
    if (!res.ok) throw new Error(`Calendar server responded with ${res.status}`)
    const text = await res.text()
    if (text.length > maxBytes) throw new Error('Calendar feed is too large')
    return text
  }
  throw new Error('Too many redirects')
}
