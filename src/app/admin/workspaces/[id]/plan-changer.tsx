'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PLANS, type PlanId } from '@/lib/stripe/plans'

const OPTIONS = (Object.keys(PLANS) as PlanId[]).map((id) => ({ value: id, label: PLANS[id].nameCs }))

export function PlanChanger({ workspaceId, currentPlan }: { workspaceId: string; currentPlan: string }) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [plan, setPlan] = useState(currentPlan)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'ok' | 'error'; text: string } | null>(null)

  async function save() {
    setSaving(true)
    setMessage(null)
    try {
      const res = await fetch(`/api/admin/workspaces/${workspaceId}/plan`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? 'Změna plánu se nezdařila.')
      setMessage({ type: 'ok', text: `Plán změněn. Pozor: Stripe neaktualizován (${data.warning ?? ''}).` })
      setEditing(false)
      router.refresh()
    } catch (e) {
      setMessage({ type: 'error', text: e instanceof Error ? e.message : 'Změna plánu se nezdařila.' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {editing ? (
        <div className="flex flex-wrap items-center gap-2">
          <Select value={plan} items={OPTIONS} onValueChange={(v) => v && setPlan(v)}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={save} disabled={saving || plan === currentPlan}>
            {saving && <Loader2 className="animate-spin" />} Uložit plán
          </Button>
          <Button size="sm" variant="outline" onClick={() => { setEditing(false); setPlan(currentPlan) }} disabled={saving}>
            Zrušit
          </Button>
        </div>
      ) : (
        <Button size="sm" variant="outline" className="self-start" onClick={() => setEditing(true)}>
          Změnit plán
        </Button>
      )}
      {editing && (
        <p className="text-xs text-yellow-600">Změní se jen databáze, předplatné ve Stripe zůstane beze změny.</p>
      )}
      {message && (
        <p className={message.type === 'ok' ? 'text-sm text-yellow-600' : 'text-sm text-destructive'}>{message.text}</p>
      )}
    </div>
  )
}
