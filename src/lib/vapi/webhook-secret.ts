import 'server-only'
import { randomBytes, timingSafeEqual } from 'node:crypto'
import { createAdminClient } from '@/lib/supabase/admin'

/** Nové tajemství webhooku agenta: 32 hexadecimálních znaků (128 bitů). */
export const generateWebhookSecret = () => randomBytes(16).toString('hex')

/** Porovnání v konstantním čase (délka se může prozradit, obsah ne). */
export function secretsMatch(received: string | null, expected: string | null | undefined): boolean {
  if (!received || !expected) return false
  const a = Buffer.from(received)
  const b = Buffer.from(expected)
  return a.length === b.length && timingSafeEqual(a, b)
}

/**
 * Tajemství, které má Vapi u agenta posílat: vlastní, jinak (starší agent bez secretu) sdílené VAPI_WEBHOOK_SECRET.
 * Sdílený secret je jen přechodná záloha pro agenty, kterým se vlastní ještě nedoplnil (npm run vapi:backfill-secrets).
 */
export const expectedWebhookSecret = (agentSecret: string | null | undefined) => agentSecret || process.env.VAPI_WEBHOOK_SECRET || null

// Tajemství žijí v samostatné tabulce agent_secrets, aby je žádné čtení agentů (select('*')) nevrátilo klientovi.

/** Přečte tajemství agenta (jen na serveru; nikdy se nevrací klientovi). */
export async function getAgentWebhookSecret(agentId: string): Promise<string | null> {
  const { data, error } = await createAdminClient().from('agent_secrets').select('vapi_webhook_secret').eq('agent_id', agentId).maybeSingle()
  if (error) throw error
  return data?.vapi_webhook_secret ?? null
}

export async function setAgentWebhookSecret(agentId: string, secret: string): Promise<void> {
  const { error } = await createAdminClient().from('agent_secrets').upsert({ agent_id: agentId, vapi_webhook_secret: secret })
  if (error) throw error
}

export async function clearAgentWebhookSecret(agentId: string): Promise<void> {
  const { error } = await createAdminClient().from('agent_secrets').delete().eq('agent_id', agentId)
  if (error) throw error
}

/** Tajemství, které agent skutečně používá (vlastní, jinak sdílené z env); bez něj nelze sestavit nástroje s webhookem. */
export async function resolveWebhookSecret(agentId: string): Promise<string> {
  const secret = expectedWebhookSecret(await getAgentWebhookSecret(agentId))
  if (!secret) throw new Error('Agent has no webhook secret')
  return secret
}
