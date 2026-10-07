import { redirect } from 'next/navigation'
import { clerkClient } from '@clerk/nextjs/server'
import { getWorkspaceContext } from '@/lib/auth'
import { teamLimitFor } from '@/lib/stripe/plans'
import { TeamManager, type InvitationRow, type MemberRow } from './team-manager'

export const metadata = { title: 'Team' }

export default async function TeamPage() {
  const ctx = await getWorkspaceContext()
  if (!ctx) redirect('/onboarding')
  const { workspace, userId } = ctx
  const canManage = ctx.role === 'admin'
  const client = await clerkClient()

  let members: MemberRow[] = []
  let invitations: InvitationRow[] = []

  if (workspace.clerk_org_id) {
    const orgId = workspace.clerk_org_id
    const [list, pending] = await Promise.all([
      client.organizations.getOrganizationMembershipList({ organizationId: orgId, limit: 100 }),
      // Čekající pozvánky vidí jen admini
      canManage
        ? client.organizations.getOrganizationInvitationList({ organizationId: orgId, status: ['pending'], limit: 100 })
        : Promise.resolve(null),
    ])
    members = list.data.map((m) => ({
      userId: m.publicUserData?.userId ?? m.id,
      name: [m.publicUserData?.firstName, m.publicUserData?.lastName].filter(Boolean).join(' ') || '–',
      email: m.publicUserData?.identifier ?? '–',
      imageUrl: m.publicUserData?.imageUrl ?? '',
      role: m.role === 'org:admin' ? 'org:admin' : 'org:member',
      isSelf: m.publicUserData?.userId === userId,
      isOwner: m.publicUserData?.userId === workspace.clerk_user_id,
    }))
    invitations = (pending?.data ?? []).map((i) => ({
      id: i.id,
      email: i.emailAddress,
      role: i.role === 'org:admin' ? 'org:admin' : 'org:member',
      createdAt: new Date(i.createdAt).toISOString(),
    }))
  } else {
    // Tým ještě nevznikl (organizace se vytvoří při první pozvánce): členem je jen zakladatel.
    const owner = await client.users.getUser(workspace.clerk_user_id)
    members = [
      {
        userId: owner.id,
        name: [owner.firstName, owner.lastName].filter(Boolean).join(' ') || '–',
        email: owner.primaryEmailAddress?.emailAddress ?? '–',
        imageUrl: owner.imageUrl,
        role: 'org:admin',
        isSelf: owner.id === userId,
        isOwner: true,
      },
    ]
  }

  return (
    <div className="mx-auto max-w-5xl">
      <TeamManager
        members={members}
        invitations={invitations}
        limit={teamLimitFor(workspace.plan)}
        canManage={canManage}
      />
    </div>
  )
}
