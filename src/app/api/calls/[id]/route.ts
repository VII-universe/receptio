import { NextResponse } from 'next/server'
import { requireWorkspace } from '@/lib/api-auth'
import { getCallLogById } from '@/lib/supabase/queries'

// GET /api/calls/:id – hovor včetně přepisu (jen z workspace přihlášeného uživatele)
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireWorkspace()
  if ('response' in ctx) return ctx.response

  const { id } = await params
  try {
    const call = await getCallLogById(ctx.workspace.id, id)
    if (!call) return NextResponse.json({ error: 'Call not found' }, { status: 404 })
    return NextResponse.json({ call })
  } catch (e) {
    console.error('Failed to load call', e)
    return NextResponse.json({ error: 'Failed to load call' }, { status: 500 })
  }
}
