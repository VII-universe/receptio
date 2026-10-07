import 'server-only'
import { randomBytes } from 'node:crypto'
import bcrypt from 'bcryptjs'
import { createAdminClient } from '@/lib/supabase/admin'

const KEY_FORMAT = /^rcp_live_[0-9a-f]{32}$/
const PREFIX_LENGTH = 'rcp_live_'.length + 8 // "rcp_live_" + prvních 8 hex znaků
const BCRYPT_ROUNDS = 10

export type ApiScope = 'read' | 'write'
export const API_SCOPES: ApiScope[] = ['read', 'write']

/** Nový klíč: "rcp_live_" + 32 náhodných hex znaků (128 bitů). Prefix slouží k vyhledání a zobrazení. */
export function generateApiKey(): { key: string; prefix: string } {
  const key = `rcp_live_${randomBytes(16).toString('hex')}`
  return { key, prefix: key.slice(0, PREFIX_LENGTH) }
}

export async function hashApiKey(key: string): Promise<string> {
  return bcrypt.hash(key, BCRYPT_ROUNDS)
}

export interface VerifiedKey {
  keyId: string
  workspaceId: string
  scopes: string[]
}

/**
 * Ověří klíč: najde kandidáty podle prefixu, porovná bcrypt hash a zkontroluje, že klíč je aktivní
 * a nevypršel. Vrací null pro jakýkoli neplatný klíč (bez rozlišení důvodu).
 */
export async function verifyApiKey(key: string): Promise<VerifiedKey | null> {
  // Rychlé odmítnutí špatného formátu bez dotazu do DB i bez bcryptu.
  if (!KEY_FORMAT.test(key)) return null

  const { data, error } = await createAdminClient()
    .from('api_keys')
    .select('id, workspace_id, key_hash, scopes, expires_at, is_active')
    .eq('key_prefix', key.slice(0, PREFIX_LENGTH))
    .eq('is_active', true)
  if (error) {
    console.error('API key lookup failed', error.message)
    return null
  }

  for (const row of data) {
    if (row.expires_at && new Date(row.expires_at) <= new Date()) continue
    if (await bcrypt.compare(key, row.key_hash)) {
      return { keyId: row.id, workspaceId: row.workspace_id, scopes: row.scopes }
    }
  }
  return null
}
