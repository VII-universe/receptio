import 'server-only'
import { NextResponse } from 'next/server'
import { clerkClient } from '@clerk/nextjs/server'
import { isClerkAPIResponseError } from '@clerk/nextjs/errors'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Workspace } from '@/types'

export type OrgRole = 'org:admin' | 'org:member'
export const isOrgRole = (v: unknown): v is OrgRole => v === 'org:admin' || v === 'org:member'

/**
 * ID organizace workspace, případně ji vytvoří (líně, při první pozvánce).
 * Zakladatel workspace se stane org:admin. ID organizace se bere vždy z workspace, nikdy z požadavku.
 */
export async function ensureOrganization(workspace: Workspace): Promise<string> {
  if (workspace.clerk_org_id) return workspace.clerk_org_id

  const client = await clerkClient()
  const org = await client.organizations.createOrganization({
    name: workspace.name,
    createdBy: workspace.clerk_user_id,
  })

  const { data, error } = await createAdminClient()
    .from('workspaces')
    .update({ clerk_org_id: org.id })
    .eq('id', workspace.id)
    .is('clerk_org_id', null) // souběžný požadavek mohl organizaci vytvořit dřív
    .select('clerk_org_id')
    .maybeSingle()
  if (error) {
    await client.organizations.deleteOrganization(org.id).catch(() => {})
    throw error
  }
  if (!data) {
    // Prohráli jsme souběh: naše organizace je navíc, použijeme tu, kterou uložil jiný požadavek.
    await client.organizations.deleteOrganization(org.id).catch(() => {})
    const { data: row, error: readError } = await createAdminClient()
      .from('workspaces')
      .select('clerk_org_id')
      .eq('id', workspace.id)
      .single()
    if (readError || !row?.clerk_org_id) throw readError ?? new Error('Organization race: no organization stored')
    return row.clerk_org_id
  }
  return org.id
}

/** Počet členů a čekajících pozvánek (bez organizace je členem jen zakladatel). */
export async function teamUsage(workspace: Workspace): Promise<{ members: number; pending: number }> {
  if (!workspace.clerk_org_id) return { members: 1, pending: 0 }
  const client = await clerkClient()
  const [members, invitations] = await Promise.all([
    client.organizations.getOrganizationMembershipList({ organizationId: workspace.clerk_org_id, limit: 1 }),
    client.organizations.getOrganizationInvitationList({
      organizationId: workspace.clerk_org_id,
      status: ['pending'],
      limit: 1,
    }),
  ])
  return { members: members.totalCount, pending: invitations.totalCount }
}

/** Odpověď pro chybu z Clerku (bez interních detailů); pro neočekávané chyby 502. */
export function clerkErrorResponse(e: unknown, context: string): NextResponse {
  console.error(`Clerk: ${context} failed`, e)
  if (isClerkAPIResponseError(e) && e.status >= 400 && e.status < 500) {
    const detail = e.errors[0]?.longMessage ?? e.errors[0]?.message
    return NextResponse.json({ error: detail ?? 'Požadavek se nezdařil' }, { status: e.status === 404 ? 404 : 422 })
  }
  return NextResponse.json({ error: 'Operace se nezdařila' }, { status: 502 })
}
