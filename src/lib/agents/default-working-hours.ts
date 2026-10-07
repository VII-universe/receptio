import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import type { WorkingHour } from '@/types'
import { DEFAULT_WORKING_HOURS } from './working-hours'

export { DEFAULT_WORKING_HOURS }

/** Vloží výchozí pracovní dobu agenta; už existující dny se nepřepisují (ON CONFLICT DO NOTHING). */
export async function seedWorkingHours(
  agentId: string,
  workspaceId: string,
  hours: WorkingHour[] = DEFAULT_WORKING_HOURS
): Promise<void> {
  const { error } = await createAdminClient()
    .from('working_hours')
    .upsert(
      hours.map((h) => ({ ...h, agent_id: agentId, workspace_id: workspaceId })),
      { onConflict: 'agent_id,day_of_week', ignoreDuplicates: true }
    )
  if (error) throw error
}
