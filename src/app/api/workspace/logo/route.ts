import { NextResponse } from 'next/server'
import { requireWorkspaceAdmin } from '@/lib/api-auth'
import { createAdminClient } from '@/lib/supabase/admin'

const BUCKET = 'workspace-logos'
const MAX_BYTES = 600_000

/** Typ obrázku podle prvních bajtů (hlavičce Content-Type od klienta se nevěří). */
function sniff(b: Uint8Array): { type: string; ext: string } | null {
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return { type: 'image/png', ext: 'png' }
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { type: 'image/jpeg', ext: 'jpg' }
  if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return { type: 'image/webp', ext: 'webp' }
  return null
}

async function ensureBucket() {
  const storage = createAdminClient().storage
  const { error } = await storage.createBucket(BUCKET, { public: true, fileSizeLimit: MAX_BYTES, allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp'] })
  if (error && !/already exists|duplicate/i.test(error.message)) throw error
}

async function removeOld(workspaceId: string, keep?: string) {
  const storage = createAdminClient().storage.from(BUCKET)
  const { data } = await storage.list(workspaceId)
  const stale = (data ?? []).map((f) => `${workspaceId}/${f.name}`).filter((p) => p !== keep)
  if (stale.length > 0) await storage.remove(stale)
}

// POST multipart (pole `file`) – nahraje logo podniku (PNG, JPEG nebo WebP do 600 kB; klient ho před odesláním zmenší)
export async function POST(request: Request) {
  const ctx = await requireWorkspaceAdmin()
  if ('response' in ctx) return ctx.response
  const form = await request.formData().catch(() => null)
  const file = form?.get('file')
  if (!(file instanceof File)) return NextResponse.json({ error: 'Missing file' }, { status: 400 })
  if (file.size === 0 || file.size > MAX_BYTES) return NextResponse.json({ error: 'The image must be under 600 kB' }, { status: 413 })
  const bytes = new Uint8Array(await file.arrayBuffer())
  const kind = sniff(bytes)
  if (!kind) return NextResponse.json({ error: 'Use a PNG, JPEG or WebP image' }, { status: 415 })

  try {
    await ensureBucket()
    const supabase = createAdminClient()
    const path = `${ctx.workspace.id}/${Date.now()}.${kind.ext}`
    const up = await supabase.storage.from(BUCKET).upload(path, bytes, { contentType: kind.type, cacheControl: '31536000', upsert: false })
    if (up.error) throw up.error
    const url = supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
    const { error } = await supabase.from('workspaces').update({ logo_url: url }).eq('id', ctx.workspace.id)
    if (error) {
      await supabase.storage.from(BUCKET).remove([path])
      throw error
    }
    await removeOld(ctx.workspace.id, path).catch((e) => console.error('Logo cleanup failed', e))
    return NextResponse.json({ logo_url: url })
  } catch (e) {
    console.error('Logo upload failed (is migration 033 applied?)', e)
    return NextResponse.json({ error: 'Failed to save the logo' }, { status: 500 })
  }
}

// DELETE – odstraní logo
export async function DELETE() {
  const ctx = await requireWorkspaceAdmin()
  if ('response' in ctx) return ctx.response
  try {
    const { error } = await createAdminClient().from('workspaces').update({ logo_url: null }).eq('id', ctx.workspace.id)
    if (error) throw error
    await removeOld(ctx.workspace.id).catch((e) => console.error('Logo cleanup failed', e))
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('Logo removal failed', e)
    return NextResponse.json({ error: 'Failed to remove the logo' }, { status: 500 })
  }
}
