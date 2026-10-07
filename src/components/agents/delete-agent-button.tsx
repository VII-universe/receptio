'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/toast'

export function DeleteAgentButton({ agentId, name }: { agentId: string; name: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  async function onClick() {
    if (!window.confirm(`Smazat agenta „${name}“? Smaže se i historie jeho hovorů a akci nelze vrátit.`)) return
    setBusy(true)
    try {
      const res = await fetch(`/api/agents/${agentId}`, { method: 'DELETE' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? 'Smazání se nepodařilo.')
      toast.add({ type: 'success', title: 'Agent byl smazán' })
      router.refresh()
    } catch (e) {
      toast.add({
        type: 'error',
        title: 'Smazání se nepodařilo',
        description: e instanceof Error ? e.message : undefined,
      })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Button variant="ghost" size="sm" className="text-destructive" disabled={busy} onClick={onClick}>
      {busy ? 'Mažu…' : 'Smazat'}
    </Button>
  )
}
