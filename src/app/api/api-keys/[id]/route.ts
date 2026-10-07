import { NextResponse } from 'next/server'
import { requireWorkspaceAdmin } from '@/lib/api-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { isUuid } from '@/lib/supabase/queries'

// DELETE /api/api-keys/:id – odvolá klíč (is_active = false; záznam zůstává pro přehled)
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireWorkspaceAdmin()
  if ('response' in ctx) return ctx.response

  const { id } = await params
  if (!isUuid(id)) return NextResponse.json({ error: 'Key not found' }, { status: 404 })

  const { data, error } = await createAdminClient()
    .from('api_keys')
    .update({ is_active: false })
    .eq('id', id)
    .eq('workspace_id', ctx.workspace.id)
    .select('id')
  if (error) {
    console.error('Failed to revoke API key', error)
    return NextResponse.json({ error: 'Failed to revoke key' }, { status: 500 })
  }
  if (!data || data.length === 0) return NextResponse.json({ error: 'Key not found' }, { status: 404 })
  return NextResponse.json({ revoked: true })
}
