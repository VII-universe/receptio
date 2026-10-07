import 'server-only'
import { checkMinutesLimit } from './check-limits'

/**
 * Může workspace dál přijímat hovory v rámci svého plánu? Limity plánů jsou v minutách
 * (viz PLANS a check-limits). Slouží jen ke sledování, hovory se neblokují.
 */
export async function checkCallAllowed(workspaceId: string): Promise<{ allowed: boolean; reason?: string }> {
  const { allowed } = await checkMinutesLimit(workspaceId)
  return allowed ? { allowed: true } : { allowed: false, reason: 'Dosáhli jste limitu hovorů pro váš plán.' }
}
