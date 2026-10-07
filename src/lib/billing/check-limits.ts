import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'

export async function checkMinutesLimit(workspaceId: string): Promise<{
  allowed: boolean
  minutesUsed: number
  minutesLimit: number
}> {
  const { data, error } = await createAdminClient()
    .from('workspaces')
    .select('minutes_used, minutes_limit, billing_period_end')
    .eq('id', workspaceId)
    .single()
  if (error) throw error

  // Skončené období (např. plán Zdarma) se počítá jako vynulované.
  const expired = data.billing_period_end && new Date(data.billing_period_end) <= new Date()
  const minutesUsed = expired ? 0 : data.minutes_used
  const minutesLimit: number = data.minutes_limit

  return {
    allowed: minutesLimit === -1 || minutesUsed < minutesLimit,
    minutesUsed,
    minutesLimit,
  }
}

/** Přičte minuty k měsíční spotřebě workspace (atomicky, viz migrace 005). */
export async function recordMinutesUsed(workspaceId: string, durationSeconds: number): Promise<void> {
  const minutes = Math.ceil(durationSeconds / 60)
  if (minutes <= 0) return
  const { error } = await createAdminClient().rpc('increment_minutes_used', {
    p_workspace_id: workspaceId,
    p_minutes: minutes,
  })
  if (error) throw error
}
