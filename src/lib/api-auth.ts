import 'server-only'
import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { isTwilioConfigured } from '@/lib/twilio/client'
import { resolveWorkspaceContext, type WorkspaceRole } from '@/lib/workspace-context'
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

/** Přihlášený uživatel + jeho workspace (z Clerk session; včetně členů týmu). */
export async function requireWorkspace(): Promise<Failure | { workspace: Workspace; userId: string; role: WorkspaceRole; isOwner: boolean }> {
  const { userId } = await auth()
  if (!userId) return fail('Unauthorized', 401)
  const ctx = await resolveWorkspaceContext()
  if (!ctx) return fail('Workspace not found', 404)
  return { workspace: ctx.workspace, userId: ctx.userId, role: ctx.role, isOwner: ctx.isOwner }
}

/** Jako requireWorkspace, ale jen pro adminy workspace; člen týmu dostane 403 (i při přímém volání API). */
export async function requireWorkspaceAdmin() {
  const ctx = await requireWorkspace()
  if ('response' in ctx) return ctx
  if (ctx.role !== 'admin') return fail('Nemáte oprávnění', 403)
  return ctx
}
