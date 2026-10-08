import 'server-only'
import { NextResponse } from 'next/server'
import { requireWorkspace, requireWorkspaceAdmin } from '@/lib/api-auth'
import { getAgentById } from '@/lib/supabase/queries'
import type { Agent, Workspace } from '@/types'

/** Admin workspace + agent, který do workspace patří (jinak 401/403/404). Členové týmu agenty needitují. */
export async function requireOwnedAgent(
  params: Promise<{ id: string }>
): Promise<{ response: NextResponse } | { workspace: Workspace; agent: Agent }> {
  const ctx = await requireWorkspaceAdmin()
  if ('response' in ctx) return ctx
  const agent = await getAgentById(ctx.workspace.id, (await params).id)
  if (!agent) return { response: NextResponse.json({ error: 'Agent not found' }, { status: 404 }) }
  return { workspace: ctx.workspace, agent }
}

/** Jako requireOwnedAgent, ale smí i člen týmu (rezervace a kalendář vidí a spravuje celý tým). */
export async function requireAgentAccess(
  params: Promise<{ id: string }>
): Promise<{ response: NextResponse } | { workspace: Workspace; agent: Agent }> {
  const ctx = await requireWorkspace()
  if ('response' in ctx) return ctx
  const agent = await getAgentById(ctx.workspace.id, (await params).id)
  if (!agent) return { response: NextResponse.json({ error: 'Agent not found' }, { status: 404 }) }
  return { workspace: ctx.workspace, agent }
}
