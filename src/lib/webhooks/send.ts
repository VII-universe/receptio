import 'server-only'
import { createHmac, randomUUID } from 'node:crypto'
import { lookup as dnsLookup } from 'node:dns'
import { request as httpRequest } from 'node:http'
import { request as httpsRequest } from 'node:https'
import { allowPrivateTargets, checkWebhookUrl, isBlockedAddress } from './url-guard'

const TIMEOUT_MS = 10_000

export type SendResult = { ok: true; status: number } | { ok: false; error: string }

export const signPayload = (secret: string, body: string) =>
  `sha256=${createHmac('sha256', secret).update(body).digest('hex')}`

/**
 * Pošle podepsaný POST. Bezpečnostní opatření proti SSRF:
 *  - adresa se kontroluje při připojení (custom lookup), takže DNS rebinding nepomůže,
 *  - přesměrování se nenásledují,
 *  - odpověď se nečte (zahodí se), timeout 10 s.
 */
export function sendWebhook(opts: { url: string; secret: string; event: string; payload: object }): Promise<SendResult> {
  const check = checkWebhookUrl(opts.url)
  if (!check.ok) return Promise.resolve({ ok: false, error: check.error ?? 'Invalid URL' })

  const url = new URL(opts.url)
  const body = JSON.stringify(opts.payload)
  const guarded = !allowPrivateTargets()

  return new Promise((resolve) => {
    let settled = false
    const done = (r: SendResult) => {
      if (!settled) {
        settled = true
        resolve(r)
      }
    }

    const request = url.protocol === 'https:' ? httpsRequest : httpRequest
    const req = request(
      url,
      {
        method: 'POST',
        timeout: TIMEOUT_MS,
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
          'User-Agent': 'Receptio-Webhooks/1.0',
          'X-Receptio-Signature': signPayload(opts.secret, body),
          'X-Receptio-Event': opts.event,
          'X-Receptio-Delivery': randomUUID(),
        },
        // Překlad jména se kontroluje až tady: každá vrácená adresa musí být veřejná.
        lookup: guarded
          ? (hostname, options, callback) => {
              dnsLookup(hostname, { ...options, all: true }, (err, addresses) => {
                if (err) return callback(err, '', 4)
                const list = (addresses as unknown as { address: string; family: number }[]).filter(
                  (a) => !isBlockedAddress(a.address)
                )
                if (list.length === 0 || list.length !== (addresses as unknown as unknown[]).length) {
                  return callback(new Error('The target address is internal'), '', 4)
                }
                return options.all
                  ? (callback as unknown as (e: null, a: typeof list) => void)(null, list)
                  : callback(null, list[0].address, list[0].family)
              })
            }
          : undefined,
      },
      (res) => {
        done({ ok: true, status: res.statusCode ?? 0 })
        res.destroy() // tělo odpovědi nepotřebujeme
      }
    )
    req.on('timeout', () => {
      done({ ok: false, error: 'The 10 s timeout expired' })
      req.destroy()
    })
    req.on('error', (e) => done({ ok: false, error: e.message || 'Connection error' }))
    // IP literály se v lookup nepřekládají, proto je blokuje už checkWebhookUrl.
    req.end(body)
  })
}
