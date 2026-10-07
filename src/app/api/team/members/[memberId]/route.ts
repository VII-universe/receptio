import { NextResponse } from 'next/server'
import { clerkClient } from '@clerk/nextjs/server'
import { requireWorkspaceAdmin } from '@/lib/api-auth'
import { clerkErrorResponse, isOrgRole } from '@/lib/team'

type Ctx = { params: Promise<{ memberId: string }> }

/** Společné kontroly: organizace existuje, cíl není volající ani zakladatel workspace. */
async function guard(params: Ctx['params']) {
  const ctx = await requireWorkspaceAdmin()
  if ('response' in ctx) return { response: ctx.response }
  const { memberId } = await params

  if (!ctx.workspace.clerk_org_id) {
    return { response: NextResponse.json({ error: 'Member not found' }, { status: 404 }) }
  }
  if (memberId === ctx.userId) {
    return { response: NextResponse.json({ error: 'Sám sebe nelze změnit ani odebrat.' }, { status: 403 }) }
  }
  if (memberId === ctx.workspace.clerk_user_id) {
    return { response: NextResponse.json({ error: 'Zakladatele workspace nelze změnit ani odebrat.' }, { status: 403 }) }
  }
  return { organizationId: ctx.workspace.clerk_org_id, memberId }
}

// PATCH /api/team/members/:memberId  Body: { role: 'org:admin' | 'org:member' }
export async function PATCH(request: Request, { params }: Ctx) {
  const g = await guard(params)
  if ('response' in g) return g.response

  const body = await request.json().catch(() => null)
  if (!isOrgRole(body?.role)) return NextResponse.json({ error: 'Invalid role' }, { status: 400 })

  try {
    const client = await clerkClient()
    await client.organizations.updateOrganizationMembership({
      organizationId: g.organizationId,
      userId: g.memberId,
      role: body.role,
    })
    return NextResponse.json({ success: true })
  } catch (e) {
    return clerkErrorResponse(e, 'update membership')
  }
}

// DELETE /api/team/members/:memberId
export async function DELETE(_request: Request, { params }: Ctx) {
  const g = await guard(params)
  if ('response' in g) return g.response

  try {
    const client = await clerkClient()
    await client.organizations.deleteOrganizationMembership({
      organizationId: g.organizationId,
      userId: g.memberId,
    })
    return NextResponse.json({ success: true })
  } catch (e) {
    return clerkErrorResponse(e, 'delete membership')
  }
}
