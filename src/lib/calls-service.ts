import 'server-only'
import { compactMessages } from '@/lib/calls'
import { getCallLogById } from '@/lib/supabase/queries'
import type { CallLog } from '@/types'

export type CallDetail = CallLog & { agent_name: string | null }

/**
 * Detail hovoru ze Supabase. Pokud chybí přepis (např. webhook nedoběhl),
 * zkusí chybějící data doplnit z Vapi (GET /call/:id); výsledek se jen vrátí, neukládá.
 */
export async function getCallDetail(workspaceId: string, id: string): Promise<CallDetail | null> {
  const call = await getCallLogById(workspaceId, id)
  if (!call) return null

  const hasTranscript = (call.transcript_json?.length ?? 0) > 0 || !!call.transcript
  if (hasTranscript || !process.env.VAPI_API_KEY || !call.vapi_call_id) return call

  try {
    const { vapi } = await import('@/lib/vapi/client')
    const remote = await vapi.calls.get({ id: call.vapi_call_id })
    const messages = compactMessages(remote.artifact?.messages)
    return {
      ...call,
      transcript: remote.artifact?.transcript ?? call.transcript,
      transcript_json: messages.length > 0 ? messages : call.transcript_json,
      recording_url: call.recording_url ?? remote.artifact?.recordingUrl ?? null,
      summary: call.summary ?? remote.analysis?.summary ?? null,
    }
  } catch (e) {
    console.error('Vapi: failed to fetch call', call.vapi_call_id, e)
    return call
  }
}
