import { NextResponse } from 'next/server'
import { clerkClient } from '@clerk/nextjs/server'
import { requireWorkspaceAdmin } from '@/lib/api-auth'
import { teamLimitFor } from '@/lib/stripe/plans'
import { clerkErrorResponse, ensureOrganization, isOrgRole, teamUsage } from '@/lib/team'

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

// POST /api/team/invite  Body: { email, role: 'org:admin' | 'org:member' }
export async function POST(request: Request) {
  const ctx = await requireWorkspaceAdmin()
  if ('response' in ctx) return ctx.response
  const { workspace, userId } = ctx

  const body = await request.json().catch(() => null)
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
  if (!EMAIL.test(email) || email.length > 254 || !isOrgRole(body?.role)) {
    return NextResponse.json({ error: 'Neplatný email nebo role' }, { status: 400 })
  }

  try {
    // Limit se kontroluje před vytvořením organizace; čekající pozvánky se počítají (po přijetí by limit přesáhly).
    const limit = teamLimitFor(workspace.plan)
    const { members, pending } = await teamUsage(workspace)
    if (limit !== null && members + pending >= limit) {
      return NextResponse.json({ error: 'Dosáhli jste limitu členů pro váš plán.' }, { status: 403 })
    }

    const organizationId = await ensureOrganization(workspace)
    const client = await clerkClient()
    await client.organizations.createOrganizationInvitation({
      organizationId,
      emailAddress: email,
      role: body.role,
      inviterUserId: userId,
      redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
    })
    return NextResponse.json({ success: true })
  } catch (e) {
    return clerkErrorResponse(e, 'invite')
  }
}
