import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import type { PhoneNumber } from '@/types'

export type PhoneNumberWithAgent = PhoneNumber & { agent: { id: string; name: string } | null }

export async function getPhoneNumbersByWorkspaceId(workspaceId: string): Promise<PhoneNumberWithAgent[]> {
  const { data, error } = await createAdminClient()
    .from('phone_numbers')
    .select('*, agent:agents(id, name)')
    .eq('workspace_id', workspaceId)
    .order('purchased_at', { ascending: true })
  if (error) throw error
  return data as unknown as PhoneNumberWithAgent[]
}
