'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const OPTIONS = [
  { value: 'CZK', label: 'CZK' },
  { value: 'EUR', label: 'EUR' },
]

export function CurrencyChanger({
  workspaceId,
  currentCurrency,
  locked,
}: {
  workspaceId: string
  currentCurrency: string
  locked: boolean // workspace má aktivní předplatné
}) {
  const router = useRouter()
  const [currency, setCurrency] = useState(currentCurrency)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'ok' | 'error'; text: string } | null>(null)

  async function save() {
    setSaving(true)
    setMessage(null)
    try {
      const res = await fetch(`/api/admin/workspaces/${workspaceId}/currency`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currency }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? 'Changing the currency failed.')
      setMessage({ type: 'ok', text: 'Currency changed.' })
      router.refresh()
    } catch (e) {
      setMessage({ type: 'error', text: e instanceof Error ? e.message : 'Changing the currency failed.' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <Select value={currency} items={OPTIONS} onValueChange={(v) => v && setCurrency(v)}>
          <SelectTrigger className="w-28" disabled={locked || saving}>
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
        <Button size="sm" variant="outline" onClick={save} disabled={locked || saving || currency === currentCurrency}>
          {saving && <Loader2 className="animate-spin" />} Change currency
        </Button>
      </div>
      {locked && (
        <p className="text-xs text-muted-foreground">
          The workspace has an active subscription, so the currency cannot be changed (Stripe prices are tied to a currency).
        </p>
      )}
      {message && (
        <p className={message.type === 'ok' ? 'text-sm text-green-600' : 'text-sm text-destructive'}>{message.text}</p>
      )}
    </div>
  )
}
