import { NextResponse } from 'next/server'
import { clerkClient } from '@clerk/nextjs/server'
import { requireWorkspaceAdmin } from '@/lib/api-auth'
import { clerkErrorResponse } from '@/lib/team'

// DELETE /api/team/invitations/:invitationId – zruší čekající pozvánku (jen v organizaci tohoto workspace)
export async function DELETE(_request: Request, { params }: { params: Promise<{ invitationId: string }> }) {
  const ctx = await requireWorkspaceAdmin()
  if ('response' in ctx) return ctx.response
  if (!ctx.workspace.clerk_org_id) {
    return NextResponse.json({ error: 'Invitation not found' }, { status: 404 })
  }

  const { invitationId } = await params
  try {
    const client = await clerkClient()
    await client.organizations.revokeOrganizationInvitation({
      organizationId: ctx.workspace.clerk_org_id,
      invitationId,
      requestingUserId: ctx.userId,
    })
    return NextResponse.json({ success: true })
  } catch (e) {
    return clerkErrorResponse(e, 'revoke invitation')
  }
}
