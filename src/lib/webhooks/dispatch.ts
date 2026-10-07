import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendWebhook } from './send'

const MAX_FAILURES = 10

/**
 * Odešle událost na všechny aktivní webhooky workspace, které ji odebírají.
 * Webhooky se odesílají paralelně a nezávisle (Promise.allSettled), bez opakování;
 * chyba jednoho nikdy nezastaví ostatní ani hlavní tok.
 */
export async function dispatchWebhooks(workspaceId: string, event: string, payload: object): Promise<void> {
  const supabase = createAdminClient()
  const { data: hooks, error } = await supabase
    .from('webhooks')
    .select('id, url, secret, failure_count')
    .eq('workspace_id', workspaceId)
    .eq('is_active', true)
    .contains('events', [event])
  if (error) {
    console.error('Webhooks: failed to load', error.message)
    return
  }

  await Promise.allSettled(
    (hooks ?? []).map(async (hook) => {
      const result = await sendWebhook({ url: hook.url, secret: hook.secret, event, payload })
      const failed = !result.ok || result.status >= 400
      const { error: updateError } = await supabase
        .from('webhooks')
        .update({
          last_triggered_at: new Date().toISOString(),
          last_status_code: result.ok ? result.status : null,
          failure_count: failed ? Math.min(MAX_FAILURES, hook.failure_count + 1) : 0,
        })
        .eq('id', hook.id)
      if (updateError) console.error('Webhooks: failed to store result', updateError.message)
      if (failed) console.warn(`Webhooks: delivery to ${hook.id} failed`, result.ok ? result.status : result.error)
    })
  )
}
