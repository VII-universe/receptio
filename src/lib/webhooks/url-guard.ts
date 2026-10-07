import 'server-only'
import { BlockList, isIP } from 'node:net'

// Cíle, na které server nikdy neposílá požadavky (ochrana před SSRF: loopback, privátní sítě,
// link-local včetně cloudových metadata endpointů 169.254.169.254, multicast, rezervované rozsahy).
const blocked = new BlockList()
for (const [net, prefix] of [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['172.16.0.0', 12],
  ['192.0.0.0', 24],
  ['192.168.0.0', 16],
  ['198.18.0.0', 15],
  ['224.0.0.0', 4],
  ['240.0.0.0', 4],
] as const) {
  blocked.addSubnet(net, prefix, 'ipv4')
}
for (const [net, prefix] of [
  ['::', 128],
  ['::1', 128],
  ['fc00::', 7],
  ['fe80::', 10],
  ['ff00::', 8],
] as const) {
  blocked.addSubnet(net, prefix, 'ipv6')
}

/** V produkci se interní adresy blokují vždy; ve vývoji se povolují (lokální testovací server). */
export const allowPrivateTargets = () => process.env.NODE_ENV !== 'production'

/** Je IP adresa interní / nesměrovatelná? (IPv4 zabalená v IPv6 se kontroluje jako IPv4.) */
export function isBlockedAddress(address: string): boolean {
  const mapped = address.toLowerCase().match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)
  const ip = mapped ? mapped[1] : address
  const family = isIP(ip)
  if (family === 0) return true // neplatná adresa = raději blokovat
  return blocked.check(ip, family === 4 ? 'ipv4' : 'ipv6')
}

export interface UrlCheck {
  ok: boolean
  error?: string
  warning?: string
}

/**
 * Statická kontrola URL při uložení a před odesláním: schéma, bez přihlašovacích údajů,
 * IP literály nesmí mířit do interní sítě. Překlad jména na IP se kontroluje až při připojení
 * (viz send.ts), protože DNS se může změnit.
 */
export function checkWebhookUrl(raw: string): UrlCheck {
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    return { ok: false, error: 'Neplatná URL' }
  }
  if (raw.length > 2048) return { ok: false, error: 'URL je příliš dlouhá' }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    return { ok: false, error: 'URL musí začínat https:// (nebo http://)' }
  }
  if (url.username || url.password) return { ok: false, error: 'URL nesmí obsahovat přihlašovací údaje' }

  const host = url.hostname.replace(/^\[|\]$/g, '')
  if (!allowPrivateTargets()) {
    if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.internal') || host.endsWith('.local')) {
      return { ok: false, error: 'URL nesmí mířit na interní adresu' }
    }
    if (isIP(host) && isBlockedAddress(host)) {
      return { ok: false, error: 'URL nesmí mířit na interní adresu' }
    }
  }
  return url.protocol === 'http:'
    ? { ok: true, warning: 'Adresa nepoužívá HTTPS, data se přenesou nešifrovaně.' }
    : { ok: true }
}
