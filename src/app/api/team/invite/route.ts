import { after, NextResponse } from 'next/server'
import { clerkClient, currentUser } from '@clerk/nextjs/server'
import { sendInviteEmail } from '@/lib/email/send-invite'
import { requireWorkspaceAdmin } from '@/lib/api-auth'
import { checkTeamMemberLimit } from '@/lib/billing/check-limit'
import { limitReachedResponse } from '@/lib/billing/limit-response'
import { clerkErrorResponse, ensureOrganization, isOrgRole } from '@/lib/team'

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

// POST /api/team/invite  Body: { email, role: 'org:admin' | 'org:member' }
export async function POST(request: Request) {
  const ctx = await requireWorkspaceAdmin()
  if ('response' in ctx) return ctx.response
  const { workspace, userId } = ctx

  const body = await request.json().catch(() => null)
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
  if (!EMAIL.test(email) || email.length > 254 || !isOrgRole(body?.role)) {
    return NextResponse.json({ error: 'Invalid email or role' }, { status: 400 })
  }

  try {
    // Limit se kontroluje před vytvořením organizace; čekající pozvánky se počítají (po přijetí by limit přesáhly).
    const teamLimit = await checkTeamMemberLimit(workspace)
    if (!teamLimit.allowed) return limitReachedResponse('teamMembers', teamLimit)

    const organizationId = await ensureOrganization(workspace)
    const client = await clerkClient()
    const invitation = await client.organizations.createOrganizationInvitation({
      organizationId,
      emailAddress: email,
      role: body.role,
      inviterUserId: userId,
      redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
    })
    // Pozvánku v jazyce workspace posíláme sami (Clerk e-mail pak v Clerk dashboardu vypněte, ať nechodí dvakrát).
    // Bez URL pozvánky od Clerku se náš e-mail neposílá. Chyba odeslání pozvánku nikdy neshodí.
    after(async () => {
      try {
        const user = await currentUser()
        const inviterName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.primaryEmailAddress?.emailAddress || workspace.name
        const sent = await sendInviteEmail({
          workspaceId: workspace.id,
          to: email,
          inviterName,
          inviterEmail: user?.primaryEmailAddress?.emailAddress,
          workspaceName: workspace.business_name ?? workspace.name,
          inviteUrl: invitation.url,
        })
        if (!sent) console.warn('Invite: Clerk returned no invitation URL, custom email skipped')
      } catch (e) {
        console.error('Invite: email failed', e)
      }
    })
    return NextResponse.json({ success: true })
  } catch (e) {
    return clerkErrorResponse(e, 'invite')
  }
}
