import 'server-only'
import { randomBytes } from 'node:crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import { appBaseUrl } from '@/lib/email/format'
import { bookingUid } from './types'

/** Tajný token odkazu pro odběr kalendáře; vytvoří se při prvním použití. */
export async function getOrCreateFeedToken(workspaceId: string, rotate = false): Promise<string> {
  const supabase = createAdminClient()
  if (!rotate) {
    const { data, error } = await supabase.from('workspaces').select('calendar_feed_token').eq('id', workspaceId).maybeSingle()
    if (error) throw error
    if (data?.calendar_feed_token) return data.calendar_feed_token
  }
  const token = randomBytes(32).toString('base64url')
  const { error } = await supabase.from('workspaces').update({ calendar_feed_token: token }).eq('id', workspaceId)
  if (error) throw error
  return token
}

export const feedUrls = (token: string) => {
  const https = `${appBaseUrl()}/api/calendar-feed/${token}.ics`
  return { https, webcal: https.replace(/^https?:/, 'webcal:') }
}

/** Rezervace pro feed (potvrzené a čekající, od před 30 dní do +1 rok), volitelně jen jednoho agenta. */
export async function loadFeedBookings(workspaceId: string, agentId?: string) {
  let q = createAdminClient()
    .from('bookings')
    .select('id, caller_name, caller_phone, title, notes, starts_at, ends_at, status, agent:agents(name)')
    .eq('workspace_id', workspaceId)
    .neq('status', 'cancelled')
    .gte('ends_at', new Date(Date.now() - 30 * 86_400_000).toISOString())
    .lt('starts_at', new Date(Date.now() + 365 * 86_400_000).toISOString())
    .order('starts_at')
    .limit(2000)
  if (agentId) q = q.eq('agent_id', agentId)
  const { data, error } = await q
  if (error) throw error
  return (data ?? []).map((b) => {
    const agent = b.agent as { name: string } | { name: string }[] | null
    return {
      uid: bookingUid(b.id),
      summary: `${b.title} – ${b.caller_name}`,
      description: [b.caller_phone && `Tel: ${b.caller_phone}`, (Array.isArray(agent) ? agent[0]?.name : agent?.name) && `Agent: ${Array.isArray(agent) ? agent[0]?.name : agent?.name}`, b.notes].filter(Boolean).join('\n'),
      start: new Date(b.starts_at),
      end: new Date(b.ends_at),
      status: (b.status === 'confirmed' ? 'CONFIRMED' : 'TENTATIVE') as 'CONFIRMED' | 'TENTATIVE',
    }
  })
}
