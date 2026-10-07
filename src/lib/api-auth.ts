import 'server-only'
import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { isTwilioConfigured } from '@/lib/twilio/client'
import { getWorkspaceByClerkUserId } from '@/lib/supabase/queries'
import type { Workspace } from '@/types'

type Failure = { response: NextResponse }

function fail(error: string, status: number): Failure {
  return { response: NextResponse.json({ error }, { status }) }
}

/** Telefonní API potřebuje Twilio i Vapi; bez klíčů vrací 503. */
export function requirePhoneIntegrations(): Failure | null {
  if (!isTwilioConfigured() || !process.env.VAPI_API_KEY) {
    return fail('Telefonní integrace není nakonfigurována', 503)
  }
  return null
}

/** Přihlášený uživatel + jeho workspace (ownership se bere z Clerk session). */
export async function requireWorkspace(): Promise<Failure | { workspace: Workspace }> {
  const { userId } = await auth()
  if (!userId) return fail('Unauthorized', 401)
  const workspace = await getWorkspaceByClerkUserId(userId)
  if (!workspace) return fail('Workspace not found', 404)
  return { workspace }
}
