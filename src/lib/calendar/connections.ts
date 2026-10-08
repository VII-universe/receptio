import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import type { CalendarConnection, CalendarProvider } from '@/types'
import { caldavClient, type CaldavConfig } from './caldav'
import { decryptConfig, encryptConfig } from './crypto'
import { googleClient, type GoogleConfig } from './google'
import { icalClient } from './ical'
import type { CalendarProviderClient } from './types'

// Sloupec config se klientovi nikdy neposílá.
export const PUBLIC_COLUMNS = 'id, workspace_id, provider, name, sync_enabled, last_synced_at, last_sync_error, created_at'

export interface ConnectionRow extends CalendarConnection {
  config: unknown
}

export async function listConnections(workspaceId: string): Promise<CalendarConnection[]> {
  const { data, error } = await createAdminClient().from('calendar_connections').select(PUBLIC_COLUMNS).eq('workspace_id', workspaceId).order('created_at')
  if (error) throw error
  return data as CalendarConnection[]
}

export async function getConnection(workspaceId: string, id: string): Promise<ConnectionRow | null> {
  const { data, error } = await createAdminClient().from('calendar_connections').select(`${PUBLIC_COLUMNS}, config`).eq('id', id).eq('workspace_id', workspaceId).maybeSingle()
  if (error) throw error
  return data as ConnectionRow | null
}

export async function insertConnection(workspaceId: string, provider: CalendarProvider, name: string, config: unknown): Promise<CalendarConnection> {
  const { data, error } = await createAdminClient()
    .from('calendar_connections')
    .insert({ workspace_id: workspaceId, provider, name, config: encryptConfig(config) })
    .select(PUBLIC_COLUMNS)
    .single()
  if (error) throw error
  return data as CalendarConnection
}

/** Klient provideru pro uložené napojení; po použití se případně obnovený token uloží přes `persist`. */
export function clientFor(conn: ConnectionRow): { client: CalendarProviderClient; persist: () => Promise<void> } {
  const config = decryptConfig<unknown>(conn.config)
  const client =
    conn.provider === 'google' ? googleClient(config as GoogleConfig) : conn.provider === 'caldav' ? caldavClient(config as CaldavConfig) : icalClient(config as { url: string })
  return {
    client,
    persist: async () => {
      const updated = client.updatedConfig?.()
      if (!updated) return
      const { error } = await createAdminClient().from('calendar_connections').update({ config: encryptConfig(updated) }).eq('id', conn.id)
      if (error) console.error('Failed to store refreshed calendar token', error)
    },
  }
}
