import { NextResponse } from 'next/server'
import { requireWorkspace } from '@/lib/api-auth'
import { API_SCOPES, generateApiKey, hashApiKey } from '@/lib/api-keys'
import { createAdminClient } from '@/lib/supabase/admin'

const MAX_ACTIVE_KEYS = 20
// key_hash se klientovi nikdy nevrací
const PUBLIC_COLUMNS = 'id, name, key_prefix, scopes, last_used_at, expires_at, is_active, created_at'

// GET /api/api-keys – klíče workspace (jen prefix, bez hashe)
export async function GET() {
  const ctx = await requireWorkspace()
  if ('response' in ctx) return ctx.response

  const { data, error } = await createAdminClient()
    .from('api_keys')
    .select(PUBLIC_COLUMNS)
    .eq('workspace_id', ctx.workspace.id)
    .order('created_at', { ascending: false })
  if (error) {
    console.error('Failed to load API keys', error)
    return NextResponse.json({ error: 'Failed to load API keys' }, { status: 500 })
  }
  return NextResponse.json({ keys: data })
}

// POST /api/api-keys  Body: { name, scopes?, expires_at? }
// Vrací { ...keyData, key } – plný klíč se zobrazí JEDNOU, v databázi zůstává jen hash.
export async function POST(request: Request) {
  const ctx = await requireWorkspace()
  if ('response' in ctx) return ctx.response

  const body = await request.json().catch(() => null)
  const name = typeof body?.name === 'string' ? body.name.trim() : ''
  if (!name || name.length > 100) {
    return NextResponse.json({ error: 'Název klíče je povinný (max. 100 znaků)' }, { status: 400 })
  }

  const scopes: unknown = body?.scopes ?? ['read']
  if (
    !Array.isArray(scopes) ||
    scopes.length === 0 ||
    !scopes.every((s) => typeof s === 'string' && (API_SCOPES as string[]).includes(s))
  ) {
    return NextResponse.json({ error: 'Invalid scopes' }, { status: 400 })
  }

  let expiresAt: string | null = null
  if (body?.expires_at != null) {
    const d = new Date(body.expires_at)
    if (typeof body.expires_at !== 'string' || Number.isNaN(d.getTime()) || d <= new Date()) {
      return NextResponse.json({ error: 'Platnost musí být v budoucnosti' }, { status: 400 })
    }
    expiresAt = d.toISOString()
  }

  const supabase = createAdminClient()
  const { count, error: countError } = await supabase
    .from('api_keys')
    .select('id', { count: 'exact', head: true })
    .eq('workspace_id', ctx.workspace.id)
    .eq('is_active', true)
  if (countError) {
    console.error('Failed to count API keys', countError)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
  if ((count ?? 0) >= MAX_ACTIVE_KEYS) {
    return NextResponse.json({ error: 'Dosáhli jste maximálního počtu aktivních klíčů.' }, { status: 403 })
  }

  const { key, prefix } = generateApiKey()
  const { data, error } = await supabase
    .from('api_keys')
    .insert({
      workspace_id: ctx.workspace.id,
      name,
      key_hash: await hashApiKey(key),
      key_prefix: prefix,
      scopes,
      expires_at: expiresAt,
    })
    .select(PUBLIC_COLUMNS)
    .single()
  if (error) {
    console.error('Failed to create API key', error)
    return NextResponse.json({ error: 'Failed to create API key' }, { status: 500 })
  }

  return NextResponse.json({ ...data, key }, { status: 201, headers: { 'Cache-Control': 'no-store' } })
}
