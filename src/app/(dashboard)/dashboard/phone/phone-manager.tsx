'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface AvailableNumber {
  phoneNumber: string
  friendlyName: string
  locality: string | null
  region: string | null
}

export function PhoneManager({ phoneNumber }: { phoneNumber: string | null }) {
  const router = useRouter()
  const [numbers, setNumbers] = useState<AvailableNumber[] | null>(null)
  const [searching, setSearching] = useState(false)
  const [buying, setBuying] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function search() {
    setSearching(true)
    setError(null)
    try {
      const res = await fetch('/api/phone-numbers/search?country=CZ')
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? 'Vyhledání čísel selhalo.')
      setNumbers(data.numbers)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Vyhledání čísel selhalo.')
    } finally {
      setSearching(false)
    }
  }

  async function buy(number: string) {
    if (!window.confirm(`Zakoupit číslo ${number}? Číslo se zakoupí a bude účtováno na vašem Twilio účtu.`)) {
      return
    }
    setBuying(number)
    setError(null)
    try {
      const res = await fetch('/api/phone-numbers/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: number }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error([data.error, data.detail].filter(Boolean).join(': ') || 'Zakoupení čísla selhalo.')
      }
      setNumbers(null)
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Zakoupení čísla selhalo.')
    } finally {
      setBuying(null)
    }
  }

  if (phoneNumber) {
    return (
      <Card>
        <CardHeader>
          <CardDescription>Přiřazené číslo</CardDescription>
          <CardTitle className="flex items-center gap-3 text-2xl">
            {phoneNumber} <Badge>Aktivní</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Hovory na toto číslo přijímá váš AI asistent.
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pořiďte si telefonní číslo</CardTitle>
        <CardDescription>
          Na zakoupené číslo bude volat vaše zákazníky váš AI asistent.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <Button className="self-start" onClick={search} disabled={searching || buying !== null}>
          {searching ? 'Hledám…' : 'Pořídit české číslo'}
        </Button>

        {error && <p className="text-sm text-destructive">{error}</p>}

        {numbers && numbers.length === 0 && (
          <p className="text-sm text-muted-foreground">Momentálně nejsou dostupná žádná čísla.</p>
        )}

        {numbers && numbers.length > 0 && (
          <ul className="flex flex-col divide-y rounded-lg border">
            {numbers.map((n) => (
              <li key={n.phoneNumber} className="flex items-center justify-between gap-3 p-3">
                <div>
                  <div className="font-medium">{n.friendlyName}</div>
                  <div className="text-sm text-muted-foreground">
                    {[n.locality, n.region].filter(Boolean).join(', ') || n.phoneNumber}
                  </div>
                </div>
                <Button size="sm" onClick={() => buy(n.phoneNumber)} disabled={buying !== null}>
                  {buying === n.phoneNumber ? 'Kupuji…' : 'Zakoupit'}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
