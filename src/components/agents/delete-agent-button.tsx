'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/toast'

export function DeleteAgentButton({ agentId, name }: { agentId: string; name: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  async function onClick() {
    if (!window.confirm(`Delete agent "${name}"? Its call history will be deleted too and this cannot be undone.`)) return
    setBusy(true)
    try {
      const res = await fetch(`/api/agents/${agentId}`, { method: 'DELETE' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? 'Deleting failed.')
      toast.add({ type: 'success', title: 'Agent deleted' })
      router.refresh()
    } catch (e) {
      toast.add({
        type: 'error',
        title: 'Deleting failed',
        description: e instanceof Error ? e.message : undefined,
      })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Button variant="ghost" size="sm" className="text-destructive" disabled={busy} onClick={onClick}>
      {busy ? 'Deleting…' : 'Delete'}
    </Button>
  )
}
