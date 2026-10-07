'use client'

import { useState } from 'react'
import { Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export interface PlanCardData {
  id: 'free' | 'starter' | 'business' | 'pro'
  name: string
  priceLabel: string // už naformátovaná cena v měně workspace
  features: string[]
  purchasable: boolean
}

export function PlanCards({
  plans,
  currentPlan,
  managePortal,
}: {
  plans: PlanCardData[]
  currentPlan: PlanCardData['id']
  managePortal: boolean // má aktivní placené předplatné -> změny jdou přes portál
}) {
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function go(key: string, url: string, body?: object) {
    setBusy(key)
    setError(null)
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.url) throw new Error(data.error ?? 'Něco se pokazilo, zkuste to prosím znovu.')
      window.location.href = data.url
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Něco se pokazilo, zkuste to prosím znovu.')
      setBusy(null)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {plans.map((p) => {
          const current = p.id === currentPlan
          return (
            <Card key={p.id} className={current ? 'ring-2 ring-primary' : undefined}>
              <CardHeader>
                <CardTitle>{p.name}</CardTitle>
                <CardDescription>
                  {p.priceLabel}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-4">
                <ul className="flex flex-1 flex-col gap-2 text-sm">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <Check className="mt-0.5 size-4 shrink-0 text-green-600" />
                      {f}
                    </li>
                  ))}
                </ul>

                {current ? (
                  <div className="flex flex-col gap-2">
                    <Button variant="outline" disabled>
                      Váš aktuální plán
                    </Button>
                    {managePortal && (
                      <Button
                        variant="secondary"
                        disabled={busy !== null}
                        onClick={() => go('portal', '/api/billing/create-portal')}
                      >
                        {busy === 'portal' ? 'Otevírám…' : 'Spravovat předplatné'}
                      </Button>
                    )}
                  </div>
                ) : p.id === 'free' ? null : managePortal ? (
                  <Button
                    variant="outline"
                    disabled={busy !== null}
                    onClick={() => go('portal', '/api/billing/create-portal')}
                  >
                    {busy === 'portal' ? 'Otevírám…' : 'Změnit ve správě předplatného'}
                  </Button>
                ) : (
                  <Button
                    disabled={!p.purchasable || busy !== null}
                    onClick={() => go(p.id, '/api/billing/create-checkout', { planId: p.id })}
                  >
                    {busy === p.id ? 'Přesměrovávám…' : `Přejít na ${p.name}`}
                  </Button>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
