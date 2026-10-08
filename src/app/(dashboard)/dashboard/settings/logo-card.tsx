'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { ImagePlus, Loader2, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardIcon, CardTitle } from '@/components/ui/card'
import { toast } from '@/components/ui/toast'
import { WorkspaceAvatar } from '@/components/workspace-avatar'

const SIZE = 256

/** Obrázek ořízne na čtverec a zmenší na 256 px (WebP, jinak PNG); zachová průhlednost. */
async function toSquare(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const side = Math.min(bitmap.width, bitmap.height)
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = SIZE
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas is not available')
  ctx.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, SIZE, SIZE)
  bitmap.close()
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', 0.9))
  if (blob && blob.type === 'image/webp') return blob
  const png = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
  if (!png) throw new Error('Could not process the image')
  return png
}

/** Logo podniku: nahrání (s ořezem na čtverec), náhled a odstranění. Zobrazuje se v přehledu a menu. */
export function LogoCard({ name, logoUrl }: { name: string; logoUrl: string | null }) {
  const t = useTranslations('settings')
  const router = useRouter()
  const input = useRef<HTMLInputElement>(null)
  const [url, setUrl] = useState(logoUrl)
  const [busy, setBusy] = useState(false)

  async function onFile(file: File | undefined) {
    if (!file) return
    if (!/^image\/(png|jpeg|webp)$/.test(file.type)) return toast.add({ type: 'error', title: t('logoType') })
    setBusy(true)
    try {
      const blob = await toSquare(file)
      const body = new FormData()
      body.set('file', new File([blob], 'logo', { type: blob.type }))
      const res = await fetch('/api/workspace/logo', { method: 'POST', body })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? t('logoFailed'))
      setUrl(data.logo_url)
      toast.add({ type: 'success', title: t('logoSaved') })
      router.refresh()
    } catch (e) {
      toast.add({ type: 'error', title: t('logoFailed'), description: e instanceof Error ? e.message : undefined })
    } finally {
      setBusy(false)
      if (input.current) input.current.value = ''
    }
  }

  async function remove() {
    setBusy(true)
    try {
      const res = await fetch('/api/workspace/logo', { method: 'DELETE' })
      if (!res.ok) throw new Error()
      setUrl(null)
      toast.add({ type: 'success', title: t('logoRemoved') })
      router.refresh()
    } catch {
      toast.add({ type: 'error', title: t('logoFailed') })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          <CardIcon icon={ImagePlus} />
          {t('logo')}
        </CardTitle>
        <CardDescription>{t('logoHint')}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center gap-5">
        <WorkspaceAvatar name={name} logoUrl={url} className="size-20 text-3xl" />
        <div className="flex flex-wrap items-center gap-2">
          <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" id="logo-file" onChange={(e) => void onFile(e.target.files?.[0])} />
          <Button type="button" disabled={busy} onClick={() => input.current?.click()}>
            {busy ? <Loader2 className="animate-spin" /> : <ImagePlus />} {url ? t('logoReplace') : t('logoUpload')}
          </Button>
          {url && (
            <Button type="button" variant="ghost" className="text-destructive" disabled={busy} onClick={remove}>
              <Trash2 /> {t('logoRemove')}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
