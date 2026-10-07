import 'server-only'
import { isLocale } from '@/i18n/routing'
import { createAdminClient } from '@/lib/supabase/admin'

/** Jazyk e-mailů = workspaces.locale příjemcova workspace; při chybě nebo neplatné hodnotě angličtina. */
export async function getWorkspaceEmailLocale(workspaceId: string): Promise<string> {
  try {
    const { data } = await createAdminClient().from('workspaces').select('locale').eq('id', workspaceId).maybeSingle()
    return isLocale(data?.locale) ? data.locale : 'en'
  } catch {
    return 'en'
  }
}
