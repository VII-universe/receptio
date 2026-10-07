import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { INDUSTRY_OPTIONS } from '@/lib/constants'
import { isCurrency } from '@/lib/stripe/plans'
import { createAdminClient } from '@/lib/supabase/admin'
import { publicWorkspace } from '@/lib/public-workspace'
import type { Workspace } from '@/types'
import { resolveWorkspaceContext } from '@/lib/workspace-context'

// POST /api/workspaces  Body: { name, industry }
export async function POST(request: Request) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const name = typeof body?.name === 'string' ? body.name.trim() : ''
  const industry = body?.industry
  // Fakturační měna se volí při založení workspace; bez volby (starší onboarding) platí CZK.
  const currency = body?.currency ?? 'CZK'
  if (name.length < 2 || !INDUSTRY_OPTIONS.some((o) => o.value === industry) || !isCurrency(currency)) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  // člen týmu cizího workspace si nový zakládat nemá, i když ještě nemá vlastní
  if (await resolveWorkspaceContext()) {
    return NextResponse.json({ error: 'Workspace already exists' }, { status: 409 })
  }

  const { data, error } = await createAdminClient()
    .from('workspaces')
    .insert({ clerk_user_id: userId, name, industry, currency })
    .select('*')
    .single()

  if (error) {
    // 23505 = unique violation (souběžný druhý požadavek)
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Workspace already exists' }, { status: 409 })
    }
    console.error('Failed to create workspace', error)
    return NextResponse.json({ error: 'Failed to create workspace' }, { status: 500 })
  }

  return NextResponse.json({ workspace: publicWorkspace(data as Workspace) }, { status: 201 })
}
