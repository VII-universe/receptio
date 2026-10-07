import 'server-only'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyApiKey } from './index'

export const RATE_LIMIT_PER_MINUTE = 100

const json = (status: number, error: string, headers?: Record<string, string>) =>
  NextResponse.json({ error }, { status, headers: { 'Cache-Control': 'no-store', ...headers } })

/**
 * Extrahuje Bearer token, ověří ho a zapíše použití (rate limit 100 požadavků/min na klíč).
 * Vrací kontext klíče, nebo hotovou odpověď 401 / 429.
 */
export async function requireApiKey(
  request: Request
): Promise<{ workspaceId: string; scopes: string[] } | Response> {
  const header = request.headers.get('authorization') ?? ''
  const match = header.match(/^Bearer\s+(\S+)$/i)
  if (!match) {
    return json(401, 'Missing or invalid Authorization header', { 'WWW-Authenticate': 'Bearer' })
  }

  const verified = await verifyApiKey(match[1])
  if (!verified) {
    return json(401, 'Invalid API key', { 'WWW-Authenticate': 'Bearer' })
  }

  const { data: hits, error } = await createAdminClient().rpc('api_key_hit', { p_key_id: verified.keyId })
  if (error) {
    // Chyba počítadla nesmí blokovat legitimní klíč, jen se zaloguje.
    console.error('API key rate limit counter failed', error.message)
  } else if (typeof hits === 'number' && hits > RATE_LIMIT_PER_MINUTE) {
    return json(429, 'Rate limit exceeded (100 requests per minute)', { 'Retry-After': '60' })
  }

  return { workspaceId: verified.workspaceId, scopes: verified.scopes }
}

/** 403, pokud klíč nemá požadovaný scope. */
export function requireScope(scopes: string[], scope: 'read' | 'write'): Response | null {
  return scopes.includes(scope) ? null : json(403, `API key is missing the "${scope}" scope`)
}

export { json as apiError }
