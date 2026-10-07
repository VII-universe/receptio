'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/toast'

export function DeleteAgentButton({ agentId, name }: { agentId: string; name: string }) {
  const router = useRouter()
  const t = useTranslations('agents')
  const tc = useTranslations('common')
  const [busy, setBusy] = useState(false)

  async function onClick() {
    if (!window.confirm(t('deleteConfirmNamed', { name }))) return
    setBusy(true)
    try {
      const res = await fetch(`/api/agents/${agentId}`, { method: 'DELETE' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? t('deleteFailed'))
      toast.add({ type: 'success', title: t('deleted') })
      router.refresh()
    } catch (e) {
      toast.add({
        type: 'error',
        title: t('deleteFailed'),
        description: e instanceof Error ? e.message : undefined,
      })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Button variant="ghost" size="sm" className="text-destructive" disabled={busy} onClick={onClick}>
      {busy ? t('deleting') : tc('delete')}
    </Button>
  )
}
