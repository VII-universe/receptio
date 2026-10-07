import 'server-only'
import { NextResponse } from 'next/server'
import { requireWorkspace } from '@/lib/api-auth'
import { getAgentById } from '@/lib/supabase/queries'
import type { Agent, Workspace } from '@/types'

/** Přihlášený uživatel + agent, který patří do jeho workspace (jinak 401/404). */
export async function requireOwnedAgent(
  params: Promise<{ id: string }>
): Promise<{ response: NextResponse } | { workspace: Workspace; agent: Agent }> {
  const ctx = await requireWorkspace()
  if ('response' in ctx) return ctx
  const agent = await getAgentById(ctx.workspace.id, (await params).id)
  if (!agent) return { response: NextResponse.json({ error: 'Agent not found' }, { status: 404 }) }
  return { workspace: ctx.workspace, agent }
}
