import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'

export type AdminAction = 'set_plan' | 'reset_minutes' | 'toggle_calls_paused' | 'extend_trial'

/** Zapíše akci administrátora do admin_audit_log. Při chybě zápisu vyhazuje, aby se akce nevedla bez stopy tiše. */
export async function logAdminAction(entry: {
  adminUserId: string
  workspaceId: string
  action: AdminAction
  oldValue: unknown
  newValue: unknown
}): Promise<void> {
  const { error } = await createAdminClient().from('admin_audit_log').insert({
    admin_user_id: entry.adminUserId,
    workspace_id: entry.workspaceId,
    action: entry.action,
    old_value: entry.oldValue ?? null,
    new_value: entry.newValue ?? null,
  })
  if (error) {
    console.error('Admin audit: insert failed', error)
    throw new Error('The action was applied but writing the audit log failed')
  }
}
